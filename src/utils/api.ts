import { API_BASE_URL } from "@/constants/apiConfig";
import { getAccessToken } from "@/services/authSessionService";
import {
  cacheResponse,
  getCachedResponse,
  syncQueue,
} from "@/services/syncQueueService";
import { refreshAuthSession } from "@/services/tokenRefreshService";
import { create as createAxios } from "axios";
import * as Crypto from "expo-crypto";
import { toApiError } from "@/utils/apiError";
import { requiresImmediateServerResponse } from "@/utils/apiRequestPolicy";

export const api = createAxios({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const method = config.method?.toUpperCase();
    if (
      method &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
      config.url?.startsWith("/v1/") &&
      config.url !== "/v1/user/me" &&
      !config.headers.get("Idempotency-Key")
    ) {
      config.headers.set("Idempotency-Key", Crypto.randomUUID());
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

const authEndpoints = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/password-reset",
  "/auth/password-reset/confirm",
];
const isAuthEndpoint = (url?: string) =>
  authEndpoints.some((endpoint) => url?.includes(endpoint));
const isOnlineOnlyEndpoint = requiresImmediateServerResponse;

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = canonicalize((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }
  return value;
};

const buildCacheKey = (url?: string, params?: unknown) =>
  `GET:${url ?? ""}:${JSON.stringify(canonicalize(params ?? {}))}`;

const getHeader = (headers: any, name: string) => {
  const value = typeof headers?.get === "function"
    ? headers.get(name)
    : headers?.[name];
  return typeof value === "string" ? value : undefined;
};

// Response interceptor to handle 401 and refresh access tokens
api.interceptors.response.use(
  (response) => {
    // Cache GET Responses and Process Sync Queue
    if (response.config.method === "get") {
      if (response.data && typeof response.data === "object") {
        const cacheKey = buildCacheKey(
          response.config.url,
          response.config.params,
        );
        void cacheResponse(cacheKey, response.data);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle Offline state (No Network Connection, Connection Timeout, or Server Down)
    const isOfflineOrDown =
      !error.response ||
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNABORTED" ||
      [502, 503, 504].includes(error.response?.status);

    if (
      isOfflineOrDown &&
      !isAuthEndpoint(originalRequest?.url) &&
      !isOnlineOnlyEndpoint(originalRequest?.url)
    ) {
      if (originalRequest) {
        if (originalRequest.method === "get") {
          const cacheKey = buildCacheKey(
            originalRequest.url,
            originalRequest.params,
          );
          const cachedData = await getCachedResponse(cacheKey);
          if (cachedData) {
            return {
              data: cachedData,
              status: 200,
              statusText: "OK",
              headers: {},
              config: originalRequest,
            };
          }
        } else if (
          ["post", "put", "patch", "delete"].includes(
            originalRequest.method || "",
          ) &&
          originalRequest.url?.startsWith("/v1/") &&
          !getHeader(originalRequest.headers, "Content-Type")?.includes(
            "multipart/form-data",
          )
        ) {
          const idempotencyKey =
            getHeader(originalRequest.headers, "Idempotency-Key") ??
            Crypto.randomUUID();
          const pendingId = await syncQueue.enqueue(
            originalRequest.url || "",
            (originalRequest.method || "POST").toUpperCase() as
              | "POST"
              | "PUT"
              | "PATCH"
              | "DELETE",
            originalRequest.data,
            idempotencyKey,
          );
          return {
            data: { status: "pending", offline: true, pending_id: pendingId },
            status: 202,
            statusText: "Accepted",
            headers: {},
            config: originalRequest,
          };
        }
      }
    }

    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        const tokens = await refreshAuthSession();
        const newAccessToken = tokens.access_token;
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (err) {
        return Promise.reject(toApiError(err));
      }
    }

    return Promise.reject(toApiError(error));
  },
);

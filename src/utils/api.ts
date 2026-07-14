import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  saveAuthSession,
} from "@/services/authSessionService";
import {
  cacheResponse,
  enqueueMutation,
  getCachedResponse,
  processSyncQueue,
} from "@/services/syncQueueService";
import axios from "axios";
import Constants from "expo-constants";

const baseURL =
  Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;

if (!baseURL) {
  console.warn(
    "Missing API URL: set expo.extra.apiUrl in app.json or EXPO_PUBLIC_API_URL during build",
  );
}

export const api = axios.create({
  baseURL,
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
];
const isAuthEndpoint = (url?: string) =>
  authEndpoints.some((endpoint) => url?.includes(endpoint));

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token is available.");
  }

  const response = await axios.post(
    `${baseURL}/auth/refresh`,
    { refresh_token: refreshToken },
    { headers: { "Content-Type": "application/json" }, timeout: 10000 },
  );
  await saveAuthSession(response.data);
  return response.data.access_token as string;
};

const getRefreshedAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken()
      .catch(async (error) => {
        await clearAuthSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Response interceptor to handle 401 and refresh access tokens
api.interceptors.response.use(
  (response) => {
    // Cache GET Responses and Process Sync Queue
    if (response.config.method === "get") {
      if (response.data && typeof response.data === "object") {
        const cacheKey =
          response.config.url +
          (response.config.params
            ? JSON.stringify(response.config.params)
            : "");
        void cacheResponse(cacheKey, response.data);
      }
    }
    void processSyncQueue();
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

    if (isOfflineOrDown && !isAuthEndpoint(originalRequest?.url)) {
      if (originalRequest) {
        if (originalRequest.method === "get") {
          const cacheKey =
            originalRequest.url +
            (originalRequest.params
              ? JSON.stringify(originalRequest.params)
              : "");
          const cachedData = await getCachedResponse(cacheKey);
          if (cachedData) {
            console.log(
              `[Offline Cache] Serving cached data for ${originalRequest.url}`,
            );
            return {
              data: cachedData,
              status: 200,
              statusText: "OK",
              headers: {},
              config: originalRequest,
            };
          }
        } else if (
          ["post", "put", "delete"].includes(originalRequest.method || "")
        ) {
          console.log(
            `[Offline Queue] Queueing offline ${originalRequest.method} request to ${originalRequest.url}`,
          );
          await enqueueMutation(
            originalRequest.url || "",
            (originalRequest.method || "POST").toUpperCase() as any,
            originalRequest.data,
          );
          return {
            data: { status: "success", offline: true },
            status: 200,
            statusText: "OK",
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
        const newAccessToken = await getRefreshedAccessToken();
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);

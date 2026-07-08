import {
  cacheResponse,
  enqueueMutation,
  getCachedResponse,
  processSyncQueue,
} from "@/services/syncQueueService";
import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

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
    const token = await SecureStore.getItemAsync("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const clearStoredTokens = async () => {
  await SecureStore.deleteItemAsync("access_token");
  await SecureStore.deleteItemAsync("refresh_token");
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

    if (isOfflineOrDown) {
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
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync("refresh_token");
        console.log(refreshToken);
        if (!refreshToken) {
          await clearStoredTokens();
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        isRefreshing = true;

        // Use a raw axios call to avoid interceptors recursion
        const refreshResponse = await axios.post(
          `${baseURL}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { "Content-Type": "application/json" } },
        );

        const newAccessToken = refreshResponse.data?.access_token;
        const newRefreshToken = refreshResponse.data?.refresh_token;

        if (!newAccessToken) {
          await clearStoredTokens();
          processQueue(new Error("No access token in refresh response"), null);
          isRefreshing = false;
          return Promise.reject(error);
        }

        await SecureStore.setItemAsync("access_token", newAccessToken);
        if (newRefreshToken) {
          await SecureStore.setItemAsync("refresh_token", newRefreshToken);
        }

        api.defaults.headers.common["Authorization"] =
          `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (err) {
        isRefreshing = false;
        processQueue(err, null);
        await clearStoredTokens();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);

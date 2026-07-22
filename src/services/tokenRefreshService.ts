import { API_BASE_URL } from "@/constants/apiConfig";
import {
  AuthTokenPair,
  clearAuthSession,
  getRefreshToken,
  saveAuthSession,
} from "@/services/authSessionService";
import axios, { isAxiosError } from "axios";
import { isAuthenticationRefreshFailure } from "@/utils/authRefreshPolicy";

let refreshPromise: Promise<AuthTokenPair> | null = null;

const requestTokenRefresh = async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token is available.");
  }

  const response = await axios.post<AuthTokenPair>(
    `${API_BASE_URL}/auth/refresh`,
    { refresh_token: refreshToken },
    { headers: { "Content-Type": "application/json" }, timeout: 10000 },
  );
  await saveAuthSession(response.data);
  return response.data;
};

export const refreshAuthSession = () => {
  if (!refreshPromise) {
    refreshPromise = requestTokenRefresh()
      .catch(async (error) => {
        if (
          isAxiosError(error) &&
          error.response &&
          isAuthenticationRefreshFailure(error.response.status)
        ) {
          await clearAuthSession("session-expired");
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

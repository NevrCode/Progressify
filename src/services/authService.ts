import {
  AuthTokenPair,
  clearAuthSession,
  getRefreshToken,
} from "@/services/authSessionService";
import { api } from "@/utils/api";
import { isAxiosError } from "axios";

interface LoginRequest {
  email: string;
  password: string;
}
interface SignInRequest {
  name: string;
  email: string;
  password: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export const login = async ({
  email,
  password,
}: LoginRequest): Promise<AuthTokenPair> => {
  try {
    const response = await api.post<AuthTokenPair>("/auth/login", {
      email,
      password,
    });
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Login failed"));
  }
};
export const signIn = async ({ name, email, password }: SignInRequest) => {
  try {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
    });
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Register failed"));
  }
};

export const logout = async () => {
  const refreshToken = await getRefreshToken();
  try {
    if (refreshToken) {
      await api.post("/auth/logout", { refresh_token: refreshToken });
    }
  } finally {
    await clearAuthSession();
  }
};

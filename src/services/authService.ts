import {
  AuthTokenPair,
  clearAuthSession,
  getAuthUserId,
  getRefreshToken,
} from "@/services/authSessionService";
import { clearOfflineDataForUser } from "@/services/syncQueueService";
import { clearUserScopedStorage } from "@/services/userScopedStorage";
import { api } from "@/utils/api";
import { getErrorMessage } from "@/utils/apiError";

interface LoginRequest {
  email: string;
  password: string;
}
interface SignInRequest {
  name: string;
  email: string;
  password: string;
  legalAccepted: boolean;
}

export const requestPasswordReset = async (email: string) => {
  try {
    await api.post("/auth/password-reset", { email });
  } catch (error: unknown) {
    throw new Error(
      getErrorMessage(error, "Unable to request a password reset. Please try again."),
    );
  }
};

export const confirmPasswordReset = async (
  token: string,
  newPassword: string,
) => {
  try {
    await api.post("/auth/password-reset/confirm", {
      token,
      new_password: newPassword,
    });
  } catch (error: unknown) {
    throw new Error(
      getErrorMessage(error, "Unable to reset your password. The link may have expired."),
    );
  }
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
    throw new Error(getErrorMessage(error, "Login failed. Please try again."));
  }
};
export const signIn = async ({ name, email, password, legalAccepted }: SignInRequest) => {
  try {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
      legal_accepted: legalAccepted,
    });
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Registration failed. Please try again."));
  }
};

export const logout = async () => {
  const [refreshToken, ownerId] = await Promise.all([
    getRefreshToken(),
    getAuthUserId(),
  ]);
  try {
    if (refreshToken) {
      await api.post("/auth/logout", { refresh_token: refreshToken });
    }
  } finally {
    try {
      if (ownerId) {
        await Promise.all([
          clearOfflineDataForUser(ownerId),
          clearUserScopedStorage(ownerId),
        ]);
      }
    } finally {
      await clearAuthSession();
    }
  }
};

export const deleteMyAccount = async (
  currentPassword: string,
  confirmation: string,
) => {
  const ownerId = await getAuthUserId();
  try {
    await api.delete("/v1/user/me", {
      data: {
        current_password: currentPassword,
        confirmation,
      },
    });
  } catch (error: unknown) {
    throw new Error(
      getErrorMessage(error, "Unable to delete your account. Please try again."),
    );
  }

  try {
    if (ownerId) {
      await Promise.all([
        clearOfflineDataForUser(ownerId),
        clearUserScopedStorage(ownerId),
      ]);
    }
  } finally {
    await clearAuthSession();
  }
};

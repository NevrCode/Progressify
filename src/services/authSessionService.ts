import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const AUTH_USER_ID_KEY = "auth_user_id";

export type AuthTokenPair = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
  user_id: string;
};

export type AuthState = "authenticated" | "anonymous" | "session-expired";
type AuthStateListener = (state: AuthState) => void;
const listeners = new Set<AuthStateListener>();

const emitAuthState = (state: AuthState) => {
  listeners.forEach((listener) => listener(state));
};

export const getAccessToken = () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
export const getAuthUserId = () => SecureStore.getItemAsync(AUTH_USER_ID_KEY);

export const hasAuthSession = async () => {
  const [accessToken, refreshToken, userId] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
    getAuthUserId(),
  ]);
  return Boolean(accessToken && refreshToken && userId);
};

export const saveAuthSession = async (tokens: AuthTokenPair) => {
  if (!tokens.access_token || !tokens.refresh_token || !tokens.user_id) {
    throw new Error("The server returned an incomplete authentication session.");
  }

  try {
    const previousOwnerId = await getAuthUserId();
    if (previousOwnerId && previousOwnerId !== tokens.user_id) {
      emitAuthState("anonymous");
    }
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
    await SecureStore.setItemAsync(AUTH_USER_ID_KEY, tokens.user_id);
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
    emitAuthState("authenticated");
  } catch (error) {
    await clearAuthSession();
    throw error;
  }
};

export const clearAuthSession = async (
  state: Exclude<AuthState, "authenticated"> = "anonymous",
) => {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(AUTH_USER_ID_KEY),
  ]);
  emitAuthState(state);
};

export const subscribeAuthState = (listener: AuthStateListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

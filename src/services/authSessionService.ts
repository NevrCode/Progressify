import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export type AuthTokenPair = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
};

type AuthStateListener = (authenticated: boolean) => void;
const listeners = new Set<AuthStateListener>();

const emitAuthState = (authenticated: boolean) => {
  listeners.forEach((listener) => listener(authenticated));
};

export const getAccessToken = () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export const hasAuthSession = async () => {
  const [accessToken, refreshToken] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
  ]);
  return Boolean(accessToken && refreshToken);
};

export const saveAuthSession = async (tokens: AuthTokenPair) => {
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("The server returned an incomplete authentication session.");
  }

  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
    emitAuthState(true);
  } catch (error) {
    await clearAuthSession();
    throw error;
  }
};

export const clearAuthSession = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
  emitAuthState(false);
};

export const subscribeAuthState = (listener: AuthStateListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

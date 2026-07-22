import Constants from "expo-constants";

const configuredApiUrl =
  Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;

if (!configuredApiUrl) {
  throw new Error(
    "Missing API URL configuration. Set expo.extra.apiUrl or EXPO_PUBLIC_API_URL.",
  );
}

export const API_BASE_URL = configuredApiUrl;

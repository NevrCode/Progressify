import { getAuthUserId } from "@/services/authSessionService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const getUserScopedKey = async (namespace: string, suffix?: string) => {
  const ownerId = await getAuthUserId();
  if (!ownerId) return null;
  const encodedOwner = encodeURIComponent(ownerId);
  return suffix
    ? `${namespace}:${encodedOwner}:${suffix}`
    : `${namespace}:${encodedOwner}`;
};

export const clearUserScopedStorage = async (ownerId: string) => {
  const ownerMarker = `:${encodeURIComponent(ownerId)}`;
  const keys = await AsyncStorage.getAllKeys();
  const ownedKeys = keys.filter((key) => key.includes(ownerMarker));
  if (ownedKeys.length > 0) await AsyncStorage.multiRemove(ownedKeys);
};

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserScopedKey } from "@/services/userScopedStorage";
import { logger } from "@/utils/logger";

const WATER_KEY_PREFIX = "@progressify_water:";

export const getWaterIntake = async (date: string): Promise<number> => {
  try {
    const key = await getUserScopedKey(WATER_KEY_PREFIX, date);
    if (!key) return 0;
    await AsyncStorage.removeItem(`${WATER_KEY_PREFIX}${date}`);
    const value = await AsyncStorage.getItem(key);
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    logger.warn("water_intake_load_failed", {
      error_type: error instanceof Error ? error.name : "unknown",
    });
    return 0;
  }
};

export const saveWaterIntake = async (date: string, amount: number): Promise<void> => {
  try {
    const key = await getUserScopedKey(WATER_KEY_PREFIX, date);
    if (!key) return;
    await AsyncStorage.removeItem(`${WATER_KEY_PREFIX}${date}`);
    await AsyncStorage.setItem(key, String(Math.max(0, amount)));
  } catch (error) {
    logger.warn("water_intake_save_failed", {
      error_type: error instanceof Error ? error.name : "unknown",
    });
  }
};

export const logWaterIntake = async (date: string, increment: number): Promise<number> => {
  try {
    const current = await getWaterIntake(date);
    const updated = Math.max(0, current + increment);
    await saveWaterIntake(date, updated);
    return updated;
  } catch (error) {
    logger.warn("water_intake_update_failed", {
      error_type: error instanceof Error ? error.name : "unknown",
    });
    return 0;
  }
};

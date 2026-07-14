import AsyncStorage from "@react-native-async-storage/async-storage";

const WATER_KEY_PREFIX = "@progressify_water:";

export const getWaterIntake = async (date: string): Promise<number> => {
  try {
    const key = `${WATER_KEY_PREFIX}${date}`;
    const value = await AsyncStorage.getItem(key);
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.warn("Failed to get water intake:", error);
    return 0;
  }
};

export const saveWaterIntake = async (date: string, amount: number): Promise<void> => {
  try {
    const key = `${WATER_KEY_PREFIX}${date}`;
    await AsyncStorage.setItem(key, String(Math.max(0, amount)));
  } catch (error) {
    console.warn("Failed to save water intake:", error);
  }
};

export const logWaterIntake = async (date: string, increment: number): Promise<number> => {
  try {
    const current = await getWaterIntake(date);
    const updated = Math.max(0, current + increment);
    await saveWaterIntake(date, updated);
    return updated;
  } catch (error) {
    console.warn("Failed to log water intake:", error);
    return 0;
  }
};

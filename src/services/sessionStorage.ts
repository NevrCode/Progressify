import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserScopedKey } from "@/services/userScopedStorage";
import { logger } from "@/utils/logger";

const ACTIVE_SESSION_NAMESPACE = "@progressify_active_session";
const LEGACY_ACTIVE_SESSION_KEY = "@progressify_active_session";

export type StoredDraftSet = {
  localId: string;
  set_number: number;
  weight: string;
  reps: string;
  rir: string;
};

export type StoredExerciseDraft = {
  exerciseId: number;
  startedAt: string;
  sets: StoredDraftSet[];
};

export type ActiveSessionData = {
  workoutSessionId?: number;
  routineName?: string;
  plannedExerciseIds?: Record<number, number>;
  exerciseIds: number[];
  startedAt: string;
  drafts: Record<number, StoredExerciseDraft>;
  completedIds: number[];
};

export const saveActiveSession = async (data: ActiveSessionData) => {
  try {
    const key = await getUserScopedKey(ACTIVE_SESSION_NAMESPACE);
    if (!key) return;
    await AsyncStorage.multiRemove([LEGACY_ACTIVE_SESSION_KEY]);
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    logger.warn("active_session_save_failed", {
      error_type: error instanceof Error ? error.name : "unknown",
    });
  }
};

export const loadActiveSession =
  async (): Promise<ActiveSessionData | null> => {
    try {
      const key = await getUserScopedKey(ACTIVE_SESSION_NAMESPACE);
      if (!key) return null;
      await AsyncStorage.multiRemove([LEGACY_ACTIVE_SESSION_KEY]);
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as ActiveSessionData;
    } catch (error) {
      logger.warn("active_session_load_failed", {
        error_type: error instanceof Error ? error.name : "unknown",
      });
      return null;
    }
  };

export const clearActiveSession = async () => {
  try {
    const key = await getUserScopedKey(ACTIVE_SESSION_NAMESPACE);
    if (key) await AsyncStorage.removeItem(key);
    await AsyncStorage.removeItem(LEGACY_ACTIVE_SESSION_KEY);
  } catch (error) {
    logger.warn("active_session_clear_failed", {
      error_type: error instanceof Error ? error.name : "unknown",
    });
  }
};

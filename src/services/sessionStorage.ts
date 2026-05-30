import AsyncStorage from "@react-native-async-storage/async-storage";

const ACTIVE_SESSION_KEY = "@progressify_active_session";

export type StoredDraftSet = {
  localId: string;
  set_number: number;
  weight: number;
  reps: number;
  rir: number;
};

export type StoredExerciseDraft = {
  exerciseId: number;
  startedAt: string;
  sets: StoredDraftSet[];
};

export type ActiveSessionData = {
  split: string;
  exerciseIds: number[];
  startedAt: string;
  drafts: Record<number, StoredExerciseDraft>;
  completedIds: number[];
  splitWorkoutId: number | null;
};

export const saveActiveSession = async (data: ActiveSessionData) => {
  try {
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to save active session:", error);
  }
};

export const loadActiveSession =
  async (): Promise<ActiveSessionData | null> => {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as ActiveSessionData;
    } catch (error) {
      console.warn("Failed to load active session:", error);
      return null;
    }
  };

export const clearActiveSession = async () => {
  try {
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (error) {
    console.warn("Failed to clear active session:", error);
  }
};

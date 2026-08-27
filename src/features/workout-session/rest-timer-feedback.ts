import { getUserScopedKey } from "@/services/userScopedStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Vibration } from "react-native";

const REST_TIMER_FEEDBACK_NAMESPACE = "rest-timer-feedback";
const REST_TIMER_VIBRATION_PATTERN = [0, 500, 200, 500] as const;

/**
 * This is deliberately device-local and user-scoped. Rest alerts are a personal
 * interruption preference, so they should not follow an account onto another device.
 */
export type RestTimerFeedbackPreference = {
  vibrationEnabled: boolean;
};

export const DEFAULT_REST_TIMER_FEEDBACK_PREFERENCE: RestTimerFeedbackPreference = {
  // Preserve the rest timer's existing vibration behaviour for current users.
  vibrationEnabled: true,
};

type CompletionFeedbackRuntime = {
  isSupported: () => boolean;
  vibrate: (pattern: readonly number[]) => void;
};

type CompletionFeedbackStore = {
  load: () => Promise<RestTimerFeedbackPreference>;
};

export type CompletionFeedbackRequest = {
  /** Allows a dismissed or restarted timer to cancel an in-flight preference read. */
  isCurrent: () => boolean;
};

const isPreference = (value: unknown): value is RestTimerFeedbackPreference =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { vibrationEnabled?: unknown }).vibrationEnabled === "boolean";

export async function loadRestTimerFeedbackPreference(): Promise<RestTimerFeedbackPreference> {
  try {
    const key = await getUserScopedKey(REST_TIMER_FEEDBACK_NAMESPACE);
    if (!key) return DEFAULT_REST_TIMER_FEEDBACK_PREFERENCE;

    const raw = await AsyncStorage.getItem(key);
    if (!raw) return DEFAULT_REST_TIMER_FEEDBACK_PREFERENCE;

    const parsed: unknown = JSON.parse(raw);
    return isPreference(parsed) ? parsed : DEFAULT_REST_TIMER_FEEDBACK_PREFERENCE;
  } catch {
    // Feedback is non-essential. A storage issue must never interrupt a workout.
    return DEFAULT_REST_TIMER_FEEDBACK_PREFERENCE;
  }
}

export async function saveRestTimerFeedbackPreference(
  preference: RestTimerFeedbackPreference,
): Promise<void> {
  const key = await getUserScopedKey(REST_TIMER_FEEDBACK_NAMESPACE);
  if (!key) return;
  await AsyncStorage.setItem(key, JSON.stringify(preference));
}

export function createRestTimerCompletionFeedback(
  store: CompletionFeedbackStore,
  runtime: CompletionFeedbackRuntime,
) {
  return {
    async notifyForegroundCompletion({ isCurrent }: CompletionFeedbackRequest): Promise<void> {
      try {
        const preference = await store.load();
        if (!isCurrent() || !preference.vibrationEnabled || !runtime.isSupported()) return;
        runtime.vibrate(REST_TIMER_VIBRATION_PATTERN);
      } catch {
        // Device feedback is best-effort and must never interrupt the workout.
      }
    },
  };
}

/**
 * The only completion-feedback seam used by the rest timer. Platform checks,
 * preference persistence, and native failures intentionally stay behind it.
 */
export const restTimerCompletionFeedback = createRestTimerCompletionFeedback(
  { load: loadRestTimerFeedbackPreference },
  {
    isSupported: () => Platform.OS !== "web",
    vibrate: (pattern) => Vibration.vibrate([...pattern]),
  },
);

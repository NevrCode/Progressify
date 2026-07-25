import "expo-sqlite/localStorage/install";

export type OnboardingPreference =
  | "auto"
  | "collapsed"
  | "dismissed"
  | "review";

export const ONBOARDING_PREFERENCE_KEY = "progressify.onboarding.preference";

const validPreferences = new Set<OnboardingPreference>([
  "auto",
  "collapsed",
  "dismissed",
  "review",
]);
const listeners = new Set<() => void>();

const readPreference = (): OnboardingPreference => {
  try {
    const value = localStorage.getItem(ONBOARDING_PREFERENCE_KEY);
    return value && validPreferences.has(value as OnboardingPreference)
      ? (value as OnboardingPreference)
      : "auto";
  } catch {
    return "auto";
  }
};

let currentPreference = readPreference();

export const getOnboardingPreference = () => currentPreference;

export const setOnboardingPreference = (
  preference: OnboardingPreference,
) => {
  currentPreference = preference;
  try {
    localStorage.setItem(ONBOARDING_PREFERENCE_KEY, preference);
  } catch {
    // Preference remains active for this session if storage is unavailable.
  }
  listeners.forEach((listener) => listener());
};

export const subscribeToOnboardingPreference = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};


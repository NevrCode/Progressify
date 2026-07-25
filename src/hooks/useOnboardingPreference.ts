import {
  getOnboardingPreference,
  setOnboardingPreference,
  subscribeToOnboardingPreference,
} from "@/services/onboarding-preference";
import { useSyncExternalStore } from "react";

export const useOnboardingPreference = () => {
  const preference = useSyncExternalStore(
    subscribeToOnboardingPreference,
    getOnboardingPreference,
    getOnboardingPreference,
  );

  return [preference, setOnboardingPreference] as const;
};


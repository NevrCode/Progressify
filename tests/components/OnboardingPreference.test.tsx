/// <reference types="jest" />

import {
  ONBOARDING_PREFERENCE_KEY,
  getOnboardingPreference,
  setOnboardingPreference,
} from "@/services/onboarding-preference";

jest.mock("expo-sqlite/localStorage/install", () => ({}));

const storage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
};

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: storage,
});

describe("onboarding preference", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setOnboardingPreference("auto");
    jest.clearAllMocks();
  });

  it("persists collapse, dismissal, and manual review choices", () => {
    for (const preference of ["collapsed", "dismissed", "review"] as const) {
      setOnboardingPreference(preference);
      expect(getOnboardingPreference()).toBe(preference);
      expect(storage.setItem).toHaveBeenLastCalledWith(
        ONBOARDING_PREFERENCE_KEY,
        preference,
      );
    }
  });
});

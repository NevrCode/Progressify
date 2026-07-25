import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOnboardingSteps,
  getOnboardingProgress,
} from "../src/utils/onboarding.ts";

test("builds onboarding completion from real application signals", () => {
  const steps = buildOnboardingSteps({
    hasNutritionProfile: true,
    hasActiveProgram: true,
    hasExercise: true,
    hasCompletedWorkout: false,
    hasFoodEntry: false,
  });

  assert.deepEqual(
    steps.filter((step) => step.completed).map((step) => step.key),
    ["nutrition-profile", "active-program", "first-exercise"],
  );
  assert.deepEqual(getOnboardingProgress(steps), {
    completed: 3,
    total: 5,
    percentage: 60,
    allComplete: false,
  });
});

test("recognizes a fully completed first-use journey", () => {
  const steps = buildOnboardingSteps({
    hasNutritionProfile: true,
    hasActiveProgram: true,
    hasExercise: true,
    hasCompletedWorkout: true,
    hasFoodEntry: true,
  });

  assert.equal(getOnboardingProgress(steps).allComplete, true);
});


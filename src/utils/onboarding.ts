export type OnboardingStepKey =
  | "nutrition-profile"
  | "active-program"
  | "first-exercise"
  | "first-workout"
  | "first-food";

export type OnboardingSignals = {
  hasNutritionProfile: boolean;
  hasActiveProgram: boolean;
  hasExercise: boolean;
  hasCompletedWorkout: boolean;
  hasFoodEntry: boolean;
};

export type OnboardingStep = {
  key: OnboardingStepKey;
  title: string;
  description: string;
  completed: boolean;
};

export const buildOnboardingSteps = (
  signals: OnboardingSignals,
): OnboardingStep[] => [
  {
    key: "nutrition-profile",
    title: "Set nutrition goals",
    description: "Add your body profile for personalized calories and macros.",
    completed: signals.hasNutritionProfile,
  },
  {
    key: "active-program",
    title: "Choose a workout program",
    description: "Create or activate the routine you want to follow.",
    completed: signals.hasActiveProgram,
  },
  {
    key: "first-exercise",
    title: "Add your first exercise",
    description: "Connect an exercise from the catalog or create your own.",
    completed: signals.hasExercise,
  },
  {
    key: "first-workout",
    title: "Complete your first workout",
    description: "Record a session with sets to begin tracking progress.",
    completed: signals.hasCompletedWorkout,
  },
  {
    key: "first-food",
    title: "Log your first food",
    description: "Add a meal to begin tracking daily nutrition.",
    completed: signals.hasFoodEntry,
  },
];

export const getOnboardingProgress = (steps: OnboardingStep[]) => {
  const completed = steps.filter((step) => step.completed).length;
  return {
    completed,
    total: steps.length,
    percentage: steps.length > 0 ? (completed / steps.length) * 100 : 0,
    allComplete: steps.length > 0 && completed === steps.length,
  };
};


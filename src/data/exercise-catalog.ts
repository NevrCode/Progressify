import generatedCatalog from "./exercise-catalog.generated.json";

import type { ExerciseCatalog } from "@/types/exercise-catalog";

export const exerciseCatalog = generatedCatalog as ExerciseCatalog;
export const catalogExercises = exerciseCatalog.exercises;

import generatedCatalog from "./exercise-catalog.generated.json";

import type {
  CatalogExerciseDetail,
  ExerciseCatalog,
  ExerciseCatalogDetails,
} from "@/types/exercise-catalog";

export const exerciseCatalog = generatedCatalog as ExerciseCatalog;
export const catalogExercises = exerciseCatalog.exercises;

const EMPTY_DETAIL: CatalogExerciseDetail = {
  instructions: [],
  imagePaths: [],
};

let loadedDetails: ExerciseCatalogDetails | null = null;

/**
 * Instructions and image references for one exercise.
 *
 * The detail file is roughly three times the size of the catalog itself and is
 * only needed once the user opens a specific exercise, so it is required on
 * first call rather than imported at module scope. Metro runs with
 * `inlineRequires: false`, so a top-level import here would parse that payload
 * alongside the catalog on every screen that lists exercises.
 *
 * The parsed module is cached by both the require cache and `loadedDetails`,
 * so repeated lookups cost a map access.
 */
export function getExerciseDetail(exerciseID: string): CatalogExerciseDetail {
  if (!loadedDetails) {
    loadedDetails =
      require("./exercise-catalog-details.generated.json") as ExerciseCatalogDetails;
  }
  return loadedDetails.details[exerciseID] ?? EMPTY_DETAIL;
}

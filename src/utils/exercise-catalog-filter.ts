import type { CatalogExercise } from "@/types/exercise-catalog";

export type ExerciseCatalogFilters = {
  query?: string;
  primaryMuscle?: string | null;
  equipment?: string | null;
};

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? "";

export function filterCatalogExercises(
  exercises: readonly CatalogExercise[],
  filters: ExerciseCatalogFilters,
) {
  const query = normalize(filters.query);
  const primaryMuscle = normalize(filters.primaryMuscle);
  const equipment = normalize(filters.equipment);

  return exercises.filter((exercise) => {
    if (
      primaryMuscle &&
      normalize(exercise.primaryMuscle) !== primaryMuscle
    ) {
      return false;
    }

    if (equipment && normalize(exercise.equipment) !== equipment) {
      return false;
    }

    if (!query) return true;

    return [
      exercise.name,
      exercise.primaryMuscle,
      ...exercise.secondaryMuscles,
      exercise.equipment,
    ].some((value) => normalize(value).includes(query));
  });
}

export function getCatalogFilterOptions(
  exercises: readonly CatalogExercise[],
) {
  const uniqueSorted = (values: (string | null)[]) =>
    [...new Set(values.filter((value): value is string => Boolean(value)))].sort(
      (left, right) => left.localeCompare(right, "en", { sensitivity: "base" }),
    );

  return {
    primaryMuscles: uniqueSorted(
      exercises.map((exercise) => exercise.primaryMuscle),
    ),
    equipment: uniqueSorted(exercises.map((exercise) => exercise.equipment)),
  };
}

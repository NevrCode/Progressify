/**
 * The summary every list, filter, and heatmap path needs.
 *
 * Prose and image references live in {@link CatalogExerciseDetail} instead —
 * they are ~74% of the raw catalog and are only read by the detail screen.
 */
export type CatalogExercise = {
  id: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string | null;
  level: string | null;
  mechanic: string | null;
  force: string | null;
  category: string;
};

export type CatalogExerciseDetail = {
  instructions: string[];
  imagePaths: string[];
};

export type ExerciseCatalogDetails = {
  schemaVersion: 1;
  details: Record<string, CatalogExerciseDetail>;
};

export type ExerciseCatalog = {
  schemaVersion: 1;
  source: {
    name: string;
    url: string;
    repository: string;
    license: string;
  };
  exerciseCount: number;
  exercises: CatalogExercise[];
};

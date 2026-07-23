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
  instructions: string[];
  imagePaths: string[];
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

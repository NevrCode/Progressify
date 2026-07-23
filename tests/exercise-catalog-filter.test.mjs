import assert from "node:assert/strict";
import { test } from "node:test";

import {
  filterCatalogExercises,
  getCatalogFilterOptions,
} from "../src/utils/exercise-catalog-filter.ts";

const exercises = [
  {
    id: "bench",
    name: "Bench Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps"],
    equipment: "barbell",
  },
  {
    id: "curl",
    name: "Hammer Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "dumbbell",
  },
];

test("catalog search matches names, muscles, and equipment", () => {
  assert.deepEqual(
    filterCatalogExercises(exercises, { query: "press" }).map(({ id }) => id),
    ["bench"],
  );
  assert.deepEqual(
    filterCatalogExercises(exercises, { query: "forearm" }).map(({ id }) => id),
    ["curl"],
  );
  assert.deepEqual(
    filterCatalogExercises(exercises, { query: "barbell" }).map(({ id }) => id),
    ["bench"],
  );
});

test("catalog filters combine muscle and equipment", () => {
  assert.deepEqual(
    filterCatalogExercises(exercises, {
      primaryMuscle: "chest",
      equipment: "dumbbell",
    }),
    [],
  );
});

test("catalog facets are unique and sorted", () => {
  assert.deepEqual(getCatalogFilterOptions(exercises), {
    primaryMuscles: ["biceps", "chest"],
    equipment: ["barbell", "dumbbell"],
  });
});

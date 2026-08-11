import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildCatalog,
  buildCatalogBundle,
  transformExercise,
} from "../scripts/build-exercise-catalog.mjs";

const sourceExercise = {
  id: "Bench_Press",
  name: " Bench Press ",
  force: "push",
  level: "intermediate",
  mechanic: "compound",
  equipment: "barbell",
  primaryMuscles: ["chest"],
  secondaryMuscles: ["triceps", "shoulders"],
  instructions: ["Unrack the bar.", "Press the bar."],
  category: "strength",
  images: ["Bench_Press/0.jpg"],
};

test("transformExercise maps the vendor schema to the Progressify schema", () => {
  assert.deepEqual(transformExercise(sourceExercise), {
    id: "Bench_Press",
    name: "Bench Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
    equipment: "barbell",
    level: "intermediate",
    mechanic: "compound",
    force: "push",
    category: "strength",
    instructions: ["Unrack the bar.", "Press the bar."],
    imagePaths: ["Bench_Press/0.jpg"],
  });
});

test("buildCatalog keeps strength exercises, sorts them, and records provenance", () => {
  const catalog = buildCatalog([
    sourceExercise,
    { ...sourceExercise, id: "Arnold_Press", name: "Arnold Press" },
    { ...sourceExercise, id: "Stretch", category: "stretching" },
  ]);

  assert.equal(catalog.exerciseCount, 2);
  assert.deepEqual(
    catalog.exercises.map((exercise) => exercise.id),
    ["Arnold_Press", "Bench_Press"],
  );
  assert.equal(catalog.source.license, "Unlicense");
});

test("buildCatalog rejects duplicate source identifiers", () => {
  assert.throws(
    () => buildCatalog([sourceExercise, sourceExercise]),
    /Duplicate exercise id/u,
  );
});

test("buildCatalogBundle keeps prose and images out of the catalog artefact", () => {
  const { catalog } = buildCatalogBundle([sourceExercise]);

  assert.deepEqual(catalog.exercises, [
    {
      id: "Bench_Press",
      name: "Bench Press",
      primaryMuscle: "chest",
      secondaryMuscles: ["triceps", "shoulders"],
      equipment: "barbell",
      level: "intermediate",
      mechanic: "compound",
      force: "push",
      category: "strength",
    },
  ]);
});

test("buildCatalogBundle moves prose and images into the details artefact", () => {
  const { details } = buildCatalogBundle([sourceExercise]);

  assert.deepEqual(details, {
    schemaVersion: 1,
    details: {
      Bench_Press: {
        instructions: ["Unrack the bar.", "Press the bar."],
        imagePaths: ["Bench_Press/0.jpg"],
      },
    },
  });
});

test("buildCatalogBundle keys details by every catalog id", () => {
  const { catalog, details } = buildCatalogBundle([
    sourceExercise,
    { ...sourceExercise, id: "Arnold_Press", name: "Arnold Press" },
  ]);

  assert.deepEqual(
    catalog.exercises.map((exercise) => exercise.id).sort(),
    Object.keys(details.details).sort(),
  );
});

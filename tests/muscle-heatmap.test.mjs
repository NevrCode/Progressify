import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  calculateWeeklyMuscleVolume,
  CATALOG_MUSCLES,
  CATALOG_MUSCLE_TO_BODY_SLUGS,
  getMuscleIntensity,
  MUSCLE_INTENSITY_COLORS,
} from "../src/utils/muscle-heatmap.ts";

const catalog = JSON.parse(
  readFileSync(
    new URL("../src/data/exercise-catalog.generated.json", import.meta.url),
    "utf8",
  ),
);

const benchPress = {
  id: "Bench_Press",
  name: "Bench Press",
  primaryMuscle: "chest",
  secondaryMuscles: ["shoulders", "triceps"],
  equipment: "barbell",
  level: "intermediate",
  mechanic: "compound",
  force: "push",
  category: "strength",
  instructions: [],
  imagePaths: [],
};

const sets = (count) =>
  Array.from({ length: count }, (_, index) => ({
    set_number: index + 1,
    weight: 50,
    reps: 10,
  }));

test("attributes full primary and half secondary set equivalents", () => {
  const result = calculateWeeklyMuscleVolume({
    exercises: [
      {
        id: 1,
        catalog_exercise_id: benchPress.id,
        exercise_sessions: [
          { id: 1, session_date: "2026-07-23", sets: sets(4) },
        ],
      },
    ],
    catalogById: new Map([[benchPress.id, benchPress]]),
    now: new Date("2026-07-23T12:00:00.000Z"),
  });

  assert.equal(result.muscleTotals.chest, 4);
  assert.equal(result.muscleTotals.shoulders, 2);
  assert.equal(result.muscleTotals.triceps, 2);
  assert.equal(result.bodyRegionTotals.chest, 4);
  assert.equal(result.bodyRegionTotals.deltoids, 2);
  assert.equal(result.unmappedExerciseCount, 0);
});

test("uses seven UTC calendar dates and excludes future sessions", () => {
  const result = calculateWeeklyMuscleVolume({
    exercises: [
      {
        id: 1,
        catalog_exercise_id: benchPress.id,
        exercise_sessions: [
          { id: 1, session_date: "2026-07-17", sets: sets(1) },
          { id: 2, session_date: "2026-07-16", sets: sets(10) },
          { id: 3, session_date: "2026-07-24", sets: sets(10) },
          { id: 4, session_date: "not-a-date", sets: sets(10) },
        ],
      },
    ],
    catalogById: new Map([[benchPress.id, benchPress]]),
    now: new Date("2026-07-23T12:00:00.000Z"),
  });

  assert.equal(result.muscleTotals.chest, 1);
});

test("supports exact canonical custom muscles without substring guessing", () => {
  const result = calculateWeeklyMuscleVolume({
    exercises: [
      {
        id: 1,
        muscle_group: "  LATS ",
        exercise_sessions: [
          { id: 1, session_date: "2026-07-23", sets: sets(3) },
        ],
      },
      {
        id: 2,
        muscle_group: "back and arms",
        exercise_sessions: [
          { id: 2, session_date: "2026-07-23", sets: sets(20) },
        ],
      },
    ],
    catalogById: new Map(),
    now: new Date("2026-07-23T12:00:00.000Z"),
  });

  assert.equal(result.muscleTotals.lats, 3);
  assert.equal(result.bodyRegionTotals["upper-back"], 3);
  assert.equal(result.unmappedExerciseCount, 1);
});

test("uses neutral, orange, amber, and green threshold boundaries", () => {
  assert.deepEqual(MUSCLE_INTENSITY_COLORS, [
    "#F2994A",
    "#F2C94C",
    "#27AE60",
  ]);
  assert.equal(getMuscleIntensity(0), 0);
  assert.equal(getMuscleIntensity(4), 1);
  assert.equal(getMuscleIntensity(4.5), 2);
  assert.equal(getMuscleIntensity(12), 2);
  assert.equal(getMuscleIntensity(12.5), 3);
});

test("declares a mapping or intentional null for every bundled catalog muscle", () => {
  const sourceMuscles = new Set(
    catalog.exercises.flatMap((exercise) => [
      exercise.primaryMuscle,
      ...exercise.secondaryMuscles,
    ]),
  );

  assert.deepEqual([...sourceMuscles].sort(), [...CATALOG_MUSCLES].sort());
  for (const muscle of sourceMuscles) {
    assert.ok(muscle in CATALOG_MUSCLE_TO_BODY_SLUGS);
  }
  assert.equal(CATALOG_MUSCLE_TO_BODY_SLUGS.abductors, null);
});

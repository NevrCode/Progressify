/// <reference types="jest" />

import {
  catalogExercises,
  getExerciseDetail,
} from "@/data/exercise-catalog";

describe("exercise catalog data", () => {
  it("keeps prose and image references out of the always-loaded catalog", () => {
    // The split is the whole point of the two-file layout: if these fields come
    // back, the list path pays for the detail payload again.
    for (const exercise of catalogExercises) {
      expect(exercise).not.toHaveProperty("instructions");
      expect(exercise).not.toHaveProperty("imagePaths");
    }
  });

  it("still exposes the fields the list and filter paths depend on", () => {
    const [exercise] = catalogExercises;

    expect(exercise).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        primaryMuscle: expect.any(String),
        secondaryMuscles: expect.any(Array),
        category: expect.any(String),
      }),
    );
  });

  it("resolves a detail entry for every catalog id", () => {
    // Unknown ids fall back to one shared empty object, so identity against
    // that fallback is what distinguishes "missing entry" from "entry that
    // happens to be empty". Guards against the two files drifting apart.
    const fallback = getExerciseDetail("not-a-real-exercise");
    const unresolved = catalogExercises
      .filter((exercise) => getExerciseDetail(exercise.id) === fallback)
      .map((exercise) => exercise.id);

    expect(unresolved).toEqual([]);
  });

  it("carries instructions for the overwhelming majority of exercises", () => {
    const withoutInstructions = catalogExercises.filter(
      (exercise) => getExerciseDetail(exercise.id).instructions.length === 0,
    );

    // Four upstream entries genuinely have none; the preview screen renders its
    // "no instructions" fallback for those. A sharp rise means a build bug.
    expect(withoutInstructions.length).toBeLessThan(10);
  });

  it("returns an empty detail rather than throwing for an unknown id", () => {
    expect(getExerciseDetail("not-a-real-exercise")).toEqual({
      instructions: [],
      imagePaths: [],
    });
  });

  it("returns a stable reference on repeated lookups", () => {
    const id = catalogExercises[0].id;

    expect(getExerciseDetail(id)).toBe(getExerciseDetail(id));
  });
});

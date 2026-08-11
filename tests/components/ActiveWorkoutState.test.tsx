/// <reference types="jest" />

import {
  type ActiveWorkoutExerciseState,
  addActiveWorkoutExercise,
  removeActiveWorkoutExercise,
  swapActiveWorkoutExercise,
} from "@/features/workout-session/active-workout-state";
import type { ExerciseDraft } from "@/features/workout-session/drafts";

const draft = (exerciseId: number): ExerciseDraft =>
  ({
    exerciseId,
    startedAt: "2026-08-11T00:00:00.000Z",
    sets: [
      {
        localId: `set-${exerciseId}`,
        set_number: 1,
        weight: "60",
        reps: "8",
        rir: "2",
        set_type: "WORKING",
        completed: false,
      },
    ],
  }) as unknown as ExerciseDraft;

const state = (): ActiveWorkoutExerciseState => ({
  exerciseIds: [1, 2, 3],
  drafts: { 1: draft(1), 2: draft(2), 3: draft(3) },
  completedIds: new Set([2]),
});

describe("active workout exercise state", () => {
  it("drops an exercise's id, draft, and completion together", () => {
    const next = removeActiveWorkoutExercise(state(), 2);

    expect(next.exerciseIds).toEqual([1, 3]);
    expect(Object.keys(next.drafts)).toEqual(["1", "3"]);
    expect(next.completedIds.has(2)).toBe(false);
  });

  it("leaves the other drafts referentially identical when removing", () => {
    const before = state();
    const next = removeActiveWorkoutExercise(before, 2);

    // This is what keeps the memoized exercise cards from re-rendering.
    expect(next.drafts[1]).toBe(before.drafts[1]);
    expect(next.drafts[3]).toBe(before.drafts[3]);
  });

  it("does not mutate the input state when removing", () => {
    const before = state();
    removeActiveWorkoutExercise(before, 2);

    expect(before.exerciseIds).toEqual([1, 2, 3]);
    expect(before.completedIds.has(2)).toBe(true);
    expect(before.drafts[2]).toBeTruthy();
  });

  it("appends an added exercise with an empty draft", () => {
    const next = addActiveWorkoutExercise(state(), 4);

    expect(next.exerciseIds).toEqual([1, 2, 3, 4]);
    expect(next.drafts[4].exerciseId).toBe(4);
  });

  it("treats adding an exercise already in the session as a no-op", () => {
    const before = state();

    expect(addActiveWorkoutExercise(before, 2)).toBe(before);
  });

  it("replaces the id and discards the old unsaved draft when swapping", () => {
    const next = swapActiveWorkoutExercise(state(), 2, 9);

    expect(next.exerciseIds).toEqual([1, 9, 3]);
    expect(next.drafts[2]).toBeUndefined();
    expect(next.drafts[9].exerciseId).toBe(9);
    // A fresh draft: one blank set, none of the replaced exercise's entries.
    expect(next.drafts[9].sets).toHaveLength(1);
    expect(next.drafts[9].sets[0]).toMatchObject({
      weight: "0",
      reps: "0",
      completed: false,
    });
  });

  it("clears the completion flag of the replaced exercise", () => {
    const next = swapActiveWorkoutExercise(state(), 2, 9);

    expect(next.completedIds.has(2)).toBe(false);
    expect(next.completedIds.has(9)).toBe(false);
  });

  it("preserves position when swapping rather than appending", () => {
    const next = swapActiveWorkoutExercise(state(), 1, 9);

    expect(next.exerciseIds).toEqual([9, 2, 3]);
  });

  it("refuses to swap to an exercise already in the session", () => {
    // The inline version this replaced had no such guard and would have
    // produced a duplicate id.
    const before = state();

    expect(swapActiveWorkoutExercise(before, 1, 3)).toBe(before);
  });

  it("refuses to swap an exercise that is not in the session", () => {
    const before = state();

    expect(swapActiveWorkoutExercise(before, 99, 4)).toBe(before);
  });

  it("refuses to swap an exercise for itself", () => {
    const before = state();

    expect(swapActiveWorkoutExercise(before, 2, 2)).toBe(before);
  });
});

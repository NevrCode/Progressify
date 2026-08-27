/// <reference types="jest" />

import type { DraftSet, ExerciseDraft } from "@/features/workout-session/drafts";
import { summarizeWorkoutTotals } from "@/features/workout-session/workout-totals";

const set = (partial: Partial<DraftSet>): DraftSet =>
  ({
    localId: "s",
    set_number: 1,
    weight: "0",
    reps: "0",
    rir: "2",
    set_type: "WORKING",
    completed: true,
    ...partial,
  }) as unknown as DraftSet;

const draft = (exerciseId: number, sets: DraftSet[]): ExerciseDraft =>
  ({
    exerciseId,
    startedAt: "2026-08-11T00:00:00.000Z",
    sets,
  }) as unknown as ExerciseDraft;

describe("summarizeWorkoutTotals", () => {
  it("sums working sets and volume across exercises", () => {
    const totals = summarizeWorkoutTotals([1, 2], {
      1: draft(1, [
        set({ weight: "100", reps: "5" }),
        set({ weight: "100", reps: "4" }),
      ]),
      2: draft(2, [set({ weight: "50", reps: "10" })]),
    });

    expect(totals.totalSets).toBe(3);
    expect(totals.totalVolume).toBe(1400);
  });

  it("excludes non-working sets from both totals", () => {
    const totals = summarizeWorkoutTotals([1], {
      1: draft(1, [
        set({ weight: "20", reps: "10", set_type: "WARMUP" }),
        set({ weight: "100", reps: "5" }),
        set({ weight: "60", reps: "8", set_type: undefined }),
      ]),
    });

    expect(totals.totalSets).toBe(1);
    expect(totals.totalVolume).toBe(500);
  });

  it("treats blank and unparseable entries as zero volume but still counts the set", () => {
    const totals = summarizeWorkoutTotals([1], {
      1: draft(1, [set({ weight: "", reps: "8" }), set({ weight: "abc", reps: "5" })]),
    });

    expect(totals.totalSets).toBe(2);
    expect(totals.totalVolume).toBe(0);
  });

  it("counts bodyweight sets as sets with zero volume", () => {
    const totals = summarizeWorkoutTotals([1], {
      1: draft(1, [set({ weight: "0", reps: "12" })]),
    });

    expect(totals).toEqual({ totalSets: 1, totalVolume: 0 });
  });

  it("skips exercise ids that have no draft", () => {
    const totals = summarizeWorkoutTotals([1, 99], {
      1: draft(1, [set({ weight: "10", reps: "10" })]),
    });

    expect(totals).toEqual({ totalSets: 1, totalVolume: 100 });
  });

  it("returns zeroes for an empty session", () => {
    expect(summarizeWorkoutTotals([], {})).toEqual({
      totalSets: 0,
      totalVolume: 0,
    });
  });
});

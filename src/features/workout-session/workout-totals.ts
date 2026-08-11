import type { ExerciseDraft } from "./drafts";

export type WorkoutTotals = {
  totalSets: number;
  totalVolume: number;
};

/**
 * Summary shown on the completion screen. Only WORKING sets count — warmups and
 * dropsets are logged but must not inflate the session's volume.
 */
export function summarizeWorkoutTotals(
  exerciseIds: number[],
  drafts: Record<number, ExerciseDraft>,
): WorkoutTotals {
  let totalSets = 0;
  let totalVolume = 0;

  for (const exerciseId of exerciseIds) {
    const draft = drafts[exerciseId];
    if (!draft) continue;

    for (const set of draft.sets) {
      if (set.set_type !== "WORKING") continue;
      totalSets += 1;
      totalVolume +=
        (parseFloat(set.weight) || 0) * (parseFloat(set.reps) || 0);
    }
  }

  return { totalSets, totalVolume };
}

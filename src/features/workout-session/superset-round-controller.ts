import type { DraftSet, ExerciseDraft } from "./drafts";

export type ActiveSupersetSnapshot = {
  id: string;
  restAfterRoundSeconds?: number | null;
  memberExerciseIds: number[];
};

export type ActiveWorkoutLayoutSnapshot = {
  layoutRevision?: number | null;
  groups: ActiveSupersetSnapshot[];
};

export type SupersetRestDecision =
  | { kind: "none" }
  | { kind: "start"; groupId: string; round: number; durationSeconds: number };

const workingSets = (draft: ExerciseDraft | undefined) =>
  (draft?.sets ?? []).filter((set) => set.set_type === "WORKING");

/**
 * Decides whether completion changed a superset round from incomplete to
 * complete. It has no UI/timer state, which makes out-of-order taps and rapid
 * duplicate gestures deterministic. Warm-ups deliberately never enter a round.
 */
export const getSupersetRestDecision = (
  layout: ActiveWorkoutLayoutSnapshot | undefined,
  draftsBefore: Record<number, ExerciseDraft>,
  completedExerciseId: number,
  completedSet: DraftSet,
  restSecondsByExercise: Record<number, number> | undefined,
  fallbackRestSeconds: number,
): SupersetRestDecision => {
  if (completedSet.set_type !== "WORKING") return { kind: "none" };
  const group = layout?.groups.find((candidate) =>
    candidate.memberExerciseIds.includes(completedExerciseId),
  );
  if (!group) return { kind: "none" };

  const round = workingSets(draftsBefore[completedExerciseId]).findIndex(
    (set) => set.localId === completedSet.localId,
  );
  if (round < 0) return { kind: "none" };

  const beforeComplete = group.memberExerciseIds.every((exerciseId) => {
    const set = workingSets(draftsBefore[exerciseId])[round];
    return !set || set.completed;
  });
  if (beforeComplete) return { kind: "none" };

  const becomesComplete = group.memberExerciseIds.every((exerciseId) => {
    const set = workingSets(draftsBefore[exerciseId])[round];
    return !set || (exerciseId === completedExerciseId ? true : set.completed);
  });
  if (!becomesComplete) return { kind: "none" };

  const configured = group.restAfterRoundSeconds;
  return {
    kind: "start",
    groupId: group.id,
    round,
    durationSeconds:
      typeof configured === "number"
        ? configured
        : restSecondsByExercise?.[completedExerciseId] ?? fallbackRestSeconds,
  };
};

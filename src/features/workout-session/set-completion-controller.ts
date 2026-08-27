import type { DraftSet } from "./drafts";

export type SetCompletionResult = "completed" | "invalid" | "already-completed";

const hasMeaningfulLoad = (set: DraftSet) => {
  const weight = Number(set.weight);
  const reps = Number(set.reps);
  return Number.isFinite(weight) && weight > 0 && Number.isFinite(reps) && reps > 0;
};

/**
 * Claims a local set identity synchronously before running completion effects.
 * React state can lag behind rapid gestures, so the claim is the source of
 * truth for exactly-once rest-timer starts within the mounted workout.
 */
export const completeDraftSetOnce = (
  claimedLocalIds: Set<string>,
  set: DraftSet,
  onComplete: () => void,
  onStartRest: () => void,
): SetCompletionResult => {
  if (set.completed || claimedLocalIds.has(set.localId)) {
    return "already-completed";
  }
  if (!hasMeaningfulLoad(set)) return "invalid";

  claimedLocalIds.add(set.localId);
  onComplete();
  onStartRest();
  return "completed";
};

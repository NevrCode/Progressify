import { createEmptyExerciseDraft, type ExerciseDraft } from "./drafts";

export type ActiveWorkoutExerciseState = {
  exerciseIds: number[];
  drafts: Record<number, ExerciseDraft>;
  completedIds: ReadonlySet<number>;
};

const withoutDraft = (
  drafts: Record<number, ExerciseDraft>,
  exerciseId: number,
) => {
  const next = { ...drafts };
  delete next[exerciseId];
  return next;
};

/** One atomic local transition when an exercise is removed from an active workout. */
export const removeActiveWorkoutExercise = (
  state: ActiveWorkoutExerciseState,
  exerciseId: number,
): ActiveWorkoutExerciseState => {
  const completedIds = new Set(state.completedIds);
  completedIds.delete(exerciseId);
  return {
    exerciseIds: state.exerciseIds.filter((id) => id !== exerciseId),
    drafts: withoutDraft(state.drafts, exerciseId),
    completedIds,
  };
};

/** Adds a new exercise only when it is not already in this workout. */
export const addActiveWorkoutExercise = (
  state: ActiveWorkoutExerciseState,
  exerciseId: number,
): ActiveWorkoutExerciseState => {
  if (state.exerciseIds.includes(exerciseId)) return state;
  return {
    ...state,
    exerciseIds: [...state.exerciseIds, exerciseId],
    drafts: {
      ...state.drafts,
      [exerciseId]: createEmptyExerciseDraft(exerciseId),
    },
  };
};

/** Replaces one exercise and discards its unsaved local draft. */
export const swapActiveWorkoutExercise = (
  state: ActiveWorkoutExerciseState,
  oldExerciseId: number,
  newExerciseId: number,
): ActiveWorkoutExerciseState => {
  if (oldExerciseId === newExerciseId || !state.exerciseIds.includes(oldExerciseId) || state.exerciseIds.includes(newExerciseId)) {
    return state;
  }
  const completedIds = new Set(state.completedIds);
  completedIds.delete(oldExerciseId);
  return {
    exerciseIds: state.exerciseIds.map((id) => id === oldExerciseId ? newExerciseId : id),
    drafts: {
      ...withoutDraft(state.drafts, oldExerciseId),
      [newExerciseId]: createEmptyExerciseDraft(newExerciseId),
    },
    completedIds,
  };
};

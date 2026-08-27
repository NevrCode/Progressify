import type { WorkoutSetType } from "@/types/workout-set";

type CanonicalSetInput = {
  id?: number;
  setNumber: number;
  weightKg: string;
  reps: string;
  rir: string;
  setType: WorkoutSetType;
};

/**
 * The UI may render pounds, but its state is converted to kg before this
 * boundary. This keeps every GymExerciseSessionRequestDTO canonical.
 */
export const buildCanonicalWorkoutSetRequest = ({
  id,
  setNumber,
  weightKg,
  reps,
  rir,
  setType,
}: CanonicalSetInput) => ({
  id,
  set_number: setNumber,
  weight: Number(weightKg),
  reps: Number(reps),
  rir: Number(rir || 0),
  set_type: setType,
});

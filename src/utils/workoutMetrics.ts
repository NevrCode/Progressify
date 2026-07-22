export const calculateWorkoutVolume = (weight: number, reps: number) =>
  weight * reps;

export const calculateEstimatedOneRepMax = (weight: number, reps: number) =>
  weight * (1 + reps / 30);

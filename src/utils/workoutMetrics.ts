export const calculateWorkoutVolume = (weight: number, reps: number) =>
  weight * reps;

export const calculateWorkingSetVolume = <
  T extends { weight: number; reps: number; set_type?: unknown },
>(sets: T[]) =>
  sets
    .filter((set) => set.set_type !== "WARMUP")
    .reduce(
      (total, set) => total + calculateWorkoutVolume(set.weight, set.reps),
      0,
    );

export const calculateEstimatedOneRepMax = (weight: number, reps: number) =>
  weight * (1 + reps / 30);

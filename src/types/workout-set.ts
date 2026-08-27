export const WORKOUT_SET_TYPES = ["WORKING", "WARMUP"] as const;

export type WorkoutSetType = (typeof WORKOUT_SET_TYPES)[number];

/** Legacy and malformed values are treated as working sets for compatibility. */
export const normalizeWorkoutSetType = (value: unknown): WorkoutSetType =>
  value === "WARMUP" ? "WARMUP" : "WORKING";

export const isWorkingSet = (set: { set_type?: unknown }) =>
  normalizeWorkoutSetType(set.set_type) === "WORKING";

export const withNormalizedWorkoutSetType = <T extends { set_type?: unknown }>(
  set: T,
): Omit<T, "set_type"> & { set_type: WorkoutSetType } => ({
  ...set,
  set_type: normalizeWorkoutSetType(set.set_type),
});

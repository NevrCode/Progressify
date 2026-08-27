import type {
  ExerciseProgressionDTO,
  ExerciseSessionDTO,
  WorkoutSetDTO,
} from "@/services/gymService";
import { normalizeWorkoutSetType, type WorkoutSetType } from "@/types/workout-set";
import { isWorkingSet } from "@/types/workout-set";
import {
  calculateEstimatedOneRepMax,
  calculateWorkingSetVolume,
} from "@/utils/workoutMetrics";

export type EditableSet = {
  localId: string;
  id?: number;
  set_number: string;
  weight: string;
  reps: string;
  rir: string;
  set_type: WorkoutSetType;
};

export type SessionPoint = {
  sessionDate: string;
  estimated1RM: number;
  topWeight: number;
  bestReps: number;
  totalSets: number;
  totalVolume: number;
};

export const getExerciseName = (exercise?: ExerciseProgressionDTO) =>
  exercise?.name ?? "Exercise";

export const getSessionSets = (session: ExerciseSessionDTO) =>
  session.sets ?? [];

export const getSessionDate = (session: ExerciseSessionDTO) =>
  session.session_date ?? "";

export const formatDateForDisplay = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const toDateSortValue = (value?: string) => {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

export const buildSessionPoints = (
  sessions: ExerciseSessionDTO[],
): SessionPoint[] =>
  sessions
    .map((session) => {
      const sessionDate = getSessionDate(session);
      const sets = getSessionSets(session).filter(isWorkingSet);

      if (!sessionDate || !sets.length) return null;

      const topSet = sets.reduce((best, current) => {
        if (current.weight > best.weight) return current;
        if (current.weight === best.weight && current.reps > best.reps) {
          return current;
        }
        return best;
      }, sets[0]);
      const totalVolume = calculateWorkingSetVolume(sets);

      return {
        sessionDate,
        estimated1RM: calculateEstimatedOneRepMax(topSet.weight, topSet.reps),
        topWeight: topSet.weight,
        bestReps: topSet.reps,
        totalSets: sets.length,
        totalVolume,
      };
    })
    .filter((point): point is SessionPoint => point !== null)
    .sort(
      (first, second) =>
        toDateSortValue(first.sessionDate) -
        toDateSortValue(second.sessionDate),
    );

export const createEditableSet = (
  set: WorkoutSetDTO,
  index: number,
): EditableSet => ({
  localId: `${set.id ?? "new"}-${index}-${Date.now()}`,
  id: set.id,
  set_number: String(set.set_number ?? index + 1),
  weight: String(set.weight ?? ""),
  reps: String(set.reps ?? ""),
  rir: String(set.rir ?? 0),
  set_type: normalizeWorkoutSetType(set.set_type),
});

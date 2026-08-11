import {
  parseActiveWorkoutLayoutSnapshot,
  parsePlannedExerciseRestSeconds,
  type ActiveWorkoutLayoutSnapshot,
} from "./drafts";

export type ActiveWorkoutRouteParams = {
  exerciseIds?: string;
  workoutSessionId?: string;
  routineName?: string;
  plannedExerciseMap?: string;
  plannedExerciseRestMap?: string;
  activeWorkoutLayout?: string;
};

export type ActiveWorkoutRouteLaunch = {
  exerciseIds: number[];
  workoutSessionId: number | null;
  routineName?: string;
  plannedExerciseIds: Record<number, number>;
  plannedExerciseRestSeconds: Record<number, number>;
  layoutSnapshot?: ActiveWorkoutLayoutSnapshot;
};

const parseJson = (value: string | undefined): unknown | undefined => {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const parseExerciseIds = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

const parsePlannedExerciseIds = (value: unknown): Record<number, number> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value).reduce<Record<number, number>>((result, [key, rawId]) => {
    const exerciseId = Number(key);
    const plannedExerciseId = Number(rawId);
    if (Number.isInteger(exerciseId) && exerciseId > 0 && Number.isInteger(plannedExerciseId) && plannedExerciseId > 0) {
      result[exerciseId] = plannedExerciseId;
    }
    return result;
  }, {});
};

/**
 * The route boundary for an active workout. Invalid optional metadata is
 * deliberately ignored, so a deep link can still start a manual workout.
 */
export const parseActiveWorkoutRouteLaunch = (
  params: ActiveWorkoutRouteParams,
): ActiveWorkoutRouteLaunch => {
  const rawWorkoutSessionId = Number(params.workoutSessionId);
  const plannedExerciseIds = parsePlannedExerciseIds(parseJson(params.plannedExerciseMap));
  const plannedExerciseRestSeconds = parsePlannedExerciseRestSeconds(
    parseJson(params.plannedExerciseRestMap),
  ) ?? {};
  const layoutSnapshot = parseActiveWorkoutLayoutSnapshot(
    parseJson(params.activeWorkoutLayout),
  ) ?? undefined;

  return {
    exerciseIds: parseExerciseIds(params.exerciseIds),
    workoutSessionId: Number.isInteger(rawWorkoutSessionId) && rawWorkoutSessionId > 0
      ? rawWorkoutSessionId
      : null,
    routineName: params.routineName,
    plannedExerciseIds,
    plannedExerciseRestSeconds,
    layoutSnapshot,
  };
};

import type {
  ActiveWorkoutExerciseSnapshot,
  ActiveWorkoutLayoutSnapshot,
} from "./drafts";

/**
 * The slice of a persisted session that survives a crash or app restart.
 *
 * This is one value with one lifecycle: it is absent until hydration reads
 * storage, then present. Keeping it as a single object rather than a spread of
 * independent state slots means the screen can never observe a half-restored
 * session.
 */
export type RestoredSession = {
  exerciseIds: number[];
  workoutSessionId: number | null;
  routineName: string | null;
  plannedExerciseIds: Record<number, number>;
  plannedExerciseRestSeconds: Record<number, number>;
  layoutSnapshot?: ActiveWorkoutLayoutSnapshot;
  exerciseSnapshots?: Record<number, ActiveWorkoutExerciseSnapshot>;
};

/** The same fields as they arrive from navigation params. */
export type RouteSession = {
  workoutSessionId: number | null;
  routineName?: string;
  plannedExerciseIds: Record<number, number>;
  plannedExerciseRestSeconds: Record<number, number>;
  layoutSnapshot?: ActiveWorkoutLayoutSnapshot;
};

export type ActiveSession = {
  restoredExerciseIds: number[];
  workoutSessionId: number | null;
  routineName?: string;
  plannedExerciseIds: Record<number, number>;
  plannedExerciseRestSeconds: Record<number, number>;
  layoutSnapshot?: ActiveWorkoutLayoutSnapshot;
  exerciseSnapshots?: Record<number, ActiveWorkoutExerciseSnapshot>;
};

const NO_EXERCISE_IDS: number[] = [];
const NO_PLANNED_EXERCISE_IDS: Record<number, number> = {};

/**
 * Decides which session values win: a restored session, or the route params.
 *
 * The precedence rules are deliberately not uniform, and each one is load
 * bearing:
 *
 * - `workoutSessionId`, `routineName`, `layoutSnapshot` — nullish coalescing, so
 *   a restored session that genuinely lacks the value defers to the route.
 * - `plannedExerciseIds`, `plannedExerciseRestSeconds` — emptiness, not
 *   nullishness. A restored session stores `{}` when it has no planned
 *   exercises, and `{}` must defer to the route rather than blanking it.
 * - `exerciseSnapshots` — restored only. The route never carries snapshots, so
 *   there is nothing to fall back to.
 */
export function resolveActiveSession(
  restored: RestoredSession | null,
  route: RouteSession,
): ActiveSession {
  return {
    restoredExerciseIds: restored?.exerciseIds ?? NO_EXERCISE_IDS,
    workoutSessionId: restored?.workoutSessionId ?? route.workoutSessionId,
    routineName: restored?.routineName ?? route.routineName,
    plannedExerciseIds: Object.keys(
      restored?.plannedExerciseIds ?? NO_PLANNED_EXERCISE_IDS,
    ).length
      ? (restored?.plannedExerciseIds ?? NO_PLANNED_EXERCISE_IDS)
      : route.plannedExerciseIds,
    plannedExerciseRestSeconds: Object.keys(
      restored?.plannedExerciseRestSeconds ?? NO_PLANNED_EXERCISE_IDS,
    ).length
      ? (restored?.plannedExerciseRestSeconds ?? NO_PLANNED_EXERCISE_IDS)
      : route.plannedExerciseRestSeconds,
    layoutSnapshot: restored?.layoutSnapshot ?? route.layoutSnapshot,
    exerciseSnapshots: restored?.exerciseSnapshots,
  };
}

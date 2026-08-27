import type {
  CompletedWorkoutSnapshotDTO,
  StartedWorkoutDTO,
} from "@/services/workoutProgramService";
import type {
  ActiveSessionDraft,
  ActiveWorkoutExerciseSnapshot,
  ActiveWorkoutLayoutSnapshot,
  DraftSet,
  ExerciseDraft,
} from "./drafts";

type RepeatClock = {
  now?: () => number;
  random?: () => number;
};

const localId = (exerciseId: number, setNumber: number, index: number, clock?: RepeatClock) =>
  `${(clock?.now ?? Date.now)()}-${exerciseId}-${setNumber}-${index}-${Math.floor((clock?.random ?? Math.random)() * 1_000_000)}`;

const orderedExercises = (snapshot: CompletedWorkoutSnapshotDTO) =>
  [...snapshot.exercises].sort((left, right) => left.position - right.position ||
    left.planned_exercise_id - right.planned_exercise_id);

const toExerciseSnapshot = (
  exercise: CompletedWorkoutSnapshotDTO["exercises"][number],
): ActiveWorkoutExerciseSnapshot => ({
  id: exercise.exercise_progression_id,
  name: exercise.exercise_name,
  muscleGroup: exercise.muscle_group ?? "",
  catalogExerciseId: exercise.catalog_exercise_id,
  targetRepMin: exercise.target_rep_min,
  targetRepMax: exercise.target_rep_max,
  targetRIR: exercise.target_rir,
  notes: exercise.notes,
});

const repeatedSets = (
  exerciseId: number,
  sets: CompletedWorkoutSnapshotDTO["exercises"][number]["sets"],
  clock?: RepeatClock,
): DraftSet[] => sets
  .map((set, index) => ({ set, index }))
  .sort((left, right) => left.set.set_number - right.set.set_number || left.index - right.index)
  .map(({ set, index }) => ({
    localId: localId(exerciseId, set.set_number, index, clock),
    set_number: set.set_number,
    weight: String(set.weight),
    reps: String(set.reps),
    rir: String(set.rir),
    set_type: set.set_type,
    completed: false,
  }));

/**
 * The one repeat-hydration boundary. Only the immutable completion snapshot
 * supplies exercise order, names, set prefills, superset layout and rest.
 * The returned draft has fresh local identities and zero completed sets.
 */
export const createRepeatWorkoutLaunch = (
  snapshot: CompletedWorkoutSnapshotDTO,
  started: StartedWorkoutDTO,
  clock?: RepeatClock,
): ActiveSessionDraft => {
  if (snapshot.snapshot_version !== 1 || started.status !== "ACTIVE" ||
    started.id === snapshot.workout_session_id) {
    throw new Error("The completed workout cannot be repeated.");
  }

  const exercises = orderedExercises(snapshot);
  if (!exercises.length) throw new Error("The completed workout has no exercises to repeat.");
  const exerciseIds = exercises.map((exercise) => exercise.exercise_progression_id);
  if (new Set(exerciseIds).size !== exerciseIds.length) {
    throw new Error("The completed workout has duplicate exercise identities.");
  }
  const startedAt = new Date((clock?.now ?? Date.now)()).toISOString();
  const plannedExerciseIds: Record<number, number> = {};
  const plannedExerciseRestSeconds: Record<number, number> = {};
  const exerciseSnapshots: Record<number, ActiveWorkoutExerciseSnapshot> = {};
  const drafts: Record<number, ExerciseDraft> = {};

  for (const exercise of exercises) {
    const id = exercise.exercise_progression_id;
    plannedExerciseIds[id] = exercise.planned_exercise_id;
    plannedExerciseRestSeconds[id] = exercise.rest_seconds ?? 90;
    exerciseSnapshots[id] = toExerciseSnapshot(exercise);
    const sets = repeatedSets(id, exercise.sets, clock);
    drafts[id] = {
      exerciseId: id,
      startedAt,
      sets: sets.length ? sets : [{
        localId: localId(id, 1, 0, clock), set_number: 1, weight: "0", reps: "0", rir: "0",
        set_type: "WORKING", completed: false,
      }],
    };
  }

  const layoutSnapshot: ActiveWorkoutLayoutSnapshot = {
    groups: snapshot.exercise_groups.flatMap((group) => {
      const memberExerciseIds = exercises
        .filter((exercise) => exercise.group_id === group.id)
        .sort((left, right) => (left.group_member_position ?? 0) - (right.group_member_position ?? 0))
        .map((exercise) => exercise.exercise_progression_id);
      return memberExerciseIds.length >= 2 ? [{
        id: group.id,
        restAfterRoundSeconds: group.rest_after_round_seconds ?? null,
        memberExerciseIds,
      }] : [];
    }),
  };

  return {
    version: 4,
    workoutSessionId: started.id,
    routineName: snapshot.routine.name,
    plannedExerciseIds,
    plannedExerciseRestSeconds,
    layoutSnapshot,
    exerciseSnapshots,
    exerciseIds,
    startedAt,
    drafts,
    completedIds: [],
  };
};

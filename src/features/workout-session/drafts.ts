import type { WorkoutSetType } from "@/types/workout-set";

const normalizeWorkoutSetType = (value: unknown): WorkoutSetType =>
  value === "WARMUP" ? "WARMUP" : "WORKING";

const isWorkingSet = (set: { set_type?: unknown }) =>
  normalizeWorkoutSetType(set.set_type) === "WORKING";

export const ACTIVE_SESSION_DRAFT_VERSION = 4 as const;
export const DEFAULT_REST_SECONDS = 90;
export const MAX_REST_SECONDS = 60 * 60;

export type DraftSet = {
  localId: string;
  set_number: number;
  weight: string;
  reps: string;
  rir: string;
  set_type: WorkoutSetType;
  completed: boolean;
};

export type RemovedDraftSet = {
  exerciseId: number;
  set: DraftSet;
  index: number;
  replacementLocalId?: string;
};

export type ExerciseDraft = {
  exerciseId: number;
  startedAt: string;
  sets: DraftSet[];
};

/**
 * The subset of exercise history needed to build a new active-workout draft.
 * Keeping this structural avoids coupling the draft reducer to the API client.
 */
export type PriorWorkoutSet = {
  id?: number;
  set_number: number;
  weight: number;
  reps: number;
  rir?: number;
  set_type?: WorkoutSetType;
};

export type CompletedExerciseSession = {
  id?: number;
  session_date?: string;
  sets?: PriorWorkoutSet[];
};

export type ExerciseDraftHistory = {
  exercise_sessions?: CompletedExerciseSession[];
  last_workout_sets?: PriorWorkoutSet[];
};

/** A running timer stores an absolute deadline; a paused timer stores its remainder. */
export type RestTimerSnapshot = {
  paused: boolean;
  initialDuration: number;
  endsAt?: string;
  remainingSeconds?: number;
};

export type RestTimerSnapshotInput = {
  active: boolean;
  paused: boolean;
  initialDuration: number;
  remainingSeconds: number;
  endsAt: number | null;
};

export type RestTimerRestore = {
  paused: boolean;
  initialDuration: number;
  remainingSeconds: number;
  endsAt: number | null;
};

export type ActiveSessionDraft = {
  version: typeof ACTIVE_SESSION_DRAFT_VERSION;
  workoutSessionId?: number;
  routineName?: string;
  plannedExerciseIds?: Record<number, number>;
  /** Configured rest duration keyed by exercise progression id. */
  plannedExerciseRestSeconds?: Record<number, number>;
  /** Immutable routine/group arrangement captured when this workout started. */
  layoutSnapshot?: ActiveWorkoutLayoutSnapshot;
  /** Immutable exercise labels/settings for a snapshot-based repeat launch. */
  exerciseSnapshots?: Record<number, ActiveWorkoutExerciseSnapshot>;
  restTimer?: RestTimerSnapshot;
  exerciseIds: number[];
  startedAt: string;
  drafts: Record<number, ExerciseDraft>;
  completedIds: number[];
};

export type ActiveSupersetSnapshot = {
  id: string;
  restAfterRoundSeconds?: number | null;
  memberExerciseIds: number[];
};

export type ActiveWorkoutLayoutSnapshot = {
  layoutRevision?: number | null;
  groups: ActiveSupersetSnapshot[];
};

/** Immutable display fields captured by a snapshot-based repeat launch. */
export type ActiveWorkoutExerciseSnapshot = {
  id: number;
  name: string;
  muscleGroup: string;
  catalogExerciseId?: string | null;
  targetRepMin?: number | null;
  targetRepMax?: number | null;
  targetRIR?: number | null;
  notes?: string | null;
};

type DraftClock = {
  now?: () => number;
  random?: () => number;
};

const getTimestamp = (clock?: DraftClock) => (clock?.now ?? Date.now)();

const getRandomInt = (clock?: DraftClock) =>
  Math.floor((clock?.random ?? Math.random)() * 100);

const createDraftSet = (
  exerciseId: number,
  setNumber: number,
  clock?: DraftClock,
): DraftSet => {
  const timestamp = getTimestamp(clock);
  return {
    localId: `${timestamp}-${exerciseId}-${getRandomInt(clock)}`,
    set_number: setNumber,
    weight: "0",
    reps: "0",
    rir: "0",
    set_type: "WORKING",
    completed: false,
  };
};

export const createEmptyExerciseDraft = (
  exerciseId: number,
  clock?: DraftClock,
): ExerciseDraft => {
  const timestamp = getTimestamp(clock);
  return {
    exerciseId,
    startedAt: new Date(timestamp).toISOString(),
    sets: [createDraftSet(exerciseId, 1, clock)],
  };
};

const getSessionDateSortValue = (session: CompletedExerciseSession) =>
  session.session_date ?? "";

const getSessionIdSortValue = (session: CompletedExerciseSession) =>
  session.id ?? Number.MIN_SAFE_INTEGER;

const compareSessions = (
  left: CompletedExerciseSession,
  right: CompletedExerciseSession,
) => {
  const leftDate = getSessionDateSortValue(left);
  const rightDate = getSessionDateSortValue(right);
  if (leftDate !== rightDate) return leftDate < rightDate ? -1 : 1;

  return getSessionIdSortValue(left) - getSessionIdSortValue(right);
};

const getPreviousWorkoutSets = (
  history: ExerciseDraftHistory,
): PriorWorkoutSet[] => {
  const latestCompletedSession = [...(history.exercise_sessions ?? [])]
    .filter((session) => (session.sets?.length ?? 0) > 0)
    .sort(compareSessions)
    .at(-1);

  const sets = latestCompletedSession?.sets ?? history.last_workout_sets ?? [];
  return sets.filter(isWorkingSet);
};

/**
 * Creates a fresh exercise draft from the most recent completed session. A
 * date tie is resolved by session id so dashboard ordering cannot affect what
 * the user sees. The legacy last-workout summary remains a safe fallback.
 */
export const createExerciseDraft = (
  exerciseId: number,
  history: ExerciseDraftHistory = {},
  clock?: DraftClock,
): ExerciseDraft => {
  const previousSets = getPreviousWorkoutSets(history);
  if (!previousSets.length) return createEmptyExerciseDraft(exerciseId, clock);

  const timestamp = getTimestamp(clock);
  const orderedSets = previousSets
    .map((set, originalIndex) => ({ set, originalIndex }))
    .sort(
      (left, right) =>
        left.set.set_number - right.set.set_number ||
        left.originalIndex - right.originalIndex,
    );

  return {
    exerciseId,
    startedAt: new Date(timestamp).toISOString(),
    sets: orderedSets.map(({ set }) => ({
      ...createDraftSet(exerciseId, set.set_number, clock),
      weight: String(set.weight),
      reps: String(set.reps),
      rir: String(set.rir ?? 0),
      set_type: "WORKING",
      completed: false,
    })),
  };
};

const normalizeInputValue = (value: string) => {
  if (value.length > 1 && value[0] === "0" && value[1] !== ".") {
    return value.replace(/^0+/, "") || "0";
  }
  return value;
};

export const updateExerciseDraftSet = (
  drafts: Record<number, ExerciseDraft>,
  exerciseId: number,
  localId: string,
  field: keyof DraftSet,
  value: string,
): Record<number, ExerciseDraft> => {
  const draft = drafts[exerciseId];
  if (!draft) return drafts;

  const cleanValue = normalizeInputValue(value);
  return {
    ...drafts,
    [exerciseId]: {
      ...draft,
      sets: draft.sets.map((set) =>
        set.localId === localId ? { ...set, [field]: cleanValue } : set,
      ),
    },
  };
};

export const appendExerciseDraftSet = (
  drafts: Record<number, ExerciseDraft>,
  exerciseId: number,
  clock?: DraftClock,
): Record<number, ExerciseDraft> => {
  const draft = drafts[exerciseId];
  if (!draft) return drafts;

  return {
    ...drafts,
    [exerciseId]: {
      ...draft,
      sets: [...draft.sets, createDraftSet(exerciseId, draft.sets.length + 1, clock)],
    },
  };
};

export const toggleExerciseDraftSetType = (
  drafts: Record<number, ExerciseDraft>,
  exerciseId: number,
  localId: string,
): Record<number, ExerciseDraft> => {
  const draft = drafts[exerciseId];
  if (!draft) return drafts;

  return {
    ...drafts,
    [exerciseId]: {
      ...draft,
      sets: draft.sets.map((set) =>
        set.localId === localId
          ? {
              ...set,
              set_type: set.set_type === "WARMUP" ? "WORKING" : "WARMUP",
            }
          : set,
      ),
    },
  };
};

export const isDraftSetCompletable = (set: DraftSet) => {
  const weight = Number(set.weight);
  const reps = Number(set.reps);
  return Number.isFinite(weight) && weight > 0 && Number.isFinite(reps) && reps > 0;
};

export const completeExerciseDraftSet = (
  drafts: Record<number, ExerciseDraft>,
  exerciseId: number,
  localId: string,
): Record<number, ExerciseDraft> => {
  const draft = drafts[exerciseId];
  const target = draft?.sets.find((set) => set.localId === localId);
  if (!draft || !target || target.completed || !isDraftSetCompletable(target)) {
    return drafts;
  }

  return {
    ...drafts,
    [exerciseId]: {
      ...draft,
      sets: draft.sets.map((set) =>
        set.localId === localId ? { ...set, completed: true } : set,
      ),
    },
  };
};

export const duplicateExerciseDraftSet = (
  drafts: Record<number, ExerciseDraft>,
  exerciseId: number,
  localId: string,
  clock?: DraftClock,
): Record<number, ExerciseDraft> => {
  const draft = drafts[exerciseId];
  const index = draft?.sets.findIndex((set) => set.localId === localId) ?? -1;
  if (!draft || index < 0) return drafts;

  const source = draft.sets[index];
  const copy: DraftSet = {
    ...source,
    localId: createDraftSet(exerciseId, source.set_number, clock).localId,
    completed: false,
  };
  const sets = [...draft.sets];
  sets.splice(index + 1, 0, copy);
  return {
    ...drafts,
    [exerciseId]: {
      ...draft,
      sets: sets.map((set, setIndex) => ({ ...set, set_number: setIndex + 1 })),
    },
  };
};

export const removeExerciseDraftSetWithUndo = (
  drafts: Record<number, ExerciseDraft>,
  exerciseId: number,
  localId: string,
  clock?: DraftClock,
): { drafts: Record<number, ExerciseDraft>; removed?: RemovedDraftSet } => {
  const draft = drafts[exerciseId];
  const index = draft?.sets.findIndex((set) => set.localId === localId) ?? -1;
  if (!draft || index < 0) return { drafts };

  const removed = draft.sets[index];
  let remaining = draft.sets.filter((set) => set.localId !== localId);
  let replacementLocalId: string | undefined;
  if (!remaining.length) {
    const replacement = createDraftSet(exerciseId, 1, clock);
    replacementLocalId = replacement.localId;
    remaining = [replacement];
  }

  return {
    drafts: {
      ...drafts,
      [exerciseId]: {
        ...draft,
        sets: remaining.map((set, setIndex) => ({ ...set, set_number: setIndex + 1 })),
      },
    },
    removed: { exerciseId, set: removed, index, replacementLocalId },
  };
};

export const restoreRemovedExerciseDraftSet = (
  drafts: Record<number, ExerciseDraft>,
  removed: RemovedDraftSet,
): Record<number, ExerciseDraft> => {
  const draft = drafts[removed.exerciseId];
  if (!draft || draft.sets.some((set) => set.localId === removed.set.localId)) {
    return drafts;
  }

  const currentSets = removed.replacementLocalId
    ? draft.sets.filter((set) => set.localId !== removed.replacementLocalId)
    : draft.sets;
  const sets = [...currentSets];
  sets.splice(Math.min(removed.index, sets.length), 0, removed.set);
  return {
    ...drafts,
    [removed.exerciseId]: {
      ...draft,
      sets: sets.map((set, setIndex) => ({ ...set, set_number: setIndex + 1 })),
    },
  };
};

export const removeExerciseDraftSet = (
  drafts: Record<number, ExerciseDraft>,
  exerciseId: number,
  localId: string,
): Record<number, ExerciseDraft> => {
  const draft = drafts[exerciseId];
  if (!draft) return drafts;

  const remainingSets = draft.sets.filter((set) => set.localId !== localId);
  if (!remainingSets.length) {
    const nextDrafts = { ...drafts };
    delete nextDrafts[exerciseId];
    return nextDrafts;
  }

  return {
    ...drafts,
    [exerciseId]: {
      ...draft,
      sets: remainingSets.map((set, index) => ({
        ...set,
        set_number: index + 1,
      })),
    },
  };
};

export const getDurationLabel = (startedAt: string, now = Date.now()) => {
  const elapsedMs = now - new Date(startedAt).getTime();
  const minutes = Math.max(1, Math.round(elapsedMs / 60000));
  return `${minutes} min`;
};

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isRestDuration = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= MAX_REST_SECONDS;

const isActiveRestDuration = (value: unknown): value is number =>
  isRestDuration(value) && value > 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseDraftSet = (value: unknown): DraftSet | null => {
  if (!isRecord(value)) return null;
  if (
    typeof value.localId !== "string" ||
    !isPositiveInteger(value.set_number) ||
    typeof value.weight !== "string" ||
    typeof value.reps !== "string" ||
    typeof value.rir !== "string"
  ) {
    return null;
  }
  return {
    localId: value.localId,
    set_number: value.set_number,
    weight: value.weight,
    reps: value.reps,
    rir: value.rir,
    set_type: normalizeWorkoutSetType(value.set_type),
    completed: typeof value.completed === "boolean" ? value.completed : false,
  };
};

const parseExerciseDraft = (value: unknown): ExerciseDraft | null => {
  if (!isRecord(value) || !isPositiveInteger(value.exerciseId)) return null;
  if (typeof value.startedAt !== "string" || !Array.isArray(value.sets)) {
    return null;
  }

  const sets = value.sets.map(parseDraftSet);
  if (sets.some((set) => set === null)) return null;
  return {
    exerciseId: value.exerciseId,
    startedAt: value.startedAt,
    sets: sets as DraftSet[],
  };
};

const parseNumberList = (value: unknown): number[] | null => {
  if (!Array.isArray(value) || !value.every(isPositiveInteger)) return null;
  return value;
};

export const parseActiveWorkoutLayoutSnapshot = (
  value: unknown,
): ActiveWorkoutLayoutSnapshot | undefined | null => {
  if (value === undefined) return undefined;
  if (!isRecord(value) || !Array.isArray(value.groups)) return null;
  if (
    value.layoutRevision !== undefined &&
    (!Number.isInteger(value.layoutRevision) || (value.layoutRevision as number) < 0)
  ) return null;
  const groups = value.groups.map((group): ActiveSupersetSnapshot | null => {
    if (!isRecord(group) || typeof group.id !== "string" || !Array.isArray(group.memberExerciseIds)) return null;
    const members = parseNumberList(group.memberExerciseIds);
    const rest = group.restAfterRoundSeconds;
    if (!members || members.length < 2 || members.length > 10 || new Set(members).size !== members.length) return null;
    if (rest !== undefined && rest !== null && !isRestDuration(rest)) return null;
    return {
      id: group.id,
      ...(rest === undefined ? {} : { restAfterRoundSeconds: rest as number | null }),
      memberExerciseIds: members,
    };
  });
  if (groups.some((group) => group === null)) return null;
  return {
    ...(value.layoutRevision === undefined ? {} : { layoutRevision: value.layoutRevision as number }),
    groups: groups as ActiveSupersetSnapshot[],
  };
};

const parsePlannedExerciseIds = (
  value: unknown,
): Record<number, number> | undefined | null => {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;

  const entries = Object.entries(value);
  if (
    entries.some(
      ([exerciseId, plannedExerciseId]) =>
        !isPositiveInteger(Number(exerciseId)) ||
        !isPositiveInteger(plannedExerciseId),
    )
  ) {
    return null;
  }
  return entries.reduce<Record<number, number>>((result, [key, plannedExerciseId]) => {
    result[Number(key)] = plannedExerciseId as number;
    return result;
  }, {});
};

const parseExerciseSnapshots = (
  value: unknown,
): Record<number, ActiveWorkoutExerciseSnapshot> | undefined | null => {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  const result: Record<number, ActiveWorkoutExerciseSnapshot> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!isPositiveInteger(Number(key)) || !isRecord(item) || item.id !== Number(key) ||
      typeof item.name !== "string" || typeof item.muscleGroup !== "string") return null;
    const validOptionalPositive = (field: "targetRepMin" | "targetRepMax") =>
      item[field] === undefined || item[field] === null || isPositiveInteger(item[field]);
    if (!validOptionalPositive("targetRepMin") || !validOptionalPositive("targetRepMax") ||
      (item.targetRIR !== undefined && item.targetRIR !== null &&
        (!Number.isInteger(item.targetRIR) || Number(item.targetRIR) < 0))) return null;
    if ((item.catalogExerciseId !== undefined && item.catalogExerciseId !== null && typeof item.catalogExerciseId !== "string") ||
      (item.notes !== undefined && item.notes !== null && typeof item.notes !== "string")) return null;
    result[Number(key)] = {
      id: item.id as number,
      name: item.name as string,
      muscleGroup: item.muscleGroup as string,
      ...(item.catalogExerciseId === undefined ? {} : { catalogExerciseId: item.catalogExerciseId as string | null }),
      ...(item.targetRepMin === undefined ? {} : { targetRepMin: item.targetRepMin as number | null }),
      ...(item.targetRepMax === undefined ? {} : { targetRepMax: item.targetRepMax as number | null }),
      ...(item.targetRIR === undefined ? {} : { targetRIR: item.targetRIR as number | null }),
      ...(item.notes === undefined ? {} : { notes: item.notes as string | null }),
    };
  }
  return result;
};

/**
 * Validates a rest-duration map received from a route or persisted draft.
 * Zero is intentional: it disables the automatic rest timer for that exercise.
 */
export const parsePlannedExerciseRestSeconds = (
  value: unknown,
): Record<number, number> | null => {
  if (!isRecord(value)) return null;

  const entries = Object.entries(value);
  if (
    entries.some(
      ([exerciseId, restSeconds]) =>
        !isPositiveInteger(Number(exerciseId)) || !isRestDuration(restSeconds),
    )
  ) {
    return null;
  }

  return entries.reduce<Record<number, number>>((result, [key, restSeconds]) => {
    result[Number(key)] = restSeconds as number;
    return result;
  }, {});
};

/** Uses the routine default when an exercise has no valid configured duration. */
export const getExerciseRestSeconds = (
  restSecondsByExercise: Record<number, number> | undefined,
  exerciseId: number,
  fallback = DEFAULT_REST_SECONDS,
) => {
  const restSeconds = restSecondsByExercise?.[exerciseId];
  return isRestDuration(restSeconds) ? restSeconds : fallback;
};

/**
 * Serializes only a currently usable timer. Running timers use an absolute
 * deadline so elapsed time while the app is inactive is not lost.
 */
export const createRestTimerSnapshot = (
  input: RestTimerSnapshotInput,
  now = Date.now(),
): RestTimerSnapshot | undefined => {
  if (
    !input.active ||
    !isActiveRestDuration(input.initialDuration) ||
    !isActiveRestDuration(input.remainingSeconds)
  ) {
    return undefined;
  }

  if (input.paused) {
    return {
      paused: true,
      initialDuration: input.initialDuration,
      remainingSeconds: input.remainingSeconds,
    };
  }

  if (input.endsAt === null || input.endsAt <= now) return undefined;
  return {
    paused: false,
    initialDuration: input.initialDuration,
    endsAt: new Date(input.endsAt).toISOString(),
  };
};

export const parseRestTimerSnapshot = (
  value: unknown,
): RestTimerSnapshot | null => {
  if (!isRecord(value) || typeof value.paused !== "boolean") return null;
  if (!isActiveRestDuration(value.initialDuration)) return null;

  if (value.paused) {
    if (!isActiveRestDuration(value.remainingSeconds) || value.endsAt !== undefined) {
      return null;
    }
    return {
      paused: true,
      initialDuration: value.initialDuration,
      remainingSeconds: value.remainingSeconds,
    };
  }

  if (typeof value.endsAt !== "string" || !Number.isFinite(Date.parse(value.endsAt))) {
    return null;
  }
  if (value.remainingSeconds !== undefined) return null;
  return {
    paused: false,
    initialDuration: value.initialDuration,
    endsAt: value.endsAt,
  };
};

/** Returns null for elapsed timers so hydration never replays completion feedback. */
export const restoreRestTimerSnapshot = (
  snapshot: RestTimerSnapshot | undefined,
  now = Date.now(),
): RestTimerRestore | null => {
  if (!snapshot) return null;
  if (snapshot.paused) {
    return {
      paused: true,
      initialDuration: snapshot.initialDuration,
      remainingSeconds: snapshot.remainingSeconds!,
      endsAt: null,
    };
  }

  const endsAt = Date.parse(snapshot.endsAt!);
  const remainingSeconds = Math.ceil((endsAt - now) / 1000);
  if (remainingSeconds <= 0) return null;
  return {
    paused: false,
    initialDuration: snapshot.initialDuration,
    remainingSeconds,
    endsAt,
  };
};

/**
 * Parses the persisted v3 format and migrates v2/v1/original unversioned drafts
 * shape. Invalid records are rejected instead of reaching the workout screen.
 */
export const parseActiveSessionDraft = (
  value: unknown,
): ActiveSessionDraft | null => {
  if (!isRecord(value)) return null;
  if (
    value.version !== undefined &&
    value.version !== 1 &&
    value.version !== 2 &&
    value.version !== 3 &&
    value.version !== ACTIVE_SESSION_DRAFT_VERSION
  ) {
    return null;
  }
  if (
    typeof value.startedAt !== "string" ||
    !Array.isArray(value.exerciseIds) ||
    !Array.isArray(value.completedIds) ||
    !isRecord(value.drafts)
  ) {
    return null;
  }

  const exerciseIds = parseNumberList(value.exerciseIds);
  const completedIds = parseNumberList(value.completedIds);
  const plannedExerciseIds = parsePlannedExerciseIds(value.plannedExerciseIds);
  const exerciseSnapshots = parseExerciseSnapshots(value.exerciseSnapshots);
  const plannedExerciseRestSeconds =
    value.plannedExerciseRestSeconds === undefined
      ? undefined
      : parsePlannedExerciseRestSeconds(value.plannedExerciseRestSeconds);
  const restTimer =
    value.restTimer === undefined ? undefined : parseRestTimerSnapshot(value.restTimer);
  const layoutSnapshot = parseActiveWorkoutLayoutSnapshot(value.layoutSnapshot);
  if (
    !exerciseIds ||
    !completedIds ||
    plannedExerciseIds === null ||
    exerciseSnapshots === null ||
    plannedExerciseRestSeconds === null ||
    restTimer === null ||
    layoutSnapshot === null
  ) {
    return null;
  }
  if (value.workoutSessionId !== undefined && !isPositiveInteger(value.workoutSessionId)) {
    return null;
  }
  if (value.routineName !== undefined && typeof value.routineName !== "string") {
    return null;
  }

  const drafts = Object.entries(value.drafts).reduce<Record<number, ExerciseDraft> | null>(
    (result, [exerciseId, draft]) => {
      if (result === null || !isPositiveInteger(Number(exerciseId))) return null;
      const parsedDraft = parseExerciseDraft(draft);
      if (!parsedDraft) return null;
      result[Number(exerciseId)] = parsedDraft;
      return result;
    },
    {},
  );
  if (drafts === null) return null;

  return {
    version: ACTIVE_SESSION_DRAFT_VERSION,
    workoutSessionId: value.workoutSessionId,
    routineName: value.routineName,
    plannedExerciseIds,
    ...(plannedExerciseRestSeconds === undefined
      ? {}
      : { plannedExerciseRestSeconds }),
    ...(restTimer === undefined ? {} : { restTimer }),
    ...(layoutSnapshot === undefined ? {} : { layoutSnapshot }),
    ...(exerciseSnapshots === undefined ? {} : { exerciseSnapshots }),
    exerciseIds,
    startedAt: value.startedAt,
    drafts,
    completedIds,
  };
};

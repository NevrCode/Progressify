import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ACTIVE_SESSION_DRAFT_VERSION,
  appendExerciseDraftSet,
  completeExerciseDraftSet,
  createExerciseDraft,
  createEmptyExerciseDraft,
  createRestTimerSnapshot,
  duplicateExerciseDraftSet,
  DEFAULT_REST_SECONDS,
  getExerciseRestSeconds,
  parseActiveSessionDraft,
  parsePlannedExerciseRestSeconds,
  removeExerciseDraftSetWithUndo,
  restoreRestTimerSnapshot,
  restoreRemovedExerciseDraftSet,
  removeExerciseDraftSet,
  toggleExerciseDraftSetType,
  updateExerciseDraftSet,
} from "../src/features/workout-session/drafts.ts";

const clock = {
  now: () => 1_700_000_000_000,
  random: (() => {
    let next = 0.42;
    return () => (next += 0.01);
  })(),
};

test("unversioned active-session drafts migrate to the versioned format", () => {
  const legacyDraft = {
    workoutSessionId: 11,
    routineName: "Push day",
    plannedExerciseIds: { 5: 42 },
    exerciseIds: [5],
    startedAt: "2024-01-01T10:00:00.000Z",
    drafts: {
      5: {
        exerciseId: 5,
        startedAt: "2024-01-01T10:00:00.000Z",
        sets: [
          {
            localId: "set-1",
            set_number: 1,
            weight: "60",
            reps: "8",
            rir: "2",
          },
        ],
      },
    },
    completedIds: [],
  };

  const parsed = parseActiveSessionDraft(legacyDraft);
  assert.equal(parsed?.version, ACTIVE_SESSION_DRAFT_VERSION);
  assert.equal(parsed?.drafts[5].sets[0].set_type, "WORKING");
  assert.equal(parsed?.drafts[5].sets[0].completed, false);
});

test("v2 drafts migrate set completion to incomplete while v3 preserves it", () => {
  const base = {
    exerciseIds: [5],
    startedAt: "2024-01-01T10:00:00.000Z",
    drafts: {
      5: {
        exerciseId: 5,
        startedAt: "2024-01-01T10:00:00.000Z",
        sets: [{ localId: "set-1", set_number: 1, weight: "60", reps: "8", rir: "2", set_type: "WORKING" }],
      },
    },
    completedIds: [],
  };

  assert.equal(parseActiveSessionDraft({ ...base, version: 2 })?.drafts[5].sets[0].completed, false);
  assert.equal(
    parseActiveSessionDraft({
      ...base,
      version: ACTIVE_SESSION_DRAFT_VERSION,
      drafts: { 5: { ...base.drafts[5], sets: [{ ...base.drafts[5].sets[0], completed: true }] } },
    })?.drafts[5].sets[0].completed,
    true,
  );
});

test("invalid stored drafts are rejected before reaching the active workout", () => {
  assert.equal(
    parseActiveSessionDraft({
      version: ACTIVE_SESSION_DRAFT_VERSION,
      exerciseIds: [1],
      startedAt: "2024-01-01T10:00:00.000Z",
      drafts: { 1: { exerciseId: 1, startedAt: "now", sets: [] } },
      completedIds: [0],
    }),
    null,
  );
});

test("rest duration maps keep zero, reject invalid values, and fall back safely", () => {
  assert.deepEqual(parsePlannedExerciseRestSeconds({ 7: 0, 8: 120 }), {
    7: 0,
    8: 120,
  });
  assert.equal(parsePlannedExerciseRestSeconds({ 7: 3601 }), null);
  assert.equal(getExerciseRestSeconds({ 7: 0 }, 7), 0);
  assert.equal(getExerciseRestSeconds({ 7: 120 }, 8), DEFAULT_REST_SECONDS);
});

test("versioned active-session drafts preserve configured exercise rest durations", () => {
  const parsed = parseActiveSessionDraft({
    version: ACTIVE_SESSION_DRAFT_VERSION,
    plannedExerciseRestSeconds: { 7: 120 },
    exerciseIds: [7],
    startedAt: "2024-01-01T10:00:00.000Z",
    drafts: {
      7: {
        exerciseId: 7,
        startedAt: "2024-01-01T10:00:00.000Z",
        sets: [],
      },
    },
    completedIds: [],
  });

  assert.deepEqual(parsed?.plannedExerciseRestSeconds, { 7: 120 });
});

test("v4 drafts preserve the immutable launch layout snapshot while older drafts migrate", () => {
  const base = {
    version: ACTIVE_SESSION_DRAFT_VERSION,
    exerciseIds: [7, 8],
    startedAt: "2024-01-01T10:00:00.000Z",
    drafts: {
      7: { exerciseId: 7, startedAt: "2024-01-01T10:00:00.000Z", sets: [] },
      8: { exerciseId: 8, startedAt: "2024-01-01T10:00:00.000Z", sets: [] },
    },
    completedIds: [],
  };
  const parsed = parseActiveSessionDraft({
    ...base,
    layoutSnapshot: {
      layoutRevision: 3,
      groups: [{ id: "group-a", restAfterRoundSeconds: null, memberExerciseIds: [7, 8] }],
    },
  });
  assert.deepEqual(parsed?.layoutSnapshot, {
    layoutRevision: 3,
    groups: [{ id: "group-a", restAfterRoundSeconds: null, memberExerciseIds: [7, 8] }],
  });
  assert.equal(parseActiveSessionDraft({ ...base, version: 3 })?.layoutSnapshot, undefined);
});

test("running rest timers persist an absolute deadline and restore the elapsed remainder", () => {
  const now = 1_700_000_000_000;
  const snapshot = createRestTimerSnapshot(
    {
      active: true,
      paused: false,
      initialDuration: 90,
      remainingSeconds: 90,
      endsAt: now + 90_000,
    },
    now,
  );

  assert.deepEqual(snapshot, {
    paused: false,
    initialDuration: 90,
    endsAt: new Date(now + 90_000).toISOString(),
  });
  assert.deepEqual(restoreRestTimerSnapshot(snapshot, now + 30_100), {
    paused: false,
    initialDuration: 90,
    remainingSeconds: 60,
    endsAt: now + 90_000,
  });
  assert.equal(restoreRestTimerSnapshot(snapshot, now + 90_000), null);
});

test("paused rest timers preserve their remaining time without an absolute deadline", () => {
  const snapshot = createRestTimerSnapshot(
    {
      active: true,
      paused: true,
      initialDuration: 120,
      remainingSeconds: 46,
      endsAt: null,
    },
    1_700_000_000_000,
  );

  assert.deepEqual(snapshot, {
    paused: true,
    initialDuration: 120,
    remainingSeconds: 46,
  });
  assert.deepEqual(restoreRestTimerSnapshot(snapshot, 1_700_100_000_000), {
    paused: true,
    initialDuration: 120,
    remainingSeconds: 46,
    endsAt: null,
  });
});

test("draft operations retain input cleanup, numbering, and empty-draft removal", () => {
  const initial = { 7: createEmptyExerciseDraft(7, clock) };
  const updated = updateExerciseDraftSet(initial, 7, initial[7].sets[0].localId, "weight", "007");
  const appended = appendExerciseDraftSet(updated, 7, clock);

  assert.equal(updated[7].sets[0].weight, "7");
  assert.equal(updated[7].sets[0].set_type, "WORKING");
  assert.deepEqual(
    appended[7].sets.map((set) => set.set_number),
    [1, 2],
  );

  const withoutFirstSet = removeExerciseDraftSet(
    appended,
    7,
    appended[7].sets[0].localId,
  );
  assert.equal(withoutFirstSet[7].sets[0].set_number, 1);
  assert.deepEqual(
    removeExerciseDraftSet(withoutFirstSet, 7, withoutFirstSet[7].sets[0].localId),
    {},
  );
});

test("draft set classification toggles without changing entered values", () => {
  const initial = { 7: createEmptyExerciseDraft(7, clock) };
  const localId = initial[7].sets[0].localId;
  const warmup = toggleExerciseDraftSetType(initial, 7, localId);
  const working = toggleExerciseDraftSetType(warmup, 7, localId);

  assert.equal(warmup[7].sets[0].set_type, "WARMUP");
  assert.equal(working[7].sets[0].set_type, "WORKING");
  assert.equal(warmup[7].sets[0].weight, initial[7].sets[0].weight);
});

test("set completion validates entered weight and reps and is idempotent", () => {
  const initial = { 7: createEmptyExerciseDraft(7, clock) };
  const localId = initial[7].sets[0].localId;
  assert.equal(completeExerciseDraftSet(initial, 7, localId), initial);

  const weighted = updateExerciseDraftSet(initial, 7, localId, "weight", "50");
  const ready = updateExerciseDraftSet(weighted, 7, localId, "reps", "8");
  const completed = completeExerciseDraftSet(ready, 7, localId);
  assert.equal(completed[7].sets[0].completed, true);
  assert.equal(completeExerciseDraftSet(completed, 7, localId), completed);
});

test("duplicating inserts an incomplete copy with classification and a new identity", () => {
  const initial = { 7: createEmptyExerciseDraft(7, clock) };
  const localId = initial[7].sets[0].localId;
  const warmup = toggleExerciseDraftSetType(initial, 7, localId);
  const weighted = updateExerciseDraftSet(warmup, 7, localId, "weight", "25");
  const completed = completeExerciseDraftSet(
    updateExerciseDraftSet(weighted, 7, localId, "reps", "10"),
    7,
    localId,
  );
  const duplicated = duplicateExerciseDraftSet(completed, 7, localId, clock);

  assert.deepEqual(duplicated[7].sets.map((set) => set.set_number), [1, 2]);
  assert.notEqual(duplicated[7].sets[1].localId, localId);
  assert.equal(duplicated[7].sets[1].weight, "25");
  assert.equal(duplicated[7].sets[1].set_type, "WARMUP");
  assert.equal(duplicated[7].sets[1].completed, false);
});

test("remove and undo restore identity and order, including the final-set safeguard", () => {
  const initial = { 7: createEmptyExerciseDraft(7, clock) };
  const appended = appendExerciseDraftSet(initial, 7, clock);
  const target = appended[7].sets[0];
  const removed = removeExerciseDraftSetWithUndo(appended, 7, target.localId, clock);
  assert.equal(removed.drafts[7].sets.length, 1);
  assert.equal(removed.drafts[7].sets[0].set_number, 1);
  const restored = restoreRemovedExerciseDraftSet(removed.drafts, removed.removed);
  assert.equal(restored[7].sets[0].localId, target.localId);
  assert.deepEqual(restored[7].sets.map((set) => set.set_number), [1, 2]);

  const finalRemoval = removeExerciseDraftSetWithUndo(initial, 7, target.localId, clock);
  assert.equal(finalRemoval.drafts[7].sets.length, 1);
  assert.notEqual(finalRemoval.drafts[7].sets[0].localId, target.localId);
  const finalRestore = restoreRemovedExerciseDraftSet(finalRemoval.drafts, finalRemoval.removed);
  assert.deepEqual(finalRestore[7].sets.map((set) => set.localId), [target.localId]);
});

test("new exercise drafts copy the latest completed session by date and id", () => {
  const draft = createExerciseDraft(
    7,
    {
      exercise_sessions: [
        {
          id: 99,
          session_date: "2025-05-12",
          sets: [{ set_number: 1, weight: 65, reps: 6, rir: 1 }],
        },
        {
          id: 100,
          session_date: "2025-05-12",
          sets: [
            { set_number: 2, weight: 72.5, reps: 7, rir: 2 },
            { set_number: 1, weight: 70, reps: 8, rir: 3 },
          ],
        },
        {
          id: 101,
          session_date: "2025-05-11",
          sets: [{ set_number: 1, weight: 80, reps: 3, rir: 0 }],
        },
      ],
    },
    clock,
  );

  assert.deepEqual(
    draft.sets.map(({ set_number, weight, reps, rir }) => ({
      set_number,
      weight,
      reps,
      rir,
    })),
    [
      { set_number: 1, weight: "70", reps: "8", rir: "3" },
      { set_number: 2, weight: "72.5", reps: "7", rir: "2" },
    ],
  );
  assert.equal(draft.startedAt, "2023-11-14T22:13:20.000Z");
});

test("draft initialization falls back to last-workout sets, then an empty set", () => {
  const fromFallback = createExerciseDraft(
    8,
    {
      exercise_sessions: [{ id: 1, session_date: "2025-01-01", sets: [] }],
      last_workout_sets: [{ set_number: 1, weight: 42.5, reps: 10 }],
    },
    clock,
  );
  const empty = createExerciseDraft(9, {}, clock);

  assert.deepEqual(
    fromFallback.sets.map(({ set_number, weight, reps, rir }) => ({
      set_number,
      weight,
      reps,
      rir,
    })),
    [{ set_number: 1, weight: "42.5", reps: "10", rir: "0" }],
  );
  assert.deepEqual(
    empty.sets.map(({ set_number, weight, reps, rir }) => ({
      set_number,
      weight,
      reps,
      rir,
    })),
    [{ set_number: 1, weight: "0", reps: "0", rir: "0" }],
  );
});

test("previous-session prefill copies working sets and excludes warm-ups", () => {
  const draft = createExerciseDraft(
    12,
    {
      exercise_sessions: [
        {
          id: 4,
          session_date: "2026-08-02",
          sets: [
            { set_number: 1, weight: 20, reps: 10, set_type: "WARMUP" },
            { set_number: 2, weight: 50, reps: 8, rir: 2, set_type: "WORKING" },
          ],
        },
      ],
    },
    clock,
  );

  assert.deepEqual(
    draft.sets.map(({ weight, reps, set_type }) => ({ weight, reps, set_type })),
    [{ weight: "50", reps: "8", set_type: "WORKING" }],
  );
});

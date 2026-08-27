import assert from "node:assert/strict";
import test from "node:test";

import { resolveActiveSession } from "../src/features/workout-session/restored-session.ts";

const layout = { groups: [{ id: "g1", memberExerciseIds: [1, 2] }] };
const routeLayout = { groups: [{ id: "route", memberExerciseIds: [9] }] };

const route = {
  workoutSessionId: 500,
  routineName: "Push Day",
  plannedExerciseIds: { 1: 11 },
  plannedExerciseRestSeconds: { 1: 90 },
  layoutSnapshot: routeLayout,
};

const restored = {
  exerciseIds: [7, 8],
  workoutSessionId: 900,
  routineName: "Restored Day",
  plannedExerciseIds: { 7: 77 },
  plannedExerciseRestSeconds: { 7: 120 },
  layoutSnapshot: layout,
  exerciseSnapshots: { 7: { name: "Squat" } },
};

test("falls back to route params before anything is restored", () => {
  const active = resolveActiveSession(null, route);

  assert.deepEqual(active, {
    restoredExerciseIds: [],
    workoutSessionId: 500,
    routineName: "Push Day",
    plannedExerciseIds: { 1: 11 },
    plannedExerciseRestSeconds: { 1: 90 },
    layoutSnapshot: routeLayout,
    exerciseSnapshots: undefined,
  });
});

test("a restored session outranks the route params", () => {
  const active = resolveActiveSession(restored, route);

  assert.deepEqual(active, {
    restoredExerciseIds: [7, 8],
    workoutSessionId: 900,
    routineName: "Restored Day",
    plannedExerciseIds: { 7: 77 },
    plannedExerciseRestSeconds: { 7: 120 },
    layoutSnapshot: layout,
    exerciseSnapshots: { 7: { name: "Squat" } },
  });
});

test("a restored session without an id defers to the route id", () => {
  const active = resolveActiveSession(
    { ...restored, workoutSessionId: null },
    route,
  );

  assert.equal(active.workoutSessionId, 500);
});

test("a restored session without a routine name defers to the route name", () => {
  const active = resolveActiveSession(
    { ...restored, routineName: null },
    route,
  );

  assert.equal(active.routineName, "Push Day");
});

test("empty planned exercises defer to the route rather than blanking it", () => {
  // The restored session stores {} when it has no planned exercises. Treating
  // that as "restored wins" would erase the route's planned exercises.
  const active = resolveActiveSession(
    { ...restored, plannedExerciseIds: {}, plannedExerciseRestSeconds: {} },
    route,
  );

  assert.deepEqual(active.plannedExerciseIds, { 1: 11 });
  assert.deepEqual(active.plannedExerciseRestSeconds, { 1: 90 });
});

test("a restored layout of undefined defers to the route layout", () => {
  const active = resolveActiveSession(
    { ...restored, layoutSnapshot: undefined },
    route,
  );

  assert.deepEqual(active.layoutSnapshot, routeLayout);
});

test("exercise snapshots come from the restored session only", () => {
  // The route never carries snapshots, so there is nothing to fall back to.
  const active = resolveActiveSession(
    { ...restored, exerciseSnapshots: undefined },
    route,
  );

  assert.equal(active.exerciseSnapshots, undefined);
});

test("resolves against an empty route without throwing", () => {
  const active = resolveActiveSession(null, {
    workoutSessionId: null,
    routineName: undefined,
    plannedExerciseIds: {},
    plannedExerciseRestSeconds: {},
    layoutSnapshot: undefined,
  });

  assert.deepEqual(active, {
    restoredExerciseIds: [],
    workoutSessionId: null,
    routineName: undefined,
    plannedExerciseIds: {},
    plannedExerciseRestSeconds: {},
    layoutSnapshot: undefined,
    exerciseSnapshots: undefined,
  });
});

test("returns a stable empty id list so memo dependencies do not churn", () => {
  const first = resolveActiveSession(null, route);
  const second = resolveActiveSession(null, route);

  assert.equal(first.restoredExerciseIds, second.restoredExerciseIds);
});

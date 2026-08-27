import assert from "node:assert/strict";
import test from "node:test";

import { getSupersetRestDecision } from "../src/features/workout-session/superset-round-controller.ts";

const set = (localId, completed, set_type = "WORKING") => ({ localId, set_number: 1, weight: "50", reps: "8", rir: "2", set_type, completed });
const layout = { groups: [{ id: "superset-a", restAfterRoundSeconds: null, memberExerciseIds: [1, 2] }] };

test("only the transition completing an out-of-order round starts group rest", () => {
  const before = { 1: { exerciseId: 1, startedAt: "now", sets: [set("one", false)] }, 2: { exerciseId: 2, startedAt: "now", sets: [set("two", true)] } };
  assert.deepEqual(getSupersetRestDecision(layout, before, 1, before[1].sets[0], { 1: 75 }, 90), { kind: "start", groupId: "superset-a", round: 0, durationSeconds: 75 });
  assert.deepEqual(getSupersetRestDecision(layout, { ...before, 1: { ...before[1], sets: [set("one", true)] } }, 1, set("one", true), { 1: 75 }, 90), { kind: "none" });
});

test("warm-ups are outside rounds and unequal working counts allow an absent member", () => {
  const before = {
    1: { exerciseId: 1, startedAt: "now", sets: [set("warm", false, "WARMUP"), set("one", false)] },
    2: { exerciseId: 2, startedAt: "now", sets: [] },
  };
  assert.deepEqual(getSupersetRestDecision(layout, before, 1, before[1].sets[0], {}, 90), { kind: "none" });
  assert.deepEqual(getSupersetRestDecision(layout, before, 1, before[1].sets[1], {}, 90), { kind: "start", groupId: "superset-a", round: 0, durationSeconds: 90 });
});

test("an explicit group rest wins, including zero", () => {
  const before = { 1: { exerciseId: 1, startedAt: "now", sets: [set("one", false)] }, 2: { exerciseId: 2, startedAt: "now", sets: [] } };
  const explicit = { groups: [{ ...layout.groups[0], restAfterRoundSeconds: 0 }] };
  assert.deepEqual(getSupersetRestDecision(explicit, before, 1, before[1].sets[0], { 1: 120 }, 90), { kind: "start", groupId: "superset-a", round: 0, durationSeconds: 0 });
});

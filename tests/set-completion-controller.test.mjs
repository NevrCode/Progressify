import assert from "node:assert/strict";
import test from "node:test";

import { completeDraftSetOnce } from "../src/features/workout-session/set-completion-controller.ts";

const readySet = {
  localId: "set-1",
  set_number: 1,
  weight: "50",
  reps: "8",
  rir: "2",
  set_type: "WORKING",
  completed: false,
};

test("two immediate completion attempts update once and start one rest timer", () => {
  const claims = new Set();
  let updates = 0;
  let timerStarts = 0;
  const complete = () =>
    completeDraftSetOnce(
      claims,
      readySet,
      () => updates++,
      () => timerStarts++,
    );

  assert.equal(complete(), "completed");
  assert.equal(complete(), "already-completed");
  assert.equal(updates, 1);
  assert.equal(timerStarts, 1);
});

test("invalid and restored completed sets never claim or start rest", () => {
  const claims = new Set();
  let effects = 0;
  const effect = () => effects++;

  assert.equal(
    completeDraftSetOnce(claims, { ...readySet, weight: "0" }, effect, effect),
    "invalid",
  );
  assert.equal(
    completeDraftSetOnce(claims, { ...readySet, completed: true }, effect, effect),
    "already-completed",
  );
  assert.equal(claims.size, 0);
  assert.equal(effects, 0);
});

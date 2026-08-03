import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isWorkingSet,
  normalizeWorkoutSetType,
  withNormalizedWorkoutSetType,
} from "../src/types/workout-set.ts";
import { calculateWorkingSetVolume } from "../src/utils/workoutMetrics.ts";

test("legacy or invalid set types normalize to working", () => {
  assert.equal(normalizeWorkoutSetType(undefined), "WORKING");
  assert.equal(normalizeWorkoutSetType("invalid"), "WORKING");
  assert.equal(normalizeWorkoutSetType("WARMUP"), "WARMUP");
  assert.equal(isWorkingSet({}), true);
});

test("request serialization always includes a stable set type", () => {
  assert.deepEqual(withNormalizedWorkoutSetType({ set_number: 1, weight: 80 }), {
    set_number: 1,
    weight: 80,
    set_type: "WORKING",
  });
  assert.equal(
    withNormalizedWorkoutSetType({ set_number: 2, set_type: "WARMUP" }).set_type,
    "WARMUP",
  );
});

test("client working volume excludes warm-up sets", () => {
  assert.equal(
    calculateWorkingSetVolume([
      { weight: 20, reps: 10, set_type: "WARMUP" },
      { weight: 80, reps: 5, set_type: "WORKING" },
      { weight: 70, reps: 6 },
    ]),
    820,
  );
});

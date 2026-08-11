import assert from "node:assert/strict";
import { test } from "node:test";

import { createRepeatWorkoutLaunch } from "../src/features/workout-session/repeat-workout.ts";

const snapshot = {
  snapshot_version: 1,
  workout_session_id: 40,
  completed_at: "2026-08-08T10:00:00.000Z",
  program: { id: 10, name: "Deleted source program", template_type: "CUSTOM" },
  routine: { id: 20, name: "Deleted source routine" },
  exercise_groups: [{ id: "group-a", type: "SUPERSET", rest_after_round_seconds: 75 }],
  exercises: [
    {
      planned_exercise_id: 101, exercise_progression_id: 7, exercise_name: "Bench Press",
      muscle_group: "Chest", position: 1, rest_seconds: 90, group_id: "group-a",
      group_member_position: 1, sets: [
        { id: 1, set_number: 1, weight: 30, reps: 10, rir: 3, set_type: "WARMUP" },
        { id: 2, set_number: 2, weight: 70, reps: 8, rir: 2, set_type: "WORKING" },
      ],
    },
    {
      planned_exercise_id: 102, exercise_progression_id: 8, exercise_name: "Row",
      muscle_group: "Back", position: 0, rest_seconds: 120, group_id: "group-a",
      group_member_position: 0, sets: [
        { id: 3, set_number: 1, weight: 50, reps: 10, rir: 2, set_type: "WORKING" },
      ],
    },
  ],
};

test("repeat hydration uses only snapshot data with fresh incomplete local sets", () => {
  const launch = createRepeatWorkoutLaunch(snapshot, {
    id: 41, program_id: 10, routine_id: 20, routine_name_snapshot: "Deleted source routine",
    started_at: "2026-08-08T11:00:00.000Z", status: "ACTIVE", exercises: [], exercise_groups: [],
  }, { now: () => 1_700_000_000_000, random: () => 0.1 });

  assert.equal(launch.workoutSessionId, 41);
  assert.equal(launch.routineName, "Deleted source routine");
  assert.deepEqual(launch.exerciseIds, [8, 7]);
  assert.equal(launch.drafts[7].sets[0].set_type, "WARMUP");
  assert.equal(launch.drafts[7].sets[0].weight, "30");
  assert.equal(launch.drafts[7].sets[1].weight, "70");
  assert.equal(launch.drafts[7].sets.every((set) => !set.completed), true);
  assert.notEqual(launch.drafts[7].sets[0].localId, "1");
  assert.deepEqual(launch.layoutSnapshot.groups, [{
    id: "group-a", restAfterRoundSeconds: 75, memberExerciseIds: [8, 7],
  }]);
  assert.equal(launch.exerciseSnapshots?.[7].name, "Bench Press");
});

test("repeat hydration rejects an accidental reuse of the completed workout identity", () => {
  assert.throws(() => createRepeatWorkoutLaunch(snapshot, {
    id: 40, program_id: 10, routine_id: 20, routine_name_snapshot: "Old", started_at: "now",
    status: "ACTIVE", exercises: [], exercise_groups: [],
  }), /cannot be repeated/);
});

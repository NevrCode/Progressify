import assert from "node:assert/strict";
import test from "node:test";

import {
  createSuperset,
  dissolveSuperset,
  moveLayoutBlock,
  moveLayoutRoutine,
  serializeProgramLayout,
  setSupersetRest,
  toProgramLayout,
} from "../src/features/program-layout/model.ts";

const exercise = (id, position, group_id = null, group_member_position = null) => ({
  id,
  exercise_progression_id: id + 100,
  exercise_name: `Exercise ${id}`,
  position,
  group_id,
  group_member_position,
});

const program = () => ({
  id: 9,
  name: "Strength",
  template_type: "CUSTOM",
  status: "ACTIVE",
  layout_revision: 7,
  routines: [
    {
      id: 2,
      name: "Second",
      position: 1,
      planned_exercises: [exercise(22, 1), exercise(21, 0)],
      exercise_groups: [],
    },
    {
      id: 1,
      name: "First",
      position: 0,
      planned_exercises: [exercise(12, 1, "group-a", 1), exercise(11, 0, "group-a", 0), exercise(13, 2)],
      exercise_groups: [{ id: "group-a", type: "SUPERSET", rest_after_round_seconds: 75 }],
    },
  ],
});

test("layout derives explicit group blocks and emits a canonical full payload", () => {
  const layout = toProgramLayout(program());
  assert.deepEqual(layout.routines.map((routine) => routine.id), [1, 2]);
  assert.equal(layout.routines[0].blocks[0].type, "SUPERSET");
  assert.deepEqual(
    serializeProgramLayout(layout),
    {
      expected_revision: 7,
      routines: [
        { routine_id: 1, blocks: [
          { type: "SUPERSET", group_id: "group-a", rest_after_round_seconds: 75, members: [{ planned_exercise_id: 11 }, { planned_exercise_id: 12 }] },
          { type: "EXERCISE", planned_exercise_id: 13 },
        ] },
        { routine_id: 2, blocks: [
          { type: "EXERCISE", planned_exercise_id: 21 },
          { type: "EXERCISE", planned_exercise_id: 22 },
        ] },
      ],
    },
  );
});

test("reorder and group reducers preserve complete exercise membership", () => {
  let layout = toProgramLayout(program());
  layout = moveLayoutRoutine(layout, 2, -1);
  layout = moveLayoutBlock(layout, 1, 1, -1);
  layout = dissolveSuperset(layout, 1, "group-a");
  layout = createSuperset(layout, 1, [13, 11], "group-new");
  layout = setSupersetRest(layout, 1, "group-new", 0);

  const request = serializeProgramLayout(layout);
  assert.deepEqual(request.routines.map((routine) => routine.routine_id), [2, 1]);
  const blocks = request.routines[1].blocks;
  assert.equal(blocks.filter((block) => block.type === "SUPERSET").length, 1);
  const grouped = blocks.find((block) => block.type === "SUPERSET");
  assert.equal(grouped.rest_after_round_seconds, 0);
  assert.deepEqual(grouped.members.map((member) => member.planned_exercise_id).sort(), [11, 13]);
  assert.deepEqual(
    blocks.flatMap((block) => block.type === "SUPERSET" ? block.members.map((member) => member.planned_exercise_id) : [block.planned_exercise_id]).sort(),
    [11, 12, 13],
  );
});

test("group limits and invalid rest are rejected without mutating the local layout", () => {
  const layout = toProgramLayout(program());
  assert.equal(createSuperset(layout, 1, [11], "nope"), layout);
  assert.equal(setSupersetRest(layout, 1, "group-a", 3601), layout);
});

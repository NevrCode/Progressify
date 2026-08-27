import assert from "node:assert/strict";
import test from "node:test";

import {
  isRoutineLayoutRevisionConflict,
  routineLayoutConflictPrompt,
} from "../src/features/program-layout/conflict.ts";
import { ApiError } from "../src/utils/apiError.ts";

test("a stale layout is a reload-and-repeat conflict, never a silent rebase", () => {
  const stale = new ApiError("changed", 409, "ROUTINE_LAYOUT_REVISION_CONFLICT");
  assert.equal(isRoutineLayoutRevisionConflict(stale), true);
  assert.match(routineLayoutConflictPrompt, /repeat/i);
  assert.equal(isRoutineLayoutRevisionConflict(new ApiError("other", 409, "HTTP_409")), false);
});

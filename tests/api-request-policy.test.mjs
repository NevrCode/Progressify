import assert from "node:assert/strict";
import test from "node:test";

import { requiresImmediateServerResponse } from "../src/utils/apiRequestPolicy.ts";

test("program and routine mutations require a real server response", () => {
  const urls = [
    "/v1/gym/programs",
    "/v1/gym/programs/12/activate",
    "/v1/gym/routines/7/start",
    "/v1/gym/planned-exercises/4",
    "/v1/gym/workout-sessions/9/complete",
  ];

  for (const url of urls) {
    assert.equal(requiresImmediateServerResponse(url), true, url);
  }
});

test("ordinary gym writes remain eligible for the offline queue", () => {
  assert.equal(requiresImmediateServerResponse("/v1/gym/session"), false);
  assert.equal(requiresImmediateServerResponse("/v1/gym/exercise"), false);
  assert.equal(requiresImmediateServerResponse(undefined), false);
});

test("similar-looking paths do not accidentally become online-only", () => {
  assert.equal(requiresImmediateServerResponse("/v1/gym/programs-legacy"), false);
  assert.equal(requiresImmediateServerResponse("/v1/gym/routines-old/1"), false);
});

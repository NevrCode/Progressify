import assert from "node:assert/strict";
import test from "node:test";

import { isAuthenticationRefreshFailure } from "../src/utils/authRefreshPolicy.ts";

test("only authentication rejection expires the local session", () => {
  assert.equal(isAuthenticationRefreshFailure(400), true);
  assert.equal(isAuthenticationRefreshFailure(401), true);
  assert.equal(isAuthenticationRefreshFailure(500), false);
  assert.equal(isAuthenticationRefreshFailure(undefined), false);
});

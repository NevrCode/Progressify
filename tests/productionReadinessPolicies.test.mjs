import assert from "node:assert/strict";
import test from "node:test";
import { AxiosError } from "axios";

import {
  getFieldErrors,
  shouldRetryApiError,
  toApiError,
} from "../src/utils/apiError.ts";
import { formatRupiah } from "../src/utils/formatter.ts";
import {
  isRetryableSyncFailure,
  syncRetryDelay,
} from "../src/utils/syncRetryPolicy.ts";
import {
  calculateEstimatedOneRepMax,
  calculateWorkoutVolume,
} from "../src/utils/workoutMetrics.ts";

test("maps backend errors without losing validation details or request id", () => {
  const error = new AxiosError("bad request", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 422,
    statusText: "Unprocessable Entity",
    headers: {},
    config: { headers: {} },
    data: {
      code: "VALIDATION_FAILED",
      message: "Check the highlighted fields.",
      request_id: "request-17",
      details: [{ field: "email", message: "Email is invalid." }],
    },
  });

  const mapped = toApiError(error);
  assert.equal(mapped.status, 422);
  assert.equal(mapped.code, "VALIDATION_FAILED");
  assert.equal(mapped.requestId, "request-17");
  assert.deepEqual(getFieldErrors(mapped), { email: "Email is invalid." });
  assert.equal(shouldRetryApiError(0, mapped), false);
});

test("retries only transient API and synchronization failures", () => {
  assert.equal(isRetryableSyncFailure(503), true);
  assert.equal(isRetryableSyncFailure(409, "IDEMPOTENCY_IN_PROGRESS"), true);
  assert.equal(isRetryableSyncFailure(422), false);
  assert.equal(syncRetryDelay(1), 2000);
  assert.equal(syncRetryDelay(20), 256000);
});

test("calculates workout metrics and formats Indonesian currency", () => {
  assert.equal(calculateWorkoutVolume(100, 8), 800);
  assert.equal(calculateEstimatedOneRepMax(100, 6), 120);
  assert.match(formatRupiah(1000), /1\.000/);
});

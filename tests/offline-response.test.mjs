import assert from "node:assert/strict";
import test from "node:test";

import { isOfflineQueuedResponse } from "../src/utils/offline-response.ts";

test("recognizes only the explicit offline queue acceptance shape", () => {
  assert.equal(
    isOfflineQueuedResponse({
      status: "pending",
      offline: true,
      pending_id: "queue-1",
    }),
    true,
  );
  assert.equal(
    isOfflineQueuedResponse({
      status: "pending",
      offline: false,
      pending_id: "queue-1",
    }),
    false,
  );
  assert.equal(
    isOfflineQueuedResponse({
      status: "success",
      offline: true,
      pending_id: "queue-1",
    }),
    false,
  );
  assert.equal(isOfflineQueuedResponse(null), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { rankDiscovery } from "../src/utils/discovery-ranking.ts";

const item = (resource_id) => ({ resource_type: "food", resource_id });

test("discovery ranking gives favorites then recents then matches ownership of duplicates", () => {
  const result = rankDiscovery(
    [item("custom:1"), item("custom:1")],
    [item("custom:1"), item("external:2")],
    [item("external:2"), item("custom:3")],
  );
  assert.deepEqual(result.favorites.map((value) => value.resource_id), ["custom:1"]);
  assert.deepEqual(result.recent.map((value) => value.resource_id), ["external:2"]);
  assert.deepEqual(result.matches.map((value) => value.resource_id), ["custom:3"]);
});

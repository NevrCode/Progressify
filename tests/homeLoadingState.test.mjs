import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("home training progress is controlled by the real query state", async () => {
  const source = await readFile("src/app/(tabs)/home.tsx", "utf8");

  assert.doesNotMatch(source, /gymLoading\s*\|\|\s*true/);
  assert.match(source, /gymLoading\s*\?/);
  assert.match(source, /We couldn&apos;t load your training progress\./);
});

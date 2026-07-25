import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("session progression charts initially show the latest data points", async () => {
  const source = await readFile("src/app/(tabs)/gymProgression.tsx", "utf8");

  assert.match(source, /<LineChart[\s\S]*?scrollToEnd/);
  assert.match(source, /scrollAnimation=\{false\}/);
  assert.match(
    source,
    /toDateSortValue\(a\.sessionDate\)\s*-\s*toDateSortValue\(b\.sessionDate\)/,
  );
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("session progression charts initially show the latest data points", async () => {
  const cardSource = await readFile(
    "src/components/gym/exercise-progression-card.tsx",
    "utf8",
  );
  const progressionSource = await readFile(
    "src/features/gym/exercise-progression.ts",
    "utf8",
  );

  assert.match(cardSource, /<LineChart[\s\S]*?scrollToEnd/);
  assert.match(cardSource, /scrollAnimation=\{false\}/);
  assert.match(
    progressionSource,
    /toDateSortValue\(a\.sessionDate\)\s*-\s*toDateSortValue\(b\.sessionDate\)/,
  );
});

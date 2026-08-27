import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("exercise progression and active sessions no longer depend on legacy split", () => {
  const gymService = read("../src/services/gymService.ts");
  const sessionStorage = read("../src/services/sessionStorage.ts");
  const progressionScreen = read("../src/app/(tabs)/gymProgression.tsx");
  const activeWorkout = read("../src/app/(pages)/activeWorkoutSession.tsx");

  assert.doesNotMatch(gymService, /SplitType|\bsplit:/);
  assert.doesNotMatch(sessionStorage, /\bsplit:/);
  assert.doesNotMatch(progressionScreen, /activeSplit|splitOptions|Exercise split/);
  assert.doesNotMatch(activeWorkout, /displaySplit|normalizeSplit|restoredSplit/);
});

test("obsolete local split program and summary modules are removed", () => {
  assert.equal(
    existsSync(new URL("../src/services/programStorage.ts", import.meta.url)),
    false,
  );
  assert.equal(
    existsSync(
      new URL("../src/components/gym/SplitSummaryCard.tsx", import.meta.url),
    ),
    false,
  );
});

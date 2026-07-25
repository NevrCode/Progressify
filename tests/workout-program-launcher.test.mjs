import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("workout programs prioritize starting a routine over editing it", async () => {
  const source = await readFile("src/app/(pages)/programs.tsx", "utf8");

  const launcher = source.indexOf("Choose today&apos;s workout");
  const management = source.indexOf("Manage program");
  const detailedExercises = source.indexOf(
    "routine.planned_exercises.map((planned)",
  );

  assert.ok(launcher >= 0);
  assert.ok(management > launcher);
  assert.ok(detailedExercises > management);
  assert.match(source, /horizontal/);
  assert.match(source, /label="Start workout"/);
  assert.match(source, /showManage\s*\?/);
  assert.match(source, /ReanimatedSwipeable/);
  assert.match(source, /renderLeftActions/);
  assert.match(source, /accessibilityActions/);
});

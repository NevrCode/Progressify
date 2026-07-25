import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("home training progress is controlled by the real query state", async () => {
  const source = await readFile("src/app/(tabs)/home.tsx", "utf8");

  assert.match(source, /gymQuery\.isLoading\s*\?/);
  assert.match(source, /gymQuery\.isError/);
  assert.match(source, /Cached data is\s+still shown where available\./);
  assert.doesNotMatch(source, /activeTab|setActiveTab/);
});

test("home uses real program, nutrition, water, and active-session data", async () => {
  const source = await readFile("src/app/(tabs)/home.tsx", "utf8");

  assert.match(source, /getWorkoutPrograms/);
  assert.match(source, /useTodayDiarySummary/);
  assert.match(source, /getWaterIntake/);
  assert.match(source, /logWaterIntake/);
  assert.match(source, /waterMutation\.mutate\(action\.increment\)/);
  assert.match(source, /useActiveSession/);
  assert.match(source, /sessionDatesThisWeek\.size/);
});

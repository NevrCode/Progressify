import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("critical mutation flows use inline accessible action feedback", async () => {
  const [sessions, food, foodLogging, programs, mealPreps] = await Promise.all([
    readFile("src/app/(pages)/manageWorkoutSession.tsx", "utf8"),
    readFile("src/app/(tabs)/foodDiary.tsx", "utf8"),
    readFile("src/components/nutrition/food-logging-flow.tsx", "utf8"),
    readFile("src/app/(pages)/programs.tsx", "utf8"),
    readFile("src/components/nutrition/mealPrepSection.tsx", "utf8"),
  ]);

  for (const source of [sessions, food, programs, mealPreps]) {
    assert.match(source, /<ActionStatus/);
    assert.match(source, /ActionFeedback/);
  }

  assert.match(sessions, /Session saved locally/);
  assert.match(foodLogging, /Food saved locally/);
  assert.match(foodLogging, /<ActionStatus/);
  assert.match(foodLogging, /ActionFeedback/);
  assert.match(programs, /surface: options\.surface \?\? "page"/);
  assert.doesNotMatch(programs, /alert\(`Could not \$\{operation\}`/);
});

test("food mutations distinguish queued writes and preserve failed forms", async () => {
  const [food, foodLogging, mealPreps, foodSearch, customFoodService, mealPrepService] =
    await Promise.all([
      readFile("src/app/(tabs)/foodDiary.tsx", "utf8"),
      readFile("src/components/nutrition/food-logging-flow.tsx", "utf8"),
      readFile("src/components/nutrition/mealPrepSection.tsx", "utf8"),
      readFile("src/components/nutrition/foodSearchModal.tsx", "utf8"),
      readFile("src/services/customFoodService.ts", "utf8"),
      readFile("src/services/mealPrepService.ts", "utf8"),
    ]);

  assert.match(food, /Profile saved locally/);
  assert.match(foodLogging, /Custom food saved locally/);
  assert.match(food, /Deletion saved locally/);
  assert.match(food, /surface: "profile"/);
  assert.match(foodLogging, /surface: "custom"/);
  assert.doesNotMatch(food, /alert\("Save failed"/);
  assert.doesNotMatch(foodLogging, /alert\("Create custom food failed"/);
  assert.doesNotMatch(food, /alert\("Delete failed"/);

  assert.match(mealPreps, /surface: "form"/);
  assert.match(mealPreps, /surface: "detail"/);
  assert.match(mealPreps, /surface: "log"/);
  assert.match(mealPreps, /Meal prep saved locally/);
  assert.doesNotMatch(mealPreps, /alert\("Create failed"/);
  assert.doesNotMatch(mealPreps, /alert\("Log failed"/);

  assert.match(foodSearch, /isOfflineQueuedResponse\(saved\)/);
  assert.match(foodSearch, /It can be added to this meal prep after synchronization/);
  assert.doesNotMatch(foodSearch, /alert\("Save failed"/);

  assert.match(customFoodService, /return res\.data/);
  assert.equal((mealPrepService.match(/return res\.data/g) ?? []).length >= 6, true);
});

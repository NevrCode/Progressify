import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("shared primitives preserve accessible names, state, and touch targets", () => {
  const appButton = read("../src/components/base/app-button.tsx");
  const iconButton = read("../src/components/base/icon-button.tsx");
  const pagination = read("../src/components/base/pagination-navigator.tsx");
  const formField = read("../src/components/base/form-field.tsx");

  assert.match(appButton, /accessibilityLabel=\{accessibilityLabel \?\? label\}/);
  assert.match(iconButton, /Math\.ceil\(\(44 - visualSize\) \/ 2\)/);
  assert.match(iconButton, /hitSlop=\{hitSlop \?\? effectiveHitSlop\}/);
  assert.match(pagination, /minWidth: 44/);
  assert.match(pagination, /minHeight: 44/);
  assert.match(formField, /accessibilityLiveRegion=\{error \? "polite" : "none"\}/);
});

test("workout controls identify destructive actions and rest timer state", () => {
  const workout = read("../src/app/(pages)/activeWorkoutSession.tsx");
  const setRow = read("../src/features/workout-session/active-workout-set-row.tsx");
  const restTimer = read("../src/components/gym/rest-timer-overlay.tsx");

  assert.match(setRow, /accessibilityLabel=\{`Remove set \$\{set\.set_number\}`\}/);
  assert.match(setRow, /accessibilityLabel=\{`Duplicate set \$\{set\.set_number\}`\}/);
  assert.match(setRow, /accessibilityLabel=\{`Complete set \$\{set\.set_number\}`\}/);
  assert.match(restTimer, /accessibilityLabel="Dismiss rest timer"/);
  assert.match(restTimer, /accessibilityLiveRegion="polite"/);
  assert.match(workout, /accessibilityLabel="Exit active workout"/);
});

test("visual training summaries provide concise screen-reader alternatives", () => {
  const gym = read("../src/app/(tabs)/gymProgression.tsx");
  const sessionManager = read(
    "../src/app/(pages)/manageWorkoutSession.tsx",
  );
  const progressionFrame = read(
    "../src/components/gym/progression-chart-frame.tsx",
  );
  const heatmap = read("../src/components/gym/MuscleHeatmap.tsx");

  assert.match(gym, /<ProgressionChartFrame/);
  assert.match(sessionManager, /<ProgressionChartFrame/);
  assert.match(progressionFrame, /accessibilityRole="image"/);
  assert.match(
    progressionFrame,
    /accessibilityLabel=\{summary\.accessibilityLabel\}/,
  );
  assert.match(heatmap, /accessibilityLabel=\{accessibleSummaryLabel\}/);
  assert.match(heatmap, /Weekly muscle volume/);
});

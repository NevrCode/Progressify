import assert from "node:assert/strict";
import test from "node:test";

import { buildProgressionChartSummary } from "../src/utils/progression-chart-summary.ts";

test("summarizes latest, best, overall change, and date range from sorted history", () => {
  const summary = buildProgressionChartSummary("Bench press", [
    { sessionDate: "2026-07-24", estimated1RM: 110 },
    { sessionDate: "2026-07-10", estimated1RM: 100 },
    { sessionDate: "2026-07-17", estimated1RM: 115 },
  ]);

  assert.equal(summary.sessionCount, 3);
  assert.equal(summary.latestValue, 110);
  assert.equal(summary.bestValue, 115);
  assert.equal(summary.overallChange, 10);
  assert.equal(summary.overallChangePercentage, 10);
  assert.equal(summary.firstDate, "2026-07-10");
  assert.equal(summary.latestDate, "2026-07-24");
  assert.match(summary.accessibilityLabel, /3 sessions/);
  assert.match(
    summary.accessibilityLabel,
    /from July 10, 2026 to July 24, 2026/,
  );
  assert.match(summary.accessibilityLabel, /Latest 110\.0 kilograms/);
  assert.match(
    summary.accessibilityLabel,
    /Best 115\.0 kilograms on July 17, 2026/,
  );
  assert.match(summary.accessibilityLabel, /increased by 10\.0 kilograms/);
});

test("describes a single session without inventing a trend", () => {
  const summary = buildProgressionChartSummary("Squat", [
    { sessionDate: "2026-07-24", estimated1RM: 140.25 },
  ]);

  assert.equal(summary.sessionCount, 1);
  assert.equal(summary.overallChange, undefined);
  assert.match(summary.accessibilityLabel, /1 session on July 24, 2026/);
  assert.match(summary.accessibilityLabel, /140\.3 kilograms/);
  assert.match(summary.accessibilityLabel, /More sessions are needed/);
});

test("reports missing history when no valid chart points remain", () => {
  const summary = buildProgressionChartSummary("Row", [
    { sessionDate: "", estimated1RM: 100 },
    { sessionDate: "2026-07-24", estimated1RM: 0 },
    { sessionDate: "invalid", estimated1RM: 100 },
  ]);

  assert.equal(summary.sessionCount, 0);
  assert.match(summary.accessibilityLabel, /No valid session history/);
});

test("announces an unchanged overall result without a false percentage", () => {
  const summary = buildProgressionChartSummary("Deadlift", [
    { sessionDate: "2026-07-10", estimated1RM: 180 },
    { sessionDate: "2026-07-24", estimated1RM: 180.02 },
  ]);

  assert.match(summary.accessibilityLabel, /is unchanged/);
  assert.doesNotMatch(summary.accessibilityLabel, /percent/);
});

test("uses the selected display formatter while leaving chart metrics canonical", () => {
  const summary = buildProgressionChartSummary(
    "Bench press",
    [
      { sessionDate: "2026-07-10", estimated1RM: 100 },
      { sessionDate: "2026-07-24", estimated1RM: 110 },
    ],
    { formatValue: (kilograms) => `${(kilograms * 2.20462262).toFixed(1)} pounds` },
  );

  assert.equal(summary.latestValue, 110);
  assert.match(summary.accessibilityLabel, /Latest 242\.5 pounds/);
  assert.match(summary.accessibilityLabel, /increased by 22\.0 pounds/);
  assert.doesNotMatch(summary.accessibilityLabel, /kilograms/);
});

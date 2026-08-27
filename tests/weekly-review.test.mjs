import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWeeklyReview,
  hasCompleteWeeklyFoodHistory,
} from "../src/utils/weekly-review.ts";

const referenceDate = new Date("2026-07-24T12:00:00Z");

test("compares recorded training and diary activity across two seven-day windows", () => {
  const review = buildWeeklyReview(
    [
      {
        exercise_sessions: [
          {
            session_date: "2026-07-24",
            sets: [{ weight: 100, reps: 10 }],
          },
          {
            session_date: "2026-07-22",
            sets: [{ weight: 60, reps: 10 }],
          },
          {
            session_date: "2026-07-17",
            sets: [{ weight: 50, reps: 10 }],
          },
          {
            session_date: "2026-07-15",
            sets: [{ weight: 40, reps: 10 }],
          },
          {
            session_date: "2026-07-25",
            sets: [{ weight: 999, reps: 10 }],
          },
        ],
      },
    ],
    [
      { date: "2026-07-24" },
      { date: "2026-07-24" },
      { date: "2026-07-20" },
      { date: "2026-07-16" },
    ],
    { referenceDate, foodHistoryComplete: true },
  );

  assert.deepEqual(review.trainingDays, {
    current: 2,
    previous: 2,
    difference: 0,
    percentageChange: 0,
  });
  assert.equal(review.trainingVolume.current, 1600);
  assert.equal(review.trainingVolume.previous, 900);
  assert.equal(Math.round(review.trainingVolume.percentageChange), 78);
  assert.deepEqual(review.diaryDays, {
    current: 2,
    previous: 1,
    difference: 1,
    percentageChange: 100,
  });
  assert.match(review.summary, /increased 78%/);
});

test("waits for a prior training baseline before claiming a trend", () => {
  const review = buildWeeklyReview(
    [
      {
        exercise_sessions: [
          {
            session_date: "2026-07-23",
            sets: [{ weight: 80, reps: 8 }],
          },
        ],
      },
    ],
    [],
    { referenceDate },
  );

  assert.equal(review.hasTrainingData, true);
  assert.equal(review.hasPreviousTrainingData, false);
  assert.match(review.summary, /establish your comparison baseline/);
  assert.equal(review.diaryDays, undefined);
});

test("detects whether paged diary history reaches the full review window", () => {
  assert.equal(
    hasCompleteWeeklyFoodHistory(
      [{ date: "2026-07-24" }, { date: "2026-07-11" }],
      50,
      referenceDate,
    ),
    true,
  );
  assert.equal(
    hasCompleteWeeklyFoodHistory(
      [{ date: "2026-07-24" }, { date: "2026-07-20" }],
      50,
      referenceDate,
    ),
    false,
  );
  assert.equal(
    hasCompleteWeeklyFoodHistory(
      [{ date: "2026-07-24" }, { date: "2026-07-20" }],
      2,
      referenceDate,
    ),
    true,
  );
});

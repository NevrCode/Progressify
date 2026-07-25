import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNutritionInsights,
  buildTrainingInsights,
} from "../src/utils/home-insights.ts";

const referenceDate = new Date("2026-07-24T12:00:00Z");

test("builds strength, volume, and consistency insights from recorded sets", () => {
  const insights = buildTrainingInsights(
    [
      {
        id: 7,
        name: "Chest press",
        exercise_sessions: [
          {
            session_date: "2026-07-24",
            sets: [{ weight: 100, reps: 10 }],
          },
          {
            session_date: "2026-07-21",
            sets: [{ weight: 80, reps: 10 }],
          },
        ],
      },
      {
        id: 8,
        name: "Row",
        exercise_sessions: [
          {
            session_date: "2026-07-24",
            sets: [{ weight: 60, reps: 10 }],
          },
          {
            session_date: "2026-07-21",
            sets: [{ weight: 60, reps: 5 }],
          },
        ],
      },
    ],
    referenceDate,
  );

  assert.deepEqual(
    insights.map((insight) => insight.id),
    ["strength-7", "volume-2026-07-24", "training-consistency"],
  );
  assert.match(insights[0].message, /Chest press improved 25%/);
  assert.match(insights[1].message, /higher/);
  assert.match(insights[2].message, /2 training days/);
});

test("does not invent a trend from a single training session", () => {
  const insights = buildTrainingInsights(
    [
      {
        name: "Squat",
        exercise_sessions: [
          {
            session_date: "2026-07-24",
            sets: [{ weight: 100, reps: 5 }],
          },
        ],
      },
    ],
    referenceDate,
  );

  assert.deepEqual(
    insights.map((insight) => insight.id),
    ["training-consistency"],
  );
});

test("detects a new estimated personal record without duplicating improvement", () => {
  const insights = buildTrainingInsights(
    [
      {
        id: 11,
        name: "Bench press",
        exercise_sessions: [
          {
            session_date: "2026-07-24",
            sets: [{ weight: 110, reps: 5 }],
          },
          {
            session_date: "2026-07-17",
            sets: [{ weight: 100, reps: 5 }],
          },
          {
            session_date: "2026-07-10",
            sets: [{ weight: 90, reps: 5 }],
          },
        ],
      },
    ],
    referenceDate,
  );

  const strengthInsights = insights.filter(
    (insight) =>
      insight.id.startsWith("personal-record") ||
      insight.id.startsWith("strength-"),
  );
  assert.equal(strengthInsights.length, 1);
  assert.equal(strengthInsights[0].title, "New estimated strength record");
  assert.match(strengthInsights[0].message, /128 kg one-rep max/);
  assert.match(strengthInsights[0].reason, /every earlier recorded session/);
});

test("detects a conservative five-session plateau without an improvement duplicate", () => {
  const insights = buildTrainingInsights(
    [
      {
        id: 12,
        name: "Lat pulldown",
        exercise_sessions: [
          {
            session_date: "2026-07-24",
            sets: [{ weight: 100, reps: 8 }],
          },
          {
            session_date: "2026-07-19",
            sets: [{ weight: 101, reps: 8 }],
          },
          {
            session_date: "2026-07-14",
            sets: [{ weight: 99, reps: 8 }],
          },
          {
            session_date: "2026-07-09",
            sets: [{ weight: 100, reps: 8 }],
          },
          {
            session_date: "2026-07-04",
            sets: [{ weight: 100, reps: 8 }],
          },
        ],
      },
    ],
    referenceDate,
  );

  const plateau = insights.find((insight) =>
    insight.id.startsWith("plateau-"),
  );
  assert.equal(plateau?.title, "Progress has levelled off");
  assert.match(plateau?.message ?? "", /last five sessions/);
  assert.equal(
    insights.some((insight) => insight.id.startsWith("strength-")),
    false,
  );
  assert.equal(
    insights.some((insight) => insight.id.startsWith("personal-record-")),
    false,
  );
});

test("does not call short or stale histories a plateau", () => {
  const insights = buildTrainingInsights(
    [
      {
        id: 13,
        name: "Row",
        exercise_sessions: [
          {
            session_date: "2026-06-01",
            sets: [{ weight: 100, reps: 8 }],
          },
          {
            session_date: "2026-05-28",
            sets: [{ weight: 100, reps: 8 }],
          },
          {
            session_date: "2026-05-24",
            sets: [{ weight: 100, reps: 8 }],
          },
          {
            session_date: "2026-05-20",
            sets: [{ weight: 100, reps: 8 }],
          },
          {
            session_date: "2026-05-16",
            sets: [{ weight: 100, reps: 8 }],
          },
        ],
      },
      {
        id: 14,
        name: "Squat",
        exercise_sessions: [
          {
            session_date: "2026-07-24",
            sets: [{ weight: 100, reps: 8 }],
          },
          {
            session_date: "2026-07-18",
            sets: [{ weight: 100, reps: 8 }],
          },
          {
            session_date: "2026-07-12",
            sets: [{ weight: 100, reps: 8 }],
          },
          {
            session_date: "2026-07-06",
            sets: [{ weight: 100, reps: 8 }],
          },
        ],
      },
    ],
    referenceDate,
  );

  assert.equal(
    insights.some((insight) => insight.id.startsWith("plateau-")),
    false,
  );
});

test("ignores future sessions across strength, volume, and consistency signals", () => {
  const insights = buildTrainingInsights(
    [
      {
        id: 15,
        name: "Deadlift",
        exercise_sessions: [
          {
            session_date: "2026-07-25",
            sets: [{ weight: 999, reps: 10 }],
          },
          {
            session_date: "2026-07-24",
            sets: [{ weight: 100, reps: 10 }],
          },
          {
            session_date: "2026-07-20",
            sets: [{ weight: 80, reps: 10 }],
          },
        ],
      },
    ],
    referenceDate,
  );

  assert.equal(
    insights.some((insight) => insight.id.includes("2026-07-25")),
    false,
  );
  assert.equal(
    insights.some((insight) => insight.id.startsWith("personal-record-")),
    false,
  );
  assert.match(insights[0].message, /improved 25%/);
});

test("builds today's protein insight and recent diary consistency", () => {
  const insights = buildNutritionInsights(
    {
      protein: {
        consumed: 90,
        goal: 100,
        remaining: 10,
        percentage: 90,
      },
    },
    [
      { date: "2026-07-24" },
      { date: "2026-07-24" },
      { date: "2026-07-22" },
      { date: "2026-07-18" },
      { date: "2026-07-10" },
    ],
    referenceDate,
  );

  assert.equal(insights[0].title, "Protein is on track");
  assert.equal(insights[0].tone, "positive");
  assert.match(insights[1].message, /3 days in the last seven days/);
});

test("falls back to calories only when protein has not been logged", () => {
  const [insight] = buildNutritionInsights(
    {
      calories: { consumed: 2200, goal: 2000 },
      protein: { consumed: 0, goal: 150 },
    },
    [],
    referenceDate,
  );

  assert.equal(insight.id, "calories-today");
  assert.equal(insight.tone, "warning");
});

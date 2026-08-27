export type WeeklyReviewMetric = {
  current: number;
  previous: number;
  difference: number;
  percentageChange?: number;
};

export type WeeklyReview = {
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  trainingDays: WeeklyReviewMetric;
  trainingVolume: WeeklyReviewMetric;
  diaryDays?: WeeklyReviewMetric;
  summary: string;
  hasTrainingData: boolean;
  hasPreviousTrainingData: boolean;
};

type SetLike = {
  weight?: number;
  reps?: number;
  set_type?: string;
};

type SessionLike = {
  session_date?: string;
  sets?: SetLike[];
};

type ExerciseLike = {
  exercise_sessions?: SessionLike[];
};

type FoodEntryLike = {
  date?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const utcDay = (date: Date) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

const dateKeyToTime = (value?: string) => {
  if (!value) return undefined;
  const time = new Date(`${value.slice(0, 10)}T00:00:00Z`).getTime();
  return Number.isFinite(time) ? time : undefined;
};

const inRange = (time: number, start: number, end: number) =>
  time >= start && time <= end;

const periodLabel = (start: number, end: number) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameMonth = startDate.getUTCMonth() === endDate.getUTCMonth();
  const startLabel = startDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const endLabel = endDate.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${startLabel}–${endLabel}`;
};

const metric = (current: number, previous: number): WeeklyReviewMetric => ({
  current,
  previous,
  difference: current - previous,
  percentageChange:
    previous > 0 ? ((current - previous) / previous) * 100 : undefined,
});

const setVolume = (set: SetLike) => {
  if (set.set_type === "WARMUP") return 0;
  const weight = Number(set.weight ?? 0);
  const reps = Number(set.reps ?? 0);
  return weight > 0 && reps > 0 ? weight * reps : 0;
};

export const getWeeklyReviewStartTime = (referenceDate = new Date()) =>
  utcDay(referenceDate) - 13 * DAY_MS;

export const hasCompleteWeeklyFoodHistory = (
  entries: FoodEntryLike[],
  totalEntries: number,
  referenceDate = new Date(),
) => {
  if (totalEntries <= entries.length) return true;
  const oldestLoadedTime = Math.min(
    ...entries
      .map((entry) => dateKeyToTime(entry.date))
      .filter((time): time is number => time !== undefined),
  );
  return (
    Number.isFinite(oldestLoadedTime) &&
    oldestLoadedTime <= getWeeklyReviewStartTime(referenceDate)
  );
};

export const buildWeeklyReview = (
  exercises: ExerciseLike[],
  foodEntries: FoodEntryLike[],
  options: {
    referenceDate?: Date;
    foodHistoryComplete?: boolean;
  } = {},
): WeeklyReview => {
  const referenceDate = options.referenceDate ?? new Date();
  const currentEnd = utcDay(referenceDate);
  const currentStart = currentEnd - 6 * DAY_MS;
  const previousEnd = currentStart - DAY_MS;
  const previousStart = previousEnd - 6 * DAY_MS;
  const currentTrainingDates = new Set<number>();
  const previousTrainingDates = new Set<number>();
  let currentVolume = 0;
  let previousVolume = 0;

  for (const exercise of exercises) {
    for (const session of exercise.exercise_sessions ?? []) {
      const time = dateKeyToTime(session.session_date);
      if (time === undefined) continue;
      const volume = (session.sets ?? []).reduce(
        (total, set) => total + setVolume(set),
        0,
      );

      if (inRange(time, currentStart, currentEnd)) {
        currentTrainingDates.add(time);
        currentVolume += volume;
      } else if (inRange(time, previousStart, previousEnd)) {
        previousTrainingDates.add(time);
        previousVolume += volume;
      }
    }
  }

  const trainingDays = metric(
    currentTrainingDates.size,
    previousTrainingDates.size,
  );
  const trainingVolume = metric(currentVolume, previousVolume);
  let diaryDays: WeeklyReviewMetric | undefined;

  if (options.foodHistoryComplete) {
    const currentDiaryDates = new Set<number>();
    const previousDiaryDates = new Set<number>();

    for (const entry of foodEntries) {
      const time = dateKeyToTime(entry.date);
      if (time === undefined) continue;
      if (inRange(time, currentStart, currentEnd)) {
        currentDiaryDates.add(time);
      } else if (inRange(time, previousStart, previousEnd)) {
        previousDiaryDates.add(time);
      }
    }

    diaryDays = metric(currentDiaryDates.size, previousDiaryDates.size);
  }

  const hasTrainingData =
    trainingDays.current > 0 || trainingVolume.current > 0;
  const hasPreviousTrainingData =
    trainingDays.previous > 0 || trainingVolume.previous > 0;
  let summary =
    "Complete training sessions in both periods to unlock a useful comparison.";

  if (hasTrainingData && !hasPreviousTrainingData) {
    summary =
      "This week is recorded. One more week of sessions will establish your comparison baseline.";
  } else if (hasTrainingData && hasPreviousTrainingData) {
    const volumeChange = trainingVolume.percentageChange;
    if (volumeChange !== undefined && Math.abs(volumeChange) >= 10) {
      summary =
        volumeChange > 0
          ? `Recorded training volume increased ${Math.round(volumeChange)}% week over week.`
          : `Recorded training volume decreased ${Math.round(Math.abs(volumeChange))}% week over week.`;
    } else if (trainingDays.difference !== 0) {
      summary =
        trainingDays.difference > 0
          ? `You trained ${trainingDays.difference} more ${
              trainingDays.difference === 1 ? "day" : "days"
            } than the previous week.`
          : `You trained ${Math.abs(trainingDays.difference)} fewer ${
              Math.abs(trainingDays.difference) === 1 ? "day" : "days"
            } than the previous week.`;
    } else {
      summary = "Training frequency and recorded volume stayed broadly steady.";
    }
  }

  return {
    currentPeriodLabel: periodLabel(currentStart, currentEnd),
    previousPeriodLabel: periodLabel(previousStart, previousEnd),
    trainingDays,
    trainingVolume,
    diaryDays,
    summary,
    hasTrainingData,
    hasPreviousTrainingData,
  };
};

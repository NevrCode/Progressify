export type InsightTone = "positive" | "info" | "warning" | "neutral";
export type InsightCategory = "Training" | "Nutrition";
export type InsightDestination = "gym" | "food";

export type HomeInsight = {
  id: string;
  category: InsightCategory;
  title: string;
  message: string;
  reason: string;
  tone: InsightTone;
  destination: InsightDestination;
};

type ExerciseSetLike = {
  weight?: number;
  reps?: number;
  set_type?: string;
};

type ExerciseSessionLike = {
  session_date?: string;
  sets?: ExerciseSetLike[];
};

type ExerciseLike = {
  id?: number;
  name?: string;
  exercise_sessions?: ExerciseSessionLike[];
};

type MacroProgressLike = {
  consumed?: number;
  goal?: number;
  remaining?: number;
  percentage?: number;
};

type NutritionProgressLike = {
  calories?: MacroProgressLike;
  protein?: MacroProgressLike;
};

type FoodEntryLike = {
  date?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const getDateKey = (value?: string) => {
  if (!value) return undefined;
  const key = value.slice(0, 10);
  const time = new Date(`${key}T00:00:00Z`).getTime();
  return Number.isFinite(time) ? key : undefined;
};

const startOfUtcDay = (value: Date) =>
  Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

const isWithinLastSevenDays = (dateKey: string, referenceDate: Date) => {
  const time = new Date(`${dateKey}T00:00:00Z`).getTime();
  const end = startOfUtcDay(referenceDate);
  return time >= end - 6 * DAY_MS && time <= end;
};

const sessionTime = (session: ExerciseSessionLike) => {
  const key = getDateKey(session.session_date);
  return key ? new Date(`${key}T00:00:00Z`).getTime() : 0;
};

const estimatedOneRepMax = (set: ExerciseSetLike) => {
  if (set.set_type === "WARMUP") return 0;
  const weight = Number(set.weight ?? 0);
  const reps = Number(set.reps ?? 0);
  return weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;
};

const sessionOneRepMax = (session: ExerciseSessionLike) =>
  Math.max(0, ...(session.sets ?? []).map(estimatedOneRepMax));

const sessionVolume = (session: ExerciseSessionLike) =>
  (session.sets ?? []).reduce((total, set) => {
    if (set.set_type === "WARMUP") return total;
    const weight = Number(set.weight ?? 0);
    const reps = Number(set.reps ?? 0);
    return total + (weight > 0 && reps > 0 ? weight * reps : 0);
  }, 0);

const roundedPercentage = (value: number) => Math.max(1, Math.round(value));

export const buildTrainingInsights = (
  exercises: ExerciseLike[],
  referenceDate = new Date(),
): HomeInsight[] => {
  const referenceTime = startOfUtcDay(referenceDate);
  const strengthSignals = exercises.map((exercise) => {
    const sessions = [...(exercise.exercise_sessions ?? [])]
      .map((session) => ({
        session,
        time: sessionTime(session),
        estimate: sessionOneRepMax(session),
      }))
      .filter(
        ({ time, estimate }) =>
          time > 0 && time <= referenceTime && estimate > 0,
      )
      .sort((left, right) => right.time - left.time);
    const latest = sessions[0];
    const previous = sessions[1];
    const earlierBest = Math.max(
      0,
      ...sessions.slice(1).map(({ estimate }) => estimate),
    );
    const latestChange =
      previous?.estimate > 0
        ? ((latest.estimate - previous.estimate) / previous.estimate) * 100
        : 0;
    const recordChange =
      earlierBest > 0
        ? ((latest?.estimate ?? 0) - earlierBest) / earlierBest * 100
        : 0;
    const isPersonalRecord =
      sessions.length >= 3 && recordChange >= 1;
    const plateauSessions = sessions.slice(0, 5);
    const plateauEstimates = plateauSessions.map(({ estimate }) => estimate);
    const plateauMaximum = Math.max(0, ...plateauEstimates);
    const plateauMinimum = Math.min(...plateauEstimates);
    const plateauRange =
      plateauMaximum > 0
        ? ((plateauMaximum - plateauMinimum) / plateauMaximum) * 100
        : Number.POSITIVE_INFINITY;
    const plateauSpan =
      plateauSessions.length === 5
        ? plateauSessions[0].time - plateauSessions[4].time
        : 0;
    const latestAge = latest ? referenceTime - latest.time : Infinity;
    const isPlateau =
      !isPersonalRecord &&
      plateauSessions.length === 5 &&
      latestAge >= 0 &&
      latestAge <= 13 * DAY_MS &&
      plateauSpan >= 14 * DAY_MS &&
      plateauRange <= 3;

    return {
      id: exercise.id ?? exercise.name ?? "exercise",
      name: exercise.name?.trim() || "Exercise",
      latestDate: latest?.session.session_date?.slice(0, 10) ?? "unknown",
      latestEstimate: latest?.estimate ?? 0,
      latestTime: latest?.time ?? 0,
      latestChange,
      recordChange,
      plateauRange,
      isPersonalRecord,
      isPlateau,
    };
  });

  const volumeByDate = new Map<string, number>();
  const sessionDates = new Set<string>();

  for (const exercise of exercises) {
    for (const session of exercise.exercise_sessions ?? []) {
      const dateKey = getDateKey(session.session_date);
      if (!dateKey) continue;
      const dateTime = new Date(`${dateKey}T00:00:00Z`).getTime();
      if (dateTime > referenceTime) continue;

      sessionDates.add(dateKey);
      const volume = sessionVolume(session);
      if (volume > 0) {
        volumeByDate.set(dateKey, (volumeByDate.get(dateKey) ?? 0) + volume);
      }
    }
  }

  const insights: HomeInsight[] = [];
  const personalRecord = strengthSignals
    .filter((signal) => signal.isPersonalRecord)
    .sort((left, right) => right.recordChange - left.recordChange)[0];
  const strongestImprovement = strengthSignals
    .filter(
      (signal) =>
        !signal.isPersonalRecord &&
        !signal.isPlateau &&
        signal.latestChange >= 1,
    )
    .sort((left, right) => right.latestChange - left.latestChange)[0];
  const plateau = strengthSignals
    .filter((signal) => signal.isPlateau)
    .sort((left, right) => right.latestTime - left.latestTime)[0];

  if (personalRecord) {
    insights.push({
      id: `personal-record-${personalRecord.id}-${personalRecord.latestDate}`,
      category: "Training",
      title: "New estimated strength record",
      message: `${personalRecord.name} reached an estimated ${Math.round(
        personalRecord.latestEstimate,
      )} kg one-rep max, ${roundedPercentage(
        personalRecord.recordChange,
      )}% above its previous best.`,
      reason:
        "The latest session is compared with every earlier recorded session for this exercise using weight × (1 + reps ÷ 30). At least three valid sessions and a 1% improvement are required.",
      tone: "positive",
      destination: "gym",
    });
  }

  if (strongestImprovement) {
    const change = roundedPercentage(strongestImprovement.latestChange);
    insights.push({
      id: `strength-${strongestImprovement.id}`,
      category: "Training",
      title: "Strength is moving up",
      message: `${strongestImprovement.name} improved ${change}% from its previous session.`,
      reason:
        "This compares the best estimated one-rep max from the latest two recorded sessions using weight × (1 + reps ÷ 30).",
      tone: "positive",
      destination: "gym",
    });
  }

  if (plateau) {
    insights.push({
      id: `plateau-${plateau.id}-${plateau.latestDate}`,
      category: "Training",
      title: "Progress has levelled off",
      message: `${plateau.name} estimated strength stayed within ${Math.max(
        1,
        Math.ceil(plateau.plateauRange),
      )}% across its last five sessions.`,
      reason:
        "This appears only when five valid estimated one-rep max results span at least 14 days, the latest session is recent, and the total range is no more than 3%. It is a trend prompt, not an automatic program change.",
      tone: "info",
      destination: "gym",
    });
  }

  const volumeDates = [...volumeByDate.keys()].sort().reverse();
  if (volumeDates.length >= 2) {
    const currentVolume = volumeByDate.get(volumeDates[0]) ?? 0;
    const previousVolume = volumeByDate.get(volumeDates[1]) ?? 0;
    const change =
      previousVolume > 0
        ? ((currentVolume - previousVolume) / previousVolume) * 100
        : 0;

    if (Math.abs(change) >= 5) {
      const increased = change > 0;
      insights.push({
        id: `volume-${volumeDates[0]}`,
        category: "Training",
        title: increased
          ? "Recorded volume increased"
          : "Recorded volume dipped",
        message: `Your latest recorded training volume was ${Math.round(
          Math.abs(change),
        )}% ${increased ? "higher" : "lower"} than the previous training day.`,
        reason:
          "This adds weight × reps across every recorded set on each of your latest two training dates. A lower day can also reflect a lighter or shorter workout.",
        tone: increased ? "positive" : "neutral",
        destination: "gym",
      });
    }
  }

  const recentTrainingDays = [...sessionDates].filter((dateKey) =>
    isWithinLastSevenDays(dateKey, referenceDate),
  ).length;

  if (recentTrainingDays > 0) {
    insights.push({
      id: "training-consistency",
      category: "Training",
      title: "Seven-day consistency",
      message: `${recentTrainingDays} training ${
        recentTrainingDays === 1 ? "day" : "days"
      } recorded in the last seven days.`,
      reason:
        "This counts unique dates with at least one completed exercise session. It does not assume a fixed workout split or weekly target.",
      tone: recentTrainingDays >= 3 ? "positive" : "info",
      destination: "gym",
    });
  }

  return insights;
};

export const buildNutritionInsights = (
  progress?: NutritionProgressLike,
  entries: FoodEntryLike[] = [],
  referenceDate = new Date(),
): HomeInsight[] => {
  const insights: HomeInsight[] = [];
  const protein = progress?.protein;
  const proteinGoal = Number(protein?.goal ?? 0);
  const proteinConsumed = Number(protein?.consumed ?? 0);
  const proteinPercentage =
    proteinGoal > 0
      ? (proteinConsumed / proteinGoal) * 100
      : Number(protein?.percentage ?? 0);

  if (proteinGoal > 0 && proteinConsumed > 0) {
    const remaining = Math.max(
      0,
      Number(protein?.remaining ?? proteinGoal - proteinConsumed),
    );
    const onTrack = proteinPercentage >= 85;

    insights.push({
      id: "protein-today",
      category: "Nutrition",
      title: onTrack ? "Protein is on track" : "Protein still has room",
      message: onTrack
        ? `${Math.round(proteinConsumed)} g logged toward today’s ${Math.round(
            proteinGoal,
          )} g goal.`
        : `${Math.round(remaining)} g remains to reach today’s protein goal.`,
      reason:
        "This uses today’s food diary totals and your current protein goal. It updates whenever today’s entries change.",
      tone: onTrack ? "positive" : proteinPercentage < 50 ? "warning" : "info",
      destination: "food",
    });
  } else {
    const calories = progress?.calories;
    const calorieGoal = Number(calories?.goal ?? 0);
    const calorieConsumed = Number(calories?.consumed ?? 0);
    if (calorieGoal > 0 && calorieConsumed > 0) {
      const percentage = (calorieConsumed / calorieGoal) * 100;
      insights.push({
        id: "calories-today",
        category: "Nutrition",
        title: percentage <= 105 ? "Calories are in range" : "Goal exceeded",
        message: `${Math.round(calorieConsumed)} of ${Math.round(
          calorieGoal,
        )} kcal logged today.`,
        reason:
          "This compares today’s food diary total with your current calorie goal. It is guidance, not a medical assessment.",
        tone: percentage <= 105 ? "info" : "warning",
        destination: "food",
      });
    }
  }

  const loggingDates = new Set(
    entries
      .map((entry) => getDateKey(entry.date))
      .filter(
        (dateKey): dateKey is string =>
          !!dateKey && isWithinLastSevenDays(dateKey, referenceDate),
      ),
  );

  if (loggingDates.size >= 2) {
    insights.push({
      id: "nutrition-logging",
      category: "Nutrition",
      title: "Diary consistency",
      message: `Your recent entries include meals on ${loggingDates.size} days in the last seven days.`,
      reason:
        "This counts unique dates among the most recent food diary entries currently loaded. It may undercount busy logging weeks and does not judge whether meals were nutritionally complete.",
      tone: loggingDates.size >= 5 ? "positive" : "info",
      destination: "food",
    });
  }

  return insights;
};

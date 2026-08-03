export type ProgressionChartPoint = {
  sessionDate: string;
  estimated1RM: number;
};

export type ProgressionChartSummary = {
  sessionCount: number;
  latestValue?: number;
  bestValue?: number;
  overallChange?: number;
  overallChangePercentage?: number;
  firstDate?: string;
  latestDate?: string;
  accessibilityLabel: string;
};

export type ProgressionChartSummaryOptions = {
  /** Values supplied by the gym API are canonical kilograms. */
  formatValue?: (kilograms: number) => string;
};

const parseDate = (value: string) => {
  const dateKey = value.slice(0, 10);
  const time = new Date(`${dateKey}T00:00:00Z`).getTime();
  return Number.isFinite(time) ? { dateKey, time } : undefined;
};

const formatDate = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const formatKilograms = (value: number) => `${value.toFixed(1)} kilograms`;

export const buildProgressionChartSummary = (
  exerciseName: string,
  points: ProgressionChartPoint[],
  options: ProgressionChartSummaryOptions = {},
): ProgressionChartSummary => {
  const formatValue = options.formatValue ?? formatKilograms;
  const validPoints = points
    .map((point) => {
      const parsedDate = parseDate(point.sessionDate);
      const value = Number(point.estimated1RM);
      return parsedDate && Number.isFinite(value) && value > 0
        ? { ...point, ...parsedDate, estimated1RM: value }
        : undefined;
    })
    .filter((point): point is NonNullable<typeof point> => !!point)
    .sort((left, right) => left.time - right.time);

  if (validPoints.length === 0) {
    return {
      sessionCount: 0,
      accessibilityLabel: `${exerciseName} estimated one-rep max progression. No valid session history is available.`,
    };
  }

  const first = validPoints[0];
  const latest = validPoints[validPoints.length - 1];
  const best = validPoints.reduce((currentBest, point) =>
    point.estimated1RM > currentBest.estimated1RM ? point : currentBest,
  );
  const baseSummary = `${exerciseName} estimated one-rep max progression. ${
    validPoints.length
  } ${validPoints.length === 1 ? "session" : "sessions"}`;

  if (validPoints.length === 1) {
    return {
      sessionCount: 1,
      latestValue: latest.estimated1RM,
      bestValue: best.estimated1RM,
      firstDate: first.dateKey,
      latestDate: latest.dateKey,
      accessibilityLabel: `${baseSummary} on ${formatDate(
        latest.dateKey,
      )}. Estimated one-rep max ${formatValue(
        latest.estimated1RM,
      )}. More sessions are needed to calculate an overall change.`,
    };
  }

  const overallChange = latest.estimated1RM - first.estimated1RM;
  const overallChangePercentage =
    first.estimated1RM > 0
      ? (overallChange / first.estimated1RM) * 100
      : undefined;
  const changeDirection =
    Math.abs(overallChange) < 0.05
      ? "unchanged"
      : overallChange > 0
        ? "increased"
        : "decreased";
  const changeSummary =
    changeDirection === "unchanged"
      ? "Overall estimated one-rep max is unchanged from the first displayed session."
      : `Overall estimated one-rep max ${changeDirection} by ${formatValue(
          Math.abs(overallChange),
        )}, or ${Math.abs(overallChangePercentage ?? 0).toFixed(
          0,
        )} percent, from the first displayed session.`;

  return {
    sessionCount: validPoints.length,
    latestValue: latest.estimated1RM,
    bestValue: best.estimated1RM,
    overallChange,
    overallChangePercentage,
    firstDate: first.dateKey,
    latestDate: latest.dateKey,
    accessibilityLabel: `${baseSummary} from ${formatDate(
      first.dateKey,
    )} to ${formatDate(latest.dateKey)}. Latest ${formatValue(
      latest.estimated1RM,
    )}. Best ${formatValue(best.estimated1RM)} on ${formatDate(
      best.dateKey,
    )}. ${changeSummary}`,
  };
};

import type { ExerciseSessionDTO } from "@/services/gymService";
import {
  calculateEstimatedOneRepMax,
  calculateWorkingSetVolume,
} from "@/utils/workoutMetrics";
import { isWorkingSet } from "@/types/workout-set";
import type { MeasurementSystem } from "@/utils/measurement-units";
import { displayMass, massUnitLabel } from "@/utils/measurement-units";

export type SessionProgressionPoint = {
  key: string;
  label: string;
  sessionDate: string;
  topWeight: number;
  bestReps: number;
  estimated1RM: number;
  totalVolume: number;
  totalSets: number;
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const formatSessionLabel = (value?: string) => {
  if (!value) return "Undated";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export const getDayMonthYear = (value?: string) => {
  if (!value) return "";

  const month = MONTH_NAMES[new Date(value).getMonth()];
  const day = new Date(value).getDate();
  const y = new Date(value).getFullYear();
  return month + " " + day + ", " + y;
};

export const getDayMonth = (value?: string) => {
  if (!value) return "";

  const month = MONTH_NAMES[new Date(value).getMonth()];
  const day = new Date(value).getDate();
  return month + " " + day;
};

export const toDateSortValue = (value?: string) => {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const parsed = new Date(value).getTime();
  if (!Number.isNaN(parsed)) return parsed;

  const fallback = Date.parse(value.slice(0, 10));
  return Number.isNaN(fallback) ? Number.MAX_SAFE_INTEGER : fallback;
};

export const buildSessionProgression = (
  exerciseSessions: ExerciseSessionDTO[],
): SessionProgressionPoint[] => {
  const points = exerciseSessions
    .map((session) => {
      const sessionDate = session.session_date ?? "";
      const sessionSets = (session.sets ?? []).filter(isWorkingSet);

      if (!sessionDate || sessionSets.length === 0) {
        return null;
      }

      const sortedSets = [...sessionSets].sort(
        (a, b) => a.set_number - b.set_number,
      );

      const topSet = sortedSets.reduce((best, current) => {
        if (current.weight > best.weight) {
          return current;
        }

        if (current.weight === best.weight && current.reps > best.reps) {
          return current;
        }

        return best;
      });

      const totalVolume = calculateWorkingSetVolume(sortedSets);

      const estimated1RM = calculateEstimatedOneRepMax(
        topSet.weight,
        topSet.reps,
      );

      return {
        key: `${session.id}-${sessionDate}`,
        label: formatSessionLabel(sessionDate),
        sessionDate,
        topWeight: topSet.weight,
        bestReps: topSet.reps,
        estimated1RM,
        totalSets: sortedSets.length,
        totalVolume,
      };
    })
    .filter(Boolean);

  return (points as SessionProgressionPoint[]).sort(
    (a, b) => toDateSortValue(a.sessionDate) - toDateSortValue(b.sessionDate),
  );
};

export const get1RMTrend = (
  points: SessionProgressionPoint[],
  measurementSystem: MeasurementSystem,
): { value: string; isPositive: boolean } | null => {
  if (points.length < 2) return null;
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];

  if (previous.estimated1RM <= 0) return null;

  const diff = latest.estimated1RM - previous.estimated1RM;
  const pct = (diff / previous.estimated1RM) * 100;

  if (Math.abs(diff) < 0.1) return null;

  return {
    value: `${diff > 0 ? "+" : "-"}${displayMass(Math.abs(diff), measurementSystem)} ${massUnitLabel(measurementSystem)} (${diff > 0 ? "+" : ""}${pct.toFixed(0)}%)`,
    isPositive: diff > 0,
  };
};

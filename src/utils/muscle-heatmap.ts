import type { ExerciseProgressionDTO } from "@/services/gymService";
import type { CatalogExercise } from "@/types/exercise-catalog";
import type { Slug } from "react-native-body-highlighter";

export const CATALOG_MUSCLES = [
  "abdominals",
  "abductors",
  "adductors",
  "biceps",
  "calves",
  "chest",
  "forearms",
  "glutes",
  "hamstrings",
  "lats",
  "lower back",
  "middle back",
  "neck",
  "quadriceps",
  "shoulders",
  "traps",
  "triceps",
] as const;

export type CatalogMuscle = (typeof CATALOG_MUSCLES)[number];
export type MuscleIntensity = 0 | 1 | 2 | 3;

export const MUSCLE_ATTRIBUTION_WEIGHTS = {
  primary: 1,
  secondary: 0.5,
} as const;

export const MUSCLE_INTENSITY_THRESHOLDS = {
  lowMaximum: 4,
  moderateMaximum: 12,
} as const;

export const MUSCLE_INTENSITY_COLORS = [
  "#F2994A",
  "#F2C94C",
  "#27AE60",
] as const;

export const CATALOG_MUSCLE_TO_BODY_SLUGS: Record<
  CatalogMuscle,
  readonly Slug[] | null
> = {
  abdominals: ["abs", "obliques"],
  abductors: null,
  adductors: ["adductors"],
  biceps: ["biceps"],
  calves: ["calves"],
  chest: ["chest"],
  forearms: ["forearm"],
  glutes: ["gluteal"],
  hamstrings: ["hamstring"],
  lats: ["upper-back"],
  "lower back": ["lower-back"],
  "middle back": ["upper-back"],
  neck: ["neck"],
  quadriceps: ["quadriceps"],
  shoulders: ["deltoids"],
  traps: ["trapezius"],
  triceps: ["triceps"],
};

export type MuscleContribution = {
  muscle: CatalogMuscle;
  setEquivalents: number;
};

export type WeeklyMuscleVolume = {
  muscleTotals: Record<CatalogMuscle, number>;
  bodyRegionTotals: Partial<Record<Slug, number>>;
  bodyRegionContributions: Partial<Record<Slug, MuscleContribution[]>>;
  unmappedExerciseCount: number;
};

const CATALOG_MUSCLE_SET = new Set<string>(CATALOG_MUSCLES);
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const isCatalogMuscle = (value: string): value is CatalogMuscle =>
  CATALOG_MUSCLE_SET.has(value);

export const getMuscleIntensity = (
  setEquivalents: number,
): MuscleIntensity => {
  if (setEquivalents <= 0) return 0;
  if (setEquivalents <= MUSCLE_INTENSITY_THRESHOLDS.lowMaximum) return 1;
  if (setEquivalents <= MUSCLE_INTENSITY_THRESHOLDS.moderateMaximum) return 2;
  return 3;
};

export const getMuscleIntensityLabel = (
  intensity: MuscleIntensity,
): string => {
  if (intensity === 1) return "Low exposure";
  if (intensity === 2) return "Moderate exposure";
  if (intensity === 3) return "Target exposure";
  return "No exposure";
};

const createEmptyMuscleTotals = (): Record<CatalogMuscle, number> =>
  Object.fromEntries(CATALOG_MUSCLES.map((muscle) => [muscle, 0])) as Record<
    CatalogMuscle,
    number
  >;

const getSevenDayWindowStart = (now: Date): number => {
  const start = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return start - 6 * DAY_IN_MS;
};

const parseSessionDate = (value: string): number | null => {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const parsed = dateOnlyMatch
    ? Date.UTC(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : Date.parse(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeCustomMuscle = (
  muscleGroup: string | undefined,
): CatalogMuscle | null => {
  const normalized = muscleGroup?.trim().toLowerCase() ?? "";
  return isCatalogMuscle(normalized) ? normalized : null;
};

export const calculateWeeklyMuscleVolume = ({
  exercises,
  catalogById,
  now = new Date(),
}: {
  exercises: ExerciseProgressionDTO[];
  catalogById: ReadonlyMap<string, CatalogExercise>;
  now?: Date;
}): WeeklyMuscleVolume => {
  const muscleTotals = createEmptyMuscleTotals();
  const windowStart = getSevenDayWindowStart(now);
  const windowEnd = now.getTime();
  let unmappedExerciseCount = 0;

  for (const exercise of exercises) {
    const catalogExercise = exercise.catalog_exercise_id
      ? catalogById.get(exercise.catalog_exercise_id)
      : undefined;
    const customMuscle = catalogExercise
      ? null
      : normalizeCustomMuscle(exercise.muscle_group);

    const catalogPrimaryMuscle =
      catalogExercise && isCatalogMuscle(catalogExercise.primaryMuscle)
        ? catalogExercise.primaryMuscle
        : null;
    const catalogSecondaryMuscles =
      catalogExercise?.secondaryMuscles ?? [];
    const muscles: MuscleContribution[] = catalogPrimaryMuscle
      ? [
          {
            muscle: catalogPrimaryMuscle,
            setEquivalents: MUSCLE_ATTRIBUTION_WEIGHTS.primary,
          },
          ...catalogSecondaryMuscles
            .filter(
              (muscle): muscle is CatalogMuscle =>
                isCatalogMuscle(muscle) && muscle !== catalogPrimaryMuscle,
            )
            .map((muscle) => ({
              muscle,
              setEquivalents: MUSCLE_ATTRIBUTION_WEIGHTS.secondary,
            })),
        ]
      : customMuscle
        ? [
            {
              muscle: customMuscle,
              setEquivalents: MUSCLE_ATTRIBUTION_WEIGHTS.primary,
            },
          ]
        : [];

    if (muscles.length === 0) {
      unmappedExerciseCount += 1;
      continue;
    }

    const completedSetCount = (exercise.exercise_sessions ?? []).reduce(
      (total, session) => {
        if (!session.session_date) return total;
        const sessionTime = parseSessionDate(session.session_date);
        if (
          sessionTime === null ||
          sessionTime < windowStart ||
          sessionTime > windowEnd
        ) {
          return total;
        }
        return (
          total +
          (session.sets ?? []).filter((set) => set.set_type !== "WARMUP").length
        );
      },
      0,
    );

    for (const contribution of muscles) {
      muscleTotals[contribution.muscle] +=
        completedSetCount * contribution.setEquivalents;
    }
  }

  const bodyRegionTotals: Partial<Record<Slug, number>> = {};
  const bodyRegionContributions: Partial<
    Record<Slug, MuscleContribution[]>
  > = {};

  for (const muscle of CATALOG_MUSCLES) {
    const setEquivalents = muscleTotals[muscle];
    const slugs = CATALOG_MUSCLE_TO_BODY_SLUGS[muscle];
    if (!slugs || setEquivalents <= 0) continue;

    for (const slug of slugs) {
      bodyRegionTotals[slug] =
        (bodyRegionTotals[slug] ?? 0) + setEquivalents;
      bodyRegionContributions[slug] = [
        ...(bodyRegionContributions[slug] ?? []),
        { muscle, setEquivalents },
      ];
    }
  }

  return {
    muscleTotals,
    bodyRegionTotals,
    bodyRegionContributions,
    unmappedExerciseCount,
  };
};

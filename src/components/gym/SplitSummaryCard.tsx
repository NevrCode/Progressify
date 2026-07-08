import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { useTheme } from "@/context/ThemeContext";
import {
  ExerciseProgressionDTO,
  ExerciseSessionDTO,
} from "@/services/gymService";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

interface SplitSummaryCardProps {
  exercises: ExerciseProgressionDTO[];
  styles: any;
}

const SPLIT_COLORS: Record<string, string> = {
  PUSH: "#0090FF",
  PULL: "#2514df",
  LEGS: "#1D9E75",
};

const normalizeSplit = (split?: string): "PUSH" | "PULL" | "LEGS" => {
  const n = split?.toUpperCase();
  if (n === "PULL" || n === "LEGS") return n;
  return "PUSH";
};

const displaySplit = (split?: string) => {
  const n = normalizeSplit(split);
  return n.charAt(0) + n.slice(1).toLowerCase();
};

const formatShortDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const toDateSortValue = (value?: string) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getExerciseSessions = (
  exercise: ExerciseProgressionDTO,
): ExerciseSessionDTO[] => exercise.exercise_sessions ?? [];

const getSessionDate = (session: ExerciseSessionDTO) =>
  session.session_date ?? "";

const getLastSessionDate = (exercise: ExerciseProgressionDTO): string => {
  const sessions = getExerciseSessions(exercise);
  if (!sessions.length) return "";
  return (
    [...sessions].sort(
      (a, b) =>
        toDateSortValue(getSessionDate(b)) - toDateSortValue(getSessionDate(a)),
    )[0]?.session_date ?? ""
  );
};

export const SplitSummaryCard: React.FC<SplitSummaryCardProps> = ({
  exercises,
  styles,
}) => {
  const { theme } = useTheme();

  const grouped = useMemo(() => {
    const map: Record<string, { count: number; lastDate: string }> = {};
    for (const ex of exercises) {
      const split = normalizeSplit(ex.split);
      const last = getLastSessionDate(ex);
      if (!map[split]) map[split] = { count: 0, lastDate: "" };
      map[split].count++;
      if (!map[split].lastDate || last > map[split].lastDate) {
        map[split].lastDate = last;
      }
    }
    return map;
  }, [exercises]);

  const splits = ["PUSH", "PULL", "LEGS"] as const;

  // Suggest the split that was done least recently
  const nextSplit = splits.reduce((oldest, s) => {
    const a = grouped[oldest]?.lastDate ?? "";
    const b = grouped[s]?.lastDate ?? "";
    return b < a ? s : oldest;
  }, splits[0]);

  return (
    <ShadowGlowCard style={styles.exerciseCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Split overview</Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 4,
        }}
      >
        {splits.map((split) => {
          const info = grouped[split];
          const isNext = split === nextSplit;
          return (
            <View
              key={split}
              style={{
                flex: 1,
                minWidth: "30%",
                backgroundColor: theme.card,
                borderRadius: 12,
                borderWidth: isNext ? 1.5 : 1,
                borderColor: isNext ? SPLIT_COLORS[split] : theme.border,
                padding: 10,
                shadowColor: isNext ? SPLIT_COLORS[split] : "transparent",
                shadowOffset: isNext ? { width: 0, height: 4 } : { width: 0, height: 0 },
                shadowOpacity: isNext ? 0.15 : 0,
                shadowRadius: isNext ? 6 : 0,
                elevation: isNext ? 4 : 0,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 4,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: SPLIT_COLORS[split],
                  }}
                />
                <Text
                  style={{ fontSize: 12, fontWeight: "700", color: theme.text }}
                >
                  {displaySplit(split)}
                </Text>
                {isNext && (
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      color: SPLIT_COLORS[split],
                      marginLeft: "auto",
                    }}
                  >
                    NEXT
                  </Text>
                )}
              </View>
              {info ? (
                <>
                  <Text style={styles.exerciseMeta}>
                    {info.count} exercise{info.count !== 1 ? "s" : ""}
                  </Text>
                  <Text style={styles.exerciseSubMeta}>
                    {info.lastDate
                      ? formatShortDate(info.lastDate)
                      : "Not done yet"}
                  </Text>
                </>
              ) : (
                <Text style={styles.exerciseSubMeta}>No sessions</Text>
              )}
            </View>
          );
        })}
      </View>
    </ShadowGlowCard>
  );
};

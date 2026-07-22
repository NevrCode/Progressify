import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { ThemeType } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";
import { ExerciseProgressionDTO } from "@/services/gymService";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Body, { ExtendedBodyPart, Slug } from "react-native-body-highlighter";

interface MuscleHeatmapProps {
  exercises: ExerciseProgressionDTO[];
}

export const MuscleHeatmap: React.FC<MuscleHeatmapProps> = ({ exercises }) => {
  const { theme } = useTheme();
  const styles = style(theme);
  const [selectedMuscle, setSelectedMuscle] = useState<{
    name: string;
    sets: number;
  } | null>(null);

  const muscleSets = useMemo(() => {
    const counts: Record<string, number> = {
      chest: 0,
      back: 0,
      shoulders: 0,
      biceps: 0,
      triceps: 0,
      abs: 0,
      quads: 0,
      hamstrings: 0,
      calves: 0,
    };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const minTime = sevenDaysAgo.getTime();

    for (const ex of exercises) {
      const muscle = (ex.muscle_group ?? "").toLowerCase();
      let key = "";
      if (muscle.includes("chest")) key = "chest";
      else if (muscle.includes("back") || muscle.includes("lat")) key = "back";
      else if (muscle.includes("shoulder") || muscle.includes("delt"))
        key = "shoulders";
      else if (muscle.includes("bicep")) key = "biceps";
      else if (muscle.includes("tricep")) key = "triceps";
      else if (muscle.includes("abs") || muscle.includes("core")) key = "abs";
      else if (
        muscle.includes("quad") ||
        muscle.includes("thigh") ||
        muscle.includes("leg")
      )
        key = "quads";
      else if (muscle.includes("hamstring")) key = "hamstrings";
      else if (muscle.includes("calf") || muscle.includes("calves"))
        key = "calves";

      if (!key) continue;

      const sessions = ex.exercise_sessions ?? [];
      for (const session of sessions) {
        const dateStr = session.session_date ?? "";
        if (!dateStr) continue;
        const time = new Date(dateStr).getTime();
        if (time >= minTime) {
          const sets = session.sets ?? [];
          counts[key] += sets.length;
        }
      }
    }

    return counts;
  }, [exercises]);

  // 2. Map sets count to intensity values (1, 2, 3) for the highlighter package
  const highlightedData = useMemo(() => {
    const list: { slug: Slug; intensity: number }[] = [];

    const getIntensity = (sets: number) => {
      if (sets === 0) return 0;
      if (sets <= 4) return 1;
      if (sets <= 12) return 2;
      return 3;
    };

    const addMuscle = (slugs: Slug[], sets: number) => {
      const intensity = getIntensity(sets);
      if (intensity > 0) {
        for (const slug of slugs) {
          list.push({ slug, intensity });
        }
      }
    };

    addMuscle(["chest"], muscleSets.chest);
    addMuscle(["deltoids"], muscleSets.shoulders);
    addMuscle(["biceps"], muscleSets.biceps);
    addMuscle(["triceps"], muscleSets.triceps);
    addMuscle(["forearm"], muscleSets.biceps);
    addMuscle(["abs", "obliques"], muscleSets.abs);
    addMuscle(["quadriceps"], muscleSets.quads);
    addMuscle(["hamstring", "gluteal"], muscleSets.hamstrings);
    addMuscle(["calves"], muscleSets.calves);
    addMuscle(["trapezius", "upper-back", "lower-back"], muscleSets.back);

    return list;
  }, [muscleSets]);

  // 3. Define volume labels based on set count
  const getVolumeLabel = (sets: number) => {
    if (sets === 0) return { label: "Inactive", color: theme.primary + "80" };
    if (sets <= 4) return { label: "Low Volume", color: "#F2994A" };
    if (sets <= 12) return { label: "Optimal Volume", color: "#27AE60" };
    return { label: "High Volume", color: "#219653" };
  };

  const handleBodyPartPress = (part: ExtendedBodyPart) => {
    if (!part.slug) return;

    let displayName = part.slug.charAt(0).toUpperCase() + part.slug.slice(1);
    let key = "";

    if (part.slug === "chest") {
      key = "chest";
    } else if (part.slug === "deltoids") {
      displayName = "Shoulders";
      key = "shoulders";
    } else if (part.slug === "biceps" || part.slug === "forearm") {
      displayName = "Biceps";
      key = "biceps";
    } else if (part.slug === "triceps") {
      key = "triceps";
    } else if (part.slug === "abs" || part.slug === "obliques") {
      displayName = "Abs / Core";
      key = "abs";
    } else if (part.slug === "quadriceps") {
      displayName = "Quads";
      key = "quads";
    } else if (part.slug === "hamstring" || part.slug === "gluteal") {
      displayName = "Hamstrings / Glutes";
      key = "hamstrings";
    } else if (part.slug === "calves") {
      key = "calves";
    } else if (["trapezius", "upper-back", "lower-back"].includes(part.slug)) {
      displayName = "Back & Traps";
      key = "back";
    }

    if (key) {
      setSelectedMuscle({
        name: displayName,
        sets: muscleSets[key] ?? 0,
      });
    }
  };

  const intensityColors = ["#F2994A", "#27AE60", "#219653"];

  return (
    <ShadowGlowCard
      style={[
        styles.container,
        {
          backgroundColor: theme.primary + "06",
          borderColor: theme.primary + "20",
          borderWidth: 1.5,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Volume Heatmap</Text>
        <Text style={styles.subtitle}>Set count totals over last 7 days</Text>
      </View>

      <View style={styles.avatarRow}>
        {/* FRONT VIEW */}
        <View style={styles.avatarColumn}>
          <Text style={styles.viewLabel}>Front</Text>
          <View style={styles.bodyContainer}>
            <Body
              data={highlightedData}
              colors={intensityColors}
              side="front"
              gender="male"
              scale={0.9}
              border={theme.border}
              defaultFill={theme.primary + "15"}
              defaultStroke={theme.background + "15"}
              defaultStrokeWidth={1}
              onBodyPartPress={handleBodyPartPress}
            />
          </View>
        </View>

        {/* BACK VIEW */}
        <View style={styles.avatarColumn}>
          <Text style={styles.viewLabel}>Back</Text>
          <View style={styles.bodyContainer}>
            <Body
              data={highlightedData}
              colors={intensityColors}
              side="back"
              gender="male"
              scale={0.9}
              border={theme.border}
              defaultFill={theme.border + "15"}
              defaultStroke={theme.border}
              defaultStrokeWidth={1}
              onBodyPartPress={handleBodyPartPress}
            />
          </View>
        </View>
      </View>

      {/* Dynamic Detail Tooltip Panel */}
      {selectedMuscle ? (
        <View
          style={[
            styles.tooltipCard,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <View style={styles.tooltipHeader}>
            <Text style={[styles.tooltipTitle, { color: theme.text }]}>
              {selectedMuscle.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedMuscle(null)}>
              <Text style={{ color: theme.textLight, fontSize: 11 }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tooltipContent}>
            <Text style={[styles.tooltipValue, { color: theme.primary }]}>
              {selectedMuscle.sets} sets{" "}
              <Text style={{ color: theme.textLight, fontSize: 13 }}>
                this week
              </Text>
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    getVolumeLabel(selectedMuscle.sets).color + "1A",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getVolumeLabel(selectedMuscle.sets).color },
                ]}
              >
                {getVolumeLabel(selectedMuscle.sets).label}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyTooltip}>
          <Text style={{ color: theme.textLight, fontSize: 11 }}>
            Tap any highlighted muscle group to see total working sets logged
            this week.
          </Text>
        </View>
      )}
    </ShadowGlowCard>
  );
};

const style = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      width: "100%",
      padding: 16,
      marginBottom: 12,
    },
    header: {
      marginBottom: 16,
    },
    title: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.text,
    },
    subtitle: {
      color: theme.text,
      fontSize: 11,
      opacity: 0.6,
      marginTop: 2,
    },
    avatarRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      marginVertical: 8,
    },
    avatarColumn: {
      alignItems: "center",
      gap: 8,
    },
    viewLabel: {
      fontSize: 11,
      color: theme.text,
      fontWeight: "600",
      opacity: 0.8,
      textTransform: "uppercase",
    },
    bodyContainer: {
      width: 140,
      height: 240,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    tooltipCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 12,
      marginTop: 14,
      gap: 8,
    },
    tooltipHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    tooltipTitle: {
      fontSize: 13,
      color: theme.text,
      fontWeight: "700",
    },
    tooltipContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    tooltipValue: {
      fontSize: 18,
      fontWeight: "800",
    },
    statusBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statusText: {
      fontSize: 10,
      fontWeight: "700",
    },
    emptyTooltip: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      opacity: 0.8,
    },
  });

import { gymStyles } from "@/assets/styles/gym.style";
import { useTheme } from "@/context/ThemeContext";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import { ExerciseProgressionDTO, SplitType } from "@/services/gymService";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const splitOptions: SplitType[] = ["PUSH", "PULL", "LEGS"];

const normalizeSplit = (split?: string): SplitType => {
  const normalized = split?.toUpperCase();
  if (normalized === "PULL" || normalized === "LEGS") return normalized;
  return "PUSH";
};

const displaySplit = (split?: string) => {
  const normalized = normalizeSplit(split);
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
};

const getExerciseName = (exercise: ExerciseProgressionDTO) =>
  exercise.name ?? "Exercise";

const toDateSortValue = (value?: string) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

export default function WorkoutSession() {
  const { theme } = useTheme();
  const styles = gymStyles(theme);
  const router = useRouter();

  const [selectedSplit, setSelectedSplit] = useState<SplitType>("PUSH");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<number>>(
    new Set(),
  );
  const [search, setSearch] = useState("");

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGymDashboard();

  const exerciseProgressions = useMemo(
    () => dashboard?.exercise_progressions ?? [],
    [dashboard],
  );

  const splitExercises = useMemo(() => {
    const filtered = exerciseProgressions.filter(
      (exercise) => normalizeSplit(exercise.split) === selectedSplit,
    );
    return [...filtered].sort(
      (a, b) =>
        toDateSortValue(a.last_session_date) -
        toDateSortValue(b.last_session_date),
    );
  }, [exerciseProgressions, selectedSplit]);

  const filteredExercises = useMemo(() => {
    if (!search.trim()) return splitExercises;
    const keyword = search.toLowerCase();
    return splitExercises.filter(
      (exercise) =>
        exercise.name?.toLowerCase().includes(keyword) ||
        exercise.muscle_group?.toLowerCase().includes(keyword),
    );
  }, [splitExercises, search]);

  const toggleExercise = (exerciseId: number) => {
    setSelectedExerciseIds((current) => {
      const next = new Set(current);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedExerciseIds.size === filteredExercises.length) {
      setSelectedExerciseIds(new Set());
    } else {
      setSelectedExerciseIds(new Set(filteredExercises.map((e) => e.id)));
    }
  };

  const startSession = () => {
    if (!selectedExerciseIds.size) {
      Alert.alert(
        "No exercises selected",
        "Pick at least one exercise to start the session.",
      );
      return;
    }

    const selectedNames = exerciseProgressions
      .filter((exercise) => selectedExerciseIds.has(exercise.id))
      .map((exercise) => getExerciseName(exercise));

    router.push({
      pathname: "/activeWorkoutSession",
      params: {
        exerciseIds: Array.from(selectedExerciseIds).join(","),
        split: selectedSplit,
      },
    });
  };

  const allSelected =
    filteredExercises.length > 0 &&
    selectedExerciseIds.size === filteredExercises.length;

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Loading exercises...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (error) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorState}>
            <Text style={styles.errorTitle}>Could not load exercises</Text>
            <Text style={styles.errorText}>
              Check your connection and try again.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => refetch()}
            >
              <Text style={styles.primaryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Workout</Text>
              <Text style={styles.title}>Setup Session</Text>
            </View>
            <TouchableOpacity
              style={styles.headerBadge}
              onPress={() => router.back()}
            >
              <MaterialIcons name="close" size={22} color={theme.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroLabel}>Today&apos;s focus</Text>
                <Text style={styles.heroTitle}>
                  {displaySplit(selectedSplit)} Day
                </Text>
              </View>
              <View style={styles.heroIconWrap}>
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={22}
                  color={theme.white}
                />
              </View>
            </View>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Available</Text>
                <Text style={styles.heroStatValue}>
                  {splitExercises.length}
                </Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Selected</Text>
                <Text style={styles.heroStatValue}>
                  {selectedExerciseIds.size}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>1. Pick your split</Text>
          </View>

          <View style={styles.chipRow}>
            {splitOptions.map((option) => {
              const active = selectedSplit === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => {
                    setSelectedSplit(option);
                    setSelectedExerciseIds(new Set());
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {displaySplit(option)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>2. Choose exercises</Text>
            {filteredExercises.length > 0 && (
              <TouchableOpacity style={styles.inlineAction} onPress={toggleAll}>
                <MaterialIcons
                  name={allSelected ? "check-box" : "check-box-outline-blank"}
                  size={16}
                  color={theme.primary}
                />
                <Text style={styles.inlineActionText}>
                  {allSelected ? "Deselect all" : "Select all"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View
            style={{
              backgroundColor: theme.white,
              width: "100%",
              borderWidth: 1,
              borderColor: theme.border,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 10,
              borderRadius: 20,
              marginBottom: 4,
            }}
          >
            <TouchableOpacity>
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="search" size={20} color={theme.primary} />
              </View>
            </TouchableOpacity>
            <TextInput
              style={{ width: "85%" }}
              placeholder="Search exercises..."
              value={search}
              onChangeText={setSearch}
            />
            <TouchableOpacity
              onPress={() => {
                if (search !== "") setSearch("");
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons
                  name={search !== "" ? "close" : "filter-list"}
                  size={20}
                  color={theme.primary}
                />
              </View>
            </TouchableOpacity>
          </View>

          {filteredExercises.length ? (
            filteredExercises.map((exercise) => {
              const isSelected = selectedExerciseIds.has(exercise.id);

              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.exerciseCard,
                    isSelected && {
                      borderWidth: 2,
                      borderColor: theme.primary,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => toggleExercise(exercise.id)}
                >
                  <View style={styles.exerciseHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exerciseName}>
                        {getExerciseName(exercise)}
                      </Text>
                      <Text style={styles.exerciseMeta}>
                        {exercise.muscle_group ?? "-"} |{" "}
                        {exercise.target_rep_range ?? "-"}
                      </Text>
                      {!!exercise.last_session_date && (
                        <Text style={styles.exerciseSubMeta}>
                          Last: {exercise.last_session_date}
                        </Text>
                      )}
                    </View>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: isSelected ? theme.primary : theme.border,
                        backgroundColor: isSelected
                          ? theme.primary
                          : "transparent",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {isSelected && (
                        <MaterialIcons
                          name="check"
                          size={18}
                          color={theme.white}
                        />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No exercises found</Text>
              <Text style={styles.emptyText}>
                {search.trim()
                  ? "Try a different search term."
                  : `No ${displaySplit(selectedSplit)} exercises yet. Add some from the progression page.`}
              </Text>
            </View>
          )}
        </ScrollView>

        {selectedExerciseIds.size > 0 && (
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 14,
              backgroundColor: theme.card,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
          >
            <TouchableOpacity
              style={[styles.primaryButton, { width: "100%" }]}
              onPress={startSession}
            >
              <Text style={styles.primaryButtonText}>
                Start {displaySplit(selectedSplit)} Session (
                {selectedExerciseIds.size} exercises)
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

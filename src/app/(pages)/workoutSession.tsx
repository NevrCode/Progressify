import { gymStyles } from "@/assets/styles/gym.style";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import { ExerciseProgressionDTO, SplitType } from "@/services/gymService";
import {
  addProgram,
  deleteProgram,
  loadPrograms,
  WorkoutProgram,
} from "@/services/programStorage";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
  const { alert } = useAlert();

  const [selectedSplit, setSelectedSplit] = useState<SplitType>("PUSH");
  const splitTranslateX = useRef(new Animated.Value(0)).current;
  const [switcherWidth, setSwitcherWidth] = useState(0);

  useEffect(() => {
    const toVal =
      selectedSplit === "PUSH"
        ? 0
        : selectedSplit === "PULL"
          ? 1
          : 2;
    Animated.timing(splitTranslateX, {
      toValue: toVal,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [selectedSplit]);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<number>>(
    new Set(),
  );
  const [search, setSearch] = useState("");
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [programName, setProgramName] = useState("");
  const [showAllExercises, setShowAllExercises] = useState(false);

  useEffect(() => {
    loadPrograms().then(setPrograms);
  }, []);

  const refreshPrograms = useCallback(async () => {
    const loaded = await loadPrograms();
    setPrograms(loaded);
  }, []);

  const handleDeleteProgram = (program: WorkoutProgram) => {
    alert("Delete program", `"${program.name}" will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = await deleteProgram(program.id);
          setPrograms(updated);
        },
      },
    ]);
  };

  const handleSaveProgram = async () => {
    const name = programName.trim();
    if (!name) {
      alert("Name required", "Enter a name for your program.");
      return;
    }
    if (!selectedExerciseIds.size) return;

    const updated = await addProgram({
      name,
      split: selectedSplit,
      exerciseIds: Array.from(selectedExerciseIds),
    });
    setPrograms(updated);
    setShowSaveInput(false);
    setProgramName("");
    alert("Saved", `"${name}" program created.`);
  };

  const loadProgram = (program: WorkoutProgram) => {
    setSelectedSplit(normalizeSplit(program.split));
    setSelectedExerciseIds(new Set(program.exerciseIds));
  };

  const programsForSplit = useMemo(
    () => programs.filter((p) => normalizeSplit(p.split) === selectedSplit),
    [programs, selectedSplit],
  );

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

  const availableExercises = useMemo(() => {
    const source = showAllExercises ? exerciseProgressions : splitExercises;
    return [...source].sort(
      (a, b) =>
        toDateSortValue(a.last_session_date) -
        toDateSortValue(b.last_session_date),
    );
  }, [exerciseProgressions, showAllExercises, splitExercises]);

  const filteredExercises = useMemo(() => {
    if (!search.trim()) return availableExercises;
    const keyword = search.toLowerCase();
    return availableExercises.filter(
      (exercise) =>
        exercise.name?.toLowerCase().includes(keyword) ||
        exercise.muscle_group?.toLowerCase().includes(keyword) ||
        exercise.split?.toLowerCase().includes(keyword),
    );
  }, [availableExercises, search]);

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
      alert(
        "No exercises selected",
        "Pick at least one exercise to start the session.",
      );
      return;
    }

    // const selectedNames = exerciseProgressions
    //   .filter((exercise) => selectedExerciseIds.has(exercise.id))
    //   .map((exercise) => getExerciseName(exercise));

    router.replace({
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
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <View>
              <Text
                style={{
                  color: theme.textLight,
                  fontSize: 12,
                  fontWeight: "800",
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  marginBottom: 2,
                }}
              >
                Workout
              </Text>
              <Text
                style={{
                  color: theme.textBlack,
                  fontSize: 28,
                  fontWeight: "900",
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  letterSpacing: -0.8,
                }}
              >
                Setup Session
              </Text>
            </View>
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: theme.primary + "15",
                borderWidth: 1.5,
                borderColor: theme.primary + "30",
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => router.back()}
            >
              <MaterialIcons name="close" size={22} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <ShadowGlowCard>
            <View style={[styles.heroTopRow, { marginBottom: 12 }]}>
              <View>
                <Text style={styles.heroLabel}>Today&apos;s focus</Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "900",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: theme.textBlack,
                  }}
                >
                  {displaySplit(selectedSplit)} Day
                </Text>
              </View>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: theme.primary + "15",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={20}
                  color={theme.primary}
                />
              </View>
            </View>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Available</Text>
                <Text style={styles.heroStatValue}>
                  {availableExercises.length}
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
          </ShadowGlowCard>

          <View style={[styles.sectionHeader, { marginTop: 14 }]}>
            <Text style={styles.sectionTitle}>1. Pick your split</Text>
          </View>

          <View
            onLayout={(e) => setSwitcherWidth(e.nativeEvent.layout.width)}
            style={{
              flexDirection: "row",
              backgroundColor: theme.card,
              borderRadius: 24,
              padding: 4,
              borderWidth: 1.5,
              borderColor: theme.border,
              marginBottom: 16,
              position: "relative",
            }}
          >
            {switcherWidth > 0 && (
              <Animated.View
                style={{
                  position: "absolute",
                  top: 4,
                  bottom: 4,
                  left: 4,
                  width: (switcherWidth - 8) / 3,
                  backgroundColor: theme.primary + "12",
                  borderWidth: 1.5,
                  borderColor: theme.primary + "30",
                  borderRadius: 20,
                  transform: [
                    {
                      translateX: splitTranslateX.interpolate({
                        inputRange: [0, 1, 2],
                        outputRange: [
                          0,
                          (switcherWidth - 8) / 3,
                          ((switcherWidth - 8) / 3) * 2,
                        ],
                      }),
                    },
                  ],
                }}
              />
            )}

            {splitOptions.map((option) => {
              const active = selectedSplit === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderRadius: 20,
                  }}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedSplit(option);
                    setSelectedExerciseIds(new Set());
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                      color: active ? theme.primary : theme.textLight,
                    }}
                  >
                    {displaySplit(option)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Programs section */}
          {programsForSplit.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My Programs</Text>
                <Text style={styles.sectionMeta}>
                  {programsForSplit.length} saved
                </Text>
              </View>
              {programsForSplit.map((program) => (
                <TouchableOpacity
                  key={program.id}
                  style={styles.exerciseCard}
                  activeOpacity={0.7}
                  onPress={() => loadProgram(program)}
                  onLongPress={() => handleDeleteProgram(program)}
                >
                  <View style={styles.exerciseHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exerciseName}>{program.name}</Text>
                      <Text style={styles.exerciseMeta}>
                        {displaySplit(program.split)} |{" "}
                        {program.exerciseIds.length} exercises
                      </Text>
                    </View>
                    <MaterialIcons
                      name="play-circle-outline"
                      size={24}
                      color={theme.primary}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

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

          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                !showAllExercises && styles.filterChipActive,
              ]}
              onPress={() => setShowAllExercises(false)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  !showAllExercises && styles.filterChipTextActive,
                ]}
              >
                {displaySplit(selectedSplit)} only
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                showAllExercises && styles.filterChipActive,
              ]}
              onPress={() => setShowAllExercises(true)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  showAllExercises && styles.filterChipTextActive,
                ]}
              >
                All exercises
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              backgroundColor: theme.card,
              width: "100%",
              borderWidth: 1,
              borderColor: theme.border,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 10,
              borderRadius: 12,
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
              style={{
                color: theme.primary,
                fontWeight: "500",
                width: "85%",
              }}
              placeholder="Search Exercise..."
              placeholderTextColor={theme.textLight}
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
                        {displaySplit(exercise.split)} |{" "}
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
                  : showAllExercises
                    ? "Add exercises from the progression page first."
                    : `No ${displaySplit(selectedSplit)} exercises yet. Switch to all exercises or add some from the progression page.`}
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
              gap: 10,
            }}
          >
            {showSaveInput ? (
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: theme.background,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    color: theme.textBlack,
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  placeholder="Program name..."
                  placeholderTextColor={theme.textLight}
                  value={programName}
                  onChangeText={setProgramName}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleSaveProgram}
                >
                  <Text style={styles.primaryButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setShowSaveInput(false);
                    setProgramName("");
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={[styles.primaryButton, { flex: 1 }]}
                  onPress={startSession}
                >
                  <Text style={styles.primaryButtonText}>
                    Start ({selectedExerciseIds.size})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setShowSaveInput(true)}
                >
                  <MaterialIcons
                    name="bookmark-outline"
                    size={18}
                    color={theme.primary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

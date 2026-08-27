import { gymStyles } from "@/assets/styles/gym.style";
import { AppButton } from "@/components/base/app-button";
import { IconButton } from "@/components/base/icon-button";
import { ScreenError, ScreenLoading } from "@/components/base/screen-state";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { ExerciseSelectRow } from "@/components/gym/exercise-select-row";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import { ExerciseProgressionDTO } from "@/services/gymService";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  type ListRenderItem,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const toDateSortValue = (value?: string) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

export default function WorkoutSession() {
  const { theme } = useTheme();
  // Memoized because ExerciseSelectRow is memoized: a fresh styles object every
  // render would defeat the row's props comparison and re-render the whole list.
  const styles = useMemo(() => gymStyles(theme), [theme]);
  const router = useRouter();
  const { alert } = useAlert();

  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<number>>(
    new Set(),
  );
  const [search, setSearch] = useState("");

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
  } = useGymDashboard();

  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const exerciseProgressions = useMemo(
    () => dashboard?.exercise_progressions ?? [],
    [dashboard],
  );

  const availableExercises = useMemo(() => {
    return [...exerciseProgressions].sort(
      (a, b) =>
        toDateSortValue(a.last_session_date) -
        toDateSortValue(b.last_session_date),
    );
  }, [exerciseProgressions]);

  const filteredExercises = useMemo(() => {
    if (!search.trim()) return availableExercises;
    const keyword = search.toLowerCase();
    return availableExercises.filter(
      (exercise) =>
        exercise.name?.toLowerCase().includes(keyword) ||
        exercise.muscle_group?.toLowerCase().includes(keyword),
    );
  }, [availableExercises, search]);

  // Stable identity (functional setState needs no deps) so memoized rows are
  // not invalidated on every parent render.
  const toggleExercise = useCallback((exerciseId: number) => {
    setSelectedExerciseIds((current) => {
      const next = new Set(current);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  }, []);

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
        routineName: "Manual Workout",
      },
    });
  };

  const allSelected =
    filteredExercises.length > 0 &&
    selectedExerciseIds.size === filteredExercises.length;

  const keyExtractor = useCallback(
    (exercise: ExerciseProgressionDTO) => String(exercise.id),
    [],
  );

  const renderExercise = useCallback<ListRenderItem<ExerciseProgressionDTO>>(
    ({ item }) => (
      <ExerciseSelectRow
        exercise={item}
        selected={selectedExerciseIds.has(item.id)}
        onToggle={toggleExercise}
        styles={styles}
        theme={theme}
      />
    ),
    [selectedExerciseIds, styles, theme, toggleExercise],
  );

  if (isLoading) {
    return <ScreenLoading message="Loading exercises..." theme={theme} />;
  }

  if (error) {
    return (
      <ScreenError
        title="Could not load exercises"
        message="Check your connection and try again."
        actionLabel="Retry"
        onAction={retry}
        theme={theme}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={filteredExercises}
          keyExtractor={keyExtractor}
          renderItem={renderExercise}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          // Passed as an element, not a component function. An inline arrow
          // component would be a new type on every render, remounting the
          // header and dropping focus from the search field on each keystroke.
          ListHeaderComponent={
            <>
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
            <IconButton
              accessibilityLabel="Close workout setup"
              icon={
                <MaterialIcons name="close" size={22} color={theme.primary} />
              }
              onPress={() => router.back()}
              size="large"
            />
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
                  Manual Workout
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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Choose exercises</Text>
            {filteredExercises.length > 0 && (
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityLabel={
                  allSelected ? "Deselect all exercises" : "Select all exercises"
                }
                accessibilityState={{ checked: allSelected }}
                style={styles.inlineAction}
                onPress={toggleAll}
              >
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
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="search" size={20} color={theme.primary} />
              </View>
            </View>
            <TextInput
              accessibilityLabel="Search exercises"
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
              accessible={search !== ""}
              accessibilityRole="button"
              accessibilityLabel="Clear exercise search"
              accessibilityState={{ disabled: search === "" }}
              disabled={search === ""}
              hitSlop={8}
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
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No exercises found</Text>
              <Text style={styles.emptyText}>
                {search.trim()
                  ? "Try a different search term."
                  : "Add exercises from the progression page first."}
              </Text>
            </View>
          }
        />

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
            <AppButton
              label={`Start (${selectedExerciseIds.size})`}
              disabled={selectedExerciseIds.size === 0}
              onPress={startSession}
            />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

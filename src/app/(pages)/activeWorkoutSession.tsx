import { gymStyles } from "@/assets/styles/gym.style";
import { useTheme } from "@/context/ThemeContext";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import {
    createExerciseSession,
    createSplitWorkout,
    ExerciseProgressionDTO,
    GymExerciseSessionRequestDTO,
    GymSplitWorkoutRequestDTO,
    SplitType,
} from "@/services/gymService";
import {
    ActiveSessionData,
    clearActiveSession,
    loadActiveSession,
    saveActiveSession,
} from "@/services/sessionStorage";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type DraftSet = {
  localId: string;
  set_number: number;
  weight: number;
  reps: number;
  rir: number;
};

type ExerciseDraft = {
  exerciseId: number;
  startedAt: string;
  sets: DraftSet[];
};

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

const formatDateForApi = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const getRandomInt = () => Math.floor(Math.random() * 100);

const getDurationLabel = (startedAt: string) => {
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  const minutes = Math.max(1, Math.round(elapsedMs / 60000));
  return `${minutes} min`;
};

const getLastSessionHint = (
  exercise: ExerciseProgressionDTO,
): string | null => {
  const sessions = exercise.exercise_sessions ?? [];
  if (!sessions.length) return null;

  const latest = sessions.reduce((best, current) => {
    const bestDate = best.session_date ?? "";
    const curDate = current.session_date ?? "";
    return curDate > bestDate ? current : best;
  });

  const sets = (latest.sets ?? []).sort((a, b) => a.set_number - b.set_number);
  if (!sets.length) return null;

  const summary = sets.map((s) => `${s.weight}kg × ${s.reps}`).join(", ");

  return summary;
};

export default function ActiveWorkoutSession() {
  const { theme } = useTheme();
  const styles = gymStyles(theme);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { exerciseIds, split } = useLocalSearchParams<{
    exerciseIds?: string;
    split?: string;
  }>();

  const [restoredIds, setRestoredIds] = useState<number[]>([]);
  const [restoredSplit, setRestoredSplit] = useState<SplitType | null>(null);

  const selectedSplit = restoredSplit ?? normalizeSplit(split);
  const selectedIds = useMemo(
    () =>
      (exerciseIds ?? "")
        .split(",")
        .map(Number)
        .filter((id) => !Number.isNaN(id) && id > 0),
    [exerciseIds],
  );

  const sessionStartedAtRef = useRef(new Date().toISOString());
  const [elapsed, setElapsed] = useState("0 min");
  const [drafts, setDrafts] = useState<Record<number, ExerciseDraft>>({});
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [finishingId, setFinishingId] = useState<number | null>(null);
  const [deletingSetKey, setDeletingSetKey] = useState<string | null>(null);
  const [splitWorkoutId, setSplitWorkoutId] = useState<number | null>(null);
  const [allSaved, setAllSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: dashboard, isLoading, error } = useGymDashboard();

  const exerciseProgressions = useMemo(
    () => dashboard?.exercise_progressions ?? [],
    [dashboard],
  );

  const splitWorkouts = useMemo(
    () => dashboard?.split_workouts ?? [],
    [dashboard],
  );

  const selectedExercises = useMemo(() => {
    const ids = selectedIds.length > 0 ? selectedIds : restoredIds;
    return ids
      .map((id) => exerciseProgressions.find((e) => e.id === id))
      .filter((e): e is ExerciseProgressionDTO => e != null);
  }, [selectedIds, restoredIds, exerciseProgressions]);

  useEffect(() => {
    if (hydrated) return;
    if (isLoading) return;
    const allIds = selectedIds.length > 0 ? selectedIds : [];
    if (allIds.length > 0 && !selectedExercises.length) return;

    const hydrate = async () => {
      const stored = await loadActiveSession();

      if (!selectedIds.length && stored && stored.exerciseIds.length > 0) {
        sessionStartedAtRef.current = stored.startedAt;
        setDrafts(stored.drafts);
        setCompletedIds(new Set(stored.completedIds));
        setSplitWorkoutId(stored.splitWorkoutId);
        setRestoredIds(stored.exerciseIds);
        setRestoredSplit(normalizeSplit(stored.split));
        setHydrated(true);
        return;
      }

      if (selectedExercises.length) {
        const initial: Record<number, ExerciseDraft> = {};
        for (const exercise of selectedExercises) {
          initial[exercise.id] = {
            exerciseId: exercise.id,
            startedAt: new Date().toISOString(),
            sets: [
              {
                localId: `${Date.now()}-${exercise.id}-${getRandomInt()}`,
                set_number: 1,
                weight: 0,
                reps: 0,
                rir: 0,
              },
            ],
          };
        }
        setDrafts(initial);
      }
      setHydrated(true);
    };

    hydrate();
  }, [hydrated, selectedExercises, selectedIds, isLoading]);

  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearedRef = useRef(false);

  const persistState = useCallback(() => {
    if (!hydrated || allSaved || clearedRef.current) return;
    const allIds = selectedIds.length > 0 ? selectedIds : restoredIds;
    if (!allIds.length) return;

    const data: ActiveSessionData = {
      split: selectedSplit,
      exerciseIds: allIds,
      startedAt: sessionStartedAtRef.current,
      drafts,
      completedIds: Array.from(completedIds),
      splitWorkoutId,
    };
    saveActiveSession(data);
  }, [
    hydrated,
    allSaved,
    selectedIds,
    restoredIds,
    selectedSplit,
    drafts,
    completedIds,
    splitWorkoutId,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(persistState, 500);
    return () => {
      if (saveRef.current) clearTimeout(saveRef.current);
    };
  }, [persistState, hydrated]);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(getDurationLabel(sessionStartedAtRef.current));
    }, 10000);
    setElapsed(getDurationLabel(sessionStartedAtRef.current));
    return () => clearInterval(interval);
  }, [hydrated]);

  // Android hardware back guard
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!allSaved) {
        confirmExit();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [allSaved]);

  const splitWorkoutMutation = useMutation({
    mutationFn: async (payload: GymSplitWorkoutRequestDTO) =>
      createSplitWorkout(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym"] });
    },
  });

  const sessionMutation = useMutation({
    mutationFn: async ({
      exerciseProgressionId,
      payload,
    }: {
      exerciseProgressionId: number;
      payload: GymExerciseSessionRequestDTO;
    }) => createExerciseSession(exerciseProgressionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym"] });
    },
  });

  const ensureSplitWorkoutId = async (): Promise<number> => {
    if (splitWorkoutId) return splitWorkoutId;

    // Check for existing workout today
    const today = formatDateForApi(new Date());
    const existing = splitWorkouts.find(
      (w) =>
        normalizeSplit(w.split) === selectedSplit &&
        (w.date ?? w.workout_date) === today,
    );

    if (existing?.id) {
      setSplitWorkoutId(existing.id);
      return existing.id;
    }

    const created = await splitWorkoutMutation.mutateAsync({
      split: selectedSplit,
      date: today,
      duration: getDurationLabel(sessionStartedAtRef.current),
      exercises: selectedExercises.length,
      total_volume: 0,
      focus: selectedExercises.map(getExerciseName).join(", "),
    });

    if (!created?.id) {
      throw new Error("Could not create the workout session.");
    }

    setSplitWorkoutId(created.id);
    return created.id;
  };

  const confirmExit = () => {
    router.back();
  };

  // --- Draft manipulation ---

  const updateDraftSet = (
    exerciseId: number,
    localId: string,
    field: keyof DraftSet,
    value: number,
  ) => {
    setDrafts((current) => {
      const draft = current[exerciseId];
      if (!draft) return current;
      return {
        ...current,
        [exerciseId]: {
          ...draft,
          sets: draft.sets.map((s) =>
            s.localId === localId ? { ...s, [field]: value } : s,
          ),
        },
      };
    });
  };

  const addDraftSet = (exerciseId: number) => {
    setDrafts((current) => {
      const draft = current[exerciseId];
      if (!draft) return current;
      return {
        ...current,
        [exerciseId]: {
          ...draft,
          sets: [
            ...draft.sets,
            {
              localId: `${Date.now()}-${exerciseId}-${getRandomInt()}`,
              set_number: draft.sets.length + 1,
              weight: 0,
              reps: 0,
              rir: 0,
            },
          ],
        },
      };
    });
  };

  const deleteDraftSet = (exerciseId: number, localId: string) => {
    if (deletingSetKey) return;
    setDeletingSetKey(localId);

    setTimeout(() => {
      setDrafts((current) => {
        const draft = current[exerciseId];
        if (!draft) return current;

        const nextSets = draft.sets.filter((s) => s.localId !== localId);

        if (!nextSets.length) {
          const copy = { ...current };
          delete copy[exerciseId];
          return copy;
        }

        const reindexed = nextSets.map((s, idx) => ({
          ...s,
          set_number: idx + 1,
        }));

        return {
          ...current,
          [exerciseId]: { ...draft, sets: reindexed },
        };
      });
      setDeletingSetKey(null);
    }, 350);
  };

  // --- Finish individual exercise ---

  const finishExercise = async (exercise: ExerciseProgressionDTO) => {
    const draft = drafts[exercise.id];
    if (!draft) return;

    const invalidSet = draft.sets.find(
      (s) => s.weight <= 0 || s.reps <= 0 || s.rir < 0,
    );
    if (invalidSet) {
      Alert.alert(
        "Incomplete set",
        `Set #${invalidSet.set_number} needs weight > 0, reps > 0, and RIR ≥ 0.`,
      );
      return;
    }

    setFinishingId(exercise.id);
    try {
      const workoutId = await ensureSplitWorkoutId();
      const sessionDate = formatDateForApi(new Date());

      const payload: GymExerciseSessionRequestDTO = {
        split_workout_id: workoutId,
        session_date: sessionDate,
        notes: "",
        sets: draft.sets.map((s) => ({
          set_number: s.set_number,
          weight: s.weight,
          reps: s.reps,
          rir: s.rir,
        })),
      };

      await sessionMutation.mutateAsync({
        exerciseProgressionId: exercise.id,
        payload,
      });

      setCompletedIds((prev) => {
        const next = new Set(prev).add(exercise.id);
        if (next.size === selectedExercises.length) {
          setAllSaved(true);
          clearedRef.current = true;
          clearActiveSession();
        }
        return next;
      });
    } catch (err: any) {
      Alert.alert(
        "Save failed",
        err?.message || "Could not save this exercise session.",
      );
    } finally {
      setFinishingId(null);
    }
  };

  const finishAll = async () => {
    const unfinished = selectedExercises.filter((e) => !completedIds.has(e.id));
    if (!unfinished.length) {
      setAllSaved(true);
      return;
    }

    for (const exercise of unfinished) {
      await finishExercise(exercise);
    }
  };

  // --- Loading / Error states ---

  if (
    isLoading ||
    (hydrated && restoredIds.length > 0 && !selectedExercises.length)
  ) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Loading session...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if ((error || (!selectedExercises.length && !isLoading)) && hydrated) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorState}>
            <Text style={styles.errorTitle}>Session unavailable</Text>
            <Text style={styles.errorText}>
              Could not load the selected exercises. Go back and try again.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.primaryButtonText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // --- Completion screen ---

  if (allSaved) {
    const totalSets = selectedExercises.reduce((sum, e) => {
      const draft = drafts[e.id];
      return sum + (draft?.sets.length ?? 0);
    }, 0);
    const totalVolume = selectedExercises.reduce((sum, e) => {
      const draft = drafts[e.id];
      if (!draft) return sum;
      return sum + draft.sets.reduce((s, set) => s + set.weight * set.reps, 0);
    }, 0);

    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View
            style={[
              styles.container,
              { justifyContent: "center", alignItems: "center", flex: 1 },
            ]}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={72}
              color={theme.primary}
            />
            <Text
              style={[styles.title, { textAlign: "center", marginTop: 16 }]}
            >
              Session Complete
            </Text>
            <Text
              style={[
                styles.exerciseMeta,
                { textAlign: "center", marginTop: 8 },
              ]}
            >
              {displaySplit(selectedSplit)} | {elapsed} | {totalSets} sets |{" "}
              {totalVolume} vol
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 32, width: "100%" }]}
              onPress={() => router.back()}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // --- Main session view ---

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>{displaySplit(selectedSplit)}</Text>
              <Text style={styles.title}>Active Session</Text>
            </View>
            <TouchableOpacity style={styles.headerBadge} onPress={confirmExit}>
              <MaterialIcons name="close" size={22} color={theme.white} />
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.primary + "12",
              borderRadius: 999,
              paddingVertical: 8,
              paddingHorizontal: 14,
              gap: 10,
              borderWidth: 1,
              borderColor: theme.primary + "30",
            }}
          >
            <MaterialCommunityIcons
              name="timer-outline"
              size={16}
              color={theme.primary}
            />
            <Text
              style={{
                color: theme.primary,
                fontSize: 13,
                fontWeight: "800",
              }}
            >
              {elapsed}
            </Text>
            <View
              style={{
                width: 1,
                height: 16,
                backgroundColor: theme.primary + "30",
              }}
            />
            <Text
              style={{
                color: theme.primary,
                fontSize: 13,
                fontWeight: "700",
                flex: 1,
              }}
            >
              {completedIds.size}/{selectedExercises.length} exercises
            </Text>
            <Text
              style={{
                color: theme.primary,
                fontSize: 12,
                fontWeight: "800",
              }}
            >
              {restoredIds.length > 0 && selectedIds.length === 0
                ? "Resumed"
                : completedIds.size === selectedExercises.length
                  ? "Done"
                  : "Active"}
            </Text>
          </View>

          {selectedExercises.map((exercise) => {
            const draft = drafts[exercise.id];
            const isCompleted = completedIds.has(exercise.id);
            const isFinishing = finishingId === exercise.id;
            const sets = draft?.sets ?? [];

            return (
              <View
                key={exercise.id}
                style={[
                  styles.exerciseCard,
                  isCompleted && {
                    opacity: 0.6,
                    borderWidth: 2,
                    borderColor: theme.income,
                  },
                ]}
              >
                <View style={styles.exerciseHeader}>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text style={styles.exerciseName}>
                        {getExerciseName(exercise)}
                      </Text>
                      {isCompleted && (
                        <MaterialIcons
                          name="check-circle"
                          size={18}
                          color={theme.income}
                        />
                      )}
                    </View>
                    <Text style={styles.exerciseMeta}>
                      {exercise.muscle_group ?? "-"} |{" "}
                      {exercise.target_rep_range ?? "-"}
                    </Text>
                    {(() => {
                      const hint = getLastSessionHint(exercise);
                      if (!hint) return null;
                      return (
                        <Text
                          style={{
                            color: theme.textLight,
                            fontSize: 11,
                            fontWeight: "600",
                            marginTop: 4,
                          }}
                          numberOfLines={1}
                        >
                          Last session: {hint}
                        </Text>
                      );
                    })()}
                  </View>
                </View>

                {!isCompleted && (
                  <View style={styles.subsectionHeader}>
                    <Text style={styles.subsectionTitle}>Sets</Text>
                    <TouchableOpacity
                      style={styles.inlineAction}
                      onPress={() => addDraftSet(exercise.id)}
                      disabled={isFinishing}
                    >
                      <MaterialIcons
                        name="add"
                        size={16}
                        color={isFinishing ? theme.textLight : theme.primary}
                      />
                      <Text
                        style={[
                          styles.inlineActionText,
                          isFinishing && { color: theme.textLight },
                        ]}
                      >
                        Add set
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {sets.length > 0 && (
                  <View style={styles.setTable}>
                    <View style={styles.setTableHeader}>
                      <Text style={styles.setHeaderText}>Set</Text>
                      <Text style={styles.setHeaderText}>Weight</Text>
                      <Text style={styles.setHeaderText}>Reps</Text>
                      <Text style={styles.setHeaderText}>RIR</Text>
                      {!isCompleted && (
                        <Text style={styles.setHeaderText}>Act</Text>
                      )}
                    </View>
                    {sets.map((set) => (
                      <View key={set.localId} style={styles.setRow}>
                        <Text style={styles.setValue}>#{set.set_number}</Text>
                        {isCompleted ? (
                          <>
                            <Text style={styles.setValue}>{set.weight}kg</Text>
                            <Text style={styles.setValue}>{set.reps}</Text>
                            <Text style={styles.setValue}>{set.rir}</Text>
                          </>
                        ) : (
                          <>
                            <TextInput
                              style={styles.setValue}
                              keyboardType="numeric"
                              value={String(set.weight)}
                              onChangeText={(v) =>
                                updateDraftSet(
                                  exercise.id,
                                  set.localId,
                                  "weight",
                                  Number(v),
                                )
                              }
                            />
                            <TextInput
                              style={styles.setValue}
                              keyboardType="numeric"
                              value={String(set.reps)}
                              onChangeText={(v) =>
                                updateDraftSet(
                                  exercise.id,
                                  set.localId,
                                  "reps",
                                  Number(v),
                                )
                              }
                            />
                            <TextInput
                              style={styles.setValue}
                              keyboardType="numeric"
                              value={String(set.rir)}
                              onChangeText={(v) =>
                                updateDraftSet(
                                  exercise.id,
                                  set.localId,
                                  "rir",
                                  Number(v),
                                )
                              }
                            />
                            <TouchableOpacity
                              onPress={() =>
                                deleteDraftSet(exercise.id, set.localId)
                              }
                              disabled={deletingSetKey === set.localId}
                            >
                              {deletingSetKey === set.localId ? (
                                <ActivityIndicator
                                  size="small"
                                  color={theme.expense}
                                />
                              ) : (
                                <MaterialIcons
                                  name="delete"
                                  size={16}
                                  color={theme.expense}
                                />
                              )}
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {!isCompleted && (
                  <TouchableOpacity
                    style={[
                      styles.saveSetButton,
                      { opacity: isFinishing ? 0.6 : 1 },
                    ]}
                    onPress={() => finishExercise(exercise)}
                    disabled={isFinishing}
                  >
                    {isFinishing ? (
                      <ActivityIndicator size="small" color={theme.white} />
                    ) : (
                      <Text style={styles.saveSetButtonText}>
                        Finish Exercise
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Bottom spacer */}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Bottom bar */}
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
            onPress={finishAll}
            disabled={!!finishingId}
          >
            {finishingId ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {completedIds.size === selectedExercises.length
                  ? "All Done"
                  : `Save All (${completedIds.size}/${selectedExercises.length} done)`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

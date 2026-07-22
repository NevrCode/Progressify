import { gymStyles } from "@/assets/styles/gym.style";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import {
  createExerciseSession,
  ExerciseProgressionDTO,
  GymExerciseSessionRequestDTO,
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
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type DraftSet = {
  localId: string;
  set_number: number;
  weight: string;
  reps: string;
  rir: string;
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

const createEmptyExerciseDraft = (exerciseId: number): ExerciseDraft => ({
  exerciseId,
  startedAt: new Date().toISOString(),
  sets: [
    {
      localId: `${Date.now()}-${exerciseId}-${getRandomInt()}`,
      set_number: 1,
      weight: "0",
      reps: "0",
      rir: "0",
    },
  ],
});

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

  // Rest Timer State
  const [restTime, setRestTime] = useState<number>(0);
  const [isRestPaused, setIsRestPaused] = useState<boolean>(false);
  const [initialRestDuration, setInitialRestDuration] = useState<number>(90);
  const [isRestActive, setIsRestActive] = useState<boolean>(false);

  const startRestTimer = (seconds: number) => {
    setRestTime(seconds);
    setInitialRestDuration(seconds);
    setIsRestPaused(false);
    setIsRestActive(true);
  };

  const adjustRestTime = (seconds: number) => {
    setRestTime((prev) => Math.max(0, prev + seconds));
  };

  const toggleRestPause = () => {
    setIsRestPaused((prev) => !prev);
  };

  const stopRestTimer = () => {
    setRestTime(0);
    setIsRestPaused(false);
    setIsRestActive(false);
  };

  const formatRestTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    let interval: any = null;
    if (isRestActive && restTime > 0 && !isRestPaused) {
      interval = setInterval(() => {
        setRestTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            if (Platform.OS !== "web") {
              try {
                Vibration.vibrate([0, 500, 200, 500]);
              } catch {
                // ignore
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRestActive, restTime, isRestPaused]);

  const selectedSplit = restoredSplit ?? normalizeSplit(split);
  const selectedIds = useMemo(
    () =>
      (exerciseIds ?? "")
        .split(",")
        .map(Number)
        .filter((id) => !Number.isNaN(id) && id > 0),
    [exerciseIds],
  );
  const { alert } = useAlert();

  const sessionStartedAtRef = useRef(new Date().toISOString());
  const [elapsed, setElapsed] = useState("0 min");
  const [drafts, setDrafts] = useState<Record<number, ExerciseDraft>>({});
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [finishingId, setFinishingId] = useState<number | null>(null);
  const [deletingSetKey, setDeletingSetKey] = useState<string | null>(null);
  const [allSaved, setAllSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapTargetId, setSwapTargetId] = useState<number | null>(null);
  const [currentExerciseIds, setCurrentExerciseIds] = useState<number[]>([]);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");

  const { data: dashboard, isLoading, error } = useGymDashboard();

  const exerciseProgressions = useMemo(
    () => dashboard?.exercise_progressions ?? [],
    [dashboard],
  );

  const sessionExerciseIds = useMemo(
    () =>
      currentExerciseIds.length > 0
        ? currentExerciseIds
        : selectedIds.length > 0
          ? selectedIds
          : restoredIds,
    [currentExerciseIds, selectedIds, restoredIds],
  );

  const selectedExercises = useMemo(() => {
    return sessionExerciseIds
      .map((id) => exerciseProgressions.find((e) => e.id === id))
      .filter((e): e is ExerciseProgressionDTO => e != null);
  }, [sessionExerciseIds, exerciseProgressions]);

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
        setRestoredIds(stored.exerciseIds);
        setRestoredSplit(normalizeSplit(stored.split));
        setCurrentExerciseIds(stored.exerciseIds);
        setHydrated(true);
        return;
      }

      if (selectedExercises.length) {
        const initial: Record<number, ExerciseDraft> = {};
        for (const exercise of selectedExercises) {
          initial[exercise.id] = createEmptyExerciseDraft(exercise.id);
        }
        setDrafts(initial);
        setCurrentExerciseIds(selectedIds);
      }
      setHydrated(true);
    };

    hydrate();
  }, [hydrated, selectedExercises, selectedIds, isLoading]);

  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearedRef = useRef(false);

  const persistState = useCallback(() => {
    if (!hydrated || allSaved || clearedRef.current) return;
    if (!sessionExerciseIds.length) return;

    const data: ActiveSessionData = {
      split: selectedSplit,
      exerciseIds: sessionExerciseIds,
      startedAt: sessionStartedAtRef.current,
      drafts,
      completedIds: Array.from(completedIds),
    };
    saveActiveSession(data);
  }, [
    hydrated,
    allSaved,
    sessionExerciseIds,
    selectedSplit,
    drafts,
    completedIds,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(persistState, 500);
    return () => {
      if (saveRef.current) clearTimeout(saveRef.current);
    };
  }, [persistState, hydrated]);

  const confirmExit = useCallback(() => {
    router.back();
  }, [router]);

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
  }, [allSaved, confirmExit]);

  // Navigate back if all exercises removed
  useEffect(() => {
    const hadSession =
      selectedIds.length > 0 ||
      restoredIds.length > 0 ||
      Object.keys(drafts).length > 0;

    if (
      hydrated &&
      hadSession &&
      currentExerciseIds.length === 0 &&
      !allSaved
    ) {
      clearActiveSession();
      router.back();
    }
  }, [
    hydrated,
    currentExerciseIds,
    selectedIds,
    restoredIds,
    drafts,
    allSaved,
    router,
  ]);

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

  // --- Draft manipulation ---

  const updateDraftSet = (
    exerciseId: number,
    localId: string,
    field: keyof DraftSet,
    value: string,
  ) => {
    // Strip leading zeros (e.g. "07" → "7") but keep "0" and "0." intact
    let clean = value;
    if (clean.length > 1 && clean[0] === "0" && clean[1] !== ".") {
      clean = clean.replace(/^0+/, "") || "0";
    }

    setDrafts((current) => {
      const draft = current[exerciseId];
      if (!draft) return current;
      return {
        ...current,
        [exerciseId]: {
          ...draft,
          sets: draft.sets.map((s) =>
            s.localId === localId ? { ...s, [field]: clean } : s,
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
              weight: "0",
              reps: "0",
              rir: "0",
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

  // --- Available exercises for swap ---
  const availableSessionExercises = useMemo(() => {
    const currentIds = new Set(sessionExerciseIds);
    const keyword = exerciseSearch.trim().toLowerCase();

    return exerciseProgressions
      .filter((exercise) => !currentIds.has(exercise.id))
      .filter((exercise) => {
        if (!keyword) return true;
        return (
          exercise.name?.toLowerCase().includes(keyword) ||
          exercise.muscle_group?.toLowerCase().includes(keyword) ||
          exercise.split?.toLowerCase().includes(keyword)
        );
      });
  }, [exerciseProgressions, sessionExerciseIds, exerciseSearch]);

  // --- Remove exercise from session ---
  const removeExercise = (exerciseId: number) => {
    if (finishingId === exerciseId) return;

    const exercise = selectedExercises.find((e) => e.id === exerciseId);
    const draft = drafts[exerciseId];
    const hasData = draft?.sets.some(
      (s) => (parseFloat(s.weight) || 0) > 0 || (parseFloat(s.reps) || 0) > 0,
    );

    const doRemove = () => {
      setCurrentExerciseIds((prev) => prev.filter((id) => id !== exerciseId));
      setDrafts((current) => {
        const copy = { ...current };
        delete copy[exerciseId];
        return copy;
      });
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(exerciseId);
        return next;
      });
    };

    if (hasData) {
      alert(
        "Remove exercise",
        `Remove "${getExerciseName(exercise!)}"? Entered sets will be lost.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: doRemove },
        ],
      );
    } else {
      doRemove();
    }
  };

  // --- Swap exercise ---
  const openSwapModal = (exerciseId: number) => {
    if (finishingId === exerciseId) return;
    setSwapTargetId(exerciseId);
    setExerciseSearch("");
    setShowSwapModal(true);
  };

  const closeExercisePicker = () => {
    setShowSwapModal(false);
    setShowAddExerciseModal(false);
    setSwapTargetId(null);
    setExerciseSearch("");
  };

  const openAddExerciseModal = () => {
    setExerciseSearch("");
    setShowAddExerciseModal(true);
  };

  const addExerciseToSession = (exerciseId: number) => {
    if (sessionExerciseIds.includes(exerciseId)) return;

    setCurrentExerciseIds((prev) => {
      const base = prev.length ? prev : sessionExerciseIds;
      return [...base, exerciseId];
    });
    setDrafts((current) => ({
      ...current,
      [exerciseId]: createEmptyExerciseDraft(exerciseId),
    }));
    closeExercisePicker();
  };

  const swapExercise = (newExerciseId: number) => {
    if (swapTargetId === null) return;

    const oldDraft = drafts[swapTargetId];
    const hasData = oldDraft?.sets.some(
      (s) => (parseFloat(s.weight) || 0) > 0 || (parseFloat(s.reps) || 0) > 0,
    );

    const doSwap = () => {
      setCurrentExerciseIds((prev) =>
        prev.map((id) => (id === swapTargetId ? newExerciseId : id)),
      );
      setDrafts((current) => {
        const copy = { ...current };
        delete copy[swapTargetId];
        copy[newExerciseId] = createEmptyExerciseDraft(newExerciseId);
        return copy;
      });
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(swapTargetId);
        return next;
      });
      closeExercisePicker();
    };

    if (hasData) {
      alert(
        "Swap exercise",
        "The current exercise has entered data. Swap anyway?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Swap", style: "destructive", onPress: doSwap },
        ],
      );
    } else {
      doSwap();
    }
  };

  // --- Finish individual exercise ---

  const finishExercise = async (exercise: ExerciseProgressionDTO) => {
    const draft = drafts[exercise.id];
    if (!draft) return;

    const invalidSet = draft.sets.find(
      (s) =>
        (parseFloat(s.weight) || 0) <= 0 ||
        (parseFloat(s.reps) || 0) <= 0 ||
        (parseFloat(s.rir) || 0) < 0,
    );
    if (invalidSet) {
      alert(
        "Incomplete set",
        `Set #${invalidSet.set_number} needs weight > 0, reps > 0, and RIR ≥ 0.`,
      );
      return;
    }

    setFinishingId(exercise.id);
    try {
      const sessionDate = formatDateForApi(new Date());

      const payload: GymExerciseSessionRequestDTO = {
        session_date: sessionDate,
        notes: "",
        sets: draft.sets.map((s) => ({
          set_number: s.set_number,
          weight: parseFloat(s.weight) || 0,
          reps: parseFloat(s.reps) || 0,
          rir: parseFloat(s.rir) || 0,
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
      alert(
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
      return (
        sum +
        draft.sets.reduce(
          (s, set) =>
            s + (parseFloat(set.weight) || 0) * (parseFloat(set.reps) || 0),
          0,
        )
      );
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
                {displaySplit(selectedSplit)} Day
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
                Active Session
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
              onPress={confirmExit}
            >
              <MaterialIcons name="close" size={22} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.primary + "06",
              borderRadius: 16,
              padding: 12,
              borderWidth: 1.5,
              borderColor: theme.primary + "20",
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: theme.primary + "15",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 10,
              }}
            >
              <MaterialCommunityIcons
                name="timer-outline"
                size={18}
                color={theme.primary}
              />
            </View>
            <Text
              style={{
                color: theme.textBlack,
                fontSize: 16,
                fontWeight: "900",
                fontFamily: "PlusJakartaSans_800ExtraBold",
                flex: 1,
              }}
            >
              {elapsed}
            </Text>
            <View
              style={{
                backgroundColor: theme.primary + "15",
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  color: theme.primary,
                  fontSize: 11,
                  fontWeight: "800",
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                }}
              >
                {completedIds.size}/{selectedExercises.length} EXERCISES
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <TouchableOpacity
              style={styles.inlineAction}
              onPress={openAddExerciseModal}
              disabled={!!finishingId}
            >
              <MaterialIcons
                name="add-circle-outline"
                size={18}
                color={finishingId ? theme.textLight : theme.primary}
              />
              <Text
                style={[
                  styles.inlineActionText,
                  !!finishingId && { color: theme.textLight },
                ]}
              >
                Add exercise
              </Text>
            </TouchableOpacity>
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
                      {displaySplit(exercise.split)} |{" "}
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
                  {!isCompleted && (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 6,
                        alignItems: "flex-start",
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => openSwapModal(exercise.id)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor: theme.primary + "15",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <MaterialIcons
                          name="swap-horiz"
                          size={18}
                          color={theme.primary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeExercise(exercise.id)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor: theme.expense + "15",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <MaterialIcons
                          name="delete-outline"
                          size={18}
                          color={theme.expense}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
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
                  <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                  >
                    <View
                      style={{
                        borderWidth: 1.5,
                        borderColor: theme.border,
                        borderRadius: 16,
                        backgroundColor: theme.background,
                        overflow: "hidden",
                        marginTop: 10,
                      }}
                    >
                      {/* Table Header */}
                      <View
                        style={{
                          flexDirection: "row",
                          backgroundColor: theme.card,
                          borderBottomWidth: 1.5,
                          borderBottomColor: theme.border,
                          paddingVertical: 8,
                          paddingHorizontal: 8,
                        }}
                      >
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 10,
                            fontWeight: "800",
                            fontFamily: "PlusJakartaSans_800ExtraBold",
                            color: theme.textLight,
                            textAlign: "center",
                          }}
                        >
                          SET
                        </Text>
                        <Text
                          style={{
                            flex: 2.2,
                            fontSize: 10,
                            fontWeight: "800",
                            fontFamily: "PlusJakartaSans_800ExtraBold",
                            color: theme.textLight,
                            textAlign: "center",
                          }}
                        >
                          WEIGHT
                        </Text>
                        <Text
                          style={{
                            flex: 1.8,
                            fontSize: 10,
                            fontWeight: "800",
                            fontFamily: "PlusJakartaSans_800ExtraBold",
                            color: theme.textLight,
                            textAlign: "center",
                          }}
                        >
                          REPS
                        </Text>
                        <Text
                          style={{
                            flex: 1.8,
                            fontSize: 10,
                            fontWeight: "800",
                            fontFamily: "PlusJakartaSans_800ExtraBold",
                            color: theme.textLight,
                            textAlign: "center",
                          }}
                        >
                          RIR
                        </Text>
                        <Text
                          style={{
                            flex: 1.6,
                            fontSize: 10,
                            fontWeight: "800",
                            fontFamily: "PlusJakartaSans_800ExtraBold",
                            color: theme.textLight,
                            textAlign: "center",
                          }}
                        >
                          ACT
                        </Text>
                      </View>

                      {/* Table Rows */}
                      {sets.map((set, idx) => (
                        <View
                          key={set.localId}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            borderBottomWidth: idx === sets.length - 1 ? 0 : 1,
                            borderBottomColor: theme.border + "50",
                            paddingVertical: 6,
                            paddingHorizontal: 8,
                          }}
                        >
                          <Text
                            style={{
                              flex: 1,
                              fontSize: 13,
                              fontWeight: "900",
                              fontFamily: "PlusJakartaSans_800ExtraBold",
                              color: theme.textBlack,
                              textAlign: "center",
                            }}
                          >
                            {set.set_number}
                          </Text>

                          {isCompleted ? (
                            <>
                              <Text
                                style={{
                                  flex: 2.2,
                                  fontSize: 13,
                                  fontWeight: "700",
                                  color: theme.textBlack,
                                  textAlign: "center",
                                }}
                              >
                                {set.weight}kg
                              </Text>
                              <Text
                                style={{
                                  flex: 1.8,
                                  fontSize: 13,
                                  fontWeight: "700",
                                  color: theme.textBlack,
                                  textAlign: "center",
                                }}
                              >
                                {set.reps}
                              </Text>
                              <Text
                                style={{
                                  flex: 1.8,
                                  fontSize: 13,
                                  fontWeight: "700",
                                  color: theme.textBlack,
                                  textAlign: "center",
                                }}
                              >
                                {set.rir}
                              </Text>
                              <View style={{ flex: 1.6 }} />
                            </>
                          ) : (
                            <>
                              {/* Weight Input */}
                              <View style={{ flex: 2.2, paddingHorizontal: 4 }}>
                                <TextInput
                                  style={{
                                    backgroundColor: theme.card,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                    color: theme.textBlack,
                                    fontSize: 13,
                                    fontWeight: "600",
                                    paddingVertical: 6,
                                    textAlign: "center",
                                  }}
                                  keyboardType="numeric"
                                  value={set.weight}
                                  onChangeText={(v) =>
                                    updateDraftSet(
                                      exercise.id,
                                      set.localId,
                                      "weight",
                                      v,
                                    )
                                  }
                                />
                              </View>

                              {/* Reps Input */}
                              <View style={{ flex: 1.8, paddingHorizontal: 4 }}>
                                <TextInput
                                  style={{
                                    backgroundColor: theme.card,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                    color: theme.textBlack,
                                    fontSize: 13,
                                    fontWeight: "600",
                                    paddingVertical: 6,
                                    textAlign: "center",
                                  }}
                                  keyboardType="numeric"
                                  value={set.reps}
                                  onChangeText={(v) =>
                                    updateDraftSet(
                                      exercise.id,
                                      set.localId,
                                      "reps",
                                      v,
                                    )
                                  }
                                />
                              </View>

                              {/* RIR Input */}
                              <View style={{ flex: 1.8, paddingHorizontal: 4 }}>
                                <TextInput
                                  style={{
                                    backgroundColor: theme.card,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                    color: theme.textBlack,
                                    fontSize: 13,
                                    fontWeight: "600",
                                    paddingVertical: 6,
                                    textAlign: "center",
                                  }}
                                  keyboardType="numeric"
                                  value={set.rir}
                                  onChangeText={(v) =>
                                    updateDraftSet(
                                      exercise.id,
                                      set.localId,
                                      "rir",
                                      v,
                                    )
                                  }
                                />
                              </View>

                              {/* Actions */}
                              <View
                                style={{
                                  flex: 1.6,
                                  flexDirection: "row",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <TouchableOpacity
                                  onPress={() => startRestTimer(90)}
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 6,
                                    backgroundColor: theme.primary + "12",
                                    justifyContent: "center",
                                    alignItems: "center",
                                  }}
                                >
                                  <MaterialCommunityIcons
                                    name="timer-play-outline"
                                    size={15}
                                    color={theme.primary}
                                  />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() =>
                                    deleteDraftSet(exercise.id, set.localId)
                                  }
                                  disabled={deletingSetKey === set.localId}
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 6,
                                    backgroundColor: theme.expense + "12",
                                    justifyContent: "center",
                                    alignItems: "center",
                                  }}
                                >
                                  {deletingSetKey === set.localId ? (
                                    <ActivityIndicator
                                      size="small"
                                      color={theme.expense}
                                    />
                                  ) : (
                                    <MaterialIcons
                                      name="delete-outline"
                                      size={15}
                                      color={theme.expense}
                                    />
                                  )}
                                </TouchableOpacity>
                              </View>
                            </>
                          )}
                        </View>
                      ))}
                    </View>
                  </KeyboardAvoidingView>
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

        {/* Floating Rest Timer Overlay */}
        {isRestActive && (
          <LinearGradient
            colors={
              restTime === 0
                ? [theme.income + "F2", theme.income]
                : [theme.primary + "E6", theme.primary + "FF"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              marginHorizontal: 20,
              marginBottom: 10,
              borderRadius: 16,
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 8,
              borderWidth: 1,
              borderColor: restTime === 0 ? theme.income + "30" : theme.primary + "30",
            }}
          >
            {/* Left section: Icon and Time */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <MaterialCommunityIcons
                name={
                  restTime === 0
                    ? "bell-ring-outline"
                    : isRestPaused
                      ? "timer-off-outline"
                      : "timer-sand"
                }
                size={26}
                color={theme.background}
              />
              <View>
                <Text
                  style={{
                    color: theme.background,
                    fontSize: 10,
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    opacity: 0.9,
                  }}
                >
                  {restTime === 0 ? "Rest Finished" : "Rest Timer"}
                </Text>
                <Text
                  style={{
                    color: theme.background,
                    fontSize: 22,
                    fontWeight: "900",
                    letterSpacing: -0.5,
                    marginTop: 1,
                  }}
                >
                  {restTime === 0 ? "Go Lift!" : formatRestTime(restTime)}
                </Text>
              </View>
            </View>

            {/* Middle section: Action Controls */}
            {restTime > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => adjustRestTime(-30)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: theme.background + "20",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: theme.background, fontSize: 11, fontWeight: "900" }}>-30s</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => adjustRestTime(30)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: theme.background + "20",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: theme.background, fontSize: 11, fontWeight: "900" }}>+30s</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => startRestTimer(initialRestDuration)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: theme.background,
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: "row",
                    gap: 4,
                  }}
                >
                  <MaterialIcons name="replay" size={14} color={theme.income} />
                  <Text style={{ color: theme.income, fontSize: 11, fontWeight: "900" }}>Restart</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Right section: Play/Pause/Dismiss */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {restTime > 0 && (
                <TouchableOpacity
                  onPress={toggleRestPause}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: theme.background,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <MaterialCommunityIcons
                    name={isRestPaused ? "play" : "pause"}
                    size={20}
                    color={theme.primary}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={stopRestTimer}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: theme.background + "20",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <MaterialCommunityIcons name="close" size={20} color={theme.background} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        )}

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

        {/* Swap Exercise Modal */}
        <Modal
          visible={showSwapModal}
          animationType="slide"
          transparent
          onRequestClose={closeExercisePicker}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { maxHeight: "70%" }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Swap Exercise</Text>
                <TouchableOpacity onPress={closeExercisePicker}>
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={theme.textBlack}
                  />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Search exercises..."
                placeholderTextColor={theme.textLight}
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
              />
              <ScrollView contentContainerStyle={{ gap: 8 }}>
                {availableSessionExercises.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No other exercises available.
                  </Text>
                ) : (
                  availableSessionExercises.map((ex) => (
                    <TouchableOpacity
                      key={ex.id}
                      style={styles.listCard}
                      onPress={() => swapExercise(ex.id)}
                    >
                      <Text style={styles.listTitle}>
                        {getExerciseName(ex)}
                      </Text>
                      <Text style={styles.listMeta}>
                        {displaySplit(ex.split)} | {ex.muscle_group ?? "-"} |{" "}
                        {ex.target_rep_range ?? "-"}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Add Exercise Modal */}
        <Modal
          visible={showAddExerciseModal}
          animationType="slide"
          transparent
          onRequestClose={closeExercisePicker}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { maxHeight: "70%" }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Exercise</Text>
                <TouchableOpacity onPress={closeExercisePicker}>
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={theme.textBlack}
                  />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Search exercises..."
                placeholderTextColor={theme.textLight}
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
              />
              <ScrollView contentContainerStyle={{ gap: 8 }}>
                {availableSessionExercises.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No more exercises available.
                  </Text>
                ) : (
                  availableSessionExercises.map((ex) => (
                    <TouchableOpacity
                      key={ex.id}
                      style={styles.listCard}
                      onPress={() => addExerciseToSession(ex.id)}
                    >
                      <Text style={styles.listTitle}>
                        {getExerciseName(ex)}
                      </Text>
                      <Text style={styles.listMeta}>
                        {displaySplit(ex.split)} | {ex.muscle_group ?? "-"} |{" "}
                        {ex.target_rep_range ?? "-"}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

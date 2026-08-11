import { gymStyles } from "@/assets/styles/gym.style";
import { AppButton } from "@/components/base/app-button";
import { IconButton } from "@/components/base/icon-button";
import { ScreenError, ScreenLoading } from "@/components/base/screen-state";
import { ActiveWorkoutCompletion } from "@/components/gym/active-workout-completion";
import { ActiveWorkoutExercisePicker } from "@/components/gym/active-workout-exercise-picker";
import { RestTimerOverlay } from "@/components/gym/rest-timer-overlay";
import {
  ActiveWorkoutExerciseList,
  type ActiveWorkoutExerciseActions,
} from "@/features/workout-session/active-workout-exercise-list";
import { SetUndoSnackbar } from "@/features/workout-session/set-undo-snackbar";
import { completeDraftSetOnce } from "@/features/workout-session/set-completion-controller";
import { getSupersetRestDecision } from "@/features/workout-session/superset-round-controller";
import { useAlert } from "@/context/AlertContext";
import { getErrorMessage } from "@/utils/apiError";
import { useTheme } from "@/context/ThemeContext";
import { useUnitPreference } from "@/context/UnitPreferenceContext";
import {
  ACTIVE_SESSION_DRAFT_VERSION,
  appendExerciseDraftSet,
  completeExerciseDraftSet,
  createExerciseDraft,
  duplicateExerciseDraftSet,
  getExerciseRestSeconds,
  getDurationLabel,
  removeExerciseDraftSetWithUndo,
  restoreRemovedExerciseDraftSet,
  toggleExerciseDraftSetType,
  type DraftSet,
  type ExerciseDraft,
  type RemovedDraftSet,
  updateExerciseDraftSet,
} from "@/features/workout-session/drafts";
import {
  resolveActiveSession,
  type RestoredSession,
} from "@/features/workout-session/restored-session";
import {
  type ActiveWorkoutRouteParams,
  parseActiveWorkoutRouteLaunch,
} from "@/features/workout-session/active-workout-launch";
import {
  type ActiveWorkoutExerciseState,
  addActiveWorkoutExercise,
  removeActiveWorkoutExercise,
  swapActiveWorkoutExercise,
} from "@/features/workout-session/active-workout-state";
import {
  CLOSED_PICKER,
  closePicker,
  type ExercisePickerState,
  openAddPicker,
  openSwapPicker,
  pickerSearch,
  pickerSwapTarget,
  setPickerSearch,
} from "@/features/workout-session/exercise-picker-state";
import { useRestTimer } from "@/features/workout-session/use-rest-timer";
import { summarizeWorkoutTotals } from "@/features/workout-session/workout-totals";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import {
  createExerciseSession,
  ExerciseProgressionDTO,
  GymExerciseSessionRequestDTO,
} from "@/services/gymService";
import {
  ActiveSessionData,
  clearActiveSession,
  loadActiveSession,
  saveActiveSession,
} from "@/services/sessionStorage";
import { completeWorkoutSession } from "@/services/workoutProgramService";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

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



export default function ActiveWorkoutSession() {
  const { theme } = useTheme();
  const { measurementSystem } = useUnitPreference();
  const styles = useMemo(() => gymStyles(theme), [theme]);
  const router = useRouter();
  const queryClient = useQueryClient();
  // Stable so the memoized state screens do not re-render on every tick of the
  // session timer.
  const goBack = useCallback(() => router.back(), [router]);
  const routeParams = useLocalSearchParams<ActiveWorkoutRouteParams>();

  // One value, one lifecycle: absent until hydration reads storage, then
  // present. Previously seven independent slots that could only ever be written
  // together.
  const [restoredSession, setRestoredSession] = useState<RestoredSession | null>(
    null,
  );

  const restTimer = useRestTimer();
  const restoreRestTimer = restTimer.restore;

  // The route boundary: one parse of every param, with invalid optional
  // metadata ignored so a malformed deep link still starts a manual workout.
  //
  // Keyed on the individual param strings, not on the params object:
  // useLocalSearchParams returns a fresh object every render, so depending on it
  // would rebuild `launch` each time and churn the identity of everything
  // derived from it — including the exercise list's memo boundary.
  const launch = useMemo(
    () => parseActiveWorkoutRouteLaunch(routeParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      routeParams.exerciseIds,
      routeParams.workoutSessionId,
      routeParams.routineName,
      routeParams.plannedExerciseMap,
      routeParams.plannedExerciseRestMap,
      routeParams.activeWorkoutLayout,
    ],
  );

  const {
    restoredExerciseIds: restoredIds,
    workoutSessionId: activeWorkoutSessionId,
    routineName: activeRoutineName,
    plannedExerciseIds: activePlannedExerciseIds,
    plannedExerciseRestSeconds: activePlannedExerciseRestSeconds,
    layoutSnapshot: activeLayoutSnapshot,
    exerciseSnapshots: activeExerciseSnapshots,
  } = useMemo(
    () => resolveActiveSession(restoredSession, launch),
    [restoredSession, launch],
  );

  const selectedIds = launch.exerciseIds;
  const { alert } = useAlert();

  const sessionStartedAtRef = useRef(new Date().toISOString());
  const [elapsed, setElapsed] = useState("0 min");
  const [drafts, setDrafts] = useState<Record<number, ExerciseDraft>>({});
  const draftsRef = useRef<Record<number, ExerciseDraft>>({});
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [finishingId, setFinishingId] = useState<number | null>(null);
  const [removedSet, setRemovedSet] = useState<RemovedDraftSet | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedSetClaimsRef = useRef(new Set<string>());
  const [allSaved, setAllSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [picker, setPicker] = useState<ExercisePickerState>(CLOSED_PICKER);
  const exerciseSearch = pickerSearch(picker);
  const [currentExerciseIds, setCurrentExerciseIds] = useState<number[]>([]);

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
      .map((id) => {
        const snapshot = activeExerciseSnapshots?.[id];
        if (snapshot) {
          const min = snapshot.targetRepMin;
          const max = snapshot.targetRepMax;
          return {
            id,
            catalog_exercise_id: snapshot.catalogExerciseId,
            name: snapshot.name,
            muscle_group: snapshot.muscleGroup,
            target_rep_range: min ? `${min}-${max ?? min}` : undefined,
            notes: snapshot.notes ?? undefined,
          } satisfies ExerciseProgressionDTO;
        }
        return exerciseProgressions.find((e) => e.id === id);
      })
      .filter((e): e is ExerciseProgressionDTO => e != null);
  }, [sessionExerciseIds, exerciseProgressions, activeExerciseSnapshots]);

  const activeGroupByExercise = useMemo(() => {
    const groups = new Map<number, { id: string; memberIndex: number; size: number }>();
    for (const group of activeLayoutSnapshot?.groups ?? []) {
      group.memberExerciseIds.forEach((exerciseId, memberIndex) =>
        groups.set(exerciseId, { id: group.id, memberIndex, size: group.memberExerciseIds.length }),
      );
    }
    return groups;
  }, [activeLayoutSnapshot]);

  useEffect(() => {
    if (hydrated) return;
    if (isLoading) return;

    const hydrate = async () => {
      const stored = await loadActiveSession();

      if (stored && stored.exerciseIds.length > 0) {
        sessionStartedAtRef.current = stored.startedAt;
        draftsRef.current = stored.drafts;
        setDrafts(stored.drafts);
        setCompletedIds(new Set(stored.completedIds));
        setRestoredSession({
          exerciseIds: stored.exerciseIds,
          workoutSessionId: stored.workoutSessionId ?? null,
          routineName: stored.routineName ?? null,
          plannedExerciseIds: stored.plannedExerciseIds ?? {},
          plannedExerciseRestSeconds: stored.plannedExerciseRestSeconds ?? {},
          layoutSnapshot: stored.layoutSnapshot,
          exerciseSnapshots: stored.exerciseSnapshots,
        });
        restoreRestTimer(stored.restTimer);
        setCurrentExerciseIds(stored.exerciseIds);
        setHydrated(true);
        return;
      }

      if (selectedExercises.length) {
        const initial: Record<number, ExerciseDraft> = {};
        for (const exercise of selectedExercises) {
          initial[exercise.id] = createExerciseDraft(exercise.id, exercise);
        }
        draftsRef.current = initial;
        setDrafts(initial);
        setCurrentExerciseIds(selectedIds);
      }
      setHydrated(true);
    };

    hydrate();
  }, [hydrated, selectedExercises, selectedIds, isLoading, restoreRestTimer]);

  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearedRef = useRef(false);

  useEffect(
    () => () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    },
    [],
  );

  const persistState = useCallback(() => {
    if (!hydrated || allSaved || clearedRef.current) return;
    if (!sessionExerciseIds.length) return;

    const data: ActiveSessionData = {
      version: ACTIVE_SESSION_DRAFT_VERSION,
      workoutSessionId: activeWorkoutSessionId ?? undefined,
      routineName: activeRoutineName,
      plannedExerciseIds: activePlannedExerciseIds,
      plannedExerciseRestSeconds: activePlannedExerciseRestSeconds,
      layoutSnapshot: activeLayoutSnapshot,
      exerciseSnapshots: activeExerciseSnapshots,
      restTimer: restTimer.snapshot(),
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
    drafts,
    completedIds,
    activeWorkoutSessionId,
    activeRoutineName,
    activePlannedExerciseIds,
    activePlannedExerciseRestSeconds,
    activeLayoutSnapshot,
    activeExerciseSnapshots,
    restTimer,
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
    setDrafts((current) => {
      const next = updateExerciseDraftSet(current, exerciseId, localId, field, value);
      draftsRef.current = next;
      return next;
    });
  };

  const addDraftSet = (exerciseId: number) => {
    setDrafts((current) => {
      const next = appendExerciseDraftSet(current, exerciseId);
      draftsRef.current = next;
      return next;
    });
  };

  const deleteDraftSet = (exerciseId: number, localId: string) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const result = removeExerciseDraftSetWithUndo(drafts, exerciseId, localId);
    if (!result.removed) return;
    draftsRef.current = result.drafts;
    setDrafts(result.drafts);
    setRemovedSet(result.removed);
    undoTimerRef.current = setTimeout(() => setRemovedSet(null), 5000);
  };

  const undoDeleteDraftSet = () => {
    if (!removedSet) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setDrafts((current) => {
      const next = restoreRemovedExerciseDraftSet(current, removedSet);
      draftsRef.current = next;
      return next;
    });
    setRemovedSet(null);
  };

  const duplicateDraftSet = (exerciseId: number, localId: string) => {
    setDrafts((current) => {
      const next = duplicateExerciseDraftSet(current, exerciseId, localId);
      draftsRef.current = next;
      return next;
    });
  };

  const completeDraftSet = (exerciseId: number, localId: string) => {
    const draftsBefore = draftsRef.current;
    const set = draftsBefore[exerciseId]?.sets.find((candidate) => candidate.localId === localId);
    if (!set) return;
    const result = completeDraftSetOnce(
      completedSetClaimsRef.current,
      set,
      () => {
        const next = completeExerciseDraftSet(draftsRef.current, exerciseId, localId);
        draftsRef.current = next;
        setDrafts(next);
      },
      () => {
        const decision = getSupersetRestDecision(
          activeLayoutSnapshot,
          draftsBefore,
          exerciseId,
          set,
          activePlannedExerciseRestSeconds,
          getExerciseRestSeconds(undefined, exerciseId),
        );
        const normalRest = getExerciseRestSeconds(activePlannedExerciseRestSeconds, exerciseId);
        const seconds = set.set_type === "WARMUP"
          ? normalRest
          : decision.kind === "start"
            ? decision.durationSeconds
            : activeLayoutSnapshot?.groups.some((group) => group.memberExerciseIds.includes(exerciseId))
              ? 0
              : normalRest;
        if (seconds > 0) restTimer.start(seconds);
      },
    );
    if (result === "invalid") {
      alert(
        "Incomplete set",
        `Set #${set.set_number} needs a numeric weight and reps greater than zero.`,
      );
    }
  };

  const toggleDraftSetType = (exerciseId: number, localId: string) => {
    setDrafts((current) => {
      const next = toggleExerciseDraftSetType(current, exerciseId, localId);
      draftsRef.current = next;
      return next;
    });
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
          exercise.muscle_group?.toLowerCase().includes(keyword)
        );
      });
  }, [exerciseProgressions, sessionExerciseIds, exerciseSearch]);

  /**
   * Applies one atomic transition over the {ids, drafts, completedIds} triple.
   *
   * These three always move together; updating them through three independent
   * setState calls is what previously let them drift. Also keeps `draftsRef` in
   * step — the old inline remove/swap paths did not, which left the ref holding
   * drafts for exercises no longer in the session.
   */
  const applyExerciseTransition = (
    transition: (
      state: ActiveWorkoutExerciseState,
    ) => ActiveWorkoutExerciseState,
  ) => {
    const next = transition({
      exerciseIds: sessionExerciseIds,
      drafts: draftsRef.current,
      completedIds,
    });
    draftsRef.current = next.drafts;
    setCurrentExerciseIds(next.exerciseIds);
    setDrafts(next.drafts);
    setCompletedIds(new Set(next.completedIds));
  };

  // --- Remove exercise from session ---
  const removeExercise = (exerciseId: number) => {
    if (finishingId === exerciseId) return;

    const exercise = selectedExercises.find((e) => e.id === exerciseId);
    const draft = drafts[exerciseId];
    const hasData = draft?.sets.some(
      (s) => (parseFloat(s.weight) || 0) > 0 || (parseFloat(s.reps) || 0) > 0,
    );

    const doRemove = () =>
      applyExerciseTransition((state) =>
        removeActiveWorkoutExercise(state, exerciseId),
      );

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
    setPicker(openSwapPicker(exerciseId));
  };

  const closeExercisePicker = () => {
    setPicker(closePicker);
  };

  const openAddExerciseModal = () => {
    setPicker(openAddPicker());
  };

  const setExerciseSearch = (value: string) => {
    setPicker((current) => setPickerSearch(current, value));
  };

  const addExerciseToSession = (exerciseId: number) => {
    // addActiveWorkoutExercise is a no-op when the exercise is already present.
    applyExerciseTransition((state) =>
      addActiveWorkoutExercise(state, exerciseId),
    );
    closeExercisePicker();
  };

  const swapExercise = (newExerciseId: number) => {
    // The union guarantees a target whenever the picker is in swap mode, so this
    // narrows rather than guarding against a state that can no longer exist.
    const targetExerciseId = pickerSwapTarget(picker);
    if (targetExerciseId === null) return;

    const oldDraft = drafts[targetExerciseId];
    const hasData = oldDraft?.sets.some(
      (s) => (parseFloat(s.weight) || 0) > 0 || (parseFloat(s.reps) || 0) > 0,
    );

    const doSwap = () => {
      applyExerciseTransition((state) =>
        swapActiveWorkoutExercise(state, targetExerciseId, newExerciseId),
      );
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
      return false;
    }

    setFinishingId(exercise.id);
    try {
      const sessionDate = formatDateForApi(new Date());

      const payload: GymExerciseSessionRequestDTO = {
        session_date: sessionDate,
        notes: "",
        workout_session_id: activeWorkoutSessionId ?? undefined,
        planned_exercise_id: activePlannedExerciseIds[exercise.id],
        sets: draft.sets.map((s) => ({
          set_number: s.set_number,
          weight: parseFloat(s.weight) || 0,
          reps: parseFloat(s.reps) || 0,
          rir: parseFloat(s.rir) || 0,
          set_type: s.set_type,
        })),
      };

      await sessionMutation.mutateAsync({
        exerciseProgressionId: exercise.id,
        payload,
      });

      const completesWorkout =
        !completedIds.has(exercise.id) &&
        completedIds.size + 1 === selectedExercises.length;

      setCompletedIds((prev) => {
        const next = new Set(prev).add(exercise.id);
        if (next.size === selectedExercises.length) {
          setAllSaved(true);
          clearedRef.current = true;
          clearActiveSession();
        }
        return next;
      });

      if (completesWorkout && activeWorkoutSessionId) {
        try {
          await completeWorkoutSession(activeWorkoutSessionId);
        } catch (completionError) {
          alert(
            "Workout saved",
            completionError instanceof Error
              ? `Your sets were saved, but the routine could not be marked complete: ${completionError.message}`
              : "Your sets were saved, but the routine could not be marked complete.",
          );
        }
      }
      return true;
    } catch (err) {
      alert(
        "Save failed",
        getErrorMessage(err, "Could not save this exercise session."),
      );
      return false;
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

    let everyExerciseSaved = true;
    for (const exercise of unfinished) {
      everyExerciseSaved = (await finishExercise(exercise)) === true && everyExerciseSaved;
    }
    if (everyExerciseSaved && unfinished.length > 1 && activeWorkoutSessionId) {
      try {
        await completeWorkoutSession(activeWorkoutSessionId);
      } catch (completionError) {
        alert(
          "Workout saved",
          completionError instanceof Error
            ? `Your sets were saved, but the routine could not be marked complete: ${completionError.message}`
            : "Your sets were saved, but the routine could not be marked complete.",
        );
      }
    }
  };

  const applyProgressionRecommendation = (exercise: ExerciseProgressionDTO) => {
    const recommendation = exercise.recommendation;
    if (!recommendation || recommendation.suggested_weight == null) return;

    const apply = () => {
      const targetSets = Math.max(1, recommendation.target_sets);
      const nextSets: DraftSet[] = Array.from({ length: targetSets }, (_, index) => ({
        localId: `${Date.now()}-${exercise.id}-${index}-${getRandomInt()}`,
        set_number: index + 1,
        weight: String(recommendation.suggested_weight),
        reps: String(recommendation.target_reps_min),
        rir: String(recommendation.target_rir),
        set_type: "WORKING",
        completed: false,
      }));

      setDrafts((current) => ({
        ...current,
        [exercise.id]: {
          exerciseId: exercise.id,
          startedAt: current[exercise.id]?.startedAt ?? new Date().toISOString(),
          sets: nextSets,
        },
      }));
    };

    const hasEnteredData = (drafts[exercise.id]?.sets ?? []).some(
      (set) => Number(set.weight) > 0 || Number(set.reps) > 0,
    );
    if (hasEnteredData) {
      alert(
        "Apply progression suggestion?",
        "This replaces the sets currently entered for this exercise. You can edit the suggested values afterward.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Apply", onPress: apply },
        ],
      );
      return;
    }
    apply();
  };

  // --- Loading / Error states ---

  if (
    (isLoading && !activeExerciseSnapshots) ||
    (hydrated && restoredIds.length > 0 && !selectedExercises.length && !activeExerciseSnapshots)
  ) {
    return <ScreenLoading message="Loading session..." theme={theme} />;
  }

  if (((error && !activeExerciseSnapshots) || (!selectedExercises.length && !isLoading)) && hydrated) {
    return (
      <ScreenError
        title="Session unavailable"
        message="Could not load the selected exercises. Go back and try again."
        actionLabel="Go back"
        onAction={goBack}
        theme={theme}
      />
    );
  }

  // --- Completion screen ---

  if (allSaved) {
    const { totalSets, totalVolume } = summarizeWorkoutTotals(
      selectedExercises.map((exercise) => exercise.id),
      drafts,
    );

    return (
      <ActiveWorkoutCompletion
        routineName={activeRoutineName}
        elapsed={elapsed}
        totalSets={totalSets}
        totalVolume={totalVolume}
        onDone={goBack}
        theme={theme}
      />
    );
  }

  // --- Main session view ---

  // The list's action port. Names differ from the screen's handlers where the
  // port describes intent rather than implementation: `swapExercise` opens the
  // picker, it does not perform the swap.
  const exerciseListActions: ActiveWorkoutExerciseActions = {
    addSet: addDraftSet,
    updateSet: updateDraftSet,
    toggleSetType: toggleDraftSetType,
    completeSet: completeDraftSet,
    duplicateSet: duplicateDraftSet,
    removeSet: deleteDraftSet,
    swapExercise: openSwapModal,
    removeExercise,
    applyRecommendation: applyProgressionRecommendation,
    finishExercise,
  };

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
                {activeRoutineName ?? "Manual Workout"}
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
            <IconButton
              accessibilityLabel="Exit active workout"
              icon={
                <MaterialIcons name="close" size={22} color={theme.primary} />
              }
              onPress={confirmExit}
              size="large"
            />
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
              accessibilityRole="button"
              accessibilityLabel="Add exercise to active workout"
              accessibilityState={{ disabled: !!finishingId }}
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

          <ActiveWorkoutExerciseList
            exercises={selectedExercises}
            drafts={drafts}
            completedIds={completedIds}
            finishingId={finishingId}
            groupsByExercise={activeGroupByExercise}
            measurementSystem={measurementSystem}
            theme={theme}
            actions={exerciseListActions}
          />

          {/* Bottom spacer */}
          <View style={{ height: 20 }} />
        </ScrollView>

        <RestTimerOverlay
          active={restTimer.active}
          remainingSeconds={restTimer.remainingSeconds}
          paused={restTimer.paused}
          initialDuration={restTimer.initialDuration}
          onAdjust={restTimer.adjust}
          onTogglePause={restTimer.togglePause}
          onRestart={restTimer.restart}
          onDismiss={restTimer.dismiss}
          theme={theme}
        />

        {removedSet ? (
          <SetUndoSnackbar
            setNumber={removedSet.set.set_number}
            onUndo={undoDeleteDraftSet}
            theme={theme}
          />
        ) : null}

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
          <AppButton
            label={
              completedIds.size === selectedExercises.length
                ? "All Done"
                : `Save All (${completedIds.size}/${selectedExercises.length} done)`
            }
            accessibilityLabel={
              completedIds.size === selectedExercises.length
                ? "Finish workout"
                : `Save workout, ${completedIds.size} of ${selectedExercises.length} exercises completed`
            }
            loading={!!finishingId}
            onPress={finishAll}
            style={{ width: "100%" }}
          />
        </View>

        {/* One picker: the two modes are mutually exclusive, so they were
            always two instances of the same stateless component where at most
            one could be visible. */}
        <ActiveWorkoutExercisePicker
          visible={picker.visible}
          mode={picker.mode}
          exercises={availableSessionExercises}
          search={exerciseSearch}
          onSearchChange={setExerciseSearch}
          onSelect={picker.mode === "swap" ? swapExercise : addExerciseToSession}
          onClose={closeExercisePicker}
          theme={theme}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

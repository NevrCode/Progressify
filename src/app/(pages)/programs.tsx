import { AppButton } from "@/components/base/app-button";
import {
  DurableUndoSnackbar,
  type DurableUndoSnackbarState,
} from "@/components/base/durable-undo-snackbar";
import {
  ActionStatus,
  type ActionFeedback,
} from "@/components/base/action-status";
import { FormField } from "@/components/base/form-field";
import { PageHeader } from "@/components/base/page-header";
import { SegmentedControl } from "@/components/base/segmented-control";
import { StatePanel } from "@/components/base/state-panel";
import { ProgramLayoutEditor } from "@/components/gym/program-layout-editor";
import { AvailableExerciseRow } from "@/components/gym/available-exercise-row";
import { InactiveProgramCard } from "@/components/gym/inactive-program-card";
import { RoutineLauncherCard } from "@/components/gym/routine-launcher-card";
import { RoutineManageCard } from "@/components/gym/routine-manage-card";
import { programsStyles } from "@/assets/styles/programs.style";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import {
  activateWorkoutProgram,
  addPlannedExercise,
  completeWorkoutProgram,
  createProgramLayoutMutation,
  createWorkoutProgram,
  createWorkoutRoutine,
  deleteWorkoutRoutine,
  deletePlannedExercise,
  duplicateWorkoutRoutine,
  getWorkoutPrograms,
  PlannedExerciseDTO,
  PlannedExerciseRequest,
  ProgramTemplate,
  startWorkoutRoutine,
  getLatestRepeatableWorkoutSnapshot,
  repeatCompletedWorkout,
  replaceWorkoutProgramLayout,
  restoreWorkoutRoutine,
  updatePlannedExercise,
  WorkoutRoutineDTO,
} from "@/services/workoutProgramService";
import { createRepeatWorkoutLaunch } from "@/features/workout-session/repeat-workout";
import { loadActiveSession, saveActiveSession } from "@/services/sessionStorage";
import {
  serializeProgramLayout,
  type ProgramLayout,
} from "@/features/program-layout/model";
import {
  isRoutineLayoutRevisionConflict,
  routineLayoutConflictPrompt,
} from "@/features/program-layout/conflict";
import { toApiError } from "@/utils/apiError";
import { isOfflineQueuedResponse } from "@/utils/offline-response";
import { syncQueue } from "@/services/syncQueueService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const templateOptions = [
  { label: "PPL", value: "PUSH_PULL_LEGS" },
  { label: "Upper/Lower", value: "UPPER_LOWER" },
  { label: "Full Body", value: "FULL_BODY" },
  { label: "Bro Split", value: "BRO_SPLIT" },
  { label: "Custom", value: "CUSTOM" },
] as const;
type RoutineDeleteUndo = DurableUndoSnackbarState & {
  pendingId?: string;
  routineId?: number;
};

const parseRepRange = (value?: string) => {
  const values = value?.match(/\d+/g)?.map(Number) ?? [];
  return { min: values[0] || 8, max: values[1] || values[0] || 12 };
};

const plannedExerciseUpdateRequest = (
  planned: PlannedExerciseDTO,
  restSeconds: number,
): PlannedExerciseRequest => ({
  exercise_progression_id: planned.exercise_progression_id,
  position: planned.position,
  target_sets: planned.target_sets ?? null,
  target_rep_min: planned.target_rep_min ?? null,
  target_rep_max: planned.target_rep_max ?? null,
  target_rir: planned.target_rir ?? null,
  rest_seconds: restSeconds,
  notes: planned.notes ?? null,
});

type FeedbackSurface = "page" | "create" | "exercise";
type ScopedActionFeedback = ActionFeedback & {
  surface: FeedbackSurface;
};

export default function ProgramsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => programsStyles(theme), [theme]);
  const { alert } = useAlert();
  const router = useRouter();
  const queryClient = useQueryClient();
  const programsQuery = useQuery({
    queryKey: ["gym", "programs"],
    queryFn: getWorkoutPrograms,
  });
  const { data: dashboard } = useGymDashboard();
  const programs = programsQuery.data ?? [];
  const activeProgram = programs.find((program) => program.status === "ACTIVE");
  const [showCreate, setShowCreate] = useState(false);
  const [programName, setProgramName] = useState("");
  const [template, setTemplate] = useState<ProgramTemplate>("PUSH_PULL_LEGS");
  const [routineName, setRoutineName] = useState("");
  const [showManage, setShowManage] = useState(false);
  const [exerciseRoutine, setExerciseRoutine] =
    useState<WorkoutRoutineDTO | null>(null);
  const [actionFeedback, setActionFeedback] =
    useState<ScopedActionFeedback | null>(null);
  const [restSecondsDrafts, setRestSecondsDrafts] = useState<
    Record<number, string>
  >({});
  const [deleteUndo, setDeleteUndo] = useState<RoutineDeleteUndo | null>(null);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["gym", "programs"] });
  const createMutation = useMutation({
    mutationFn: () => createWorkoutProgram(programName.trim(), template),
    onSuccess: async () => {
      await refresh();
      setShowCreate(false);
      setProgramName("");
    },
  });
  const activateMutation = useMutation({
    mutationFn: activateWorkoutProgram,
    onSuccess: refresh,
  });
  const completeMutation = useMutation({
    mutationFn: completeWorkoutProgram,
    onSuccess: refresh,
  });
  const routineMutation = useMutation({
    mutationFn: () =>
      createWorkoutRoutine(
        activeProgram!.id,
        routineName.trim(),
        activeProgram!.routines.length,
      ),
    onSuccess: async () => {
      setRoutineName("");
      await refresh();
    },
  });
  const duplicateRoutineMutation = useMutation({
    mutationFn: duplicateWorkoutRoutine,
    onSuccess: refresh,
  });
  const deleteRoutineMutation = useMutation({
    mutationFn: deleteWorkoutRoutine,
    onSuccess: refresh,
  });
  const addExerciseMutation = useMutation({
    mutationFn: ({
      routine,
      exerciseId,
    }: {
      routine: WorkoutRoutineDTO;
      exerciseId: number;
    }) => {
      const exercise = dashboard?.exercise_progressions?.find(
        (item) => item.id === exerciseId,
      );
      const reps = parseRepRange(exercise?.target_rep_range);
      return addPlannedExercise(routine.id, {
        exercise_progression_id: exerciseId,
        position: routine.planned_exercises.length,
        target_sets: 3,
        target_rep_min: reps.min,
        target_rep_max: reps.max,
        target_rir: 2,
        rest_seconds: 90,
      });
    },
    onSuccess: async () => {
      setExerciseRoutine(null);
      await refresh();
    },
  });
  const deleteExerciseMutation = useMutation({
    mutationFn: deletePlannedExercise,
    onSuccess: refresh,
  });
  const updateRestMutation = useMutation({
    mutationFn: ({
      planned,
      restSeconds,
    }: {
      planned: PlannedExerciseDTO;
      restSeconds: number;
    }) =>
      updatePlannedExercise(
        planned.id,
        plannedExerciseUpdateRequest(planned, restSeconds),
      ),
    onSuccess: async (_updated, variables) => {
      setRestSecondsDrafts((current) => {
        const next = { ...current };
        delete next[variables.planned.id];
        return next;
      });
      await refresh();
    },
  });
  const layoutMutation = useMutation({
    mutationFn: ({ programId, request }: { programId: number; request: ReturnType<typeof serializeProgramLayout> }) =>
      replaceWorkoutProgramLayout(programId, createProgramLayoutMutation(request)),
    onSuccess: refresh,
  });
  const startMutation = useMutation({
    mutationFn: startWorkoutRoutine,
    onSuccess: (session) => {
      const plannedMap = Object.fromEntries(
        session.exercises.map((exercise) => [
          exercise.exercise_progression_id,
          exercise.id,
        ]),
      );
      const plannedRestMap = Object.fromEntries(
        session.exercises.map((exercise) => [
          exercise.exercise_progression_id,
          exercise.rest_seconds ?? 90,
        ]),
      );
      const activeWorkoutLayout = {
        layoutRevision: session.layout_revision_snapshot ?? null,
        groups: (session.exercise_groups ?? []).flatMap((group) => {
          const memberExerciseIds = session.exercises
            .filter((exercise) => exercise.group_id === group.id)
            .sort((left, right) => (left.group_member_position ?? 0) - (right.group_member_position ?? 0))
            .map((exercise) => exercise.exercise_progression_id);
          return memberExerciseIds.length >= 2
            ? [{
                id: group.id,
                restAfterRoundSeconds: group.rest_after_round_seconds ?? null,
                memberExerciseIds,
              }]
            : [];
        }),
      };
      router.replace({
        pathname: "/activeWorkoutSession",
        params: {
          exerciseIds: session.exercises
            .map((item) => item.exercise_progression_id)
            .join(","),
          workoutSessionId: String(session.id),
          routineName: session.routine_name_snapshot,
          plannedExerciseMap: JSON.stringify(plannedMap),
          plannedExerciseRestMap: JSON.stringify(plannedRestMap),
          activeWorkoutLayout: JSON.stringify(activeWorkoutLayout),
        },
      });
    },
  });
  const repeatMutation = useMutation({
    mutationFn: async () => {
      const snapshot = await getLatestRepeatableWorkoutSnapshot();
      const session = await repeatCompletedWorkout(snapshot.workout_session_id);
      return { snapshot, session };
    },
    onSuccess: async ({ snapshot, session }) => {
      const launch = createRepeatWorkoutLaunch(snapshot, session);
      await saveActiveSession(launch);
      router.replace("/activeWorkoutSession");
    },
  });

  const saveProgramLayout = async (layout: ProgramLayout) => {
    try {
      await layoutMutation.mutateAsync({
        programId: layout.programId,
        request: serializeProgramLayout(layout),
      });
      setActionFeedback({ status: "success", surface: "page", title: "Layout saved", message: "Routine order and supersets were saved together." });
    } catch (error) {
      const apiError = toApiError(error);
      if (isRoutineLayoutRevisionConflict(apiError)) {
        await programsQuery.refetch();
        alert(
          "Program changed elsewhere",
          routineLayoutConflictPrompt,
          [{ text: "OK" }],
        );
        return;
      }
      setActionFeedback({ status: "error", surface: "page", title: "Could not save layout", message: apiError.message });
      throw apiError;
    }
  };

  const availableExercises = useMemo(() => {
    const used = new Set(
      exerciseRoutine?.planned_exercises.map(
        (item) => item.exercise_progression_id,
      ),
    );
    return (dashboard?.exercise_progressions ?? []).filter(
      (item) => !used.has(item.id),
    );
  }, [dashboard, exerciseRoutine]);

  const run = async (
    operation: string,
    action: () => Promise<unknown>,
    options: {
      surface?: FeedbackSurface;
      successMessage?: string;
    } = {},
  ) => {
    setActionFeedback(null);
    try {
      await action();
      setActionFeedback({
        status: "success",
        surface: "page",
        title: "Action completed",
        message:
          options.successMessage ??
          `${operation.charAt(0).toUpperCase()}${operation.slice(1)} completed successfully.`,
      });
    } catch (error) {
      const apiError = toApiError(error);
      const message =
        apiError.status === 404 && apiError.code !== "DATA_NOT_FOUND"
          ? "Workout programs are not available from this server yet. Update or restart the backend with migration V12, then try again."
          : apiError.message;
      setActionFeedback({
        status: "error",
        surface: options.surface ?? "page",
        title: `Could not ${operation}`,
        message,
      });
    }
  };

  const closeFeedbackSurface = (
    surface: Exclude<FeedbackSurface, "page">,
    close: () => void,
  ) => {
    close();
    setActionFeedback((current) =>
      current?.surface === surface ? null : current,
    );
  };

  const confirmDuplicateRoutine = (routine: WorkoutRoutineDTO) => {
    alert(
      "Duplicate routine",
      `Create a new copy of "${routine.name}" with all ${routine.planned_exercises.length} exercises?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Duplicate",
          onPress: () =>
            void run(
              "duplicate routine",
              () => duplicateRoutineMutation.mutateAsync(routine.id),
              {
                successMessage: `"${routine.name}" was duplicated.`,
              },
            ),
        },
      ],
    );
  };
  const confirmDeleteRoutine = (routine: WorkoutRoutineDTO) => {
    alert(
      "Delete empty routine",
      `Remove "${routine.name}"? Routines with exercises cannot be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteRoutineMutation.mutateAsync(routine.id);
              setDeleteUndo({
                phase: "countdown",
                label: routine.name,
                expiresAt: Date.now() + 5000,
                routineId: routine.id,
                ...(isOfflineQueuedResponse(result) ? { pendingId: result.pending_id } : {}),
              });
            } catch (error) {
              setActionFeedback({ status: "error", surface: "page", title: "Could not delete routine", message: toApiError(error).message });
            }
          },
        },
      ],
    );
  };
  const undoRoutineDeletion = async () => {
    const undo = deleteUndo;
    if (!undo || undo.phase !== "countdown" || !undo.routineId) return;
    setDeleteUndo({ phase: "undoing", label: undo.label });
    try {
      if (undo.pendingId) {
        const cancellation = await syncQueue.cancelPendingDelete(undo.pendingId);
        if (cancellation.status !== "cancelled") {
          setDeleteUndo({ phase: "unavailable", label: undo.label, message: "Undo is unavailable because deletion has already started syncing." });
          return;
        }
      } else {
        const restored = await restoreWorkoutRoutine(undo.routineId);
        await refresh();
        setDeleteUndo({
          phase: "restored",
          label: undo.label,
          ...(isOfflineQueuedResponse(restored)
            ? { message: "Restoration saved locally and will sync in order." }
            : {}),
        });
        return;
      }
      await refresh();
      setDeleteUndo({ phase: "restored", label: undo.label });
    } catch (error) {
      setDeleteUndo({ phase: "error", label: undo.label, message: toApiError(error).message });
    }
  };

  const startRepeat = () =>
    void (async () => {
      setActionFeedback(null);
      try {
        await repeatMutation.mutateAsync();
      } catch (error) {
        const apiError = toApiError(error);
        const message = apiError.code === "DATA_NOT_FOUND"
          ? "There is no completed routine workout to repeat yet."
          : apiError.code === "NO_REPEATABLE_WORKOUT"
            ? "Your latest completed workout predates repeat snapshots. Complete a new routine workout first."
            : apiError.message;
        setActionFeedback({
          status: "error",
          surface: "page",
          title: "Could not repeat last workout",
          message,
        });
      }
    })();

  const requestRepeat = async () => {
    const active = await loadActiveSession();
    if (!active?.exerciseIds.length) {
      startRepeat();
      return;
    }
    alert(
      "Unfinished workout",
      "Finish or discard the current workout before repeating the last one.",
      [
        { text: "Resume current", onPress: () => router.push("/activeWorkoutSession") },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const saveRestSeconds = (planned: PlannedExerciseDTO) => {
    const value =
      restSecondsDrafts[planned.id] ?? String(planned.rest_seconds ?? 90);
    const restSeconds = Number(value);
    if (!Number.isInteger(restSeconds) || restSeconds < 0 || restSeconds > 3600) {
      setActionFeedback({
        status: "error",
        surface: "page",
        title: "Could not update rest time",
        message: "Rest time must be a whole number from 0 to 3600 seconds.",
      });
      return;
    }
    void run(
      "update rest time",
      () => updateRestMutation.mutateAsync({ planned, restSeconds }),
      {
        successMessage: `${planned.exercise_name} now uses ${restSeconds} seconds of rest.`,
      },
    );
  };

  // Stable callback identities for the memoized row/card components below.
  // `run`, the mutations, and the alert-confirm helpers above are all
  // recreated on every render (react-query mutation objects are not stable
  // across renders), so the callbacks the memoized children receive are
  // built once via a latest-ref forwarder — the same pattern used for
  // `ActiveWorkoutExerciseList`'s `stableActions`.
  const latestActions = {
    onStart: (routineId: number) =>
      run("start workout", () => startMutation.mutateAsync(routineId)),
    onActivate: (programId: number) =>
      run("activate program", () => activateMutation.mutateAsync(programId)),
    onDuplicate: confirmDuplicateRoutine,
    onDelete: confirmDeleteRoutine,
    onAddExercise: (routine: WorkoutRoutineDTO) => setExerciseRoutine(routine),
    onDeleteExercise: (plannedId: number) =>
      run("remove exercise", () =>
        deleteExerciseMutation.mutateAsync(plannedId),
      ),
    onSaveRest: saveRestSeconds,
    onAddAvailableExercise: (exerciseId: number) => {
      const routine = exerciseRoutine;
      const exercise = availableExercises.find(
        (item) => item.id === exerciseId,
      );
      if (!routine || !exercise) return;
      void run(
        "add exercise",
        () =>
          addExerciseMutation.mutateAsync({
            routine,
            exerciseId,
          }),
        {
          surface: "exercise",
          successMessage: `${exercise.name} was added to the routine.`,
        },
      );
    },
  };
  const latestActionsRef = useRef(latestActions);
  useEffect(() => {
    latestActionsRef.current = latestActions;
  });
  const actions = useMemo(
    () => ({
      onStart: (routineId: number) => latestActionsRef.current.onStart(routineId),
      onActivate: (programId: number) =>
        latestActionsRef.current.onActivate(programId),
      onDuplicate: (routine: WorkoutRoutineDTO) =>
        latestActionsRef.current.onDuplicate(routine),
      onDelete: (routine: WorkoutRoutineDTO) =>
        latestActionsRef.current.onDelete(routine),
      onAddExercise: (routine: WorkoutRoutineDTO) =>
        latestActionsRef.current.onAddExercise(routine),
      onDeleteExercise: (plannedId: number) =>
        latestActionsRef.current.onDeleteExercise(plannedId),
      onSaveRest: (planned: PlannedExerciseDTO) =>
        latestActionsRef.current.onSaveRest(planned),
      onAddAvailableExercise: (exerciseId: number) =>
        latestActionsRef.current.onAddAvailableExercise(exerciseId),
    }),
    [],
  );
  const onChangeRestDraft = (plannedId: number, value: string) =>
    setRestSecondsDrafts((current) => ({ ...current, [plannedId]: value }));

  const savingRestForPlannedId =
    updateRestMutation.isPending && updateRestMutation.variables
      ? updateRestMutation.variables.planned.id
      : null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
      >
        <PageHeader eyebrow="Training structure" title="Workout Program" />

        {actionFeedback?.surface === "page" ? (
          <ActionStatus
            {...actionFeedback}
            onDismiss={() => setActionFeedback(null)}
          />
        ) : null}

        {programsQuery.isLoading ? (
          <Text selectable style={styles.loadingText}>
            Loading your program…
          </Text>
        ) : programsQuery.isError ? (
          <StatePanel
            variant="error"
            title="Workout programs unavailable"
            message={
              toApiError(programsQuery.error).status === 404
                ? "The connected server does not provide the workout-program API yet."
                : toApiError(programsQuery.error).message
            }
            primaryAction={{
              label: "Try again",
              onPress: () => void programsQuery.refetch(),
            }}
          />
        ) : activeProgram ? (
          <>
            <View style={styles.heroCard}>
              <Text selectable style={styles.heroCardLabel}>
                Active program
              </Text>
              <Text selectable style={styles.heroCardTitle}>
                {activeProgram.name}
              </Text>
              <Text selectable style={styles.heroCardMeta}>
                {activeProgram.routines.length} routines ·{" "}
                {activeProgram.template_type.replaceAll("_", " ")}
              </Text>
            </View>

            <View style={styles.sectionGap5}>
              <Text selectable style={styles.titleMD}>
                Choose today&apos;s workout
              </Text>
              <Text selectable style={styles.subtitleHint}>
                Pick a routine and start immediately.
              </Text>
            </View>

            {activeProgram.routines.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.launcherScrollContent}
              >
                {activeProgram.routines.map((routine) => (
                  <RoutineLauncherCard
                    key={`launcher-${routine.id}`}
                    routine={routine}
                    starting={
                      startMutation.isPending &&
                      startMutation.variables === routine.id
                    }
                    styles={styles}
                    onStart={actions.onStart}
                  />
                ))}
              </ScrollView>
            ) : (
              <StatePanel
                variant="empty"
                compact
                title="No routines yet"
                message="Open program management to add the first routine to this program."
                primaryAction={{
                  label: "Manage program",
                  onPress: () => setShowManage(true),
                }}
              />
            )}

            <AppButton
              label={showManage ? "Close program management" : "Manage program"}
              variant="secondary"
              onPress={() => setShowManage((current) => !current)}
            />

            {showManage ? (
              <>
                <View style={styles.card}>
                  <Text selectable style={styles.titleXS}>
                    Program actions
                  </Text>
                  <AppButton
                    label="Complete program"
                    variant="secondary"
                    onPress={() =>
                      run("complete program", () =>
                        completeMutation.mutateAsync(activeProgram.id),
                      )
                    }
                  />
                </View>

                <View style={styles.card}>
                  <Text selectable style={styles.titleXS}>
                    Routine order and supersets
                  </Text>
                  <ProgramLayoutEditor
                    key={`${activeProgram.id}-${activeProgram.layout_revision ?? 0}`}
                    program={activeProgram}
                    saving={layoutMutation.isPending}
                    onSave={saveProgramLayout}
                  />
                </View>

                {activeProgram.routines.map((routine) => (
                  <RoutineManageCard
                    key={routine.id}
                    routine={routine}
                    starting={
                      startMutation.isPending &&
                      startMutation.variables === routine.id
                    }
                    duplicating={
                      duplicateRoutineMutation.isPending &&
                      duplicateRoutineMutation.variables === routine.id
                    }
                    restSecondsDrafts={restSecondsDrafts}
                    savingRestForPlannedId={savingRestForPlannedId}
                    styles={styles}
                    theme={theme}
                    onStart={actions.onStart}
                    onDuplicate={actions.onDuplicate}
                    onDelete={actions.onDelete}
                    onAddExercise={actions.onAddExercise}
                    onDeleteExercise={actions.onDeleteExercise}
                    onChangeRestDraft={onChangeRestDraft}
                    onSaveRest={actions.onSaveRest}
                  />
                ))}

                <View style={styles.card}>
                  <Text selectable style={styles.titleXS}>
                    Add custom routine
                  </Text>
                  <FormField
                    label="Routine name"
                    value={routineName}
                    onChangeText={setRoutineName}
                    placeholder="Example: Upper C"
                  />
                  <AppButton
                    label="Add routine"
                    disabled={!routineName.trim()}
                    loading={routineMutation.isPending}
                    onPress={() =>
                      run("add routine", () => routineMutation.mutateAsync())
                    }
                  />
                </View>
              </>
            ) : null}
          </>
        ) : (
          <StatePanel
            variant="empty"
            title="No active program"
            message="Create a program template or activate one of your previous programs."
            primaryAction={{
              label: "Create program",
              onPress: () => setShowCreate(true),
            }}
          />
        )}

        {(!activeProgram || showManage) &&
          programs
            .filter((item) => item.status !== "ACTIVE")
            .map((program) => (
              <InactiveProgramCard
                key={program.id}
                program={program}
                activating={
                  activateMutation.isPending &&
                  activateMutation.variables === program.id
                }
                styles={styles}
                onActivate={actions.onActivate}
              />
            ))}

        {activeProgram && showManage ? (
          <AppButton
            label="Create another program"
            variant="ghost"
            onPress={() => setShowCreate(true)}
          />
        ) : null}
        <AppButton
          label="Repeat last workout"
          variant="secondary"
          loading={repeatMutation.isPending}
          onPress={() => void requestRepeat()}
        />
        <AppButton
          label="Manual workout"
          variant="ghost"
          onPress={() => router.push("/workoutSession")}
        />
      </ScrollView>

      <Modal
        visible={showCreate}
        transparent
        animationType="fade"
        onRequestClose={() =>
          closeFeedbackSurface("create", () => setShowCreate(false))
        }
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlayCenter}>
            <View style={[styles.card, styles.modalCardCentered]}>
              <Text selectable style={styles.titleLG}>
                Create workout program
              </Text>
              {actionFeedback?.surface === "create" ? (
                <ActionStatus
                  {...actionFeedback}
                  onDismiss={() => setActionFeedback(null)}
                />
              ) : null}
              <FormField
                label="Program name"
                value={programName}
                onChangeText={setProgramName}
                placeholder="My training program"
              />
              <SegmentedControl
                accessibilityLabel="Program template"
                options={templateOptions}
                value={template}
                onChange={setTemplate}
              />
              <View style={styles.modalActionsRow}>
                <AppButton
                  label="Cancel"
                  variant="secondary"
                  style={styles.modalActionButton}
                  onPress={() =>
                    closeFeedbackSurface("create", () =>
                      setShowCreate(false),
                    )
                  }
                />
                <AppButton
                  label="Create"
                  style={styles.modalActionButton}
                  disabled={!programName.trim()}
                  loading={createMutation.isPending}
                  onPress={() =>
                    run(
                      "create program",
                      () => createMutation.mutateAsync(),
                      {
                        surface: "create",
                        successMessage: "The workout program was created.",
                      },
                    )
                  }
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={exerciseRoutine != null}
        transparent
        animationType="slide"
        onRequestClose={() =>
          closeFeedbackSurface("exercise", () => setExerciseRoutine(null))
        }
      >
        <View style={styles.modalOverlayBottom}>
          <View style={[styles.card, styles.modalCardSheet]}>
            <Text selectable style={styles.titleLG}>
              Add to {exerciseRoutine?.name}
            </Text>
            {actionFeedback?.surface === "exercise" ? (
              <ActionStatus
                {...actionFeedback}
                onDismiss={() => setActionFeedback(null)}
              />
            ) : null}
            <ScrollView
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={styles.exerciseSheetScrollContent}
            >
              {availableExercises.map((exercise) => (
                <AvailableExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  styles={styles}
                  onAdd={actions.onAddAvailableExercise}
                />
              ))}
            </ScrollView>
            <AppButton
              label="Close"
              variant="secondary"
              onPress={() =>
                closeFeedbackSurface("exercise", () =>
                  setExerciseRoutine(null),
                )
              }
            />
          </View>
        </View>
      </Modal>
      <DurableUndoSnackbar
        onExpired={() => setDeleteUndo((current) => current?.phase === "countdown" ? { phase: "unavailable", label: current.label, message: "Undo period expired." } : current)}
        onUndo={() => void undoRoutineDeletion()}
        state={deleteUndo}
        theme={theme}
      />
    </SafeAreaView>
  );
}

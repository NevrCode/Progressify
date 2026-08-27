import { gymStyles } from "@/assets/styles/gym.style";
import { AppButton } from "@/components/base/app-button";
import {
  DurableUndoSnackbar,
  type DurableUndoSnackbarState,
} from "@/components/base/durable-undo-snackbar";
import { DateOnlyField } from "@/components/base/date-only-field";
import {
  ActionStatus,
  type ActionFeedback,
} from "@/components/base/action-status";
import { ModalHeader } from "@/components/base/modal-header";
import { ScreenError, ScreenLoading } from "@/components/base/screen-state";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { ProgressionChartFrame } from "@/components/gym/progression-chart-frame";
import { EditableSetRow } from "@/components/gym/editable-set-row";
import { SessionHistoryCard } from "@/components/gym/session-history-card";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useUnitPreference } from "@/context/UnitPreferenceContext";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import { buildProgressionChartSummary } from "@/utils/progression-chart-summary";
import { buildCanonicalWorkoutSetRequest } from "@/features/workout-session/canonical-set-request";
import {
  type EditableSet,
  buildSessionPoints,
  createEditableSet,
  formatDateForDisplay,
  getExerciseName,
  getSessionDate,
  getSessionSets,
  toDateSortValue,
} from "@/features/gym/session-editor";
import { displayMass, formatMass, massUnitLabel } from "@/utils/measurement-units";
import { toApiError } from "@/utils/apiError";
import { isOfflineQueuedResponse } from "@/utils/offline-response";
import {
  deleteSessionProgression,
  ExerciseSessionDTO,
  GymExerciseSessionRequestDTO,
  restoreSessionProgression,
  updateExerciseSession,
} from "@/services/gymService";
import { syncQueue } from "@/services/syncQueueService";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";

type SessionDeleteUndo = DurableUndoSnackbarState & {
  pendingId?: string;
  sessionId?: number;
};

export default function ManageWorkoutSession() {
  const { theme } = useTheme();
  const { measurementSystem } = useUnitPreference();
  const styles = useMemo(() => gymStyles(theme), [theme]);
  const router = useRouter();
  const queryClient = useQueryClient();
  const goBack = useCallback(() => router.back(), [router]);
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const selectedExerciseId = Number(exerciseId);
  const { alert } = useAlert();
  const [editingSession, setEditingSession] =
    useState<ExerciseSessionDTO | null>(null);
  const [sessionDate, setSessionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [editableSets, setEditableSets] = useState<EditableSet[]>([]);
  const [actionFeedback, setActionFeedback] =
    useState<ActionFeedback | null>(null);
  const [deleteUndo, setDeleteUndo] = useState<SessionDeleteUndo | null>(null);

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGymDashboard();

  const exercise = useMemo(
    () =>
      dashboard?.exercise_progressions?.find(
        (item) => item.id === selectedExerciseId,
      ),
    [dashboard, selectedExerciseId],
  );
  const sessions = useMemo(
    () =>
      [...(exercise?.exercise_sessions ?? [])].sort(
        (first, second) =>
          toDateSortValue(getSessionDate(second)) -
          toDateSortValue(getSessionDate(first)),
      ),
    [exercise],
  );
  const sessionPoints = useMemo(() => buildSessionPoints(sessions), [sessions]);
  const chartSummary = useMemo(
    () =>
      buildProgressionChartSummary(
        getExerciseName(exercise),
        sessionPoints,
        { formatValue: (kilograms) => formatMass(kilograms, measurementSystem) },
      ),
    [exercise, measurementSystem, sessionPoints],
  );

  const updateSessionMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: GymExerciseSessionRequestDTO;
    }) => updateExerciseSession(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gym"] });
    },
  });
  const deleteSessionMutation = useMutation({
    mutationFn: deleteSessionProgression,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gym"] });
    },
  });

  const openEditModal = useCallback((session: ExerciseSessionDTO) => {
    setActionFeedback(null);
    setEditingSession(session);
    setSessionDate(getSessionDate(session));
    setNotes(session.notes ?? "");
    setEditableSets(getSessionSets(session).map(createEditableSet));
  }, []);

  const closeEditModal = () => {
    setEditingSession(null);
    setSessionDate("");
    setNotes("");
    setEditableSets([]);
    setActionFeedback(null);
  };

  const updateSetField = useCallback(
    (
      localId: string,
      field: keyof Omit<EditableSet, "localId" | "id">,
      value: string,
    ) => {
      setEditableSets((current) =>
        current.map((set) =>
          set.localId === localId ? { ...set, [field]: value } : set,
        ),
      );
    },
    [],
  );

  const addEditableSet = () => {
    setEditableSets((current) => [
      ...current,
      {
        localId: `new-${Date.now()}`,
        set_number: String(current.length + 1),
        weight: "",
        reps: "",
        rir: "0",
        set_type: "WORKING",
      },
    ]);
  };

  const toggleEditableSetType = useCallback((localId: string) => {
    setEditableSets((current) =>
      current.map((set) =>
        set.localId === localId
          ? {
              ...set,
              set_type: set.set_type === "WARMUP" ? "WORKING" : "WARMUP",
            }
          : set,
      ),
    );
  }, []);

  const removeEditableSet = useCallback((localId: string) => {
    setEditableSets((current) =>
      current
        .filter((set) => set.localId !== localId)
        .map((set, index) => ({
          ...set,
          set_number: String(index + 1),
        })),
    );
  }, []);

  const buildPayload = () => {
    if (!sessionDate.trim()) {
      return "Session date is required.";
    }
    if (!editableSets.length) {
      return "Keep at least one set in the session.";
    }

    const sets = editableSets.map((set, index) => buildCanonicalWorkoutSetRequest({
      id: set.id,
      setNumber: index + 1,
      weightKg: set.weight,
      reps: set.reps,
      rir: set.rir,
      setType: set.set_type,
    }));
    const invalidSet = sets.find(
      (set) =>
        !set.set_number ||
        set.set_number <= 0 ||
        set.weight <= 0 ||
        set.reps <= 0 ||
        set.rir < 0,
    );

    if (invalidSet) {
      return `Set #${invalidSet.set_number || "?"} needs a valid set number, weight, reps, and RIR.`;
    }

    return {
      session_date: sessionDate.trim(),
      notes: notes.trim(),
      sets,
    };
  };

  const saveSession = async () => {
    if (!editingSession) return;

    const payload = buildPayload();
    if (typeof payload === "string") {
      setActionFeedback({
        status: "error",
        title: "Session not ready",
        message: payload,
      });
      return;
    }

    setActionFeedback(null);
    try {
      const result = await updateSessionMutation.mutateAsync({
        id: editingSession.id,
        payload,
      });
      closeEditModal();
      setActionFeedback({
        status: isOfflineQueuedResponse(result) ? "info" : "success",
        title: isOfflineQueuedResponse(result)
          ? "Session saved locally"
          : "Session updated",
        message: isOfflineQueuedResponse(result)
          ? "This update is pending synchronization and remains available in the device queue."
          : "The workout session and its sets were saved.",
      });
    } catch (saveError) {
      setActionFeedback({
        status: "error",
        title: "Update failed",
        message:
          toApiError(saveError).message ||
          "The session could not be updated.",
      });
    }
  };

  const confirmDeleteSession = useCallback(
    (session: ExerciseSessionDTO) => {
      alert(
        "Delete session",
        "This will remove the session and its sets from the progression history.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setActionFeedback(null);
              try {
                const result =
                  await deleteSessionMutation.mutateAsync(session.id);
                setDeleteUndo({
                  phase: "countdown",
                  label: `session from ${session.session_date}`,
                  expiresAt: Date.now() + 5000,
                  sessionId: session.id,
                  ...(isOfflineQueuedResponse(result) ? { pendingId: result.pending_id } : {}),
                });
                setActionFeedback({
                  status: isOfflineQueuedResponse(result) ? "info" : "success",
                  title: isOfflineQueuedResponse(result)
                    ? "Deletion saved locally"
                    : "Session deleted",
                  message: isOfflineQueuedResponse(result)
                    ? "The deletion is pending synchronization in the device queue."
                    : "The session was removed from progression history.",
                });
              } catch (deleteError) {
                setActionFeedback({
                  status: "error",
                  title: "Delete failed",
                  message:
                    toApiError(deleteError).message ||
                    "The session could not be deleted.",
                });
              }
            },
          },
        ],
      );
    },
    // `alert` and `deleteSessionMutation` are not guaranteed stable across
    // renders; this callback's identity is only meant to change when the
    // mutation itself does, so it stays in the dependency array while
    // `alert` is read fresh via closure each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deleteSessionMutation],
  );
  const undoSessionDeletion = async () => {
    const undo = deleteUndo;
    if (!undo || undo.phase !== "countdown" || !undo.sessionId) return;
    setDeleteUndo({ phase: "undoing", label: undo.label });
    try {
      if (undo.pendingId) {
        const cancellation = await syncQueue.cancelPendingDelete(undo.pendingId);
        if (cancellation.status !== "cancelled") {
          setDeleteUndo({ phase: "unavailable", label: undo.label, message: "Undo is unavailable because deletion has already started syncing." });
          return;
        }
      } else {
        const restored = await restoreSessionProgression(undo.sessionId);
        await queryClient.invalidateQueries({ queryKey: ["gym"] });
        await refetch();
        setDeleteUndo({
          phase: "restored",
          label: undo.label,
          ...(isOfflineQueuedResponse(restored)
            ? { message: "Restoration saved locally and will sync in order." }
            : {}),
        });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["gym"] });
      await refetch();
      setDeleteUndo({ phase: "restored", label: undo.label });
    } catch (error) {
      setDeleteUndo({ phase: "error", label: undo.label, message: toApiError(error).message });
    }
  };

  if (isLoading) {
    return (
      <ScreenLoading message="Loading workout sessions..." theme={theme} />
    );
  }

  if (error || !exercise) {
    return (
      <ScreenError
        title="Session data unavailable"
        message="Open this page from an exercise progression so the app knows which sessions to manage."
        actionLabel="Go back"
        onAction={goBack}
        theme={theme}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Workout Sessions</Text>
            <Text style={styles.title}>{getExerciseName(exercise)}</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.headerBadge}
            onPress={router.back}
          >
            <MaterialIcons name="arrow-back" size={22} color={theme.white} />
          </TouchableOpacity>
        </View>

        {actionFeedback && !editingSession ? (
          <ActionStatus
            {...actionFeedback}
            onDismiss={() => setActionFeedback(null)}
          />
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>Progression manager</Text>
              <Text style={styles.heroTitle}>
                {sessionPoints.length
                  ? `${sessionPoints.length} sessions`
                  : "No sessions yet"}
              </Text>
            </View>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons
                name="chart-line"
                size={22}
                color={theme.white}
              />
            </View>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Best est. 1RM</Text>
              <Text style={styles.heroStatValue}>
                {sessionPoints.length
                  ? formatMass(Math.max(...sessionPoints.map((point) => point.estimated1RM)), measurementSystem)
                  : "-"}
              </Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Top set</Text>
              <Text style={styles.heroStatValue}>
                {sessionPoints.length
                  ? `${formatMass(sessionPoints[0].topWeight, measurementSystem)} x ${sessionPoints[0].bestReps}`
                  : "-"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Progress graph</Text>
            <Text style={styles.sectionMeta}>Estimated 1RM ({massUnitLabel(measurementSystem)}) by session</Text>
          </View>
        </View>

        {sessionPoints.length ? (
          <ProgressionChartFrame
            summary={chartSummary}
            style={styles.exerciseCard}
          >
            <LineChart
              areaChart
              curved
              isAnimated
              data={sessionPoints.map((point) => ({
                value: displayMass(point.estimated1RM, measurementSystem),
                label: formatDateForDisplay(point.sessionDate),
                dataPointText: String(displayMass(point.estimated1RM, measurementSystem)),
              }))}
              height={220}
              spacing={56}
              initialSpacing={18}
              endSpacing={18}
              thickness={4}
              color={theme.primary}
              startFillColor={theme.primary}
              endFillColor={theme.primary}
              startOpacity={0.32}
              endOpacity={0.02}
              rulesColor={`${theme.border}55`}
              rulesType="dashed"
              yAxisColor="transparent"
              xAxisColor={`${theme.border}88`}
              yAxisTextStyle={styles.chartAxisLabel}
              xAxisLabelTextStyle={styles.chartXAxisLabel}
              noOfSections={4}
              maxValue={
                Math.max(...sessionPoints.map((point) => displayMass(point.estimated1RM, measurementSystem))) +
                5
              }
              dataPointsColor={theme.primary}
              dataPointsRadius={6}
              textColor={theme.textBlack}
              textFontSize={10}
              textShiftY={-14}
              textShiftX={-10}
            />
          </ProgressionChartFrame>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No graph yet</Text>
            <Text style={styles.emptyText}>
              Save at least one session with sets to see the visual trend.
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Session history</Text>
          <Text style={styles.sectionMeta}>{sessions.length} total</Text>
        </View>

        {sessions.length ? (
          sessions.map((session) => (
            <SessionHistoryCard
              key={session.id}
              session={session}
              measurementSystem={measurementSystem}
              styles={styles}
              theme={theme}
              onEdit={openEditModal}
              onDelete={confirmDeleteSession}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No sessions recorded</Text>
            <Text style={styles.emptyText}>
              Finish a workout from the progression page, then manage it here.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!editingSession}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalBackdrop}>
          <ShadowGlowCard style={styles.sessionModalCard}>
            {/* Header */}
            <ModalHeader
              closeLabel="Close edit session"
              onClose={closeEditModal}
              style={styles.sessionModalHeaderSpacing}
              supportingText="Adjust stats and details below"
              title="Edit Session"
            />

            {actionFeedback ? (
              <ActionStatus
                {...actionFeedback}
                onDismiss={() => setActionFeedback(null)}
              />
            ) : null}

            <ScrollView
              contentContainerStyle={styles.sessionModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <DateOnlyField
                label="Session date"
                value={sessionDate}
                onChange={setSessionDate}
              />

              {/* Notes Input */}
              <View>
                <Text style={styles.notesLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textarea, styles.notesInputExtra]}
                  placeholder="How did it feel?"
                  placeholderTextColor={theme.textLight}
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              {/* Sub-Header for Sets */}
              <View style={styles.setsSubHeaderRow}>
                <Text style={styles.setsSubHeaderTitle}>Logged Sets</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Add set"
                  style={styles.addSetButton}
                  onPress={addEditableSet}
                >
                  <MaterialIcons name="add" size={14} color={theme.primary} />
                  <Text style={styles.addSetButtonText}>Add Set</Text>
                </TouchableOpacity>
              </View>

              {/* Spreadsheet-like Table Grid */}
              <View style={styles.setGrid}>
                {/* Table Header Row */}
                <View style={styles.setGridHeaderRow}>
                  <Text style={styles.setGridHeaderCellSet}>SET</Text>
                  <Text style={styles.setGridHeaderCellWeight}>
                    WEIGHT ({massUnitLabel(measurementSystem)})
                  </Text>
                  <Text style={styles.setGridHeaderCellNarrow}>REPS</Text>
                  <Text style={styles.setGridHeaderCellNarrow}>RIR</Text>
                  <View style={styles.setGridHeaderSpacer} />
                </View>

                {/* Table Rows */}
                {editableSets.map((set, idx) => (
                  <EditableSetRow
                    key={set.localId}
                    set={set}
                    index={idx}
                    isLast={idx === editableSets.length - 1}
                    measurementSystem={measurementSystem}
                    styles={styles}
                    theme={theme}
                    onToggleType={toggleEditableSetType}
                    onChangeField={updateSetField}
                    onRemove={removeEditableSet}
                  />
                ))}
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.sessionModalActionsRow}>
              <AppButton
                label="Cancel"
                onPress={closeEditModal}
                style={styles.sessionModalActionButton}
                variant="secondary"
              />

              <AppButton
                label="Save Changes"
                loading={updateSessionMutation.isPending}
                onPress={saveSession}
                style={styles.sessionModalActionButton}
              />
            </View>
          </ShadowGlowCard>
        </View>
      </Modal>
      <DurableUndoSnackbar
        onExpired={() => setDeleteUndo((current) => current?.phase === "countdown" ? { phase: "unavailable", label: current.label, message: "Undo period expired." } : current)}
        onUndo={() => void undoSessionDeletion()}
        state={deleteUndo}
        theme={theme}
      />
    </SafeAreaView>
  );
}

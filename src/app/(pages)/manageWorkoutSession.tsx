import { gymStyles } from "@/assets/styles/gym.style";
import { AppButton } from "@/components/base/app-button";
import { DateOnlyField } from "@/components/base/date-only-field";
import {
  ActionStatus,
  type ActionFeedback,
} from "@/components/base/action-status";
import { ModalHeader } from "@/components/base/modal-header";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { ProgressionChartFrame } from "@/components/gym/progression-chart-frame";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useUnitPreference } from "@/context/UnitPreferenceContext";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import {
  calculateEstimatedOneRepMax,
  calculateWorkingSetVolume,
} from "@/utils/workoutMetrics";
import { isWorkingSet, normalizeWorkoutSetType, type WorkoutSetType } from "@/types/workout-set";
import { buildProgressionChartSummary } from "@/utils/progression-chart-summary";
import { buildCanonicalWorkoutSetRequest } from "@/features/workout-session/canonical-set-request";
import { displayMass, formatMass, formatMassInput, massUnitLabel, parseMassInput } from "@/utils/measurement-units";
import { toApiError } from "@/utils/apiError";
import { isOfflineQueuedResponse } from "@/utils/offline-response";
import {
  deleteSessionProgression,
  ExerciseProgressionDTO,
  ExerciseSessionDTO,
  GymExerciseSessionRequestDTO,
  updateExerciseSession,
  WorkoutSetDTO,
} from "@/services/gymService";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type EditableSet = {
  localId: string;
  id?: number;
  set_number: string;
  weight: string;
  reps: string;
  rir: string;
  set_type: WorkoutSetType;
};

type SessionPoint = {
  sessionDate: string;
  estimated1RM: number;
  topWeight: number;
  bestReps: number;
  totalSets: number;
  totalVolume: number;
};

const getExerciseName = (exercise?: ExerciseProgressionDTO) =>
  exercise?.name ?? "Exercise";

const getSessionSets = (session: ExerciseSessionDTO) => session.sets ?? [];

const getSessionDate = (session: ExerciseSessionDTO) =>
  session.session_date ?? "";

const formatDateForDisplay = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const toDateSortValue = (value?: string) => {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

const buildSessionPoints = (sessions: ExerciseSessionDTO[]): SessionPoint[] =>
  sessions
    .map((session) => {
      const sessionDate = getSessionDate(session);
      const sets = getSessionSets(session).filter(isWorkingSet);

      if (!sessionDate || !sets.length) return null;

      const topSet = sets.reduce((best, current) => {
        if (current.weight > best.weight) return current;
        if (current.weight === best.weight && current.reps > best.reps) {
          return current;
        }
        return best;
      }, sets[0]);
      const totalVolume = calculateWorkingSetVolume(sets);

      return {
        sessionDate,
        estimated1RM: calculateEstimatedOneRepMax(
          topSet.weight,
          topSet.reps,
        ),
        topWeight: topSet.weight,
        bestReps: topSet.reps,
        totalSets: sets.length,
        totalVolume,
      };
    })
    .filter((point): point is SessionPoint => point !== null)
    .sort(
      (first, second) =>
        toDateSortValue(first.sessionDate) -
        toDateSortValue(second.sessionDate),
    );

const createEditableSet = (set: WorkoutSetDTO, index: number): EditableSet => ({
  localId: `${set.id ?? "new"}-${index}-${Date.now()}`,
  id: set.id,
  set_number: String(set.set_number ?? index + 1),
  weight: String(set.weight ?? ""),
  reps: String(set.reps ?? ""),
  rir: String(set.rir ?? 0),
  set_type: normalizeWorkoutSetType(set.set_type),
});

export default function ManageWorkoutSession() {
  const { theme } = useTheme();
  const { measurementSystem } = useUnitPreference();
  const styles = gymStyles(theme);
  const router = useRouter();
  const queryClient = useQueryClient();
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

  const openEditModal = (session: ExerciseSessionDTO) => {
    setActionFeedback(null);
    setEditingSession(session);
    setSessionDate(getSessionDate(session));
    setNotes(session.notes ?? "");
    setEditableSets(getSessionSets(session).map(createEditableSet));
  };

  const closeEditModal = () => {
    setEditingSession(null);
    setSessionDate("");
    setNotes("");
    setEditableSets([]);
    setActionFeedback(null);
  };

  const updateSetField = (
    localId: string,
    field: keyof Omit<EditableSet, "localId" | "id">,
    value: string,
  ) => {
    setEditableSets((current) =>
      current.map((set) =>
        set.localId === localId ? { ...set, [field]: value } : set,
      ),
    );
  };

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

  const toggleEditableSetType = (localId: string) => {
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
  };

  const removeEditableSet = (localId: string) => {
    setEditableSets((current) =>
      current
        .filter((set) => set.localId !== localId)
        .map((set, index) => ({
          ...set,
          set_number: String(index + 1),
        })),
    );
  };

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

  const confirmDeleteSession = (session: ExerciseSessionDTO) => {
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
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Loading workout sessions...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (error || !exercise) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorState}>
            <Text style={styles.errorTitle}>Session data unavailable</Text>
            <Text style={styles.errorText}>
              Open this page from an exercise progression so the app knows which
              sessions to manage.
            </Text>
            <AppButton
              label="Go back"
              onPress={() => router.back()}
            />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
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
              yAxisTextStyle={{
                color: theme.textLight,
                fontSize: 11,
              }}
              xAxisLabelTextStyle={{
                color: theme.textLight,
                fontSize: 10,
                marginTop: 6,
              }}
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
          sessions.map((session) => {
            const sessionDateValue = getSessionDate(session);
            const sets = getSessionSets(session);
            const totalVolume = calculateWorkingSetVolume(sets);

            return (
              <View key={session.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseName}>
                      {formatDateForDisplay(sessionDateValue)}
                    </Text>
                    <Text style={styles.exerciseMeta}>
                      {sets.filter(isWorkingSet).length} working / {sets.length} total sets | {displayMass(totalVolume, measurementSystem, 0)} {massUnitLabel(measurementSystem)}-reps working volume
                    </Text>
                    {!!session.notes && (
                      <Text style={styles.exerciseSubMeta}>
                        {session.notes}
                      </Text>
                    )}
                  </View>
                  <View style={styles.cardActionIcons}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Edit session from ${session.session_date}`}
                      hitSlop={9}
                      onPress={() => openEditModal(session)}
                    >
                      <MaterialIcons
                        name="edit"
                        size={18}
                        color={theme.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Delete session from ${session.session_date}`}
                      hitSlop={9}
                      onPress={() => confirmDeleteSession(session)}
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={18}
                        color={theme.expense}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.setTable}>
                  <View style={styles.setTableHeader}>
                    <Text style={styles.setHeaderText}>Set</Text>
                    <Text style={styles.setHeaderText}>Weight ({massUnitLabel(measurementSystem)})</Text>
                    <Text style={styles.setHeaderText}>Reps</Text>
                    <Text style={styles.setHeaderText}>RIR</Text>
                  </View>
                  {sets.map((set, index) => (
                    <View key={set.id ?? index} style={styles.setRow}>
                      <Text
                        style={[
                          styles.setValue,
                          set.set_type === "WARMUP" && { color: theme.primary },
                        ]}
                      >
                        {set.set_type === "WARMUP"
                          ? `W${set.set_number}`
                          : `#${set.set_number}`}
                      </Text>
                      <Text style={styles.setValue}>{formatMass(set.weight, measurementSystem)}</Text>
                      <Text style={styles.setValue}>{set.reps}</Text>
                      <Text style={styles.setValue}>{set.rir ?? 0}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
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
          <ShadowGlowCard
            style={{
              width: "92%",
              maxHeight: "82%",
              padding: 16,
              borderRadius: 24,
              backgroundColor: theme.card,
            }}
          >
            {/* Header */}
            <ModalHeader
              closeLabel="Close edit session"
              onClose={closeEditModal}
              style={{ marginBottom: 14 }}
              supportingText="Adjust stats and details below"
              title="Edit Session"
            />

            {actionFeedback ? (
              <ActionStatus
                {...actionFeedback}
                onDismiss={() => setActionFeedback(null)}
              />
            ) : null}

            <ScrollView contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
              <DateOnlyField
                label="Session date"
                value={sessionDate}
                onChange={setSessionDate}
              />

              {/* Notes Input */}
              <View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: theme.textLight,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 6,
                  }}
                >
                  Notes
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textarea,
                    {
                      backgroundColor: theme.background,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: theme.border,
                      padding: 12,
                      color: theme.textBlack,
                      minHeight: 60,
                      textAlignVertical: "top",
                    },
                  ]}
                  placeholder="How did it feel?"
                  placeholderTextColor={theme.textLight}
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              {/* Sub-Header for Sets */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "800",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: theme.textBlack,
                  }}
                >
                  Logged Sets
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Add set"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 10,
                    backgroundColor: theme.primary + "12",
                  }}
                  onPress={addEditableSet}
                >
                  <MaterialIcons name="add" size={14} color={theme.primary} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                      color: theme.primary,
                    }}
                  >
                    Add Set
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Spreadsheet-like Table Grid */}
              <View
                style={{
                  borderWidth: 1.5,
                  borderColor: theme.border,
                  borderRadius: 16,
                  backgroundColor: theme.background,
                  overflow: "hidden",
                }}
              >
                {/* Table Header Row */}
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
                    WEIGHT ({massUnitLabel(measurementSystem)})
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
                  <View style={{ flex: 1 }} />
                </View>

                {/* Table Rows */}
                {editableSets.map((set, idx) => (
                  <View
                    key={set.localId}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderBottomWidth: idx === editableSets.length - 1 ? 0 : 1,
                      borderBottomColor: theme.border + "50",
                      paddingVertical: 6,
                      paddingHorizontal: 8,
                      backgroundColor:
                        set.set_type === "WARMUP"
                          ? theme.primary + "0A"
                          : "transparent",
                    }}
                  >
                    {/* Set Number */}
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Set ${idx + 1} is ${set.set_type === "WARMUP" ? "a warm-up set" : "a working set"}. Change to ${set.set_type === "WARMUP" ? "working" : "warm-up"} set`}
                      accessibilityState={{ selected: set.set_type === "WARMUP" }}
                      onPress={() => toggleEditableSetType(set.localId)}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "900",
                          fontFamily: "PlusJakartaSans_800ExtraBold",
                          color:
                            set.set_type === "WARMUP"
                              ? theme.primary
                              : theme.textBlack,
                          textAlign: "center",
                        }}
                      >
                        {set.set_type === "WARMUP" ? `W${idx + 1}` : idx + 1}
                      </Text>
                      <Text style={{ fontSize: 8, color: theme.textLight }}>
                        {set.set_type === "WARMUP" ? "WARM-UP" : "WORK"}
                      </Text>
                    </TouchableOpacity>

                    {/* Weight Input */}
                    <View style={{ flex: 2.2, paddingHorizontal: 4 }}>
                      <TextInput
                        accessibilityLabel={`Set ${idx + 1} weight in ${massUnitLabel(measurementSystem)}`}
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
                        keyboardType="decimal-pad"
                        placeholder={massUnitLabel(measurementSystem)}
                        placeholderTextColor={theme.textLight}
                        value={formatMassInput(set.weight ? Number(set.weight) : undefined, measurementSystem)}
                        onChangeText={(value) => {
                          const canonicalWeight = parseMassInput(value, measurementSystem);
                          updateSetField(set.localId, "weight", canonicalWeight == null ? "" : String(canonicalWeight));
                        }}
                      />
                    </View>

                    {/* Reps Input */}
                    <View style={{ flex: 1.8, paddingHorizontal: 4 }}>
                      <TextInput
                        accessibilityLabel={`Set ${idx + 1} repetitions`}
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
                        keyboardType="number-pad"
                        placeholder="reps"
                        placeholderTextColor={theme.textLight}
                        value={set.reps}
                        onChangeText={(value) =>
                          updateSetField(set.localId, "reps", value)
                        }
                      />
                    </View>

                    {/* RIR Input */}
                    <View style={{ flex: 1.8, paddingHorizontal: 4 }}>
                      <TextInput
                        accessibilityLabel={`Set ${idx + 1} repetitions in reserve`}
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
                        keyboardType="number-pad"
                        placeholder="RIR"
                        placeholderTextColor={theme.textLight}
                        value={set.rir}
                        onChangeText={(value) =>
                          updateSetField(set.localId, "rir", value)
                        }
                      />
                    </View>

                    {/* Delete Action */}
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Delete set ${idx + 1}`}
                      hitSlop={9}
                      onPress={() => removeEditableSet(set.localId)}
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <MaterialIcons
                        name="remove-circle-outline"
                        size={18}
                        color={theme.expense}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Actions */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 14,
              }}
            >
              <AppButton
                label="Cancel"
                onPress={closeEditModal}
                style={{ flex: 1 }}
                variant="secondary"
              />

              <AppButton
                label="Save Changes"
                loading={updateSessionMutation.isPending}
                onPress={saveSession}
                style={{ flex: 1 }}
              />
            </View>
          </ShadowGlowCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

import { gymStyles } from "@/assets/styles/gym.style";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import {
  calculateEstimatedOneRepMax,
  calculateWorkoutVolume,
} from "@/utils/workoutMetrics";
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
      const sets = getSessionSets(session);

      if (!sessionDate || !sets.length) return null;

      const topSet = sets.reduce((best, current) => {
        if (current.weight > best.weight) return current;
        if (current.weight === best.weight && current.reps > best.reps) {
          return current;
        }
        return best;
      }, sets[0]);
      const totalVolume = sets.reduce(
        (total, set) => total + calculateWorkoutVolume(set.weight, set.reps),
        0,
      );

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
});

export default function ManageWorkoutSession() {
  const { theme } = useTheme();
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
      },
    ]);
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

    const sets = editableSets.map((set, index) => ({
      id: set.id,
      set_number: index + 1,
      weight: Number(set.weight),
      reps: Number(set.reps),
      rir: Number(set.rir || 0),
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
      alert("Session not ready", payload);
      return;
    }

    try {
      await updateSessionMutation.mutateAsync({
        id: editingSession.id,
        payload,
      });
      closeEditModal();
    } catch (saveError: any) {
      alert(
        "Update failed",
        saveError?.message || "The session could not be updated.",
      );
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
            try {
              await deleteSessionMutation.mutateAsync(session.id);
            } catch (deleteError: any) {
              alert(
                "Delete failed",
                deleteError?.message || "The session could not be deleted.",
              );
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
          <TouchableOpacity style={styles.headerBadge} onPress={router.back}>
            <MaterialIcons name="arrow-back" size={22} color={theme.white} />
          </TouchableOpacity>
        </View>

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
                  ? `${Math.max(...sessionPoints.map((point) => point.estimated1RM)).toFixed(1)}kg`
                  : "-"}
              </Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Top set</Text>
              <Text style={styles.heroStatValue}>
                {sessionPoints.length
                  ? `${sessionPoints[0].topWeight}kg x ${sessionPoints[0].bestReps}`
                  : "-"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Progress graph</Text>
            <Text style={styles.sectionMeta}>Estimated 1RM by session</Text>
          </View>
        </View>

        {sessionPoints.length ? (
          <View style={styles.exerciseCard}>
            <LineChart
              areaChart
              curved
              isAnimated
              data={sessionPoints.map((point) => ({
                value: Number(point.estimated1RM.toFixed(1)),
                label: formatDateForDisplay(point.sessionDate),
                dataPointText: point.estimated1RM.toFixed(1),
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
                Math.max(...sessionPoints.map((point) => point.estimated1RM)) +
                5
              }
              dataPointsColor={theme.primary}
              dataPointsRadius={6}
              textColor={theme.textBlack}
              textFontSize={10}
              textShiftY={-14}
              textShiftX={-10}
            />
          </View>
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
            const totalVolume = sets.reduce(
              (total, set) =>
                total + calculateWorkoutVolume(set.weight, set.reps),
              0,
            );

            return (
              <View key={session.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseName}>
                      {formatDateForDisplay(sessionDateValue)}
                    </Text>
                    <Text style={styles.exerciseMeta}>
                      {sets.length} sets | {totalVolume} total volume
                    </Text>
                    {!!session.notes && (
                      <Text style={styles.exerciseSubMeta}>
                        {session.notes}
                      </Text>
                    )}
                  </View>
                  <View style={styles.cardActionIcons}>
                    <TouchableOpacity onPress={() => openEditModal(session)}>
                      <MaterialIcons
                        name="edit"
                        size={18}
                        color={theme.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
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
                    <Text style={styles.setHeaderText}>Weight</Text>
                    <Text style={styles.setHeaderText}>Reps</Text>
                    <Text style={styles.setHeaderText}>RIR</Text>
                  </View>
                  {sets.map((set, index) => (
                    <View key={set.id ?? index} style={styles.setRow}>
                      <Text style={styles.setValue}>#{set.set_number}</Text>
                      <Text style={styles.setValue}>{set.weight}kg</Text>
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "900",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: theme.textBlack,
                    letterSpacing: -0.5,
                  }}
                >
                  Edit Session
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    fontFamily: "PlusJakartaSans_700Bold",
                    color: theme.textLight,
                    marginTop: 2,
                  }}
                >
                  Adjust stats and details below
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeEditModal}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.primary + "12",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <MaterialIcons name="close" size={18} color={theme.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
              {/* Date Input */}
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
                  Session Date
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: theme.background,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: theme.border,
                    paddingHorizontal: 12,
                  }}
                >
                  <MaterialCommunityIcons
                    name="calendar-month"
                    size={18}
                    color={theme.primary}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      color: theme.textBlack,
                      fontSize: 14,
                      paddingVertical: 10,
                      fontWeight: "600",
                    }}
                    placeholder="YYYY-MM-DD"
                    value={sessionDate}
                    onChangeText={setSessionDate}
                  />
                </View>
              </View>

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
                    }}
                  >
                    {/* Set Number */}
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
                      {idx + 1}
                    </Text>

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
                        keyboardType="decimal-pad"
                        placeholder="kg"
                        placeholderTextColor={theme.textLight}
                        value={set.weight}
                        onChangeText={(value) =>
                          updateSetField(set.localId, "weight", value)
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
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: theme.border,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={closeEditModal}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "800",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: theme.textLight,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.primary,
                  paddingVertical: 12,
                  borderRadius: 14,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={saveSession}
                disabled={updateSessionMutation.isPending}
              >
                {updateSessionMutation.isPending ? (
                  <ActivityIndicator color={theme.white} />
                ) : (
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                      color: theme.white,
                    }}
                  >
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ShadowGlowCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

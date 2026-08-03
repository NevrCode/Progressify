import { gymStyles } from "@/assets/styles/gym.style";
import { AppButton } from "@/components/base/app-button";
import { FormField } from "@/components/base/form-field";
import { IconButton } from "@/components/base/icon-button";
import { ModalHeader } from "@/components/base/modal-header";
import { PageHeader } from "@/components/base/page-header";
import { PaginationNavigator } from "@/components/base/pagination-navigator";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { StatePanel } from "@/components/base/state-panel";
import { TabScreenScrollView } from "@/components/base/tab-screen-scroll-view";
import { ExerciseCatalogPicker } from "@/components/gym/exercise-catalog-picker";
import { ProgressionChartFrame } from "@/components/gym/progression-chart-frame";
import {
  EXERCISE_PAGE_SIZE,
  ExerciseProgressionCardSkeletons,
} from "@/components/gym/exercise-progression-card-skeleton";
import { MuscleHeatmap } from "@/components/gym/MuscleHeatmap";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useUnitPreference } from "@/context/UnitPreferenceContext";
import { useActiveSession } from "@/hooks/useActiveSession";
import {
  useExerciseProgressionPage,
  useGymDashboard,
} from "@/hooks/useGymDashboard";
import {
  calculateEstimatedOneRepMax,
  calculateWorkingSetVolume,
} from "@/utils/workoutMetrics";
import { isWorkingSet } from "@/types/workout-set";
import { buildProgressionChartSummary } from "@/utils/progression-chart-summary";
import { displayMass, formatMass, massUnitLabel, type MeasurementSystem } from "@/utils/measurement-units";

import {
  createExerciseProgression,
  deleteExerciseProgression,
  ExerciseProgressionDTO,
  ExerciseSessionDTO,
  GymExerciseProgressionRequestDTO,
  updateExerciseProgression,
} from "@/services/gymService";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type SessionProgressionPoint = {
  sessionDate: string;
  topWeight: number;
  bestReps: number;
  estimated1RM: number;
  totalVolume: number;
  totalSets: number;
};
type ModalKind = "exercise" | "set";
type ModalMode = "create" | "edit";
type ExerciseEntryStep = "catalog" | "details";

type ModalState =
  | {
      visible: false;
      kind: null;
      mode: null;
      itemId?: number;
      parentExerciseId?: number;
    }
  | {
      visible: true;
      kind: ModalKind;
      mode: ModalMode;
      itemId?: number;
      parentExerciseId?: number;
    };

const formatSessionLabel = (value?: string) => {
  if (!value) return "Undated";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};
const getDayMonthYear = (value?: string) => {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (!value) return "";

  const month = monthNames[new Date(value).getMonth()];
  const day = new Date(value).getDate();
  const y = new Date(value).getFullYear();
  return month + " " + day + ", " + y;
};
const getDayMonth = (value?: string) => {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (!value) return "";

  const month = monthNames[new Date(value).getMonth()];
  const day = new Date(value).getDate();
  return month + " " + day;
};

const toDateSortValue = (value?: string) => {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const parsed = new Date(value).getTime();
  if (!Number.isNaN(parsed)) return parsed;

  const fallback = Date.parse(value.slice(0, 10));
  return Number.isNaN(fallback) ? Number.MAX_SAFE_INTEGER : fallback;
};

const formatDateForApi = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const normalizeOptionalDate = (value?: string) =>
  value?.trim() ? value : undefined;

const buildSessionProgression = (
  exerciseSessions: ExerciseSessionDTO[],
): SessionProgressionPoint[] => {
  const points = exerciseSessions
    .map((session) => {
      const sessionDate = session.session_date ?? "";
      const sessionSets = (session.sets ?? []).filter(isWorkingSet);

      if (!sessionDate || sessionSets.length === 0) {
        return null;
      }

      const sortedSets = [...sessionSets].sort(
        (a, b) => a.set_number - b.set_number,
      );

      const topSet = sortedSets.reduce((best, current) => {
        if (current.weight > best.weight) {
          return current;
        }

        if (current.weight === best.weight && current.reps > best.reps) {
          return current;
        }

        return best;
      });

      const totalVolume = calculateWorkingSetVolume(sortedSets);

      const estimated1RM = calculateEstimatedOneRepMax(
        topSet.weight,
        topSet.reps,
      );

      return {
        key: `${session.id}-${sessionDate}`,

        label: formatSessionLabel(sessionDate),

        sessionDate,

        topWeight: topSet.weight,

        bestReps: topSet.reps,

        estimated1RM,

        totalSets: sortedSets.length,

        totalVolume,
      };
    })
    .filter(Boolean);

  return (points as SessionProgressionPoint[]).sort(
    (a, b) => toDateSortValue(a.sessionDate) - toDateSortValue(b.sessionDate),
  );
};

const get1RMTrend = (
  points: SessionProgressionPoint[],
  measurementSystem: MeasurementSystem,
): { value: string; isPositive: boolean } | null => {
  if (points.length < 2) return null;
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];

  if (previous.estimated1RM <= 0) return null;

  const diff = latest.estimated1RM - previous.estimated1RM;
  const pct = (diff / previous.estimated1RM) * 100;

  if (Math.abs(diff) < 0.1) return null;

  return {
    value: `${diff > 0 ? "+" : "-"}${displayMass(Math.abs(diff), measurementSystem)} ${massUnitLabel(measurementSystem)} (${diff > 0 ? "+" : ""}${pct.toFixed(0)}%)`,
    isPositive: diff > 0,
  };
};

export default function GymProgression() {
  const router = useRouter();
  const { theme } = useTheme();
  const { measurementSystem } = useUnitPreference();
  const styles = gymStyles(theme);
  const queryClient = useQueryClient();
  const { storedSession, hasActiveSession, checking, refresh, discard } =
    useActiveSession();
  const { alert } = useAlert();
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  const [date, setDate] = useState(new Date());
  const [openDate, setOpenDate] = useState(false);
  const [expandedExerciseId, setExpandedExerciseId] = useState<number | null>(
    null,
  );
  const [exercisePage, setExercisePage] = useState(0);
  const [deletingExerciseId, setDeletingExerciseId] = useState<number | null>(
    null,
  );
  const [modalState, setModalState] = useState<ModalState>({
    visible: false,
    kind: null,
    mode: null,
  });
  const [exerciseEntryStep, setExerciseEntryStep] =
    useState<ExerciseEntryStep>("catalog");

  const [exerciseForm, setExerciseForm] = useState({
    catalog_exercise_id: null as string | null,
    name: "",
    muscle_group: "",
    target_rep_range: "",
    last_session_date: "",
    notes: "",
  });

  const { data: dashboard, error, refetch, isFetching } = useGymDashboard();

  const exerciseProgressions = useMemo(
    () => dashboard?.exercise_progressions ?? [],
    [dashboard],
  );

  // Progressive overload stats
  const [best1RM, bestMuscleName] = useMemo(() => {
    let best = 0;
    let muscleName: string = "";
    for (const exercise of exerciseProgressions) {
      const sessions = exercise.exercise_sessions;
      for (const session of sessions ?? []) {
        const sets = session.sets;
        for (const set of (sets ?? []).filter(isWorkingSet)) {
          const est1RM = set.weight * (1 + set.reps / 30);
          if (est1RM > best) {
            best = est1RM;
            muscleName = exercise.name ?? "Unknown Exercise";
          }
        }
      }
    }
    return [best, muscleName];
  }, [exerciseProgressions]);

  const totalVolume = useMemo(() => {
    let volume = 0;
    for (const exercise of exerciseProgressions) {
      const sessions = exercise.exercise_sessions;
      for (const session of sessions ?? []) {
        const sets = session.sets;
        volume += calculateWorkingSetVolume(sets ?? []);
      }
    }
    return volume;
  }, [exerciseProgressions]);
  const manageWorkoutSession = (exercise: ExerciseProgressionDTO) => {
    router.push({
      pathname: "/manageWorkoutSession",
      params: {
        exerciseId: String(exercise.id),
      },
    });
  };

  const invalidateGym = async () => {
    await queryClient.invalidateQueries({ queryKey: ["gym"] });
  };

  const exerciseMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id?: number;
      payload: GymExerciseProgressionRequestDTO;
    }) =>
      id
        ? updateExerciseProgression(id, payload)
        : createExerciseProgression(payload),
    onSuccess: invalidateGym,
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: deleteExerciseProgression,
    onSuccess: invalidateGym,
  });

  const closeModal = () =>
    setModalState({
      visible: false,
      kind: null,
      mode: null,
    });

  const openExerciseModal = (item?: ExerciseProgressionDTO) => {
    setExerciseEntryStep(item ? "details" : "catalog");
    setExerciseForm({
      catalog_exercise_id: item?.catalog_exercise_id ?? null,
      name: item?.name ?? "",
      muscle_group: item?.muscle_group ?? "",
      target_rep_range: item?.target_rep_range ?? "",
      last_session_date: item?.last_session_date ?? "",
      notes: item?.notes ?? "",
    });
    setModalState({
      visible: true,
      kind: "exercise",
      mode: item ? "edit" : "create",
      itemId: item?.id,
    });
  };
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const progressionPageQuery = useExerciseProgressionPage({
    page: exercisePage,
    limit: EXERCISE_PAGE_SIZE,
    search: deferredSearch || undefined,
  });
  const pagedExercises = progressionPageQuery.data?.data ?? [];
  const totalExercisePages = progressionPageQuery.data?.total_pages ?? 0;

  const confirmDelete = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onConfirm },
    ]);
  };

  const handleSubmit = async () => {
    try {
      if (modalState.kind === "exercise") {
        if (
          !exerciseForm.name ||
          !exerciseForm.muscle_group ||
          !exerciseForm.target_rep_range
        ) {
          alert("Missing data", "Fill every exercise field first.");
          return;
        }

        const lastSessionDate =
          exerciseProgressions.find((e) => e.id === modalState.itemId)
            ?.last_session_date ?? exerciseForm.last_session_date;

        await exerciseMutation.mutateAsync({
          id: modalState.itemId,
          payload: {
            catalog_exercise_id: exerciseForm.catalog_exercise_id,
            name: exerciseForm.name,
            muscle_group: exerciseForm.muscle_group,
            target_rep_range: exerciseForm.target_rep_range,
            last_session_date: normalizeOptionalDate(lastSessionDate),
            notes: exerciseForm.notes,
          },
        });
      }

      closeModal();
    } catch (submitError: any) {
      alert("Save failed", submitError.message || "Please try again.");
    }
  };

  const modalSaving = exerciseMutation.isPending;

  const renderModalBody = () => {
    if (!modalState.visible || !modalState.kind) return null;

    if (modalState.kind === "exercise") {
      if (exerciseEntryStep === "catalog") {
        return (
          <ExerciseCatalogPicker
            customActionLabel={
              modalState.mode === "edit"
                ? "Remove catalog link"
                : "Create custom exercise"
            }
            customActionDescription={
              modalState.mode === "edit"
                ? "Keep this exercise and its history as a custom exercise"
                : undefined
            }
            onCreateCustom={() => {
              setExerciseForm((current) => ({
                ...current,
                catalog_exercise_id: null,
                name: modalState.mode === "create" ? "" : current.name,
                muscle_group:
                  modalState.mode === "create" ? "" : current.muscle_group,
              }));
              setExerciseEntryStep("details");
            }}
            onUseExercise={(exercise) => {
              setExerciseForm((current) => ({
                ...current,
                catalog_exercise_id: exercise.id,
                name: exercise.name,
                muscle_group: exercise.primaryMuscle,
              }));
              setExerciseEntryStep("details");
            }}
          />
        );
      }

      return (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 520 }}
          contentContainerStyle={{ gap: 14 }}
        >
          <View
            style={{
              padding: 12,
              gap: 4,
              borderRadius: 12,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: exerciseForm.catalog_exercise_id
                ? theme.primary + "35"
                : theme.border,
              backgroundColor: exerciseForm.catalog_exercise_id
                ? theme.primary + "10"
                : theme.background,
            }}
          >
            <Text
              selectable
              style={{
                color: exerciseForm.catalog_exercise_id
                  ? theme.primary
                  : theme.textBlack,
                fontSize: 12,
                fontFamily: "PlusJakartaSans_700Bold",
              }}
            >
              {exerciseForm.catalog_exercise_id
                ? "Linked to exercise catalog"
                : "Custom exercise"}
            </Text>
            {exerciseForm.catalog_exercise_id ? (
              <Text
                selectable
                style={{
                  color: theme.textLight,
                  fontSize: 11,
                  fontFamily: "PlusJakartaSans_500Medium",
                }}
              >
                {exerciseForm.catalog_exercise_id}
              </Text>
            ) : null}
          </View>
          {modalState.mode === "create" ? (
            <AppButton
              label="Back to exercise catalog"
              variant="ghost"
              onPress={() => setExerciseEntryStep("catalog")}
            />
          ) : (
            <AppButton
              label={
                exerciseForm.catalog_exercise_id
                  ? "Change catalog link"
                  : "Link to exercise catalog"
              }
              variant="secondary"
              onPress={() => setExerciseEntryStep("catalog")}
            />
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Choose session date"
            onPress={() => setOpenDate(true)}
            // style={styles.input}
          >
            <View
              style={[
                styles.input,
                { flexDirection: "row", alignItems: "center", gap: 5 },
              ]}
            >
              <MaterialIcons
                name="calendar-month"
                color={styles.inlineActionText.color}
                size={18}
              />
              <Text style={{ color: styles.inlineActionText.color }}>
                {exerciseForm.last_session_date || formatDateForApi(date)}
              </Text>
            </View>
          </TouchableOpacity>
          {openDate && (
            <DateTimePicker
              value={date}
              mode="date"
              onValueChange={(e, d) => {
                if (d) {
                  setDate(d);
                  setExerciseForm((current) => ({
                    ...current,
                    last_session_date: formatDateForApi(d),
                  }));
                }
                setOpenDate(false);
              }}
            />
          )}
          <FormField
            label="Exercise name"
            placeholder="Exercise name"
            value={exerciseForm.name}
            placeholderTextColor={theme.textLight}
            onChangeText={(name) =>
              setExerciseForm((current) => ({ ...current, name }))
            }
          />
          <FormField
            label="Muscle group"
            placeholder="Muscle group"
            value={exerciseForm.muscle_group}
            placeholderTextColor={theme.textLight}
            onChangeText={(muscle_group) =>
              setExerciseForm((current) => ({ ...current, muscle_group }))
            }
          />
          <FormField
            label="Target rep range"
            placeholder="Target rep range"
            value={exerciseForm.target_rep_range}
            placeholderTextColor={theme.textLight}
            onChangeText={(target_rep_range) =>
              setExerciseForm((current) => ({ ...current, target_rep_range }))
            }
          />

          <FormField
            label="Notes"
            placeholder="Notes"
            multiline
            value={exerciseForm.notes}
            placeholderTextColor={theme.textLight}
            onChangeText={(notes) =>
              setExerciseForm((current) => ({ ...current, notes }))
            }
          />
        </ScrollView>
      );
    }

    return null;
  };

  const getModalTitle = () => {
    if (!modalState.visible || !modalState.kind || !modalState.mode) return "";
    const action = modalState.mode === "create" ? "Add" : "Edit";

    if (modalState.kind === "exercise") return `${action} Exercise`;
    if (modalState.kind === "set") return `${action} Workout Set`;
    return `${action} Exercise`;
  };

  if (error) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatePanel
            variant="error"
            title="Could not load gym data"
            message="The backend did not return the progression data. Check your connection and try again."
            primaryAction={{ label: "Retry", onPress: () => refetch() }}
            style={{ margin: 20 }}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <TabScreenScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !!dashboard}
            onRefresh={() => {
              refetch();
              progressionPageQuery.refetch();
            }}
          />
        }
      >
        {/* ── Header ── */}
        <PageHeader eyebrow="Progressify" title="Progression" />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.primary + "30",
          }}
        >
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                fontFamily: "PlusJakartaSans_700Bold",
                color: theme.textLight,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Exercises
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "900",
                fontFamily: "PlusJakartaSans_800ExtraBold",
                color: theme.textBlack,
              }}
            >
              {exerciseProgressions.length}
            </Text>
          </View>
          <View
            style={{
              width: 1,
              backgroundColor: theme.border + "50",
            }}
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                fontFamily: "PlusJakartaSans_700Bold",
                color: theme.textLight,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Best 1RM
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "900",
                fontFamily: "PlusJakartaSans_800ExtraBold",
                color: theme.textBlack,
              }}
              numberOfLines={1}
            >
              {best1RM > 0 ? formatMass(best1RM, measurementSystem, 0) : "-"}
            </Text>
            {best1RM > 0 && bestMuscleName ? (
              <Text
                style={{
                  color: theme.primary,
                  fontSize: 8,
                  fontWeight: "800",
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {bestMuscleName}
              </Text>
            ) : null}
          </View>
          <View
            style={{
              width: 1,
              backgroundColor: theme.border + "50",
            }}
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                fontFamily: "PlusJakartaSans_700Bold",
                color: theme.textLight,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Volume
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "900",
                fontFamily: "PlusJakartaSans_800ExtraBold",
                color: theme.textBlack,
              }}
            >
              {totalVolume > 0
                ? totalVolume >= 1000
                  ? `${(totalVolume / 1000).toFixed(1)}k `
                  : `${totalVolume.toFixed(0)} `
                : "-"}
            </Text>
          </View>
        </View>

        {/* ── Start Workout launcher card ── */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open workout programs"
          accessibilityHint="Choose a routine or start a workout"
          onPress={() => router.push("/(pages)/programs")}
          activeOpacity={0.8}
          style={{ marginBottom: 12 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.primary + "30",
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.03,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.textBlack,
                  fontSize: 15,
                  fontWeight: "800",
                }}
              >
                Active Program
              </Text>
              <Text
                style={{
                  color: theme.textLight,
                  fontSize: 12,
                  fontWeight: "600",
                  marginTop: 2,
                }}
              >
                Choose a routine or manage your training plan
              </Text>
            </View>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={theme.primary}
            />
          </View>
        </TouchableOpacity>

        {!checking && hasActiveSession && storedSession && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Resume ${storedSession.routineName ?? "active workout"}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.primary + "15",
              borderRadius: 16,
              paddingVertical: 12,
              paddingHorizontal: 16,
              gap: 10,
              borderWidth: 1.5,
              borderColor: theme.primary + "40",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 3,
              marginBottom: 12,
            }}
            onPress={() => router.push("/(pages)/activeWorkoutSession")}
            activeOpacity={0.75}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                marginRight: 2,
              }}
            />
            <Text
              style={{
                flex: 1,
                color: theme.primary,
                fontSize: 14,
                fontWeight: "800",
              }}
            >
              Active {storedSession.routineName ?? "Manual Workout"}
            </Text>
            <Text
              style={{
                color: theme.primary,
                fontSize: 13,
                fontWeight: "900",
                marginRight: 6,
              }}
            >
              Resume →
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Discard active workout"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={(e) => {
                e.stopPropagation();
                discard();
              }}
            >
              <MaterialIcons name="close" size={18} color={theme.primary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        <MuscleHeatmap exercises={exerciseProgressions} />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Exercise progression</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add exercise"
            style={styles.inlineAction}
            onPress={() => openExerciseModal()}
          >
            <MaterialIcons name="add" size={18} color={theme.primary} />
            <Text style={styles.inlineActionText}>Add exercise</Text>
          </TouchableOpacity>
        </View>
        {/* ── Search Input Bar ── */}
        <View
          style={{
            backgroundColor: theme.card,
            width: "100%",
            borderWidth: 1,
            borderColor: theme.border,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            borderRadius: 24,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.03,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <MaterialIcons
            name="search"
            size={22}
            color={theme.primary}
            style={{ marginRight: 10 }}
          />
          <TextInput
            style={{
              color: theme.textBlack,
              fontWeight: "600",
              fontSize: 14,
              flex: 1,
              paddingVertical: 10,
            }}
            placeholder="Search exercise..."
            placeholderTextColor={theme.textBlack + "80"}
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              setExercisePage(0);
            }}
          />
          {search !== "" && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Clear exercise search"
              hitSlop={8}
              onPress={() => {
                setSearch("");
                setExercisePage(0);
              }}
            >
              <MaterialIcons name="close" size={20} color={theme.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {progressionPageQuery.isLoading ? (
          <ExerciseProgressionCardSkeletons />
        ) : progressionPageQuery.error ? (
          <StatePanel
            variant="error"
            compact
            title="Exercise page unavailable"
            message="This page of exercise progressions could not be loaded."
            primaryAction={{
              label: "Retry",
              onPress: () => progressionPageQuery.refetch(),
              accessibilityHint: "Retries loading this exercise page",
            }}
          />
        ) : pagedExercises.length ? (
          pagedExercises.map((exercise) => {
            const exerciseSessions = exercise.exercise_sessions ?? [];
            const latestSession = [...exerciseSessions].sort(
              (a, b) =>
                toDateSortValue(b.session_date) -
                toDateSortValue(a.session_date),
            )[0];

            const latestSessionSets = latestSession?.sets ?? [];
            const sessionProgression =
              buildSessionProgression(exerciseSessions);
            const hasSessionHistory = sessionProgression.length > 0;
            const trend = get1RMTrend(sessionProgression, measurementSystem);
            const chartSummary = buildProgressionChartSummary(
              exercise.name ?? "Exercise",
              sessionProgression,
              { formatValue: (kilograms) => formatMass(kilograms, measurementSystem) },
            );
            const expanded = expandedExerciseId === exercise.id;

            return (
              <ShadowGlowCard
                key={exercise.id}
                style={{
                  borderColor: theme.primary + "20",
                  borderWidth: 1,
                }}
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${expanded ? "Collapse" : "Expand"} ${exercise.name ?? "exercise"} progression`}
                  accessibilityState={{ expanded }}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  activeOpacity={0.7}
                  onPress={() =>
                    setExpandedExerciseId(
                      expandedExerciseId === exercise.id ? null : exercise.id,
                    )
                  }
                >
                  <View style={styles.exerciseHeader}>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          gap: 6,
                          marginTop: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        {exercise.muscle_group && (
                          <View
                            style={{
                              backgroundColor: theme.primary + "10",
                              borderRadius: 8,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderWidth: 1,
                              borderColor: theme.primary + "20",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "800",
                                color: theme.primary,
                                textTransform: "capitalize",
                              }}
                            >
                              {exercise.muscle_group}
                            </Text>
                          </View>
                        )}
                        {trend && (
                          <View
                            style={{
                              backgroundColor: trend.isPositive
                                ? theme.income + "15"
                                : theme.expense + "15",
                              borderRadius: 8,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderWidth: 1,
                              borderColor: trend.isPositive
                                ? theme.income + "30"
                                : theme.expense + "30",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "800",
                                color: trend.isPositive
                                  ? theme.income
                                  : theme.expense,
                              }}
                            >
                              {trend.isPositive ? "▲" : "▼"} {trend.value}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.exerciseSubMeta, { marginTop: 6 }]}>
                        Last session:{" "}
                        {latestSession
                          ? getDayMonthYear(latestSession.session_date)
                          : "-"}
                      </Text>
                    </View>
                    <View style={styles.cardActionIcons}>
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 6,
                          alignItems: "flex-start",
                        }}
                      >
                        <IconButton
                          accessibilityLabel={`Edit ${exercise.name ?? ""}`}
                          onPress={() => openExerciseModal(exercise)}
                          icon={
                            <MaterialIcons
                              name="edit-document"
                              size={14}
                              color={theme.primary}
                            />
                          }
                        />
                        <IconButton
                          accessibilityLabel={`Delete ${exercise.name ?? ""}`}
                          variant="destructive"
                          loading={deletingExerciseId === exercise.id}
                          onPress={() =>
                            confirmDelete(
                              "Delete exercise progression",
                              "This exercise and its linked data will be removed.",
                              async () => {
                                setDeletingExerciseId(exercise.id);
                                try {
                                  await deleteExerciseMutation.mutateAsync(
                                    exercise.id,
                                  );
                                  if (
                                    pagedExercises.length === 1 &&
                                    exercisePage > 0
                                  ) {
                                    setExercisePage((page) => page - 1);
                                  }
                                } finally {
                                  setDeletingExerciseId(null);
                                }
                              },
                            )
                          }
                          icon={
                            <MaterialIcons
                              name="delete-outline"
                              size={14}
                              color={theme.expense}
                            />
                          }
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                {expandedExerciseId === exercise.id && (
                  <>
                    <View style={styles.subsectionHeader}>
                      <View>
                        <Text
                          style={[styles.subsectionTitle, { marginBottom: 8 }]}
                        >
                          Session progression ({massUnitLabel(measurementSystem)})
                        </Text>
                      </View>
                    </View>

                    {hasSessionHistory ? (
                      <>
                        <ProgressionChartFrame
                          summary={chartSummary}
                          style={[
                            styles.chartBlock,
                            {
                              shadowColor: theme.shadow,
                              shadowOffset: { width: 0, height: 3 },
                              shadowOpacity: 0.04,
                              shadowRadius: 6,
                              elevation: 1,
                            },
                          ]}
                        >
                          <LineChart
                            areaChart
                            curved
                            isAnimated
                             data={[...sessionProgression].map((point) => ({
                               value: displayMass(point.estimated1RM, measurementSystem),
                               label: getDayMonth(point.sessionDate),
                               dataPointText: `${displayMass(point.estimated1RM, measurementSystem)}`,
                             }))}
                             scrollToEnd
                             scrollAnimation={false}
                             height={220}
                            spacing={56}
                            initialSpacing={18}
                            endSpacing={18}
                            thickness={4}
                            color={theme.primary}
                            startFillColor={theme.primary}
                            endFillColor={theme.primary}
                            startOpacity={0.25}
                            endOpacity={0.02}
                            hideRules={false}
                            rulesColor={`${theme.background}`}
                            rulesType="dashed"
                            yAxisColor={theme.background}
                            xAxisColor={theme.background}
                            hideYAxisText={false}
                            yAxisTextStyle={{
                              color: theme.textLight,
                              fontSize: 11,
                            }}
                            backgroundColor={theme.background}
                            xAxisLabelTextStyle={{
                              color: theme.textLight,
                              fontSize: 11,
                              marginTop: 6,
                            }}
                            noOfSections={4}
                            maxValue={
                              Math.max(
                                ...sessionProgression.map(
                                  (p) => displayMass(p.estimated1RM, measurementSystem),
                                ),
                              ) + 5
                            }
                            dataPointsColor={theme.primary}
                            dataPointsRadius={6}
                            textColor={theme.text}
                            textFontSize={11}
                            textShiftY={-14}
                            textShiftX={-10}
                            focusedDataPointColor={theme.white}
                            focusedDataPointRadius={8}
                            showVerticalLines
                            verticalLinesColor={`${theme.border}33`}
                            pointerConfig={{
                              pointerStripHeight: 160,
                              pointerStripColor: `${theme.primary}66`,
                              pointerStripWidth: 2,
                              pointerColor: theme.primary,
                              radius: 7,
                              activatePointersOnLongPress: true,
                              autoAdjustPointerLabelPosition: true,
                              pointerLabelComponent: (items: any) => {
                                const item = items[0];
                                return (
                                  <View
                                    style={{
                                      backgroundColor: theme.card,
                                      paddingHorizontal: 12,
                                      paddingVertical: 8,
                                      borderRadius: 12,
                                      borderWidth: 1,
                                      borderColor: theme.border,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color: theme.text,
                                        fontWeight: "700",
                                      }}
                                    >
                                      {item.value}
                                    </Text>
                                  </View>
                                );
                              },
                            }}
                          />
                        </ProgressionChartFrame>
                      </>
                    ) : (
                      <StatePanel
                        variant="empty"
                        compact
                        embedded
                        title="No progression history"
                        message="Record exercise sessions with sets to build this graph over time."
                        primaryAction={{
                          label: "Manage sessions",
                          onPress: () => manageWorkoutSession(exercise),
                        }}
                      />
                    )}

                    <View
                      style={[
                        styles.subsectionHeader,
                        { marginTop: 16, marginBottom: 8 },
                      ]}
                    >
                      <Text style={styles.subsectionTitle}>
                        Latest workout session
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Manage workout sessions for ${exercise.name ?? "exercise"}`}
                        style={styles.inlineAction}
                        onPress={() => manageWorkoutSession(exercise)}
                      >
                        <MaterialIcons
                          name="edit"
                          size={16}
                          color={theme.primary}
                        />

                        <Text style={styles.inlineActionText}>Manage</Text>
                      </TouchableOpacity>
                    </View>

                    {latestSessionSets.length ? (
                      <View style={[styles.setTable, { marginBottom: 12 }]}>
                        <View style={styles.setTableHeader}>
                          <Text style={styles.setHeaderText}>Set</Text>
                          <Text style={styles.setHeaderText}>Weight ({massUnitLabel(measurementSystem)})</Text>
                          <Text style={styles.setHeaderText}>Reps</Text>
                          <Text style={styles.setHeaderText}>RIR</Text>
                        </View>
                        {latestSessionSets.map((set) => (
                          <View key={set.id} style={styles.setRow}>
                            <Text
                              style={[
                                styles.setValue,
                                set.set_type === "WARMUP" && {
                                  color: theme.primary,
                                },
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
                    ) : (
                      <StatePanel
                        variant="empty"
                        compact
                        embedded
                        title="No sets in the latest session"
                        message="Add sets to record weight, repetitions, and RIR for this workout."
                        primaryAction={{
                          label: "Manage sets",
                          onPress: () => manageWorkoutSession(exercise),
                        }}
                      />
                    )}

                    <View style={styles.saveAndNoteRow}>
                      {!!exercise.notes && (
                        <View style={styles.noteRow}>
                          <MaterialCommunityIcons
                            name="notebook-outline"
                            size={18}
                            color={theme.primary}
                          />
                          <Text style={styles.noteText}>{exercise.notes}</Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </ShadowGlowCard>
            );
          })
        ) : (
          <StatePanel
            variant="empty"
            title="No exercises yet"
            message="Add an exercise progression, then record workout sessions to build its history."
            primaryAction={{
              label: "Add exercise",
              onPress: () => openExerciseModal(),
            }}
          />
        )}

        {!progressionPageQuery.isLoading &&
          !progressionPageQuery.error &&
          totalExercisePages > 0 && (
            <PaginationNavigator
              accessibilityLabel="Exercise pages"
              page={exercisePage}
              totalPages={totalExercisePages}
              onPageChange={setExercisePage}
            />
          )}
      </TabScreenScrollView>

      <Modal
        visible={modalState.visible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalBackdrop}>
            <View accessibilityViewIsModal style={styles.modalCard}>
              <ModalHeader
                closeLabel="Close exercise form"
                onClose={closeModal}
                style={styles.modalHeader}
                title={getModalTitle()}
              />

              {renderModalBody()}

              {modalState.mode === "edit" || exerciseEntryStep === "details" ? (
                <View style={styles.modalActions}>
                  <AppButton
                    label="Cancel"
                    variant="secondary"
                    onPress={closeModal}
                    style={{ flex: 1 }}
                  />
                  <AppButton
                    label="Save"
                    onPress={handleSubmit}
                    loading={modalSaving}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

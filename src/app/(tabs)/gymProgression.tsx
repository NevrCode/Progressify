import { gymStyles } from "@/assets/styles/gym.style";
import { AppButton } from "@/components/base/app-button";
import { FormField } from "@/components/base/form-field";
import { ModalHeader } from "@/components/base/modal-header";
import { PageHeader } from "@/components/base/page-header";
import { PaginationNavigator } from "@/components/base/pagination-navigator";
import { StatePanel } from "@/components/base/state-panel";
import { TabScreenScrollView } from "@/components/base/tab-screen-scroll-view";
import { ExerciseCatalogPicker } from "@/components/gym/exercise-catalog-picker";
import { ExerciseProgressionCard } from "@/components/gym/exercise-progression-card";
import {
  EXERCISE_PAGE_SIZE,
  ExerciseProgressionCardSkeletons,
} from "@/components/gym/exercise-progression-card-skeleton";
import { MuscleHeatmap } from "@/components/gym/MuscleHeatmap";
import { useAlert } from "@/context/AlertContext";
import { getErrorMessage } from "@/utils/apiError";
import { useTheme } from "@/context/ThemeContext";
import { useUnitPreference } from "@/context/UnitPreferenceContext";
import { useActiveSession } from "@/hooks/useActiveSession";
import {
  useExerciseProgressionPage,
  useGymDashboard,
} from "@/hooks/useGymDashboard";
import { isWorkingSet } from "@/types/workout-set";
import { buildProgressionChartSummary } from "@/utils/progression-chart-summary";
import { formatMass, massUnitLabel } from "@/utils/measurement-units";
import { calculateWorkingSetVolume } from "@/utils/workoutMetrics";
import {
  buildSessionProgression,
  get1RMTrend,
  toDateSortValue,
} from "@/features/gym/exercise-progression";

import {
  createExerciseProgression,
  deleteExerciseProgression,
  ExerciseProgressionDTO,
  GymExerciseProgressionRequestDTO,
  updateExerciseProgression,
} from "@/services/gymService";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import {
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
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
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

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

export default function GymProgression() {
  const router = useRouter();
  const { theme } = useTheme();
  const { measurementSystem } = useUnitPreference();
  const styles = useMemo(() => gymStyles(theme), [theme]);
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

  const manageWorkoutSession = useCallback(
    (exercise: ExerciseProgressionDTO) => {
      router.push({
        pathname: "/manageWorkoutSession",
        params: {
          exerciseId: String(exercise.id),
        },
      });
    },
    [router],
  );

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

  const openExerciseModal = useCallback((item?: ExerciseProgressionDTO) => {
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
  }, []);

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

  const handleToggleExpand = useCallback((exerciseId: number) => {
    setExpandedExerciseId((current) =>
      current === exerciseId ? null : exerciseId,
    );
  }, []);

  const handleDeleteExercise = useCallback(
    (exercise: ExerciseProgressionDTO) => {
      confirmDelete(
        "Delete exercise progression",
        "This exercise and its linked data will be removed.",
        async () => {
          setDeletingExerciseId(exercise.id);
          try {
            await deleteExerciseMutation.mutateAsync(exercise.id);
            if (pagedExercises.length === 1 && exercisePage > 0) {
              setExercisePage((page) => page - 1);
            }
          } finally {
            setDeletingExerciseId(null);
          }
        },
      );
      // confirmDelete and pagedExercises/exercisePage are read at call time
      // via closures re-created on every render; the callback identity only
      // needs to change when the mutation itself does.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [deleteExerciseMutation, exercisePage, pagedExercises.length],
  );

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
    } catch (submitError) {
      alert("Save failed", getErrorMessage(submitError, "Please try again."));
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
          style={styles.exerciseFormScroll}
          contentContainerStyle={styles.exerciseFormScrollContent}
        >
          <View
            style={[
              styles.exerciseModalLinkCard,
              exerciseForm.catalog_exercise_id
                ? styles.exerciseModalLinkCardLinked
                : styles.exerciseModalLinkCardUnlinked,
            ]}
          >
            <Text
              selectable
              style={[
                styles.exerciseModalLinkTitle,
                exerciseForm.catalog_exercise_id
                  ? styles.exerciseModalLinkTitleLinked
                  : styles.exerciseModalLinkTitleUnlinked,
              ]}
            >
              {exerciseForm.catalog_exercise_id
                ? "Linked to exercise catalog"
                : "Custom exercise"}
            </Text>
            {exerciseForm.catalog_exercise_id ? (
              <Text selectable style={styles.exerciseModalLinkId}>
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
          >
            <View style={[styles.input, styles.dateChooserRow]}>
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

        <View style={styles.statsBar}>
          <View style={styles.statsColumn}>
            <Text style={styles.statsLabel}>Exercises</Text>
            <Text style={styles.statsValue}>
              {exerciseProgressions.length}
            </Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsColumn}>
            <Text style={styles.statsLabel}>Best 1RM</Text>
            <Text style={styles.statsValue} numberOfLines={1}>
              {best1RM > 0 ? formatMass(best1RM, measurementSystem, 0) : "-"}
            </Text>
            {best1RM > 0 && bestMuscleName ? (
              <Text style={styles.statsSubValue} numberOfLines={1}>
                {bestMuscleName}
              </Text>
            ) : null}
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsColumn}>
            <Text style={styles.statsLabel}>Volume</Text>
            <Text style={styles.statsValue}>
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
          style={styles.launcherCard}
        >
          <View style={styles.launcherCardInner}>
            <View style={styles.launcherTextWrap}>
              <Text style={styles.launcherTitle}>Active Program</Text>
              <Text style={styles.launcherSubtitle}>
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
            style={styles.resumeBanner}
            onPress={() => router.push("/(pages)/activeWorkoutSession")}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.resumeDot,
                { backgroundColor: theme.primary },
              ]}
            />
            <Text style={styles.resumeText}>
              Active {storedSession.routineName ?? "Manual Workout"}
            </Text>
            <Text style={styles.resumeAction}>Resume →</Text>
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
        <View style={styles.searchBar}>
          <MaterialIcons
            name="search"
            size={22}
            color={theme.primary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
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
            const trend = get1RMTrend(sessionProgression, measurementSystem);
            const chartSummary = buildProgressionChartSummary(
              exercise.name ?? "Exercise",
              sessionProgression,
              {
                formatValue: (kilograms) =>
                  formatMass(kilograms, measurementSystem),
              },
            );

            return (
              <ExerciseProgressionCard
                key={exercise.id}
                exercise={exercise}
                expanded={expandedExerciseId === exercise.id}
                deleting={deletingExerciseId === exercise.id}
                latestSession={latestSession}
                latestSessionSets={latestSessionSets}
                sessionProgression={sessionProgression}
                trend={trend}
                chartSummary={chartSummary}
                measurementSystem={measurementSystem}
                theme={theme}
                styles={styles}
                onToggleExpand={handleToggleExpand}
                onEdit={openExerciseModal}
                onDelete={handleDeleteExercise}
                onManageSessions={manageWorkoutSession}
              />
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

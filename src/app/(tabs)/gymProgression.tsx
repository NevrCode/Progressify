import { gymStyles } from "@/assets/styles/gym.style";
import { useTheme } from "@/context/ThemeContext";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useGymDashboard } from "@/hooks/useGymDashboard";

import {
  createExerciseProgression,
  createExerciseSession,
  deleteExerciseProgression,
  ExerciseProgressionDTO,
  ExerciseSessionDTO,
  GymExerciseProgressionRequestDTO,
  GymExerciseSessionRequestDTO,
  SplitType,
  updateExerciseProgression,
} from "@/services/gymService";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
type ActiveWorkoutDraft = {
  exerciseId: number;

  startedAt: string;

  sets: DraftWorkoutSet[];
};

type DraftWorkoutSet = {
  localId: string;

  set_number: number;

  weight: number;

  reps: number;

  rir: number;
};
type SplitFilter = "ALL" | SplitType;
type ModalKind = "exercise" | "set";
type ModalMode = "create" | "edit";

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

const splitOptions: SplitType[] = ["PUSH", "PULL", "LEGS"];

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

const getWorkoutSets = (exercise: ExerciseProgressionDTO) =>
  exercise.workout_sets ?? exercise.last_workout_sets ?? [];

const getExerciseSessions = (exercise: ExerciseProgressionDTO) =>
  exercise.exercise_sessions ?? [];

const getSessionSets = (session: ExerciseSessionDTO) => session.sets ?? [];

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

const getSessionDate = (session: ExerciseSessionDTO) =>
  session.session_date ?? "";

const buildSessionProgression = (
  exerciseSessions: ExerciseSessionDTO[],
): SessionProgressionPoint[] => {
  const points = exerciseSessions
    .map((session) => {
      const sessionDate = getSessionDate(session);

      const sessionSets = getSessionSets(session);

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

      const totalVolume = sortedSets.reduce(
        (sum, current) => sum + current.weight * current.reps,
        0,
      );

      const estimated1RM = topSet.weight * (1 + topSet.reps / 30);

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

export default function GymProgression() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = gymStyles(theme);
  const queryClient = useQueryClient();
  const { storedSession, hasActiveSession, checking, refresh, discard } =
    useActiveSession();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  const [date, setDate] = useState(new Date());
  const [openDate, setOpenDate] = useState(false);
  const [tableDetail, setTableDetail] = useState(false);
  const [activeSplit, setActiveSplit] = useState<SplitFilter>("ALL");
  const [activeWorkoutDrafts, setActiveWorkoutDrafts] = useState<
    Record<number, ActiveWorkoutDraft>
  >({});
  const [finishingExerciseId, setFinishingExerciseId] = useState<number | null>(
    null,
  );
  const [deletingExerciseId, setDeletingExerciseId] = useState<number | null>(
    null,
  );
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>({
    visible: false,
    kind: null,
    mode: null,
  });

  const [exerciseForm, setExerciseForm] = useState({
    split: "PUSH" as SplitType,
    name: "",
    muscle_group: "",
    target_rep_range: "",
    last_session_date: "",
    notes: "",
  });

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGymDashboard();

  const exerciseProgressions = useMemo(
    () => dashboard?.exercise_progressions ?? [],
    [dashboard],
  );

  const filteredExercises = useMemo(() => {
    const list =
      activeSplit === "ALL"
        ? exerciseProgressions
        : exerciseProgressions.filter(
            (exercise) => normalizeSplit(exercise.split) === activeSplit,
          );
    return [...list].sort(
      (a, b) =>
        toDateSortValue(a.last_session_date) -
        toDateSortValue(b.last_session_date),
    );
  }, [activeSplit, exerciseProgressions]);

  // Progressive overload stats
  const [best1RM, bestMuscleName] = useMemo(() => {
    let best = 0;
    let muscleName: string = "";
    for (const exercise of exerciseProgressions) {
      const sessions = getExerciseSessions(exercise);
      for (const session of sessions) {
        const sets = getSessionSets(session);
        for (const set of sets) {
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
      const sessions = getExerciseSessions(exercise);
      for (const session of sessions) {
        const sets = getSessionSets(session);
        for (const set of sets) {
          volume += set.weight * set.reps;
        }
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

  const getRandomInt = (): number => {
    return Math.floor(Math.random() * 100);
  };
  const startWorkout = (exercise: ExerciseProgressionDTO) => {
    const draft: ActiveWorkoutDraft = {
      exerciseId: exercise.id,

      startedAt: new Date().toISOString(),

      sets: [
        {
          localId: `${Date.now() + getRandomInt()}`,

          set_number: 1,

          weight: 0,

          reps: 0,

          rir: 0,
        },
      ],
    };

    setActiveWorkoutDrafts((current) => ({
      ...current,

      [exercise.id]: draft,
    }));
  };
  const updateDraftSet = (
    exerciseId: number,
    localId: string,
    field: keyof DraftWorkoutSet,
    value: number,
  ) => {
    setActiveWorkoutDrafts((current) => {
      const draft = current[exerciseId];

      if (!draft) return current;

      return {
        ...current,

        [exerciseId]: {
          ...draft,

          sets: draft.sets.map((set) =>
            set.localId === localId
              ? {
                  ...set,
                  [field]: value,
                }
              : set,
          ),
        },
      };
    });
  };
  const addDraftSet = (exerciseId: number) => {
    setActiveWorkoutDrafts((current) => {
      const draft = current[exerciseId];

      if (!draft) return current;

      return {
        ...current,

        [exerciseId]: {
          ...draft,

          sets: [
            ...draft.sets,

            {
              localId: new Date() + getRandomInt().toString(),

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
  const validateDraftWorkout = (draft: ActiveWorkoutDraft) => {
    if (!draft.sets.length) {
      return "Add at least one set before finishing the workout.";
    }

    const invalidSet = draft.sets.find(
      (set) => set.weight <= 0 || set.reps <= 0 || set.rir < 0,
    );

    if (!invalidSet) return null;

    return `Set #${invalidSet.set_number} needs weight and reps above 0, and RIR cannot be negative.`;
  };
  const deleteDraftSet = (exerciseId: number, localId: string) => {
    if (deletingSetId) return;

    setDeletingSetId(localId);

    setTimeout(() => {
      setActiveWorkoutDrafts((current) => {
        const draft = current[exerciseId];

        if (!draft) return current;

        const nextSets = draft.sets.filter((s) => s.localId !== localId);

        // if no sets remain, remove the draft entirely
        if (!nextSets.length) {
          const copy = { ...current };
          delete copy[exerciseId];
          return copy;
        }

        // reindex set_number sequentially
        const reindexed = nextSets.map((s, idx) => ({
          ...s,
          set_number: idx + 1,
        }));

        return {
          ...current,
          [exerciseId]: {
            ...draft,
            sets: reindexed,
          },
        };
      });
      setDeletingSetId(null);
    }, 350);
  };
  const finishWorkout = async (exercise: ExerciseProgressionDTO) => {
    const draft = activeWorkoutDrafts[exercise.id];

    if (!draft) return;
    const validationMessage = validateDraftWorkout(draft);

    if (validationMessage) {
      Alert.alert("Workout not ready", validationMessage);
      return;
    }

    setFinishingExerciseId(exercise.id);
    try {
      const sessionDate = formatDateForApi(draft.startedAt);

      const sessionPayload: GymExerciseSessionRequestDTO = {
        session_date: sessionDate,
        notes: "",
        sets: draft.sets.map((set) => ({
          set_number: set.set_number,
          weight: set.weight,
          reps: set.reps,
          rir: set.rir,
        })),
      };

      await sessionMutation.mutateAsync({
        exerciseProgressionId: exercise.id,
        payload: sessionPayload,
      });

      setActiveWorkoutDrafts((current) => {
        const copy = { ...current };

        delete copy[exercise.id];

        return copy;
      });
    } catch (finishError: any) {
      console.log("API error status:", finishError.response?.status);
      console.log("API error body:", finishError.response?.data);

      Alert.alert(
        finishError.response?.data?.code ?? "Request failed",
        finishError.response?.data?.message ?? finishError.message,
      );
    } finally {
      setFinishingExerciseId(null);
    }
  };

  const invalidateGym = async () => {
    await queryClient.invalidateQueries({ queryKey: ["gym"] });
  };

  const sessionMutation = useMutation({
    mutationFn: async ({
      exerciseProgressionId,
      payload,
    }: {
      exerciseProgressionId: number;
      payload: GymExerciseSessionRequestDTO;
    }) => createExerciseSession(exerciseProgressionId, payload),

    onSuccess: invalidateGym,
  });
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
    setExerciseForm({
      split: normalizeSplit(item?.split),
      name: item ? getExerciseName(item) : "",
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
  const filteredSearchWorkout = useMemo(() => {
    const keyword = search.toLowerCase();

    return (
      filteredExercises?.filter((item) => {
        return (
          item.name?.toLowerCase().includes(keyword) ||
          item.muscle_group?.toLowerCase().includes(keyword) ||
          item.notes?.toLowerCase().includes(keyword) ||
          item.split?.toLowerCase().includes(keyword)
        );
      }) || []
    );
  }, [search, filteredExercises]);

  const confirmDelete = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    Alert.alert(title, message, [
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
          Alert.alert("Missing data", "Fill every exercise field first.");
          return;
        }

        await exerciseMutation.mutateAsync({
          id: modalState.itemId,
          payload: {
            split: exerciseForm.split,
            name: exerciseForm.name,
            muscle_group: exerciseForm.muscle_group,
            target_rep_range: exerciseForm.target_rep_range,
            last_session_date:
              exerciseProgressions.find((e) => e.id === modalState.itemId)
                ?.last_session_date ?? exerciseForm.last_session_date,
            notes: exerciseForm.notes,
          },
        });
      }

      closeModal();
    } catch (submitError: any) {
      Alert.alert("Save failed", submitError.message || "Please try again.");
    }
  };

  const modalSaving = exerciseMutation.isPending;

  const renderSplitSelector = (
    selected: SplitType,
    onChange: (value: SplitType) => void,
  ) => (
    <View style={styles.chipRow}>
      {splitOptions.map((option) => {
        const active = selected === option;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => onChange(option)}
          >
            <Text
              style={[
                styles.filterChipText,
                active && styles.filterChipTextActive,
              ]}
            >
              {displaySplit(option)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderModalBody = () => {
    if (!modalState.visible || !modalState.kind) return null;

    if (modalState.kind === "exercise") {
      return (
        <>
          {renderSplitSelector(exerciseForm.split, (split) =>
            setExerciseForm((current) => ({ ...current, split })),
          )}
          <TouchableOpacity
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
          <TextInput
            style={styles.input}
            placeholder="Exercise name"
            value={exerciseForm.name}
            placeholderTextColor={theme.textLight}
            onChangeText={(name) =>
              setExerciseForm((current) => ({ ...current, name }))
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Muscle group"
            value={exerciseForm.muscle_group}
            placeholderTextColor={theme.textLight}
            onChangeText={(muscle_group) =>
              setExerciseForm((current) => ({ ...current, muscle_group }))
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Target rep range"
            value={exerciseForm.target_rep_range}
            placeholderTextColor={theme.textLight}
            onChangeText={(target_rep_range) =>
              setExerciseForm((current) => ({ ...current, target_rep_range }))
            }
          />

          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Notes"
            multiline
            value={exerciseForm.notes}
            placeholderTextColor={theme.textLight}
            onChangeText={(notes) =>
              setExerciseForm((current) => ({ ...current, notes }))
            }
          />
        </>
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

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Loading gym dashboard...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (error) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorState}>
            <Text style={styles.errorTitle}>Could not load gym data</Text>
            <Text style={styles.errorText}>
              The page is ready, but the backend response failed. Check the API
              shape and try again.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => refetch()}
            >
              <Text style={styles.primaryButtonText}>Retry</Text>
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
          <RefreshControl refreshing={isFetching} onRefresh={() => refetch()} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Progressify</Text>
            <Text style={styles.title}>Progressive Overload</Text>
          </View>
          <View style={styles.headerBadge}>
            <MaterialCommunityIcons
              name="gymnastics"
              size={22}
              color={theme.white}
            />
          </View>
        </View>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Progress</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatValue}>
                {exerciseProgressions.length}
              </Text>
              <Text style={styles.heroStatLabel}>exercises</Text>
            </View>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatValue}>
                {best1RM > 0 ? `${best1RM.toFixed(0)}` : "-"}
              </Text>
              <Text style={styles.heroStatLabel}>best 1RM</Text>
              {best1RM > 0 && bestMuscleName ? (
                <Text
                  style={{
                    color: theme.primary,
                    fontSize: 9,
                    fontWeight: "700",
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {bestMuscleName}
                </Text>
              ) : null}
            </View>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatValue}>
                {totalVolume > 0
                  ? totalVolume >= 1000
                    ? `${(totalVolume / 1000).toFixed(1)}k`
                    : totalVolume.toFixed(0)
                  : "-"}
              </Text>
              <Text style={styles.heroStatLabel}>volume</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.startWorkoutCard}
          onPress={() => router.push("/(pages)/workoutSession")}
          activeOpacity={0.7}
        >
          <View style={styles.startWorkoutIconWrap}>
            <MaterialCommunityIcons
              name="dumbbell"
              size={20}
              color={theme.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.startWorkoutTitle}>Start Workout</Text>
            <Text style={styles.startWorkoutMeta}>
              Pick exercises and begin your session
            </Text>
          </View>
          <MaterialIcons name="arrow-forward" size={20} color={theme.primary} />
        </TouchableOpacity>
        {!checking && hasActiveSession && storedSession && (
          <TouchableOpacity
            style={styles.activeSessionBanner}
            onPress={() => router.push("/(pages)/activeWorkoutSession")}
            activeOpacity={0.7}
          >
            <View style={styles.activeSessionDot} />
            <Text style={styles.activeSessionBannerText}>
              {storedSession.split.charAt(0) +
                storedSession.split.slice(1).toLowerCase()}{" "}
              session — {storedSession.completedIds.length}/
              {storedSession.exerciseIds.length} done
            </Text>
            <Text style={styles.activeSessionBannerAction}>Resume</Text>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
              onPress={(e) => {
                e.stopPropagation();
                discard();
              }}
            >
              <MaterialIcons name="close" size={16} color={theme.textLight} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
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
          <TouchableOpacity>
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="search" size={20} color={theme.primary} />
            </View>
          </TouchableOpacity>
          <TextInput
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
        <View style={styles.filterBar}>
          {(["ALL", ...splitOptions] as SplitFilter[]).map((split) => {
            const active = split === activeSplit;
            return (
              <TouchableOpacity
                key={split}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveSplit(split)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {split === "ALL" ? "All" : displaySplit(split)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Exercise progression</Text>
          <TouchableOpacity
            style={styles.inlineAction}
            onPress={() => openExerciseModal()}
          >
            <MaterialIcons name="add" size={18} color={theme.primary} />
            <Text style={styles.inlineActionText}>Add exercise</Text>
          </TouchableOpacity>
        </View>
        {filteredSearchWorkout.length ? (
          filteredSearchWorkout.map((exercise) => {
            const activeDraft = activeWorkoutDrafts[exercise.id];
            const currentWorkoutSets = activeDraft?.sets ?? [];
            const exerciseSessions = getExerciseSessions(exercise);
            const latestSession = [...exerciseSessions].sort(
              (a, b) =>
                toDateSortValue(getSessionDate(b)) -
                toDateSortValue(getSessionDate(a)),
            )[0];

            const latestSessionSets = latestSession?.sets ?? [];
            const sessionProgression =
              buildSessionProgression(exerciseSessions);
            const hasSessionHistory = sessionProgression.length > 0;

            return (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseName}>
                      {getExerciseName(exercise)}
                    </Text>
                    <Text style={styles.exerciseMeta}>
                      {displaySplit(exercise.split)} |{" "}
                      {exercise.muscle_group ?? "-"} |{" "}
                      {exercise.target_rep_range ?? "-"}
                    </Text>
                    <Text style={styles.exerciseSubMeta}>
                      Last session:{" "}
                      {latestSession
                        ? getDayMonthYear(getSessionDate(latestSession))
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
                      <TouchableOpacity
                        onPress={() => openExerciseModal(exercise)}
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
                          name="edit-document"
                          size={18}
                          color={theme.primary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
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
                              } finally {
                                setDeletingExerciseId(null);
                              }
                            },
                          )
                        }
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor: theme.expense + "15",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {deletingExerciseId === exercise.id ? (
                          <ActivityIndicator
                            size="small"
                            color={theme.expense}
                          />
                        ) : (
                          <MaterialIcons
                            name="delete-outline"
                            size={18}
                            color={theme.expense}
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.subsectionHeader}>
                  <View>
                    <Text style={styles.subsectionTitle}>
                      Session progression
                    </Text>
                    <Text style={styles.sectionMeta}>
                      One point per recorded workout session
                    </Text>
                  </View>
                </View>

                {hasSessionHistory ? (
                  <>
                    <View style={styles.chartBlock}>
                      <LineChart
                        areaChart
                        curved
                        isAnimated
                        data={[...sessionProgression].map((point) => ({
                          value: Number(point.estimated1RM.toFixed(1)),
                          label: getDayMonth(point.sessionDate),
                          dataPointText: `${point.estimated1RM.toFixed(1)}`,
                        }))}
                        height={220}
                        spacing={56}
                        initialSpacing={18}
                        endSpacing={18}
                        thickness={4}
                        color={theme.primary}
                        startFillColor={theme.primary}
                        endFillColor={theme.primary}
                        startOpacity={0.35}
                        endOpacity={0.02}
                        hideRules={false}
                        rulesColor={`${theme.border}55`}
                        rulesType="dashed"
                        yAxisColor="transparent"
                        xAxisColor={`${theme.border}88`}
                        hideYAxisText={false}
                        yAxisTextStyle={{
                          color: theme.textLight,
                          fontSize: 11,
                        }}
                        xAxisLabelTextStyle={{
                          color: theme.textLight,
                          fontSize: 11,
                          marginTop: 6,
                        }}
                        noOfSections={4}
                        maxValue={
                          Math.max(
                            ...sessionProgression.map((p) => p.estimated1RM),
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
                    </View>
                    {/* <View style={styles.subsectionHeader}>
                        <Text style={styles.subsectionTitle}>
                          Session Detail
                        </Text>
                        <TouchableOpacity
                          style={styles.inlineAction}
                          onPress={() => {
                            setTableDetail(!tableDetail);
                          }}
                        >
                          <MaterialIcons
                            name={
                              tableDetail ? "arrow-drop-up" : "arrow-drop-down"
                            }
                            size={16}
                            color={theme.primary}
                          />
                          <Text style={styles.inlineActionText}>
                            Open Table
                          </Text>
                        </TouchableOpacity>
                      </View> */}

                    {tableDetail && (
                      <View style={styles.sessionSummaryList}>
                        {sessionProgression.length ? (
                          <View style={styles.setTable}>
                            <View style={styles.setTableHeader}>
                              <Text style={styles.setHeaderText}>date</Text>
                              <Text style={styles.setHeaderText}>sets</Text>
                              <Text style={styles.setHeaderText}>1RM</Text>
                              <Text style={styles.setHeaderText}>Volume</Text>
                            </View>
                            {sessionProgression.map((set) => (
                              <View key={set.sessionDate} style={styles.setRow}>
                                <Text style={styles.setValue}>
                                  {getDayMonth(set.sessionDate)}
                                </Text>
                                <Text style={styles.setValue}>
                                  {set.totalSets}
                                </Text>
                                <Text style={styles.setValue}>
                                  {set.estimated1RM.toFixed(1)}kg
                                </Text>
                                <Text style={styles.setValue}>
                                  {set.totalVolume}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View style={styles.subEmptyCard}>
                            <Text style={styles.subEmptyText}>
                              Add set rows to capture changing weight and reps
                              inside the latest workout. Historical graphing
                              should come from session records, not from this
                              flat set list alone.
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.subEmptyCard}>
                    <Text style={styles.subEmptyText}>
                      Record exercise sessions with sets to see your progression
                      graph over time.
                    </Text>
                  </View>
                )}

                <View style={styles.subsectionHeader}>
                  <Text style={styles.subsectionTitle}>
                    Latest workout session
                  </Text>
                  <TouchableOpacity
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
                  <View style={styles.setTable}>
                    <View style={styles.setTableHeader}>
                      <Text style={styles.setHeaderText}>Date</Text>
                      <Text style={styles.setHeaderText}>Set</Text>
                      <Text style={styles.setHeaderText}>Weight</Text>
                      <Text style={styles.setHeaderText}>Reps</Text>
                      <Text style={styles.setHeaderText}>RIR</Text>
                    </View>
                    {latestSessionSets.map((set) => (
                      <View key={set.id} style={styles.setRow}>
                        <Text style={styles.setValue}>
                          {getDayMonth(getSessionDate(latestSession))}
                        </Text>
                        <Text style={styles.setValue}>#{set.set_number}</Text>
                        <Text style={styles.setValue}>{set.weight}kg</Text>
                        <Text style={styles.setValue}>{set.reps}</Text>
                        <Text style={styles.setValue}>{set.rir ?? 0}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.subEmptyCard}>
                    <Text style={styles.subEmptyText}>
                      Add set rows to capture changing weight and reps inside
                      the latest workout. Historical graphing should come from
                      session records, not from this flat set list alone.
                    </Text>
                  </View>
                )}

                {/* <View style={styles.subsectionHeader}>
                    <Text style={styles.subsectionTitle}>Current workout</Text>

                    {!activeDraft ? (
                      <TouchableOpacity
                        style={styles.inlineAction}
                        onPress={() => startWorkout(exercise)}
                      >
                        <MaterialIcons
                          name="play-arrow"
                          size={16}
                          color={theme.primary}
                        />

                        <Text style={styles.inlineActionText}>
                          Start workout
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.inlineAction}
                        onPress={() => addDraftSet(exercise.id)}
                        disabled={finishingExerciseId === exercise.id}
                      >
                        <MaterialIcons
                          name="add"
                          size={16}
                          color={
                            finishingExerciseId === exercise.id
                              ? theme.textLight
                              : theme.primary
                          }
                        />

                        <Text
                          style={[
                            styles.inlineActionText,
                            {
                              color:
                                finishingExerciseId === exercise.id
                                  ? theme.textLight
                                  : theme.primary,
                            },
                          ]}
                        >
                          Add set
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {activeDraft ? (
                    <View style={styles.setTable}>
                      <View style={styles.setTableHeader}>
                        <Text style={styles.setHeaderText}>Set</Text>

                        <Text style={styles.setHeaderText}>Weight</Text>

                        <Text style={styles.setHeaderText}>Reps</Text>

                        <Text style={styles.setHeaderText}>RIR</Text>

                        <Text style={styles.setHeaderText}>Action</Text>
                      </View>

                      {currentWorkoutSets.map((set) => (
                        <View key={set.localId} style={styles.setRow}>
                          <Text style={styles.setValue}>#{set.set_number}</Text>

                          <TextInput
                            style={styles.setValue}
                            keyboardType="numeric"
                            value={String(set.weight)}
                            onChangeText={(value) =>
                              updateDraftSet(
                                exercise.id,
                                set.localId,
                                "weight",
                                Number(value),
                              )
                            }
                          />

                          <TextInput
                            style={styles.setValue}
                            keyboardType="numeric"
                            value={String(set.reps)}
                            onChangeText={(value) =>
                              updateDraftSet(
                                exercise.id,
                                set.localId,
                                "reps",
                                Number(value),
                              )
                            }
                          />

                          <TextInput
                            style={styles.setValue}
                            keyboardType="numeric"
                            value={String(set.rir)}
                            onChangeText={(value) =>
                              updateDraftSet(
                                exercise.id,
                                set.localId,
                                "rir",
                                Number(value),
                              )
                            }
                          />
                          <TouchableOpacity
                            onPress={() =>
                              deleteDraftSet(exercise.id, set.localId)
                            }
                            disabled={deletingSetId === set.localId}
                          >
                            {deletingSetId === set.localId ? (
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
                        </View>
                      ))}

                      <TouchableOpacity
                        style={[
                          styles.saveSetButton,
                          {
                            opacity:
                              finishingExerciseId === exercise.id ? 0.6 : 1,
                            alignSelf: "flex-end",
                          },
                        ]}
                        onPress={() => finishWorkout(exercise)}
                        disabled={finishingExerciseId === exercise.id}
                      >
                        {finishingExerciseId === exercise.id ? (
                          <ActivityIndicator size="small" color={theme.white} />
                        ) : (
                          <Text style={styles.saveSetButtonText}>
                            Finish Workout
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.subEmptyCard}>
                      <Text style={styles.subEmptyText}>
                        Start a workout to begin tracking sets for this session.
                      </Text>
                    </View>
                  )} */}
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
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No exercises yet</Text>
            <Text style={styles.emptyText}>
              Create an exercise progression first, then attach sets and graph
              points to it.
            </Text>
          </View>
        )}
      </ScrollView>

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
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{getModalTitle()}</Text>
                <TouchableOpacity onPress={closeModal}>
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={theme.textLight}
                  />
                </TouchableOpacity>
              </View>

              {renderModalBody()}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={closeModal}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleSubmit}
                  disabled={modalSaving}
                >
                  {modalSaving ? (
                    <ActivityIndicator color={theme.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

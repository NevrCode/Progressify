import { AppButton } from "@/components/base/app-button";
import {
  ActionStatus,
  type ActionFeedback,
} from "@/components/base/action-status";
import { FormField } from "@/components/base/form-field";
import { PageHeader } from "@/components/base/page-header";
import { SegmentedControl } from "@/components/base/segmented-control";
import { StatePanel } from "@/components/base/state-panel";
import { useTheme } from "@/context/ThemeContext";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import {
  activateWorkoutProgram,
  addPlannedExercise,
  completeWorkoutProgram,
  createWorkoutProgram,
  createWorkoutRoutine,
  deletePlannedExercise,
  getWorkoutPrograms,
  ProgramTemplate,
  startWorkoutRoutine,
  WorkoutRoutineDTO,
} from "@/services/workoutProgramService";
import { toApiError } from "@/utils/apiError";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { SafeAreaView } from "react-native-safe-area-context";

const templateOptions = [
  { label: "PPL", value: "PUSH_PULL_LEGS" },
  { label: "Upper/Lower", value: "UPPER_LOWER" },
  { label: "Full Body", value: "FULL_BODY" },
  { label: "Bro Split", value: "BRO_SPLIT" },
  { label: "Custom", value: "CUSTOM" },
] as const;

const parseRepRange = (value?: string) => {
  const values = value?.match(/\d+/g)?.map(Number) ?? [];
  return { min: values[0] || 8, max: values[1] || values[0] || 12 };
};

type FeedbackSurface = "page" | "create" | "exercise";
type ScopedActionFeedback = ActionFeedback & {
  surface: FeedbackSurface;
};

function SwipeToDeleteExerciseRow({
  exerciseName,
  onDelete,
}: {
  exerciseName: string;
  onDelete: () => void;
}) {
  const { theme } = useTheme();

  const deleteAction = (methods: SwipeableMethods) => (
    <TouchableOpacity
      accessibilityLabel={`Delete ${exerciseName}`}
      accessibilityRole="button"
      activeOpacity={0.75}
      onPress={() => {
        methods.close();
        onDelete();
      }}
      style={{
        alignItems: "center",
        backgroundColor: theme.expense,
        borderRadius: 10,
        flexDirection: "row",
        gap: 6,
        justifyContent: "center",
        marginRight: 8,
        paddingHorizontal: 16,
      }}
    >
      <MaterialIcons name="delete-outline" size={18} color={theme.white} />
      <Text
        style={{
          color: theme.white,
          fontFamily: "PlusJakartaSans_700Bold",
          fontSize: 11,
        }}
      >
        Delete
      </Text>
    </TouchableOpacity>
  );

  return (
    <ReanimatedSwipeable
      friction={2}
      leftThreshold={48}
      overshootLeft={false}
      renderLeftActions={(_progress, _translation, methods) =>
        deleteAction(methods)
      }
    >
      <View
        accessible
        accessibilityActions={[
          { name: "delete", label: `Delete ${exerciseName}` },
        ]}
        accessibilityLabel={exerciseName}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "delete") onDelete();
        }}
        style={{
          backgroundColor: theme.background,
          borderCurve: "continuous",
          borderRadius: 10,
          justifyContent: "center",
          minHeight: 38,
          paddingHorizontal: 12,
          paddingVertical: 7,
        }}
      >
        <Text
          selectable
          style={{
            color: theme.textBlack,
            fontFamily: "PlusJakartaSans_700Bold",
            fontSize: 12,
          }}
        >
          {exerciseName}
        </Text>
      </View>
    </ReanimatedSwipeable>
  );
}

export default function ProgramsScreen() {
  const { theme } = useTheme();
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
  const startMutation = useMutation({
    mutationFn: startWorkoutRoutine,
    onSuccess: (session) => {
      const plannedMap = Object.fromEntries(
        session.exercises.map((exercise) => [
          exercise.exercise_progression_id,
          exercise.id,
        ]),
      );
      router.replace({
        pathname: "/activeWorkoutSession",
        params: {
          exerciseIds: session.exercises
            .map((item) => item.exercise_progression_id)
            .join(","),
          workoutSessionId: String(session.id),
          routineName: session.routine_name_snapshot,
          plannedExerciseMap: JSON.stringify(plannedMap),
        },
      });
    },
  });

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

  const card = {
    padding: 16,
    gap: 12,
    borderRadius: 16,
    borderCurve: "continuous" as const,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 16 }}
      >
        <PageHeader eyebrow="Training structure" title="Workout Program" />

        {actionFeedback?.surface === "page" ? (
          <ActionStatus
            {...actionFeedback}
            onDismiss={() => setActionFeedback(null)}
          />
        ) : null}

        {programsQuery.isLoading ? (
          <Text selectable style={{ color: theme.textLight }}>
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
            <View style={card}>
              <Text
                selectable
                style={{
                  color: theme.primary,
                  fontSize: 11,
                  fontFamily: "PlusJakartaSans_700Bold",
                }}
              >
                ACTIVE PROGRAM
              </Text>
              <Text
                selectable
                style={{
                  color: theme.textBlack,
                  fontSize: 21,
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                }}
              >
                {activeProgram.name}
              </Text>
              <Text selectable style={{ color: theme.textLight, fontSize: 12 }}>
                {activeProgram.routines.length} routines ·{" "}
                {activeProgram.template_type.replaceAll("_", " ")}
              </Text>
            </View>

            <View style={{ gap: 5 }}>
              <Text
                selectable
                style={{
                  color: theme.textBlack,
                  fontSize: 17,
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                }}
              >
                Choose today&apos;s workout
              </Text>
              <Text
                selectable
                style={{ color: theme.textLight, fontSize: 11, lineHeight: 17 }}
              >
                Pick a routine and start immediately.
              </Text>
            </View>

            {activeProgram.routines.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingRight: 20 }}
              >
                {activeProgram.routines.map((routine) => (
                  <View
                    key={`launcher-${routine.id}`}
                    style={[
                      card,
                      {
                        width: 230,
                        justifyContent: "space-between",
                        borderColor: theme.primary + "25",
                      },
                    ]}
                  >
                    <View style={{ gap: 5 }}>
                      <Text
                        selectable
                        style={{
                          color: theme.textBlack,
                          fontSize: 16,
                          fontFamily: "PlusJakartaSans_800ExtraBold",
                        }}
                      >
                        {routine.name}
                      </Text>
                      <Text
                        selectable
                        style={{ color: theme.textLight, fontSize: 11 }}
                      >
                        {routine.planned_exercises.length} exercises
                      </Text>
                      <Text
                        numberOfLines={2}
                        style={{
                          color: theme.textLight,
                          fontSize: 10,
                          lineHeight: 15,
                          minHeight: 30,
                        }}
                      >
                        {routine.planned_exercises.length > 0
                          ? routine.planned_exercises
                              .slice(0, 3)
                              .map((exercise) => exercise.exercise_name)
                              .join(" · ")
                          : "Add exercises before starting this routine."}
                      </Text>
                    </View>
                    <AppButton
                      label="Start workout"
                      disabled={!routine.planned_exercises.length}
                      loading={
                        startMutation.isPending &&
                        startMutation.variables === routine.id
                      }
                      onPress={() =>
                        run("start workout", () =>
                          startMutation.mutateAsync(routine.id),
                        )
                      }
                    />
                  </View>
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
                <View style={card}>
                  <Text
                    selectable
                    style={{
                      color: theme.textBlack,
                      fontSize: 14,
                      fontFamily: "PlusJakartaSans_700Bold",
                    }}
                  >
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

                {activeProgram.routines.map((routine) => (
                  <View key={routine.id} style={card}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text
                          selectable
                          style={{
                            color: theme.textBlack,
                            fontSize: 17,
                            fontFamily: "PlusJakartaSans_800ExtraBold",
                          }}
                        >
                          {routine.name}
                        </Text>
                        <Text
                          selectable
                          style={{ color: theme.textLight, fontSize: 11 }}
                        >
                          {routine.planned_exercises.length} exercises
                        </Text>
                      </View>
                      <AppButton
                        label="Start"
                        disabled={!routine.planned_exercises.length}
                        loading={
                          startMutation.isPending &&
                          startMutation.variables === routine.id
                        }
                        onPress={() =>
                          run("start workout", () =>
                            startMutation.mutateAsync(routine.id),
                          )
                        }
                      />
                    </View>

                    {routine.planned_exercises.map((planned) => (
                      <SwipeToDeleteExerciseRow
                        key={planned.id}
                        exerciseName={planned.exercise_name}
                        onDelete={() =>
                          run("remove exercise", () =>
                            deleteExerciseMutation.mutateAsync(planned.id),
                          )
                        }
                      />
                    ))}
                    <AppButton
                      label="Add exercise"
                      variant="secondary"
                      onPress={() => setExerciseRoutine(routine)}
                    />
                  </View>
                ))}

                <View style={card}>
                  <Text
                    selectable
                    style={{
                      color: theme.textBlack,
                      fontSize: 14,
                      fontFamily: "PlusJakartaSans_700Bold",
                    }}
                  >
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
              <View key={program.id} style={card}>
                <Text
                  selectable
                  style={{
                    color: theme.textBlack,
                    fontFamily: "PlusJakartaSans_700Bold",
                  }}
                >
                  {program.name}
                </Text>
                <Text
                  selectable
                  style={{ color: theme.textLight, fontSize: 11 }}
                >
                  {program.status}
                </Text>
                <AppButton
                  label="Make active"
                  variant="secondary"
                  onPress={() =>
                    run("activate program", () =>
                      activateMutation.mutateAsync(program.id),
                    )
                  }
                />
              </View>
            ))}

        {activeProgram && showManage ? (
          <AppButton
            label="Create another program"
            variant="ghost"
            onPress={() => setShowCreate(true)}
          />
        ) : null}
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
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              padding: 20,
              backgroundColor: "rgba(0,0,0,0.7)",
            }}
          >
            <View style={[card, { backgroundColor: theme.card }]}>
              <Text
                selectable
                style={{
                  color: theme.textBlack,
                  fontSize: 18,
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                }}
              >
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
              <View style={{ flexDirection: "row", gap: 10 }}>
                <AppButton
                  label="Cancel"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() =>
                    closeFeedbackSurface("create", () =>
                      setShowCreate(false),
                    )
                  }
                />
                <AppButton
                  label="Create"
                  style={{ flex: 1 }}
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
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.65)",
          }}
        >
          <View
            style={[
              card,
              {
                maxHeight: "78%",
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              },
            ]}
          >
            <Text
              selectable
              style={{
                color: theme.textBlack,
                fontSize: 18,
                fontFamily: "PlusJakartaSans_800ExtraBold",
              }}
            >
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
              contentContainerStyle={{ gap: 8 }}
            >
              {availableExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${exercise.name}`}
                  onPress={() =>
                    exerciseRoutine &&
                    run(
                      "add exercise",
                      () =>
                        addExerciseMutation.mutateAsync({
                          routine: exerciseRoutine,
                          exerciseId: exercise.id,
                        }),
                      {
                        surface: "exercise",
                        successMessage: `${exercise.name} was added to the routine.`,
                      },
                    )
                  }
                  style={{
                    padding: 14,
                    gap: 3,
                    borderRadius: 12,
                    borderCurve: "continuous",
                    backgroundColor: theme.background,
                  }}
                >
                  <Text
                    selectable
                    style={{
                      color: theme.textBlack,
                      fontFamily: "PlusJakartaSans_700Bold",
                    }}
                  >
                    {exercise.name}
                  </Text>
                  <Text
                    selectable
                    style={{ color: theme.textLight, fontSize: 11 }}
                  >
                    {exercise.muscle_group ?? "Exercise"} ·{" "}
                    {exercise.target_rep_range ?? "8-12"} reps
                  </Text>
                </TouchableOpacity>
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
    </SafeAreaView>
  );
}

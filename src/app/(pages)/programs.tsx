import { AppButton } from "@/components/base/app-button";
import { FormField } from "@/components/base/form-field";
import { IconButton } from "@/components/base/icon-button";
import { PageHeader } from "@/components/base/page-header";
import { SegmentedControl } from "@/components/base/segmented-control";
import { useAlert } from "@/context/AlertContext";
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
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toApiError } from "@/utils/apiError";
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

export default function ProgramsScreen() {
  const { theme } = useTheme();
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
  const [exerciseRoutine, setExerciseRoutine] =
    useState<WorkoutRoutineDTO | null>(null);

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
          split: "PUSH",
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
  ) => {
    try {
      await action();
    } catch (error) {
      const apiError = toApiError(error);
      const message = apiError.status === 404 && apiError.code !== "DATA_NOT_FOUND"
        ? "Workout programs are not available from this server yet. Update or restart the backend with migration V12, then try again."
        : apiError.message;
      alert(
        `Could not ${operation}`,
        message,
      );
    }
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
        <PageHeader
          eyebrow="Training structure"
          title="Workout Program"
          icon={
            <MaterialIcons
              name="account-tree"
              size={24}
              color={theme.primary}
            />
          }
        />

        {programsQuery.isLoading ? (
          <Text selectable style={{ color: theme.textLight }}>
            Loading your program…
          </Text>
        ) : programsQuery.isError ? (
          <View style={card}>
            <Text
              selectable
              style={{
                color: theme.textBlack,
                fontSize: 17,
                fontFamily: "PlusJakartaSans_800ExtraBold",
              }}
            >
              Workout programs unavailable
            </Text>
            <Text selectable style={{ color: theme.textLight, fontSize: 12, lineHeight: 18 }}>
              {toApiError(programsQuery.error).status === 404
                ? "This server does not have the workout-program API yet. Update or restart the backend with migration V12."
                : toApiError(programsQuery.error).message}
            </Text>
            <AppButton
              label="Try again"
              variant="secondary"
              onPress={() => void programsQuery.refetch()}
            />
          </View>
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
              <AppButton
                label="Complete program"
                variant="secondary"
                onPress={() =>
                  run("complete program", () => completeMutation.mutateAsync(activeProgram.id))
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
                      run("start workout", () => startMutation.mutateAsync(routine.id))
                    }
                  />
                </View>

                {routine.planned_exercises.map((planned) => (
                  <View
                    key={planned.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      padding: 12,
                      borderRadius: 12,
                      borderCurve: "continuous",
                      backgroundColor: theme.background,
                    }}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text
                        selectable
                        style={{
                          color: theme.textBlack,
                          fontSize: 13,
                          fontFamily: "PlusJakartaSans_700Bold",
                        }}
                      >
                        {planned.exercise_name}
                      </Text>
                      <Text
                        selectable
                        style={{ color: theme.textLight, fontSize: 11 }}
                      >
                        {planned.target_sets ?? 3} sets ·{" "}
                        {planned.target_rep_min ?? 8}–
                        {planned.target_rep_max ?? 12} reps · RIR{" "}
                        {planned.target_rir ?? 2}
                      </Text>
                    </View>
                    <IconButton
                      accessibilityLabel={`Remove ${planned.exercise_name}`}
                      variant="destructive"
                      icon={
                        <MaterialIcons
                          name="remove-circle-outline"
                          size={18}
                          color={theme.expense}
                        />
                      }
                      onPress={() =>
                        run("remove exercise", () =>
                          deleteExerciseMutation.mutateAsync(planned.id),
                        )
                      }
                    />
                  </View>
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
                onPress={() => run("add routine", () => routineMutation.mutateAsync())}
              />
            </View>
          </>
        ) : (
          <View style={card}>
            <Text
              selectable
              style={{
                color: theme.textBlack,
                fontSize: 17,
                fontFamily: "PlusJakartaSans_800ExtraBold",
              }}
            >
              No active program
            </Text>
            <Text
              selectable
              style={{ color: theme.textLight, fontSize: 12, lineHeight: 18 }}
            >
              Create a program template or activate one of your previous
              programs.
            </Text>
            <AppButton
              label="Create program"
              onPress={() => setShowCreate(true)}
            />
          </View>
        )}

        {programs
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
              <Text selectable style={{ color: theme.textLight, fontSize: 11 }}>
                {program.status}
              </Text>
              <AppButton
                label="Make active"
                variant="secondary"
                onPress={() =>
                  run("activate program", () => activateMutation.mutateAsync(program.id))
                }
              />
            </View>
          ))}

        {activeProgram ? (
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
        onRequestClose={() => setShowCreate(false)}
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
                  onPress={() => setShowCreate(false)}
                />
                <AppButton
                  label="Create"
                  style={{ flex: 1 }}
                  disabled={!programName.trim()}
                  loading={createMutation.isPending}
                  onPress={() => run("create program", () => createMutation.mutateAsync())}
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
        onRequestClose={() => setExerciseRoutine(null)}
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
                    run("add exercise", () =>
                      addExerciseMutation.mutateAsync({
                        routine: exerciseRoutine,
                        exerciseId: exercise.id,
                      }),
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
              onPress={() => setExerciseRoutine(null)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

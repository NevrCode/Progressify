/// <reference types="jest" />

import { render } from "@testing-library/react-native";

import type { ThemeType } from "@/constants/colors";
import {
  ActiveWorkoutExerciseList,
  type ActiveWorkoutExerciseActions,
} from "@/features/workout-session/active-workout-exercise-list";
import { updateExerciseDraftSet } from "@/features/workout-session/drafts";
import type { ExerciseProgressionDTO } from "@/services/gymService";

const setRowRenders: string[] = [];

// AppButton and IconButton reach ThemeContext, which imports
// "expo-sqlite/localStorage/install" at module scope.
jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#00E676",
      background: "#0A0A0A",
      card: "#161616",
      border: "#2A2A2A",
      expense: "#FF5252",
      income: "#69F0AE",
      textBlack: "#FAFAFA",
      textLight: "#A0A0A0",
      white: "#FFFFFF",
    },
  }),
}));

jest.mock("@/features/workout-session/active-workout-set-row", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    ActiveWorkoutSetRow: ({ exerciseName }: { exerciseName: string }) => (
      <Text>{exerciseName}</Text>
    ),
  };
});

jest.mock("@/components/gym/progression-recommendation-card", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    ProgressionRecommendationCard: ({
      exerciseName,
    }: {
      exerciseName: string;
    }) => {
      setRowRenders.push(exerciseName);
      return <Text>rec-{exerciseName}</Text>;
    },
  };
});

const theme = {
  primary: "#00E676",
  background: "#0A0A0A",
  card: "#161616",
  border: "#2A2A2A",
  expense: "#FF5252",
  income: "#69F0AE",
  textBlack: "#FAFAFA",
  textLight: "#A0A0A0",
  white: "#FFFFFF",
} as unknown as ThemeType;

const exercise = (id: number, name: string) =>
  ({ id, name, muscle_group: "chest" }) as unknown as ExerciseProgressionDTO;

const exercises = [
  exercise(1, "Bench Press"),
  exercise(2, "Incline Press"),
  exercise(3, "Cable Fly"),
];

const draftFor = (id: number) => ({
  exerciseId: id,
  startedAt: "2026-08-11T00:00:00.000Z",
  sets: [
    {
      localId: `set-${id}`,
      set_number: 1,
      weight: "60",
      reps: "8",
      rir: "2",
      set_type: "WORKING" as const,
      completed: false,
    },
  ],
});

const baseDrafts = {
  1: draftFor(1),
  2: draftFor(2),
  3: draftFor(3),
};

const actions = {
  addSet: jest.fn(),
  updateSet: jest.fn(),
  toggleSetType: jest.fn(),
  completeSet: jest.fn(),
  duplicateSet: jest.fn(),
  removeSet: jest.fn(),
  swapExercise: jest.fn(),
  removeExercise: jest.fn(),
  applyRecommendation: jest.fn(),
  finishExercise: jest.fn(),
} as unknown as ActiveWorkoutExerciseActions;

const renderList = async (
  drafts: Record<number, ReturnType<typeof draftFor>>,
  overrides: Partial<Record<string, unknown>> = {},
) =>
  render(
    <ActiveWorkoutExerciseList
      exercises={exercises}
      drafts={drafts as never}
      completedIds={new Set()}
      finishingId={null}
      groupsByExercise={new Map()}
      measurementSystem="METRIC"
      theme={theme}
      // A fresh object each render, exactly as the screen supplies it.
      actions={{ ...actions, ...overrides } as ActiveWorkoutExerciseActions}
    />,
  );

describe("ActiveWorkoutExerciseList", () => {
  beforeEach(() => {
    setRowRenders.length = 0;
  });

  it("renders one card per exercise", async () => {
    const screen = await renderList(baseDrafts);

    expect(screen.getByText("rec-Bench Press")).toBeTruthy();
    expect(screen.getByText("rec-Incline Press")).toBeTruthy();
    expect(screen.getByText("rec-Cable Fly")).toBeTruthy();
  });

  it("re-renders only the edited exercise when one draft changes", async () => {
    const screen = await renderList(baseDrafts);
    expect(setRowRenders).toEqual([
      "Bench Press",
      "Incline Press",
      "Cable Fly",
    ]);
    setRowRenders.length = 0;

    // The real reducer: rebuilds only exercise 1's entry, leaving the other
    // drafts referentially identical.
    const nextDrafts = updateExerciseDraftSet(
      baseDrafts as never,
      1,
      "set-1",
      "weight",
      "65",
    );

    await screen.rerender(
      <ActiveWorkoutExerciseList
        exercises={exercises}
        drafts={nextDrafts}
        completedIds={new Set()}
        finishingId={null}
        groupsByExercise={new Map()}
        measurementSystem="METRIC"
        theme={theme}
        // Deliberately a new object, mirroring the screen rebuilding its
        // handlers on every render. The stable port must absorb this.
        actions={{ ...actions } as ActiveWorkoutExerciseActions}
      />,
    );

    expect(setRowRenders).toEqual(["Bench Press"]);
  });

  it("re-renders every card when the theme changes", async () => {
    const screen = await renderList(baseDrafts);
    setRowRenders.length = 0;

    await screen.rerender(
      <ActiveWorkoutExerciseList
        exercises={exercises}
        drafts={baseDrafts as never}
        completedIds={new Set()}
        finishingId={null}
        groupsByExercise={new Map()}
        measurementSystem="METRIC"
        theme={{ ...theme, primary: "#FF0000" } as ThemeType}
        actions={actions}
      />,
    );

    expect(setRowRenders).toHaveLength(3);
  });

  it("keeps calling the newest handler through the stable port", async () => {
    const first = jest.fn();
    const screen = await renderList(baseDrafts, { addSet: first });

    const second = jest.fn();
    await screen.rerender(
      <ActiveWorkoutExerciseList
        exercises={exercises}
        drafts={baseDrafts as never}
        completedIds={new Set()}
        finishingId={null}
        groupsByExercise={new Map()}
        measurementSystem="METRIC"
        theme={theme}
        actions={{ ...actions, addSet: second } as ActiveWorkoutExerciseActions}
      />,
    );

    const { fireEvent } = jest.requireActual("@testing-library/react-native");
    await fireEvent.press(
      screen.getByLabelText("Add set to Bench Press"),
    );

    // The port is permanently stable, so this proves it forwards to the latest
    // actions rather than the ones captured on first render.
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(1);
  });
});

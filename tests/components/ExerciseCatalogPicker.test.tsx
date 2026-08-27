/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import { ExerciseCatalogPicker } from "@/components/gym/exercise-catalog-picker";
import type { CatalogExercise } from "@/types/exercise-catalog";

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#00E676",
      background: "#0A0A0A",
      card: "#161616",
      border: "#2A2A2A",
      expense: "#FF5252",
      textBlack: "#FAFAFA",
      textLight: "#A0A0A0",
    },
  }),
}));
jest.mock("@/services/discoveryService", () => ({
  useDiscoveryFeed: () => ({ data: { favorites: [], recent: [] } }),
  useToggleDiscoveryFavorite: () => ({ mutate: jest.fn() }),
}));
// This suite injects its own `exercises`, so it injects the matching details
// too rather than reaching into the generated catalog.
jest.mock("@/data/exercise-catalog", () => ({
  catalogExercises: [],
  getExerciseDetail: (exerciseID: string) =>
    exerciseID === "Bench_Press"
      ? { instructions: ["Press the bar."], imagePaths: [] }
      : { instructions: [], imagePaths: [] },
}));

const exercises: CatalogExercise[] = [
  {
    id: "Bench_Press",
    name: "Bench Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps"],
    equipment: "barbell",
    level: "intermediate",
    mechanic: "compound",
    force: "push",
    category: "strength",
  },
  {
    id: "Hammer_Curl",
    name: "Hammer Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "dumbbell",
    level: "beginner",
    mechanic: "isolation",
    force: "pull",
    category: "strength",
  },
];

describe("ExerciseCatalogPicker", () => {
  it("searches, previews, and confirms a catalog exercise", async () => {
    const onUseExercise = jest.fn();
    const screen = await render(
      <ExerciseCatalogPicker
        exercises={exercises}
        onCreateCustom={jest.fn()}
        onUseExercise={onUseExercise}
      />,
    );

    await fireEvent.changeText(
      screen.getByLabelText("Search exercise catalog"),
      "bench",
    );
    await fireEvent.press(screen.getByLabelText("View Bench Press"));
    expect(screen.getByText("Press the bar.")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Use exercise" }));
    expect(onUseExercise).toHaveBeenCalledWith(exercises[0]);
  });

  it("keeps catalog results visible when the search key is submitted", async () => {
    const screen = await render(
      <ExerciseCatalogPicker
        exercises={exercises}
        onCreateCustom={jest.fn()}
        onUseExercise={jest.fn()}
      />,
    );
    const searchField = screen.getByLabelText("Search exercise catalog");

    expect(searchField.props.submitBehavior).toBe("submit");
    await fireEvent.changeText(searchField, "bench");
    await fireEvent(searchField, "submitEditing", {
      nativeEvent: { text: "bench" },
    });

    expect(screen.getByLabelText("View Bench Press")).toBeTruthy();
  });

  it("offers custom creation when no result matches", async () => {
    const onCreateCustom = jest.fn();
    const screen = await render(
      <ExerciseCatalogPicker
        exercises={exercises}
        onCreateCustom={onCreateCustom}
        onUseExercise={jest.fn()}
      />,
    );

    await fireEvent.changeText(
      screen.getByLabelText("Search exercise catalog"),
      "not-an-exercise",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Create custom exercise" }),
    );
    expect(onCreateCustom).toHaveBeenCalledTimes(1);
  });

  it("offers an accessible favorite toggle for each catalog exercise", async () => {
    const screen = await render(
      <ExerciseCatalogPicker exercises={exercises} onCreateCustom={jest.fn()} onUseExercise={jest.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Add Bench Press to favorite exercises" })).toBeTruthy();
  });
});

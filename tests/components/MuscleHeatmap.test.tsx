/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-require-imports */

import { fireEvent, render } from "@testing-library/react-native";
import { MuscleHeatmap } from "@/components/gym/MuscleHeatmap";
import { catalogExercises } from "@/data/exercise-catalog";

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#00E676",
      background: "#0A0A0A",
      card: "#161616",
      border: "#2A2A2A",
      text: "#FAFAFA",
      textLight: "#A0A0A0",
    },
  }),
}));

jest.mock("@/components/base/ShadowGlowCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ShadowGlowCard: ({ children }: { children: unknown }) =>
      React.createElement(View, null, children),
  };
});

jest.mock("react-native-body-highlighter", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  const MockBody = ({
    data,
    side,
    onBodyPartPress,
  }: {
    data: { slug: string; intensity: number }[];
    side: string;
    onBodyPartPress: (part: { slug: string }) => void;
  }) =>
    React.createElement(
      View,
      null,
      ...data.map((part) =>
        React.createElement(
          TouchableOpacity,
          {
            accessibilityLabel: `${side}-${part.slug}-${part.intensity}`,
            key: `${side}-${part.slug}`,
            onPress: () => onBodyPartPress({ slug: part.slug }),
          },
          React.createElement(Text, null, part.slug),
        ),
      ),
    );

  return { __esModule: true, default: MockBody };
});

describe("MuscleHeatmap", () => {
  it("shows the three-level legend and catalog-derived set equivalents", async () => {
    const chestExercise = catalogExercises.find(
      (exercise) => exercise.primaryMuscle === "chest",
    );
    expect(chestExercise).toBeDefined();

    const today = new Date().toISOString().slice(0, 10);
    const screen = await render(
      <MuscleHeatmap
        exercises={[
          {
            id: 1,
            catalog_exercise_id: chestExercise!.id,
            exercise_sessions: [
              {
                id: 1,
                session_date: today,
                sets: Array.from({ length: 4 }, (_, index) => ({
                  set_number: index + 1,
                  weight: 50,
                  reps: 10,
                })),
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText("Low")).toBeTruthy();
    expect(screen.getByText("Moderate")).toBeTruthy();
    expect(screen.getByText("Target")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("front-chest-1"));
    expect(screen.getByText("Low exposure")).toBeTruthy();
    expect(screen.getByText(/chest: 4/i)).toBeTruthy();
  });
});

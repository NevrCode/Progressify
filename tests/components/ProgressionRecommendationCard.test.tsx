/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import { ProgressionRecommendationCard } from "@/components/gym/progression-recommendation-card";

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#00E676",
      textBlack: "#FAFAFA",
      textLight: "#A0A0A0",
    },
  }),
}));

describe("ProgressionRecommendationCard", () => {
  it("explains and applies an actionable suggestion", async () => {
    const onApply = jest.fn();
    const screen = await render(
      <ProgressionRecommendationCard
        exerciseName="Bench Press"
        recommendation={{
          action: "INCREASE_WEIGHT",
          suggested_weight: 62.5,
          target_reps_min: 8,
          target_reps_max: 10,
          target_rir: 2,
          target_sets: 3,
          confidence: "HIGH",
          reason: "You reached the top of the rep range.",
        }}
        onApply={onApply}
      />,
    );

    expect(screen.getByText("62.5 kg × 8-10")).toBeTruthy();
    expect(screen.getByText("You reached the top of the rep range.")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Apply suggestion" }),
    );
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("does not render insufficient-data suggestions", async () => {
    const screen = await render(
      <ProgressionRecommendationCard
        exerciseName="Bench Press"
        recommendation={{
          action: "INSUFFICIENT_DATA",
          suggested_weight: null,
          target_reps_min: 0,
          target_reps_max: 0,
          target_rir: 0,
          target_sets: 0,
          confidence: "LOW",
          reason: "Complete one workout.",
        }}
        onApply={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText("Progression suggestion for Bench Press")).toBeNull();
  });
});

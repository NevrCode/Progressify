/// <reference types="jest" />

import { render } from "@testing-library/react-native";

import { NutritionProfileOverview } from "@/components/nutrition/nutrition-profile-overview";
import type { ThemeType } from "@/constants/colors";

const theme = {
  primary: "#00E676",
  card: "#161616",
  border: "#2A2A2A",
  textLight: "#A0A0A0",
  textBlack: "#FAFAFA",
} as ThemeType;

describe("NutritionProfileOverview", () => {
  it("renders each saved profile metric", async () => {
    const screen = await render(
      <NutritionProfileOverview
        profile={{
          weight_kg: 72.5,
          height_cm: 178,
          age: 28,
          gender: "MALE",
          activity_level: "MODERATELY_ACTIVE",
          goal_type: "BULK",
          calculated_tdee: 2684.4,
          calculated_calories: 2984.4,
        }}
        theme={theme}
      />,
    );

    expect(screen.getByText("Weight")).toBeTruthy();
    expect(screen.getByText("72.5 kg")).toBeTruthy();
    expect(screen.getByText("Height")).toBeTruthy();
    expect(screen.getByText("178 cm")).toBeTruthy();
    expect(screen.getByText("TDEE")).toBeTruthy();
    expect(screen.getByText("2684")).toBeTruthy();
    expect(screen.getByText("Goal")).toBeTruthy();
    expect(screen.getByText("BULK")).toBeTruthy();
  });
});

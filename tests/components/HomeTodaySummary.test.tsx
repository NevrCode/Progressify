/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { HomeTodaySummary } from "@/components/home/home-today-summary";

jest.mock("@/components/animations/fade-slide-in", () => ({
  FadeSlideIn: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/components/base/shimmer-skeleton", () => ({
  ShimmerSkeleton: () => null,
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#00E676",
      background: "#0A0A0A",
      border: "#2A2A2A",
      text: "#FAFAFA",
      textLight: "#A0A0A0",
    },
  }),
}));

describe("HomeTodaySummary", () => {
  it("shows current metrics and forwards summary actions", async () => {
    const onWaterChange = jest.fn();
    const onLogFood = jest.fn();
    const onOpenNutritionGoals = jest.fn();
    const screen = await render(
      <HomeTodaySummary
        nutrition={{
          calories: { consumed: 820, goal: 2200, percentage: 37 },
          protein: { consumed: 62, goal: 130, percentage: 48 },
        }}
        isLoading={false}
        waterAmount={750}
        waterUpdating={false}
        hasActiveSession={false}
        trainingDaysThisWeek={3}
        onWaterChange={onWaterChange}
        onLogFood={onLogFood}
        onOpenNutritionGoals={onOpenNutritionGoals}
      />,
    );

    expect(screen.getByText("820")).toBeTruthy();
    expect(screen.getByText("Not started")).toBeTruthy();
    expect(screen.getByText("3 days this week")).toBeTruthy();

    await fireEvent.press(
      screen.getByRole("button", { name: "+250 milliliters of water" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Log food" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Open nutrition goals" }),
    );

    expect(onWaterChange).toHaveBeenCalledWith(250);
    expect(onLogFood).toHaveBeenCalledTimes(1);
    expect(onOpenNutritionGoals).toHaveBeenCalledTimes(1);
  });
});

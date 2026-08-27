/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import { MealPrepDetailSheet } from "@/components/nutrition/meal-prep-detail-sheet";
import type { ThemeType } from "@/constants/colors";
import type { MealPrepResponse } from "@/services/mealPrepService";

jest.mock("@/components/base/action-status", () => ({
  ActionStatus: () => null,
}));

const theme = {
  primary: "#00E676",
  background: "#0A0A0A",
  border: "#2A2A2A",
  textBlack: "#FAFAFA",
  textLight: "#A0A0A0",
} as unknown as ThemeType;

const prep: MealPrepResponse = {
  id: 1,
  name: "Weekday Lunch",
  description: "Four portions",
  total_calories: 1800,
  total_protein: 140,
  total_carbohydrate: 160,
  total_fat: 60,
  items: [
    "Chicken", "Rice", "Broccoli", "Sauce",
  ].map((food_name, index) => ({
    id: index + 1,
    food_id: String(index + 1),
    food_name,
    gramation: 100,
    calories: 100,
    protein: 10,
    carbohydrate: 10,
    fat: 5,
  })),
};

describe("MealPrepDetailSheet", () => {
  it("expands its item preview and forwards the log action", async () => {
    const onLog = jest.fn();
    const screen = await render(
      <MealPrepDetailSheet
        prep={prep}
        index={0}
        onClose={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onLog={onLog}
        onDismissFeedback={jest.fn()}
        theme={theme}
        style={{ modalCard: {}, exerciseName: {}, listMeta: {} }}
      />,
    );

    expect(screen.queryByText("Sauce")).toBeNull();
    await fireEvent.press(screen.getByText("Show all 4 foods"));
    expect(screen.getByText("Sauce")).toBeTruthy();

    await fireEvent.press(
      screen.getByRole("button", { name: "Log Weekday Lunch to diary" }),
    );
    expect(onLog).toHaveBeenCalledTimes(1);
  });
});

/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import { FoodDiaryMealList } from "@/components/nutrition/food-diary-meal-list";
import type { ThemeType } from "@/constants/colors";

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#00E676",
      background: "#0A0A0A",
      border: "#2A2A2A",
      textLight: "#A0A0A0",
    },
  }),
}));

const theme = {
  primary: "#00E676",
  background: "#0A0A0A",
  card: "#161616",
  border: "#2A2A2A",
  textLight: "#A0A0A0",
  expense: "#FF5252",
} as unknown as ThemeType;

describe("FoodDiaryMealList", () => {
  it("groups entries by meal and forwards deletions", async () => {
    const onDelete = jest.fn();
    const screen = await render(
      <FoodDiaryMealList
        entries={[
          {
            id: 2,
            food_name: "Dinner bowl",
            meal_type: "DINNER",
            calories: 620,
            protein: 35,
            carbohydrate: 70,
            fat: 18,
            quantity: 1,
          },
          {
            id: 1,
            food_name: "Breakfast oats",
            meal_type: "BREAKFAST",
            calories: 420,
            protein: 20,
            carbohydrate: 60,
            fat: 10,
            quantity: 1,
          },
        ]}
        onDelete={onDelete}
        theme={theme}
        styles={{ listTitle: {}, listMeta: {} }}
      />,
    );

    expect(screen.getByText("Breakfast")).toBeTruthy();
    expect(screen.getByText("Dinner")).toBeTruthy();

    await fireEvent.press(
      screen.getByRole("button", { name: "Delete Breakfast oats" }),
    );
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, food_name: "Breakfast oats" }),
    );
  });
});

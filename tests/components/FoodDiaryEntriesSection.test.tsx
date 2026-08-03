/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import { FoodDiaryEntriesSection } from "@/components/nutrition/food-diary-entries-section";

jest.mock("@/components/base/shimmer-skeleton", () => ({
  ShimmerSkeleton: () => null,
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#00E676",
      background: "#0A0A0A",
      card: "#161616",
      border: "#2A2A2A",
      text: "#FAFAFA",
      textBlack: "#FAFAFA",
      textLight: "#A0A0A0",
      expense: "#FF5252",
    },
  }),
}));

describe("FoodDiaryEntriesSection", () => {
  it("shows the empty state and forwards its add-food action", async () => {
    const onAddFood = jest.fn();
    const screen = await render(
      <FoodDiaryEntriesSection
        isLoading={false}
        onAddFood={onAddFood}
        onDelete={jest.fn()}
      />,
    );

    expect(screen.getByText("No meals logged today")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Add food" }));
    expect(onAddFood).toHaveBeenCalledTimes(1);
  });

  it("shows the existing entries while loading remains false", async () => {
    const onDelete = jest.fn();
    const screen = await render(
      <FoodDiaryEntriesSection
        entries={[
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
        isLoading={false}
        onAddFood={jest.fn()}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("Today's Meals")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Delete Breakfast oats" }),
    );
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, food_name: "Breakfast oats" }),
    );
  });
});

/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import { gymStyles } from "@/assets/styles/gym.style";
import {
  CustomFoodRow,
  type DiscoverableCustomFood,
} from "@/components/nutrition/custom-food-row";
import type { ThemeType } from "@/constants/colors";

const theme = {
  primary: "#00E676",
  background: "#0A0A0A",
  textBlack: "#FAFAFA",
  textLight: "#929292",
  border: "#1E1E1E",
  white: "#FFFFFF",
  expense: "#FF5252",
  income: "#69F0AE",
  card: "#161616",
} as unknown as ThemeType;

const styles = gymStyles(theme);

const baseFood = {
  id: 12,
  food_name: "Greek yogurt",
  serving_description: "170g",
  calories: 100,
  protein: 17,
  carbohydrate: 6,
  fat: 0.7,
  resource_type: "food",
  resource_id: "custom:12",
} as unknown as DiscoverableCustomFood;

const renderRow = async (overrides = {}) => {
  const actions = {
    onSelect: jest.fn(),
    onToggleFavorite: jest.fn(),
    onDelete: jest.fn(),
  };
  const screen = await render(
    <CustomFoodRow
      food={baseFood}
      favorite={false}
      styles={styles}
      theme={theme}
      {...actions}
      {...overrides}
    />,
  );
  return { screen, actions };
};

describe("CustomFoodRow", () => {
  it("renders the serving and macro summary", async () => {
    const { screen } = await renderRow();

    expect(screen.getByText("170g • 100 kcal")).toBeTruthy();
    expect(screen.getByText("P: 17g • C: 6g • F: 0.7g")).toBeTruthy();
  });

  it("falls back to a default serving description when none is stored", async () => {
    const { screen } = await renderRow({
      food: { ...baseFood, serving_description: "" },
    });

    expect(screen.getByText("1 serving • 100 kcal")).toBeTruthy();
  });

  it("selects the food when the row body is pressed", async () => {
    const { screen, actions } = await renderRow();

    await fireEvent.press(
      screen.getByRole("button", { name: "Select Greek yogurt" }),
    );

    expect(actions.onSelect).toHaveBeenCalledWith(baseFood);
    expect(actions.onDelete).not.toHaveBeenCalled();
  });

  it("requests the opposite favorite state without selecting the food", async () => {
    const { screen, actions } = await renderRow();

    await fireEvent.press(
      screen.getByRole("button", {
        name: "Add Greek yogurt to favorite foods",
      }),
    );

    expect(actions.onToggleFavorite).toHaveBeenCalledWith(baseFood, true);
  });

  it("offers removal from favorites once the food is favorited", async () => {
    const { screen, actions } = await renderRow({ favorite: true });

    await fireEvent.press(
      screen.getByRole("button", {
        name: "Remove Greek yogurt from favorite foods",
      }),
    );

    expect(actions.onToggleFavorite).toHaveBeenCalledWith(baseFood, false);
  });

  it("delegates deletion to the parent rather than confirming inline", async () => {
    const { screen, actions } = await renderRow();

    await fireEvent.press(
      screen.getByRole("button", { name: "Delete custom food Greek yogurt" }),
    );

    expect(actions.onDelete).toHaveBeenCalledWith(baseFood);
  });

  it("does not re-render when its own props are unchanged", async () => {
    const { screen } = await renderRow();
    const before = screen.getByText("Greek yogurt");

    // Same prop identities: the memo boundary should short-circuit the update.
    await screen.rerender(
      <CustomFoodRow
        food={baseFood}
        favorite={false}
        onSelect={jest.fn()}
        onToggleFavorite={jest.fn()}
        onDelete={jest.fn()}
        styles={styles}
        theme={theme}
      />,
    );

    expect(screen.getByText("Greek yogurt")).toBe(before);
  });
});

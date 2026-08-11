/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import { FoodSearchModal } from "@/components/nutrition/foodSearchModal";

const mockUseCustomFoodSearch = jest.fn();

jest.mock("@/services/customFoodService", () => ({
  useCustomFoodSearch: (...args: unknown[]) =>
    mockUseCustomFoodSearch(...args),
  useCreateCustomFood: () => ({ mutate: jest.fn(), isPending: false }),
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
      white: "#FFFFFF",
    },
  }),
}));

const customFood = {
  id: 3,
  food_name: "Oat porridge",
  serving_description: "80g",
  metric_serving_amount: 80,
  calories: 300,
  protein: 10,
  carbohydrate: 54,
  fat: 6,
};

const renderModal = async (overrides = {}) => {
  const onFoodSelected = jest.fn();
  const onClose = jest.fn();
  const screen = await render(
    <FoodSearchModal
      visible
      onClose={onClose}
      onFoodSelected={onFoodSelected}
      {...overrides}
    />,
  );
  return { screen, onFoodSelected, onClose };
};

describe("FoodSearchModal", () => {
  beforeEach(() => {
    mockUseCustomFoodSearch.mockReset();
    mockUseCustomFoodSearch.mockReturnValue({
      data: [customFood],
      isFetching: false,
    });
  });

  it("lists the stored custom foods under a heading", async () => {
    const { screen } = await renderModal();

    expect(screen.getByText("My Custom Foods")).toBeTruthy();
    expect(screen.getByText("Oat porridge")).toBeTruthy();
  });

  it("keeps the manual-entry action reachable while results are listed", async () => {
    const { screen } = await renderModal();

    expect(
      screen.getByRole("button", { name: "Add food manually" }),
    ).toBeTruthy();
  });

  it("keeps the manual-entry action reachable when there are no results", async () => {
    mockUseCustomFoodSearch.mockReturnValue({ data: [], isFetching: false });
    const { screen } = await renderModal();

    expect(screen.queryByText("My Custom Foods")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Add food manually" }),
    ).toBeTruthy();
  });

  it("prompts for a longer query until the search minimum is met", async () => {
    const { screen } = await renderModal();

    expect(
      screen.getByText("Type at least 2 characters to search FatSecret."),
    ).toBeTruthy();
  });

  it("shows a spinner instead of stale rows while fetching", async () => {
    mockUseCustomFoodSearch.mockReturnValue({
      data: [customFood],
      isFetching: true,
    });
    const { screen } = await renderModal();

    expect(screen.getByText("Searching foods...")).toBeTruthy();
    expect(screen.queryByText("Oat porridge")).toBeNull();
    expect(screen.queryByText("My Custom Foods")).toBeNull();
  });

  it("emits the selected custom food and closes", async () => {
    const { screen, onFoodSelected, onClose } = await renderModal();

    await fireEvent.press(
      screen.getByRole("button", { name: "Select Oat porridge" }),
    );

    expect(onFoodSelected).toHaveBeenCalledWith(
      expect.objectContaining({
        food_id: "custom-3",
        food_name: "Oat porridge",
        metric_serving_amount: 80,
        is_custom: true,
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("switches to the manual form when the fallback action is pressed", async () => {
    const { screen } = await renderModal();

    await fireEvent.press(screen.getByRole("button", { name: "Add food manually" }));

    expect(screen.getByPlaceholderText("Food name *")).toBeTruthy();
  });
});

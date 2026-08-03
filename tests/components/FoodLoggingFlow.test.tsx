/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { FoodLoggingFlow } from "@/components/nutrition/food-logging-flow";

jest.mock("@/components/nutrition/BarcodeScannerModal", () => ({
  BarcodeScannerModal: () => null,
}));
jest.mock("@/services/customFoodService", () => ({
  searchCustomFoods: jest.fn().mockResolvedValue([]),
  createCustomFood: jest.fn(),
  deleteCustomFood: jest.fn(),
}));
jest.mock("@/services/foodDiaryService", () => ({
  createFoodEntry: jest.fn(),
  findFoodByBarcode: jest.fn(),
}));
jest.mock("@/hooks/useFoodDiary", () => ({
  FOOD_DIARY_QUERY_KEY: ["food-diary"],
}));
jest.mock("@/context/AlertContext", () => ({
  useAlert: () => ({ alert: jest.fn() }),
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

const renderFlow = (openRequest = 0) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <FoodLoggingFlow selectedDate="2026-08-03" openRequest={openRequest} />
    </QueryClientProvider>,
  );
};

describe("FoodLoggingFlow", () => {
  it("owns opening the picker through its small request interface", async () => {
    const screen = await renderFlow(1);
    await waitFor(() => expect(screen.getByText("Find Food")).toBeTruthy());
    expect(screen.getByPlaceholderText("Search custom foods...")).toBeTruthy();
  });

  it("validates the internally-owned custom-food form", async () => {
    const screen = await renderFlow();
    await fireEvent.press(screen.getByRole("button", { name: "Open food search" }));
    await fireEvent.press(screen.getByText("Create New Custom Food"));
    await fireEvent.press(screen.getByText("Save & Log Food"));
    expect(screen.getByText("Required information")).toBeTruthy();
    expect(screen.getByText("Enter food name.")).toBeTruthy();
  });
});

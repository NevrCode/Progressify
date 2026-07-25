/// <reference types="jest" />

import { render } from "@testing-library/react-native";

import { WeeklyReviewCard } from "@/components/home/weekly-review-card";
import type { WeeklyReview } from "@/utils/weekly-review";

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#00E676",
      secondary: "#00C853",
      tertiary: "#1B5E20",
      background: "#0A0A0A",
      card: "#161616",
      border: "#1E1E1E",
      text: "#E0E0E0",
      textBlack: "#FAFAFA",
      textLight: "#929292",
      white: "#FFFFFF",
      shadow: "#000000",
      expense: "#FF5252",
      income: "#69F0AE",
      bar: "#00E676",
    },
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const review: WeeklyReview = {
  currentPeriodLabel: "Jul 18–24",
  previousPeriodLabel: "Jul 11–17",
  trainingDays: {
    current: 3,
    previous: 2,
    difference: 1,
    percentageChange: 50,
  },
  trainingVolume: {
    current: 12000,
    previous: 10000,
    difference: 2000,
    percentageChange: 20,
  },
  diaryDays: {
    current: 5,
    previous: 4,
    difference: 1,
    percentageChange: 25,
  },
  summary: "Recorded training volume increased 20% week over week.",
  hasTrainingData: true,
  hasPreviousTrainingData: true,
};

describe("WeeklyReviewCard", () => {
  it("shows the period, comparison metrics, and accessible data summaries", async () => {
    const screen = await render(<WeeklyReviewCard review={review} />);

    expect(
      screen.getByRole("header", { name: "Weekly review" }),
    ).toBeTruthy();
    expect(screen.getByText("Jul 18–24 vs Jul 11–17")).toBeTruthy();
    expect(screen.getByLabelText(/3 training days/)).toBeTruthy();
    expect(screen.getByLabelText(/12.0k kilograms recorded volume/)).toBeTruthy();
    expect(screen.getByLabelText(/5 food diary days/)).toBeTruthy();
  });

  it("does not claim an exact nutrition comparison from partial history", async () => {
    const screen = await render(
      <WeeklyReviewCard review={{ ...review, diaryDays: undefined }} />,
    );

    expect(
      screen.getByText(/More diary history is needed/),
    ).toBeTruthy();
    expect(screen.queryByText("Food diary days")).toBeNull();
  });
});

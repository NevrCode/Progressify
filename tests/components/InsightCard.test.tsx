/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import { InsightCard } from "@/components/home/insight-card";
import type { HomeInsight } from "@/utils/home-insights";

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

const insight: HomeInsight = {
  id: "strength-1",
  category: "Training",
  title: "Strength is moving up",
  message: "Chest press improved 10% from its previous session.",
  reason: "Compared the latest two estimated one-rep max values.",
  tone: "positive",
  destination: "gym",
};

describe("InsightCard", () => {
  it("reveals its calculation context and opens the related tracker", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <InsightCard insight={insight} onPress={onPress} />,
    );

    expect(screen.getByText(insight.message)).toBeTruthy();
    expect(screen.queryByText(insight.reason)).toBeNull();

    await fireEvent.press(
      screen.getByRole("button", { name: "Show insight explanation" }),
    );
    expect(screen.getByText(insight.reason)).toBeTruthy();

    await fireEvent.press(
      screen.getByRole("button", { name: "Open training details" }),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

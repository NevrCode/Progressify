/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { StatePanel } from "@/components/base/state-panel";

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

describe("StatePanel", () => {
  it("renders actionable empty states with accessible headings", async () => {
    const onPrimary = jest.fn();
    const onSecondary = jest.fn();
    const screen = await render(
      <StatePanel
        variant="empty"
        title="No exercises yet"
        message="Add an exercise to begin."
        primaryAction={{ label: "Add exercise", onPress: onPrimary }}
        secondaryAction={{ label: "Learn more", onPress: onSecondary }}
      />,
    );

    expect(
      screen.getByRole("header", { name: "No exercises yet" }),
    ).toBeTruthy();
    expect(screen.getByText("Add an exercise to begin.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Add exercise" }));
    await fireEvent.press(screen.getByRole("button", { name: "Learn more" }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it("announces recoverable errors and supports embedded presentation", async () => {
    const screen = await render(
      <StatePanel
        testID="state-panel"
        variant="error"
        title="Refresh failed"
        message="Cached data is still available."
        compact
        embedded
      />,
    );

    const panel = screen.getByTestId("state-panel");
    expect(panel.props.accessibilityLiveRegion).toBe("polite");
    expect(StyleSheet.flatten(panel.props.style)).toMatchObject({
      backgroundColor: "transparent",
      borderWidth: 0,
    });
  });
});

/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import { ActionStatus } from "@/components/base/action-status";

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

describe("ActionStatus", () => {
  it("announces recoverable errors and supports dismissal", async () => {
    const onDismiss = jest.fn();
    const screen = await render(
      <ActionStatus
        status="error"
        title="Could not save"
        message="Your form values are still available."
        onDismiss={onDismiss}
      />,
    );

    expect(
      screen.getByLabelText(
        "Could not save. Your form values are still available.",
      ).props.accessibilityRole,
    ).toBe("alert");
    expect(screen.getByText("Your form values are still available.")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Dismiss Could not save" }),
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders queued-local feedback as informative rather than failed", async () => {
    const screen = await render(
      <ActionStatus
        status="info"
        title="Saved locally"
        message="Pending synchronization."
      />,
    );

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Pending synchronization.")).toBeTruthy();
  });
});

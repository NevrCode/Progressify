/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import { RestTimerOverlay } from "@/components/gym/rest-timer-overlay";
import type { ThemeType } from "@/constants/colors";

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#00E676",
      background: "#0A0A0A",
      border: "#2A2A2A",
      income: "#2ECC71",
    },
  }),
}));

const theme = {
  primary: "#00E676",
  background: "#0A0A0A",
  border: "#2A2A2A",
  income: "#2ECC71",
  shadow: "#000000",
} as unknown as ThemeType;

describe("RestTimerOverlay", () => {
  it("renders timer controls and forwards timer actions", async () => {
    const onAdjust = jest.fn();
    const onTogglePause = jest.fn();
    const onDismiss = jest.fn();
    const screen = await render(
      <RestTimerOverlay
        active
        remainingSeconds={90}
        paused={false}
        initialDuration={90}
        onAdjust={onAdjust}
        onTogglePause={onTogglePause}
        onRestart={jest.fn()}
        onDismiss={onDismiss}
        theme={theme}
      />,
    );

    expect(screen.getByText("1:30")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Reduce rest timer by 30 seconds" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Increase rest timer by 30 seconds" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Pause rest timer" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Dismiss rest timer" }),
    );

    expect(onAdjust).toHaveBeenNthCalledWith(1, -30);
    expect(onAdjust).toHaveBeenNthCalledWith(2, 30);
    expect(onTogglePause).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("shows the restart control after rest has finished", async () => {
    const onRestart = jest.fn();
    const screen = await render(
      <RestTimerOverlay
        active
        remainingSeconds={0}
        paused={false}
        initialDuration={120}
        onAdjust={jest.fn()}
        onTogglePause={jest.fn()}
        onRestart={onRestart}
        onDismiss={jest.fn()}
        theme={theme}
      />,
    );

    expect(screen.getByText("Go Lift!")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", {
        name: "Restart rest timer for 120 seconds",
      }),
    );
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});

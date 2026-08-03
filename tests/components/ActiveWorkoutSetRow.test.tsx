/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import type { ThemeType } from "@/constants/colors";
import { ActiveWorkoutSetRow } from "@/features/workout-session/active-workout-set-row";

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#00E676",
      background: "#0A0A0A",
      textBlack: "#FAFAFA",
      textLight: "#929292",
      border: "#1E1E1E",
      white: "#FFFFFF",
      expense: "#FF5252",
      income: "#69F0AE",
      card: "#161616",
    },
  }),
}));

jest.mock("react-native-gesture-handler/ReanimatedSwipeable", () => {
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: ({ children, renderRightActions }: any) => (
      <View>
        {children}
        {renderRightActions?.(null, null, { close: jest.fn() })}
      </View>
    ),
  };
});

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

const baseSet = {
  localId: "set-1",
  set_number: 1,
  weight: "50",
  reps: "8",
  rir: "2",
  set_type: "WORKING" as const,
  completed: false,
};

const renderRow = async (overrides = {}) => {
  const actions = {
    onChange: jest.fn(),
    onToggleType: jest.fn(),
    onComplete: jest.fn(),
    onDuplicate: jest.fn(),
    onRemove: jest.fn(),
  };
  const screen = await render(
    <ActiveWorkoutSetRow
      set={baseSet}
      exerciseName="Bench press"
      theme={theme}
      isLast
      {...actions}
      {...overrides}
    />,
  );
  return { screen, actions };
};

describe("ActiveWorkoutSetRow", () => {
  it("offers labeled complete, duplicate, and remove buttons without requiring a swipe", async () => {
    const { screen, actions } = await renderRow();

    await fireEvent.press(screen.getAllByRole("button", { name: "Complete set 1" })[0]);
    await fireEvent.press(screen.getAllByRole("button", { name: "Duplicate set 1" })[0]);
    await fireEvent.press(screen.getAllByRole("button", { name: "Remove set 1" })[0]);

    expect(actions.onComplete).toHaveBeenCalledTimes(1);
    expect(actions.onDuplicate).toHaveBeenCalledTimes(1);
    expect(actions.onRemove).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it("exposes the same three actions in the swipe action surface", async () => {
    const { screen } = await renderRow();
    expect(screen.getAllByRole("button", { name: "Complete set 1" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Duplicate set 1" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Remove set 1" })).toHaveLength(2);
    await screen.unmount();
  });

  it("locks values and completion after a set is completed while keeping copy and remove available", async () => {
    const { screen } = await renderRow({ set: { ...baseSet, completed: true } });
    expect(screen.getByLabelText("Set 1 weight in kilograms for Bench press").props.editable).toBe(false);
    expect(screen.getAllByRole("button", { name: "Complete set 1" })[0].props.accessibilityState.disabled).toBe(true);
    expect(screen.getAllByRole("button", { name: "Duplicate set 1" })[0].props.accessibilityState?.disabled).not.toBe(true);
    await screen.unmount();
  });
});

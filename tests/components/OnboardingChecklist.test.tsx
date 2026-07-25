/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import { OnboardingChecklist } from "@/components/home/onboarding-checklist";
import type { OnboardingStep } from "@/utils/onboarding";

jest.mock("@/components/base/shimmer-skeleton", () => ({
  ShimmerSkeleton: () => null,
}));

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

const steps: OnboardingStep[] = [
  {
    key: "nutrition-profile",
    title: "Set nutrition goals",
    description: "Add your profile.",
    completed: true,
  },
  {
    key: "first-workout",
    title: "Complete your first workout",
    description: "Record a workout.",
    completed: false,
  },
];

describe("OnboardingChecklist", () => {
  it("reports progress and opens incomplete steps", async () => {
    const onStepPress = jest.fn();
    const screen = await render(
      <OnboardingChecklist
        steps={steps}
        onStepPress={onStepPress}
        onRetry={jest.fn()}
        onCollapse={jest.fn()}
        onExpand={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByText("1 of 2 completed")).toBeTruthy();
    expect(
      screen.getByRole("checkbox", { name: "Set nutrition goals" }).props
        .accessibilityState,
    ).toMatchObject({ checked: true, disabled: true });
    await fireEvent.press(
      screen.getByRole("checkbox", {
        name: "Complete your first workout",
      }),
    );
    expect(onStepPress).toHaveBeenCalledWith(steps[1]);
    expect(
      screen.getByLabelText("Setup completion progress").props
        .accessibilityValue,
    ).toEqual({
      min: 0,
      max: 2,
      now: 1,
    });
  });

  it("supports collapse and dismiss controls", async () => {
    const onExpand = jest.fn();
    const onDismiss = jest.fn();
    const screen = await render(
      <OnboardingChecklist
        steps={steps}
        collapsed
        onStepPress={jest.fn()}
        onRetry={jest.fn()}
        onCollapse={jest.fn()}
        onExpand={onExpand}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.queryByText("Complete your first workout")).toBeNull();
    await fireEvent.press(screen.getByLabelText("Expand setup checklist"));
    await fireEvent.press(screen.getByLabelText("Hide setup checklist"));
    expect(onExpand).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("offers recovery without showing false incomplete steps", async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <OnboardingChecklist
        steps={steps}
        unavailable
        onStepPress={jest.fn()}
        onRetry={onRetry}
        onCollapse={jest.fn()}
        onExpand={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByText("Setup progress unavailable")).toBeTruthy();
    expect(screen.queryByText("Complete your first workout")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

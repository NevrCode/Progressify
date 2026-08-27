/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";
import * as mockReact from "react";
import {
  Text as mockText,
  TouchableOpacity as mockTouchableOpacity,
  View as mockView,
} from "react-native";

import { FoodDiaryPageHeader } from "@/components/nutrition/food-diary-page-header";

jest.mock("@/components/base/action-status", () => {
  return {
    ActionStatus: ({ message, onDismiss, title }: any) =>
      mockReact.createElement(
        mockView,
        null,
        mockReact.createElement(mockText, null, title),
        mockReact.createElement(mockText, null, message),
        mockReact.createElement(
          mockTouchableOpacity,
          { accessibilityLabel: "Dismiss page feedback", onPress: onDismiss },
          mockReact.createElement(mockText, null, "Dismiss"),
        ),
      ),
  };
});

jest.mock("@/components/base/date-navigator", () => {
  return {
    DateNavigator: ({ label, onLabelPress, onNext, onPrevious }: any) =>
      mockReact.createElement(
        mockView,
        null,
        mockReact.createElement(
          mockTouchableOpacity,
          { accessibilityLabel: "Reset date", onPress: onLabelPress },
          mockReact.createElement(mockText, null, label),
        ),
        mockReact.createElement(
          mockTouchableOpacity,
          { accessibilityLabel: "Previous date", onPress: onPrevious },
          mockReact.createElement(mockText, null, "Previous"),
        ),
        mockReact.createElement(
          mockTouchableOpacity,
          { accessibilityLabel: "Next date", onPress: onNext },
          mockReact.createElement(mockText, null, "Next"),
        ),
      ),
  };
});

jest.mock("@/components/base/page-header", () => ({
  PageHeader: () => null,
}));

describe("FoodDiaryPageHeader", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-02T12:00:00"));
  });

  afterEach(() => jest.useRealTimers());

  it("presents page feedback and delegates date navigation", async () => {
    const onDateChange = jest.fn();
    const onDismissFeedback = jest.fn();
    const screen = await render(
      <FoodDiaryPageHeader
        feedback={{
          status: "success",
          title: "Food logged",
          message: "The entry was added to the selected meal and date.",
        }}
        onDateChange={onDateChange}
        onDismissFeedback={onDismissFeedback}
        selectedDate="2026-08-02"
      />,
    );

    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("Food logged")).toBeTruthy();

    await fireEvent.press(
      screen.getByLabelText("Previous date"),
    );
    await fireEvent.press(screen.getByLabelText("Next date"));
    await fireEvent.press(screen.getByLabelText("Reset date"));
    await fireEvent.press(
      screen.getByLabelText("Dismiss page feedback"),
    );

    expect(onDateChange).toHaveBeenNthCalledWith(1, "2026-08-01");
    expect(onDateChange).toHaveBeenNthCalledWith(2, "2026-08-03");
    expect(onDateChange).toHaveBeenNthCalledWith(3, "2026-08-02");
    expect(onDismissFeedback).toHaveBeenCalledTimes(1);
  });
});

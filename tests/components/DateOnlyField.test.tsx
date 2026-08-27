/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";
import * as mockReact from "react";
import {
  Platform,
  TouchableOpacity as mockTouchableOpacity,
  View as mockView,
} from "react-native";

import { DateOnlyField } from "@/components/base/date-only-field";

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: ({ onChange }: any) =>
    mockReact.createElement(
      mockView,
      null,
      mockReact.createElement(mockTouchableOpacity, {
        accessibilityLabel: "Mock dismiss date",
        onPress: () => onChange({ type: "dismissed" }, undefined),
      }),
      mockReact.createElement(mockTouchableOpacity, {
        accessibilityLabel: "Mock set date",
        onPress: () => onChange({ type: "set" }, new Date(2026, 7, 3, 12)),
      }),
    ),
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      background: "#101010",
      card: "#202020",
      primary: "#00aa88",
      textBlack: "#ffffff",
      textLight: "#bbbbbb",
      border: "#333333",
    },
  }),
}));

describe("DateOnlyField", () => {
  it("keeps a dismissed native picker from changing the API date", async () => {
    const onChange = jest.fn();
    const screen = await render(
      <DateOnlyField label="Session date" value="2026-08-02" onChange={onChange} />,
    );

    await fireEvent.press(screen.getByLabelText("Choose Session date: Aug 2, 2026"));
    if (Platform.OS === "web") {
      await fireEvent.press(screen.getByLabelText("Next day"));
      await fireEvent.press(screen.getByLabelText("Cancel choosing Session date"));
      expect(onChange).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByLabelText("Choose Session date: Aug 2, 2026"));
      await fireEvent.press(screen.getByLabelText("Next day"));
      await fireEvent.press(screen.getByLabelText("Save Session date"));
    } else {
      await fireEvent.press(screen.getByLabelText("Mock dismiss date"));
      expect(onChange).not.toHaveBeenCalled();

      if (Platform.OS !== "android") {
        await fireEvent.press(screen.getByLabelText("Cancel choosing Session date"));
        await fireEvent.press(screen.getByLabelText("Choose Session date: Aug 2, 2026"));
        await fireEvent.press(screen.getByLabelText("Mock set date"));
        expect(onChange).not.toHaveBeenCalled();
        await fireEvent.press(screen.getByLabelText("Save Session date"));
      } else {
        await fireEvent.press(screen.getByLabelText("Choose Session date: Aug 2, 2026"));
        await fireEvent.press(screen.getByLabelText("Mock set date"));
      }
    }

    expect(onChange).toHaveBeenCalledWith("2026-08-03");
  });
});

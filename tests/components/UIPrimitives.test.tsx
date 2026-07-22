/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { AppButton } from "@/components/base/app-button";
import { DateNavigator } from "@/components/base/date-navigator";
import { FormField } from "@/components/base/form-field";
import { IconButton } from "@/components/base/icon-button";
import { PaginationNavigator } from "@/components/base/pagination-navigator";
import { SegmentedControl } from "@/components/base/segmented-control";

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#00E676",
      background: "#0A0A0A",
      card: "#161616",
      border: "#1E1E1E",
      expense: "#FF5252",
      textBlack: "#FAFAFA",
      textLight: "#6B6B6B",
    },
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

describe("shared UI primitives", () => {
  it("provides accessible actions, navigation, selection, and fields", async () => {
    const onPrimaryPress = jest.fn();
    const onDeletePress = jest.fn();
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    const onPageChange = jest.fn();
    const onSegmentChange = jest.fn();
    const screen = await render(
      <>
        <AppButton label="Save" onPress={onPrimaryPress} />
        <IconButton
          accessibilityLabel="Delete item"
          variant="destructive"
          icon={<Text>Delete</Text>}
          onPress={onDeletePress}
        />
        <DateNavigator
          label="Today"
          supportingLabel="Tap to reset date"
          onPrevious={onPrevious}
          onNext={onNext}
        />
        <PaginationNavigator
          page={1}
          totalPages={4}
          onPageChange={onPageChange}
        />
        <SegmentedControl
          value="ALL"
          options={[
            { value: "ALL", label: "All" },
            { value: "PUSH", label: "Push" },
          ]}
          onChange={onSegmentChange}
        />
        <FormField label="Exercise name" value="Bench press" />
      </>,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    await fireEvent.press(screen.getByLabelText("Delete item"));
    await fireEvent.press(screen.getByLabelText("Previous date"));
    await fireEvent.press(screen.getByLabelText("Next date"));
    await fireEvent.press(screen.getByLabelText("Page 3"));
    await fireEvent.press(screen.getByLabelText("Push"));

    expect(onPrimaryPress).toHaveBeenCalledTimes(1);
    expect(onDeletePress).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(onSegmentChange).toHaveBeenCalledWith("PUSH");
    expect(screen.getByLabelText("Exercise name")).toBeTruthy();
  });
});

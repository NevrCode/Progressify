/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { PageHeader } from "@/components/base/page-header";

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#00E676",
      textBlack: "#FAFAFA",
      textLight: "#6B6B6B",
    },
  }),
}));

jest.mock("@/components/base/SyncStatusBadge", () => ({
  SyncStatusBadge: () => {
    const { Text: MockText } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <MockText>Sync status</MockText>;
  },
}));

describe("PageHeader", () => {
  it("renders the shared hierarchy and sync status by default", async () => {
    const screen = await render(
      <PageHeader
        eyebrow="Nutrition"
        title="Food Diary"
        icon={<Text>Icon</Text>}
      />,
    );

    expect(screen.getByText("Nutrition")).toBeTruthy();
    expect(screen.getByRole("header", { name: "Food Diary" })).toBeTruthy();
    expect(screen.getByText("Sync status")).toBeTruthy();
  });

  it("supports an accessible icon action and optional sync status", async () => {
    const onIconPress = jest.fn();
    const screen = await render(
      <PageHeader
        eyebrow="Account"
        title="Profile"
        icon={<Text>Edit</Text>}
        showSyncStatus={false}
        iconAccessibilityLabel="Edit profile"
        onIconPress={onIconPress}
      />,
    );

    expect(screen.queryByText("Sync status")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Edit profile" }));
    expect(onIconPress).toHaveBeenCalledTimes(1);
  });
});

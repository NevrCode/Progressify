/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";
import type { ThemeType } from "@/constants/colors";
import { SetUndoSnackbar } from "@/features/workout-session/set-undo-snackbar";

const theme = {
  background: "#000",
  textBlack: "#fff",
  primary: "#0f0",
} as unknown as ThemeType;

test("set undo snackbar announces removal and exposes a labeled undo action", async () => {
  const onUndo = jest.fn();
  const screen = await render(<SetUndoSnackbar setNumber={2} onUndo={onUndo} theme={theme} />);
  expect(screen.getByText("Set 2 removed")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Undo removing set 2" }));
  expect(onUndo).toHaveBeenCalledTimes(1);
  await screen.unmount();
});

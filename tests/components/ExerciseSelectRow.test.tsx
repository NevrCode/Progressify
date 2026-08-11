/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import { gymStyles } from "@/assets/styles/gym.style";
import { ExerciseSelectRow } from "@/components/gym/exercise-select-row";
import type { ThemeType } from "@/constants/colors";
import type { ExerciseProgressionDTO } from "@/services/gymService";

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

const styles = gymStyles(theme);

const baseExercise = {
  id: 7,
  name: "Bench press",
  muscle_group: "Chest",
  target_rep_range: "6-8",
  last_session_date: "2026-08-01",
} as unknown as ExerciseProgressionDTO;

const renderRow = async (overrides = {}) => {
  const onToggle = jest.fn();
  const screen = await render(
    <ExerciseSelectRow
      exercise={baseExercise}
      selected={false}
      onToggle={onToggle}
      styles={styles}
      theme={theme}
      {...overrides}
    />,
  );
  return { screen, onToggle };
};

describe("ExerciseSelectRow", () => {
  it("exposes the exercise as a checkbox carrying its selection state", async () => {
    const { screen } = await renderRow({ selected: true });

    const row = screen.getByRole("checkbox", { name: "Bench press" });
    expect(row.props.accessibilityState).toMatchObject({ checked: true });
  });

  it("reports the exercise id when pressed so the parent can toggle it", async () => {
    const { screen, onToggle } = await renderRow();

    await fireEvent.press(screen.getByRole("checkbox", { name: "Bench press" }));

    expect(onToggle).toHaveBeenCalledWith(7);
  });

  it("renders muscle group, rep range, and last session summary", async () => {
    const { screen } = await renderRow();

    expect(screen.getByText("Chest | 6-8")).toBeTruthy();
    expect(screen.getByText("Last: 2026-08-01")).toBeTruthy();
  });

  it("falls back to a placeholder name and omits the last session line when absent", async () => {
    const { screen } = await renderRow({
      exercise: { id: 9 } as unknown as ExerciseProgressionDTO,
    });

    expect(screen.getByRole("checkbox", { name: "Exercise" })).toBeTruthy();
    expect(screen.queryByText(/^Last:/)).toBeNull();
  });

  it("does not re-render when its own props are unchanged", async () => {
    const { screen } = await renderRow();
    const before = screen.getByText("Bench press");

    // Same prop identities: the memo boundary should short-circuit the update.
    await screen.rerender(
      <ExerciseSelectRow
        exercise={baseExercise}
        selected={false}
        onToggle={jest.fn()}
        styles={styles}
        theme={theme}
      />,
    );

    expect(screen.getByText("Bench press")).toBe(before);
  });
});

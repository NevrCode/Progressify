/**
 * State for the in-session exercise picker.
 *
 * The picker has two mutually exclusive modes, and "swap" is only meaningful
 * with a target exercise. Encoding that in the union makes a swap without a
 * target — and both modes being open at once — unrepresentable rather than
 * something each call site has to guard.
 *
 * The closed variant retains `mode` so the modal keeps its title through the
 * slide-out animation.
 */
export type ExercisePickerState =
  | { visible: false; mode: "add" | "swap" }
  | { visible: true; mode: "swap"; targetExerciseId: number; search: string }
  | { visible: true; mode: "add"; search: string };

export const CLOSED_PICKER: ExercisePickerState = {
  visible: false,
  mode: "add",
};

export const openSwapPicker = (
  targetExerciseId: number,
): ExercisePickerState => ({
  visible: true,
  mode: "swap",
  targetExerciseId,
  search: "",
});

export const openAddPicker = (): ExercisePickerState => ({
  visible: true,
  mode: "add",
  search: "",
});

export const closePicker = (
  current: ExercisePickerState,
): ExercisePickerState => ({ visible: false, mode: current.mode });

/** Typing into a closed picker is a no-op rather than an invalid state. */
export const setPickerSearch = (
  current: ExercisePickerState,
  search: string,
): ExercisePickerState =>
  current.visible ? { ...current, search } : current;

export const pickerSearch = (state: ExercisePickerState): string =>
  state.visible ? state.search : "";

/** The exercise being swapped, or null when the picker is not swapping one. */
export const pickerSwapTarget = (state: ExercisePickerState): number | null =>
  state.visible && state.mode === "swap" ? state.targetExerciseId : null;

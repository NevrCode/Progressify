import assert from "node:assert/strict";
import test from "node:test";

import {
  CLOSED_PICKER,
  closePicker,
  openAddPicker,
  openSwapPicker,
  pickerSearch,
  pickerSwapTarget,
  setPickerSearch,
} from "../src/features/workout-session/exercise-picker-state.ts";

test("starts closed with no search and no swap target", () => {
  assert.equal(CLOSED_PICKER.visible, false);
  assert.equal(pickerSearch(CLOSED_PICKER), "");
  assert.equal(pickerSwapTarget(CLOSED_PICKER), null);
});

test("opening for a swap carries the target exercise", () => {
  const state = openSwapPicker(42);

  assert.deepEqual(state, {
    visible: true,
    mode: "swap",
    targetExerciseId: 42,
    search: "",
  });
  assert.equal(pickerSwapTarget(state), 42);
});

test("opening to add reports no swap target", () => {
  const state = openAddPicker();

  assert.deepEqual(state, { visible: true, mode: "add", search: "" });
  assert.equal(pickerSwapTarget(state), null);
});

test("opening either mode starts from an empty search", () => {
  const typed = setPickerSearch(openAddPicker(), "bench");

  assert.equal(pickerSearch(typed), "bench");
  assert.equal(pickerSearch(openAddPicker()), "");
  assert.equal(pickerSearch(openSwapPicker(1)), "");
});

test("closing retains the mode so the modal title survives the slide-out", () => {
  const closed = closePicker(openSwapPicker(7));

  assert.deepEqual(closed, { visible: false, mode: "swap" });
});

test("closing discards the search and the swap target", () => {
  const closed = closePicker(setPickerSearch(openSwapPicker(7), "squat"));

  assert.equal(pickerSearch(closed), "");
  assert.equal(pickerSwapTarget(closed), null);
});

test("typing into a closed picker changes nothing", () => {
  const state = setPickerSearch(CLOSED_PICKER, "curl");

  assert.equal(state, CLOSED_PICKER);
});

test("switching from swap to add drops the previous swap target", () => {
  // Both modes were previously separate booleans, so opening "add" while a swap
  // was open left both visible with the stale target still in place. Replacing
  // the whole value is what makes that unrepresentable.
  const swapping = setPickerSearch(openSwapPicker(9), "row");
  const adding = openAddPicker();

  assert.equal(pickerSwapTarget(swapping), 9);
  assert.equal(pickerSwapTarget(adding), null);
  assert.equal(adding.mode, "add");
  assert.equal(pickerSearch(adding), "");
});

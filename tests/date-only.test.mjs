import assert from "node:assert/strict";
import test from "node:test";

import {
  addDaysToDateOnly,
  formatDateOnly,
  formatDateOnlyForDisplay,
  getDateOnlyPickerSelection,
  isDateOnly,
  parseDateOnly,
} from "../src/utils/date-only.ts";

test("date-only parsing is strict and remains a local calendar date", () => {
  const parsed = parseDateOnly("2026-08-03");
  assert.ok(parsed);
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 7);
  assert.equal(parsed.getDate(), 3);
  assert.equal(formatDateOnly(parsed), "2026-08-03");
  assert.equal(isDateOnly("2026-02-29"), false);
  assert.equal(isDateOnly("2026-2-3"), false);
  assert.equal(parseDateOnly("2026-13-03"), null);
});

test("date-only formatting does not use an ISO instant", () => {
  const localDate = new Date(2026, 0, 1, 12);
  assert.equal(formatDateOnly(localDate), "2026-01-01");
  assert.equal(formatDateOnlyForDisplay("2026-01-01"), "Jan 1, 2026");
  assert.equal(addDaysToDateOnly("2026-02-28", 1), "2026-03-01");
  assert.equal(addDaysToDateOnly("invalid", 1), null);
});

test("only affirmative picker events can update an API date", () => {
  const selection = new Date(2026, 7, 3, 12);
  assert.equal(getDateOnlyPickerSelection("set", selection), "2026-08-03");
  assert.equal(getDateOnlyPickerSelection("dismissed", selection), null);
  assert.equal(getDateOnlyPickerSelection("set"), null);
});

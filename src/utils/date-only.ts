/**
 * Date-only values are API calendar dates, not instants. Keep all conversion
 * local so `2026-08-03` never becomes the previous/next day by UTC parsing.
 */
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const formatDateOnly = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

export const parseDateOnly = (value?: string | null): Date | null => {
  const match = value?.match(DATE_ONLY_PATTERN);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Midday avoids the rare local DST transition that happens at midnight.
  const result = new Date(year, month - 1, day, 12);

  return result.getFullYear() === year &&
    result.getMonth() === month - 1 &&
    result.getDate() === day
    ? result
    : null;
};

export const isDateOnly = (value?: string | null): value is string =>
  parseDateOnly(value) !== null;

export const formatDateOnlyForDisplay = (value?: string | null): string => {
  const date = parseDateOnly(value);
  if (!date) return value || "Choose date";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const addDaysToDateOnly = (value: string, days: number): string | null => {
  const date = parseDateOnly(value);
  if (!date || !Number.isInteger(days)) return null;

  date.setDate(date.getDate() + days);
  return formatDateOnly(date);
};

/** Returns an API date only for an affirmative native picker selection. */
export const getDateOnlyPickerSelection = (
  eventType: string | undefined,
  selectedDate?: Date,
): string | null => {
  if (eventType !== "set" || !selectedDate || Number.isNaN(selectedDate.getTime())) {
    return null;
  }

  return formatDateOnly(selectedDate);
};

export const ROUTINE_LAYOUT_CONFLICT_CODE = "ROUTINE_LAYOUT_REVISION_CONFLICT";

/** The editor must reload and ask for an explicit repeat; it never rebases. */
export const isRoutineLayoutRevisionConflict = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === ROUTINE_LAYOUT_CONFLICT_CODE;

export const routineLayoutConflictPrompt =
  "The latest workout layout has been loaded. Please repeat your reorder or superset edit before saving it again.";

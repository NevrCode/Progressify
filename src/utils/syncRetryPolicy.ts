const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

export const isRetryableSyncFailure = (
  status?: number | null,
  code?: string,
) =>
  status == null ||
  status === 408 ||
  status === 425 ||
  status === 429 ||
  status >= 500 ||
  code === "IDEMPOTENCY_IN_PROGRESS";

export const syncRetryDelay = (attempt: number) =>
  Math.min(1000 * 2 ** Math.min(attempt, 8), MAX_RETRY_DELAY_MS);

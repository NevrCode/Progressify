type LogMetadata = Record<string, string | number | boolean | null | undefined>;

const SENSITIVE_KEY = /authorization|bearer|token|password|secret|email|client|budget|balance|calorie|protein|health/i;

const redact = (metadata?: LogMetadata) => {
  if (!metadata) return undefined;
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[REDACTED]" : value,
    ]),
  );
};

const write = (
  level: "debug" | "warn" | "error",
  event: string,
  metadata?: LogMetadata,
) => {
  if (!__DEV__) return;
  const safeMetadata = redact(metadata);
  console[level](`[${event}]`, ...(safeMetadata ? [safeMetadata] : []));
};

export const logger = {
  debug: (event: string, metadata?: LogMetadata) => write("debug", event, metadata),
  warn: (event: string, metadata?: LogMetadata) => write("warn", event, metadata),
  error: (event: string, metadata?: LogMetadata) => write("error", event, metadata),
};

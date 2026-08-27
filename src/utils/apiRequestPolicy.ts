const IMMEDIATE_RESPONSE_PREFIXES = [
  "/v1/gym/programs",
  "/v1/gym/routines",
  "/v1/gym/planned-exercises",
  "/v1/gym/workout-sessions",
] as const;

export const requiresImmediateServerResponse = (url?: string) =>
  url === "/v1/user/me" ||
  IMMEDIATE_RESPONSE_PREFIXES.some(
    (prefix) => url === prefix || url?.startsWith(`${prefix}/`),
  );

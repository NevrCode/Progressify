export type OfflineQueuedResponse = {
  status: "pending";
  offline: true;
  pending_id: string;
};

export const isOfflineQueuedResponse = (
  value: unknown,
): value is OfflineQueuedResponse => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OfflineQueuedResponse>;
  return (
    candidate.status === "pending" &&
    candidate.offline === true &&
    typeof candidate.pending_id === "string"
  );
};

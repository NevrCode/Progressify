import {
  getSyncStatusSnapshot,
  subscribeSyncStatus,
} from "@/services/syncQueueService";
import { useSyncExternalStore } from "react";

export const useSyncStatus = () =>
  useSyncExternalStore(
    subscribeSyncStatus,
    getSyncStatusSnapshot,
    getSyncStatusSnapshot,
  );

import { API_BASE_URL } from "@/constants/apiConfig";
import {
  getAccessToken,
  getAuthUserId,
} from "@/services/authSessionService";
import { refreshAuthSession } from "@/services/tokenRefreshService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import axios, { isAxiosError } from "axios";
import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";
import { AppState } from "react-native";
import { onlineManager, type QueryClient } from "@tanstack/react-query";
import {
  isRetryableSyncFailure,
  syncRetryDelay,
} from "@/utils/syncRetryPolicy";

const databaseNamePromise = Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  API_BASE_URL,
).then((digest) => `progressify-offline-${digest.slice(0, 24)}.db`);
const LEGACY_DATABASE_NAME = "progressify-offline.db";
const LEGACY_DATABASE_CLEANUP_KEY = "@progressify_offline_database_v2_cleanup";
const CACHE_SCHEMA_VERSION = 1;
const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_RETRY_ATTEMPTS = 8;
const MAX_MUTATION_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const LEGACY_KEYS = ["@progressify_sync_queue"];
const LEGACY_CACHE_PREFIX = "@progressify_cache:";

export type MutationStatus = "PENDING" | "SYNCING" | "FAILED" | "CONFLICT";

export type SyncErrorCategory =
  | "Authentication required"
  | "Permission denied"
  | "Target no longer exists"
  | "Conflicting server change"
  | "Validation rejected"
  | "Server unavailable"
  | "Request rejected"
  | "Retry limit or connection failure";

/** Safe, allow-listed conflict data. Response bodies and credentials never leave SQLite. */
export type SyncConflictMetadata = {
  code: string;
  resource: string;
  expectedRevision: number | null;
  currentRevision: number | null;
  currentState: "Authoritative server state changed";
};

export type SyncQueueItem = {
  id: string;
  method: QueuedMutationRow["method"];
  action: string;
  resource: string;
  status: MutationStatus;
  queuedAt: number;
  lastAttemptAt: number | null;
  attemptCount: number;
  errorCategory: SyncErrorCategory | null;
  conflict: SyncConflictMetadata | null;
  blockedByEarlierOperation: boolean;
};

export type FailedSyncItem = {
  id: string;
  method: QueuedMutationRow["method"];
  resource: string;
  queuedAt: number;
  attemptCount: number;
  errorCategory: SyncErrorCategory;
};

export type SyncStatusSnapshot = {
  pending: number;
  failed: number;
  isSyncing: boolean;
  isOnline: boolean;
  lastSuccessfulSyncAt: number | null;
  failedItems: FailedSyncItem[];
  items?: SyncQueueItem[];
};

/**
 * A durable-undo caller can remove only its unsent DELETE. Once replay has
 * started, sending a restore directly could overtake the delete, so callers
 * must show that undo is no longer available instead.
 */
export type CancelPendingDeleteResult =
  | { status: "cancelled" }
  | { status: "already_syncing_or_sent" }
  | { status: "not_found" }
  | { status: "not_pending_delete" };

type QueuedMutationRow = {
  id: string;
  owner_id: string;
  idempotency_key: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  body: string | null;
  status: MutationStatus;
  attempt_count: number;
  next_attempt_at: number;
  created_at: number;
  updated_at: number;
  last_error: string | null;
  last_status: number | null;
  last_attempt_at: number | null;
  error_category: SyncErrorCategory | null;
  conflict_metadata: string | null;
};

type CacheRow = {
  payload: string;
  expires_at: number;
};

type QueueItemSummaryRow = Pick<
  QueuedMutationRow,
  | "id"
  | "method"
  | "url"
  | "status"
  | "attempt_count"
  | "created_at"
  | "last_attempt_at"
  | "last_status"
  | "error_category"
  | "conflict_metadata"
>;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let writeChain: Promise<void> = Promise.resolve();
let processingPromise: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let snapshot: SyncStatusSnapshot = {
  pending: 0,
  failed: 0,
  isSyncing: false,
  isOnline: true,
  lastSuccessfulSyncAt: null,
  failedItems: [],
  items: [],
};
const listeners = new Set<() => void>();
let boundQueryClient: QueryClient | null = null;

const emitSnapshot = (next: Partial<SyncStatusSnapshot>) => {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
};

export const getSyncStatusSnapshot = () => snapshot;

export const subscribeSyncStatus = (listener: () => void) => {
  listeners.add(listener);
  void refreshSyncStatus();
  return () => {
    listeners.delete(listener);
  };
};

/** Binds the app's single QueryClient so successful background replay refreshes visible data. */
export const bindSyncQueueQueryClient = (queryClient: QueryClient) => {
  boundQueryClient = queryClient;
  return () => {
    if (boundQueryClient === queryClient) boundQueryClient = null;
  };
};

const ensureMutationColumn = async (
  database: SQLite.SQLiteDatabase,
  name: string,
  definition: string,
) => {
  const columns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(offline_mutations)",
  );
  if (!columns.some((column) => column.name === name)) {
    await database.execAsync(
      `ALTER TABLE offline_mutations ADD COLUMN ${name} ${definition}`,
    );
  }
};

const getDatabase = () => {
  if (!databasePromise) {
    databasePromise = (async () => {
      const cleaned = await AsyncStorage.getItem(LEGACY_DATABASE_CLEANUP_KEY);
      if (!cleaned) {
        try {
          await SQLite.deleteDatabaseAsync(LEGACY_DATABASE_NAME);
        } catch {
          // The legacy database may not exist on clean installations.
        }
        await AsyncStorage.setItem(LEGACY_DATABASE_CLEANUP_KEY, "1");
      }
      const databaseName = await databaseNamePromise;
      return SQLite.openDatabaseAsync(databaseName);
    })().then(
      async (database) => {
        await database.execAsync(`
          PRAGMA journal_mode = WAL;
          PRAGMA foreign_keys = ON;

          CREATE TABLE IF NOT EXISTS offline_cache (
            owner_id TEXT NOT NULL,
            cache_key TEXT NOT NULL,
            payload TEXT NOT NULL,
            cached_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            schema_version INTEGER NOT NULL,
            PRIMARY KEY (owner_id, cache_key)
          );

          CREATE TABLE IF NOT EXISTS offline_mutations (
            id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            method TEXT NOT NULL,
            url TEXT NOT NULL,
            body TEXT,
            status TEXT NOT NULL,
            attempt_count INTEGER NOT NULL DEFAULT 0,
            next_attempt_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            last_error TEXT,
            last_status INTEGER,
            last_attempt_at INTEGER,
            error_category TEXT,
            conflict_metadata TEXT,
            UNIQUE (owner_id, idempotency_key)
          );

          CREATE TABLE IF NOT EXISTS sync_metadata (
            owner_id TEXT PRIMARY KEY,
            last_success_at INTEGER
          );

          CREATE INDEX IF NOT EXISTS idx_offline_mutations_owner_status_time
          ON offline_mutations (owner_id, status, next_attempt_at, created_at);

          CREATE INDEX IF NOT EXISTS idx_offline_cache_expiry
          ON offline_cache (expires_at);
        `);
        // Additive, device-local migration for databases created before sync details.
        await ensureMutationColumn(database, "last_attempt_at", "INTEGER");
        await ensureMutationColumn(database, "error_category", "TEXT");
        await ensureMutationColumn(database, "conflict_metadata", "TEXT");
        await database.runAsync(
          "UPDATE offline_mutations SET status = 'PENDING' WHERE status = 'SYNCING'",
        );
        await database.runAsync(
          "DELETE FROM offline_cache WHERE expires_at <= ?",
          Date.now(),
        );

        const oldKeys = await AsyncStorage.getAllKeys();
        await AsyncStorage.multiRemove([
          ...LEGACY_KEYS,
          ...oldKeys.filter((key) => key.startsWith(LEGACY_CACHE_PREFIX)),
        ]);
        return database;
      },
    );
  }
  return databasePromise;
};

const serializeWrite = async <T>(operation: () => Promise<T>) => {
  const result = writeChain.then(operation, operation);
  writeChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const getResourceCategory = (url: string) => {
  const path = url.split("?")[0].toLowerCase();
  if (path.startsWith("/v1/gym/")) return "Workout";
  if (path.startsWith("/v1/food-diary")) return "Food diary";
  if (path.startsWith("/v1/custom-foods")) return "Custom food";
  if (path.startsWith("/v1/meal-prep")) return "Meal prep";
  if (path.startsWith("/v1/water")) return "Water intake";
  if (path.startsWith("/v1/account")) return "Financial account";
  if (path.startsWith("/v1/transaction")) return "Transaction";
  if (path.startsWith("/v1/budget")) return "Budget";
  if (path.startsWith("/v1/category")) return "Category";
  if (path.startsWith("/v1/profile")) return "Profile";
  return "Application data";
};

const getActionDescription = (method: QueuedMutationRow["method"]) => {
  if (method === "POST") return "Create";
  if (method === "PUT" || method === "PATCH") return "Update";
  return "Remove";
};

const getErrorCategory = (status: number | null): SyncErrorCategory => {
  if (status === 401) return "Authentication required";
  if (status === 403) return "Permission denied";
  if (status === 404) return "Target no longer exists";
  if (status === 409) return "Conflicting server change";
  if (status === 422) return "Validation rejected";
  if (status != null && status >= 500) return "Server unavailable";
  if (status != null && status >= 400) return "Request rejected";
  return "Retry limit or connection failure";
};

const parseConflictMetadata = (value: string | null): SyncConflictMetadata | null => {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as Partial<SyncConflictMetadata>;
    if (
      typeof candidate.code !== "string" ||
      typeof candidate.resource !== "string" ||
      candidate.currentState !== "Authoritative server state changed"
    ) {
      return null;
    }
    return {
      code: candidate.code,
      resource: candidate.resource,
      expectedRevision:
        typeof candidate.expectedRevision === "number"
          ? candidate.expectedRevision
          : null,
      currentRevision:
        typeof candidate.currentRevision === "number"
          ? candidate.currentRevision
          : null,
      currentState: "Authoritative server state changed",
    };
  } catch {
    return null;
  }
};

const readSyncQueueItems = async (
  database: SQLite.SQLiteDatabase,
  ownerId: string,
) => {
  const rows = await database.getAllAsync<QueueItemSummaryRow>(
    `SELECT id, method, url, status, attempt_count, created_at, last_attempt_at,
            last_status, error_category, conflict_metadata
     FROM offline_mutations
     WHERE owner_id = ?
     ORDER BY created_at ASC`,
    ownerId,
  );
  let blocked = false;
  return rows.map((row): SyncQueueItem => {
    const blocking = blocked;
    if (row.status === "FAILED" || row.status === "CONFLICT") blocked = true;
    return {
      id: row.id,
      method: row.method,
      action: getActionDescription(row.method),
      resource: getResourceCategory(row.url),
      status: row.status,
      queuedAt: row.created_at,
      lastAttemptAt: row.last_attempt_at,
      attemptCount: row.attempt_count,
      errorCategory:
        row.status === "FAILED" || row.status === "CONFLICT"
          ? row.error_category ?? getErrorCategory(row.last_status)
          : null,
      conflict: parseConflictMetadata(row.conflict_metadata),
      blockedByEarlierOperation: blocking,
    };
  });
};

const refreshSyncStatus = async () => {
  const ownerId = await getAuthUserId();
  if (!ownerId) {
    emitSnapshot({
      pending: 0,
      failed: 0,
      isSyncing: false,
      lastSuccessfulSyncAt: null,
      failedItems: [],
      items: [],
    });
    return;
  }

  const database = await getDatabase();
  const counts = await database.getFirstAsync<{
    pending: number;
    failed: number;
  }>(
    `SELECT
       SUM(CASE WHEN status IN ('PENDING', 'SYNCING') THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status IN ('FAILED', 'CONFLICT') THEN 1 ELSE 0 END) AS failed
     FROM offline_mutations
     WHERE owner_id = ?`,
    ownerId,
  );
  const metadata = await database.getFirstAsync<{
    last_success_at: number | null;
  }>(
    "SELECT last_success_at FROM sync_metadata WHERE owner_id = ?",
    ownerId,
  );
  const items = await readSyncQueueItems(database, ownerId);
  const failedItems =
    (counts?.failed ?? 0) > 0
      ? items
          .filter((item) => item.status === "FAILED" || item.status === "CONFLICT")
          .map((item): FailedSyncItem => ({
            id: item.id,
            method: item.method,
            resource: item.resource,
            queuedAt: item.queuedAt,
            attemptCount: item.attemptCount,
            errorCategory: item.errorCategory ?? "Retry limit or connection failure",
          }))
      : [];

  emitSnapshot({
    pending: counts?.pending ?? 0,
    failed: counts?.failed ?? 0,
    lastSuccessfulSyncAt: metadata?.last_success_at ?? null,
    failedItems,
    items,
  });
};

export const cacheResponse = async (
  cacheKey: string,
  data: unknown,
  ttlMs = DEFAULT_CACHE_TTL_MS,
) => {
  const ownerId = await getAuthUserId();
  if (!ownerId) return;

  const now = Date.now();
  const database = await getDatabase();
  await database.runAsync(
    "DELETE FROM offline_cache WHERE expires_at <= ?",
    now,
  );
  await database.runAsync(
    `INSERT INTO offline_cache
       (owner_id, cache_key, payload, cached_at, expires_at, schema_version)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(owner_id, cache_key) DO UPDATE SET
       payload = excluded.payload,
       cached_at = excluded.cached_at,
       expires_at = excluded.expires_at,
       schema_version = excluded.schema_version`,
    ownerId,
    cacheKey,
    JSON.stringify(data),
    now,
    now + ttlMs,
    CACHE_SCHEMA_VERSION,
  );
};

export const getCachedResponse = async (cacheKey: string) => {
  const ownerId = await getAuthUserId();
  if (!ownerId) return null;

  const database = await getDatabase();
  const row = await database.getFirstAsync<CacheRow>(
    `SELECT payload, expires_at
     FROM offline_cache
     WHERE owner_id = ? AND cache_key = ? AND schema_version = ?`,
    ownerId,
    cacheKey,
    CACHE_SCHEMA_VERSION,
  );

  if (!row) return null;
  if (row.expires_at <= Date.now()) {
    await database.runAsync(
      "DELETE FROM offline_cache WHERE owner_id = ? AND cache_key = ?",
      ownerId,
      cacheKey,
    );
    return null;
  }
  return JSON.parse(row.payload) as unknown;
};

export const enqueueMutation = async (
  url: string,
  method: QueuedMutationRow["method"],
  data: unknown,
  idempotencyKey: string,
) => {
  const ownerId = await getAuthUserId();
  if (!ownerId) {
    throw new Error("Cannot queue a mutation without an authenticated owner.");
  }

  const id = Crypto.randomUUID();
  const now = Date.now();
  const body = data == null
    ? null
    : typeof data === "string"
      ? data
      : JSON.stringify(data);

  await serializeWrite(async () => {
    const database = await getDatabase();
    await database.runAsync(
      `INSERT OR IGNORE INTO offline_mutations
        (id, owner_id, idempotency_key, method, url, body, status,
         attempt_count, next_attempt_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, ?, ?)`,
      id,
      ownerId,
      idempotencyKey,
      method,
      url,
      body,
      now,
      now,
      now,
    );
  });

  await refreshSyncStatus();
  scheduleProcessing(1000);
  return id;
};

/**
 * Cancels one owner's still-unsent DELETE without changing any other queue
 * record. This is intentionally narrower than the failure discard controls:
 * it preserves the order and payload of every remaining operation.
 */
export const cancelPendingDeleteMutation = async (
  mutationId: string,
): Promise<CancelPendingDeleteResult> => {
  const ownerId = await getAuthUserId();
  if (!ownerId) return { status: "not_found" };

  const result = await serializeWrite(async () => {
    const database = await getDatabase();
    const existing = await database.getFirstAsync<Pick<QueuedMutationRow, "method" | "status">>(
      "SELECT method, status FROM offline_mutations WHERE owner_id = ? AND id = ?",
      ownerId,
      mutationId,
    );
    if (!existing) return { status: "not_found" } as const;
    if (existing.method !== "DELETE") return { status: "not_pending_delete" } as const;
    if (existing.status !== "PENDING") {
      return { status: "already_syncing_or_sent" } as const;
    }

    const deletion = await database.runAsync(
      `DELETE FROM offline_mutations
       WHERE owner_id = ? AND id = ? AND method = 'DELETE' AND status = 'PENDING'`,
      ownerId,
      mutationId,
    );
    if (deletion.changes > 0) return { status: "cancelled" } as const;

    const current = await database.getFirstAsync<Pick<QueuedMutationRow, "method" | "status">>(
      "SELECT method, status FROM offline_mutations WHERE owner_id = ? AND id = ?",
      ownerId,
      mutationId,
    );
    if (!current) return { status: "not_found" } as const;
    return current.method === "DELETE"
      ? { status: "already_syncing_or_sent" } as const
      : { status: "not_pending_delete" } as const;
  });
  await refreshSyncStatus();
  return result;
};

const parseBody = (body: string | null) => {
  if (body == null) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

const executeQueuedMutation = async (item: QueuedMutationRow) => {
  const execute = async (accessToken: string | null) =>
    axios.request({
      baseURL: API_BASE_URL,
      url: item.url,
      method: item.method,
      data: parseBody(item.body),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": item.idempotency_key,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      timeout: 10000,
    });

  try {
    return await execute(await getAccessToken());
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      const tokens = await refreshAuthSession();
      return execute(tokens.access_token);
    }
    throw error;
  }
};

const extractConflictMetadata = (
  url: string,
  code: unknown,
  details: unknown,
): SyncConflictMetadata => {
  const safeDetails = details && typeof details === "object"
    ? details as Record<string, unknown>
    : {};
  return {
    code: typeof code === "string" ? code : "CONFLICT",
    resource: getResourceCategory(url),
    expectedRevision:
      typeof safeDetails.expected_revision === "number"
        ? safeDetails.expected_revision
        : null,
    currentRevision:
      typeof safeDetails.current_revision === "number"
        ? safeDetails.current_revision
        : null,
    currentState: "Authoritative server state changed",
  };
};

const isSemanticConflict = (status: number | null, code: unknown) =>
  status === 409 &&
  (typeof code !== "string" || code === "CONFLICT" || code.endsWith("_CONFLICT"));

const invalidateReplayQueries = async (url: string) => {
  if (!boundQueryClient) return;
  const path = url.split("?")[0].toLowerCase();
  if (path.startsWith("/v1/gym/")) {
    await boundQueryClient.invalidateQueries({ queryKey: ["gym"] });
    return;
  }
  if (path.startsWith("/v1/food-diary")) {
    await Promise.all([
      boundQueryClient.invalidateQueries({ queryKey: ["food-diary"] }),
      boundQueryClient.invalidateQueries({ queryKey: ["diary-summary"] }),
    ]);
    return;
  }
  if (path.startsWith("/v1/custom-foods")) {
    await boundQueryClient.invalidateQueries({ queryKey: ["custom-foods"] });
    return;
  }
  if (path.startsWith("/v1/meal-prep")) {
    await boundQueryClient.invalidateQueries({ queryKey: ["meal-prep"] });
    return;
  }
  if (path.startsWith("/v1/water")) {
    await boundQueryClient.invalidateQueries({ queryKey: ["water-intake"] });
    return;
  }
  if (path.startsWith("/v1/discovery")) {
    await boundQueryClient.invalidateQueries({ queryKey: ["discovery"] });
    return;
  }
  if (path.startsWith("/v1/profile")) {
    await Promise.all([
      boundQueryClient.invalidateQueries({ queryKey: ["profile"] }),
      boundQueryClient.invalidateQueries({ queryKey: ["nutrition-profile"] }),
      boundQueryClient.invalidateQueries({ queryKey: ["nutrition-goals"] }),
    ]);
    return;
  }
  await boundQueryClient.invalidateQueries({ queryKey: ["profile"] });
};

const scheduleProcessing = (delayMs: number) => {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void processSyncQueue();
  }, delayMs);
};

const runSyncQueue = async () => {
  const ownerId = await getAuthUserId();
  if (!ownerId || !snapshot.isOnline) return;

  const database = await getDatabase();
  emitSnapshot({ isSyncing: true });

  try {
    while (true) {
      const item = await database.getFirstAsync<QueuedMutationRow>(
        `SELECT * FROM offline_mutations
         WHERE owner_id = ? AND status IN ('PENDING', 'FAILED')
         ORDER BY created_at ASC
         LIMIT 1`,
        ownerId,
      );
      if (!item) break;
      if (item.status === "FAILED") break;
      const exhausted = item.attempt_count >= MAX_RETRY_ATTEMPTS;
      const expired = item.created_at + MAX_MUTATION_AGE_MS <= Date.now();
      if (exhausted || expired) {
        await database.runAsync(
          `UPDATE offline_mutations
           SET status = 'FAILED', updated_at = ?, last_error = ?, error_category = ?,
               conflict_metadata = NULL
           WHERE id = ?`,
          Date.now(),
          expired
            ? "Synchronization expired before it could be completed."
            : "Synchronization retry limit reached.",
          "Retry limit or connection failure",
          item.id,
        );
        await refreshSyncStatus();
        break;
      }
      if (item.next_attempt_at > Date.now()) {
        scheduleProcessing(item.next_attempt_at - Date.now());
        break;
      }

      await database.runAsync(
        `UPDATE offline_mutations
         SET status = 'SYNCING', updated_at = ?, last_attempt_at = ?
         WHERE id = ?`,
        Date.now(),
        Date.now(),
        item.id,
      );
      await refreshSyncStatus();

      try {
        await executeQueuedMutation(item);
        const syncedAt = Date.now();
        await database.runAsync(
          `INSERT INTO sync_metadata (owner_id, last_success_at)
           VALUES (?, ?)
           ON CONFLICT(owner_id) DO UPDATE SET
             last_success_at = excluded.last_success_at`,
          ownerId,
          syncedAt,
        );
        await database.runAsync("DELETE FROM offline_mutations WHERE id = ?", item.id);
        await invalidateReplayQueries(item.url);
      } catch (error) {
        const status = isAxiosError(error) ? error.response?.status ?? null : null;
        const code = isAxiosError(error) ? error.response?.data?.code : undefined;
        const message = error instanceof Error ? error.message : "Unknown synchronization error";
        const retryable = isRetryableSyncFailure(status, code);

        if (isSemanticConflict(status, code)) {
          const conflict = extractConflictMetadata(
            item.url,
            code,
            isAxiosError(error) ? error.response?.data?.details : undefined,
          );
          await database.runAsync(
            `UPDATE offline_mutations
             SET status = 'CONFLICT', updated_at = ?, last_error = NULL,
                 last_status = ?, error_category = ?, conflict_metadata = ?
             WHERE id = ?`,
            Date.now(),
            status,
            "Conflicting server change",
            JSON.stringify(conflict),
            item.id,
          );
        } else if (retryable) {
          const attempts = item.attempt_count + 1;
          const delay = syncRetryDelay(attempts);
          await database.runAsync(
            `UPDATE offline_mutations
             SET status = 'PENDING', attempt_count = ?, next_attempt_at = ?,
                 updated_at = ?, last_error = ?, last_status = ?, error_category = ?,
                 conflict_metadata = NULL
             WHERE id = ?`,
            attempts,
            Date.now() + delay,
            Date.now(),
            message,
            status,
            getErrorCategory(status),
            item.id,
          );
          scheduleProcessing(delay);
        } else {
          await database.runAsync(
            `UPDATE offline_mutations
             SET status = 'FAILED', updated_at = ?, last_error = ?, last_status = ?,
                 error_category = ?, conflict_metadata = NULL
             WHERE id = ?`,
            Date.now(),
            message,
            status,
            getErrorCategory(status),
            item.id,
          );
        }

        // Preserve mutation ordering until this item succeeds or is resolved.
        break;
      }

      await refreshSyncStatus();
    }
  } finally {
    emitSnapshot({ isSyncing: false });
    await refreshSyncStatus();
  }
};

export const processSyncQueue = () => {
  if (!processingPromise) {
    processingPromise = runSyncQueue().finally(() => {
      processingPromise = null;
    });
  }
  return processingPromise;
};

export const retryFailedMutations = async () => {
  const ownerId = await getAuthUserId();
  if (!ownerId) return;
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE offline_mutations
     SET status = 'PENDING', attempt_count = 0, next_attempt_at = ?,
         updated_at = ?, last_error = NULL, last_status = NULL,
         error_category = NULL, conflict_metadata = NULL
     WHERE owner_id = ? AND status = 'FAILED'`,
    Date.now(),
    Date.now(),
    ownerId,
  );
  await refreshSyncStatus();
  await processSyncQueue();
};

export const discardFailedMutations = async () => {
  const ownerId = await getAuthUserId();
  if (!ownerId) return;
  const database = await getDatabase();
  await database.runAsync(
    "DELETE FROM offline_mutations WHERE owner_id = ? AND status IN ('FAILED', 'CONFLICT')",
    ownerId,
  );
  await refreshSyncStatus();
};

const assertOldestBlockedMutation = async (
  database: SQLite.SQLiteDatabase,
  ownerId: string,
  mutationId: string,
) => {
  const oldest = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM offline_mutations
     WHERE owner_id = ? AND status IN ('FAILED', 'CONFLICT')
     ORDER BY created_at ASC
     LIMIT 1`,
    ownerId,
  );
  if (!oldest || oldest.id !== mutationId) {
    throw new Error("Resolve the earlier failed change first.");
  }
};

export const retryFailedMutation = async (mutationId: string) => {
  const ownerId = await getAuthUserId();
  if (!ownerId) return;
  const database = await getDatabase();
  await assertOldestBlockedMutation(database, ownerId, mutationId);
  const now = Date.now();
  await database.runAsync(
    `UPDATE offline_mutations
     SET status = 'PENDING', attempt_count = 0, next_attempt_at = ?,
         updated_at = ?, last_error = NULL, last_status = NULL,
         error_category = NULL, conflict_metadata = NULL
     WHERE owner_id = ? AND id = ? AND status = 'FAILED'`,
    now,
    now,
    ownerId,
    mutationId,
  );
  await refreshSyncStatus();
  await processSyncQueue();
};

export const discardFailedMutation = async (mutationId: string) => {
  const ownerId = await getAuthUserId();
  if (!ownerId) return;
  const database = await getDatabase();
  await assertOldestBlockedMutation(database, ownerId, mutationId);
  await database.runAsync(
    `DELETE FROM offline_mutations
     WHERE owner_id = ? AND id = ? AND status IN ('FAILED', 'CONFLICT')`,
    ownerId,
    mutationId,
  );
  await refreshSyncStatus();
  await processSyncQueue();
};

/**
 * Refreshes only server state relevant to a conflict. It intentionally leaves
 * the conflicting request untouched: this queue never merges or rewrites it.
 */
export const reloadConflictAuthoritativeState = async (mutationId: string) => {
  const ownerId = await getAuthUserId();
  if (!ownerId) return;
  const database = await getDatabase();
  await assertOldestBlockedMutation(database, ownerId, mutationId);
  const item = await database.getFirstAsync<Pick<QueuedMutationRow, "url" | "status">>(
    "SELECT url, status FROM offline_mutations WHERE owner_id = ? AND id = ?",
    ownerId,
    mutationId,
  );
  if (!item || item.status !== "CONFLICT") {
    throw new Error("This queued change is not a conflict.");
  }
  await invalidateReplayQueries(item.url);
};

export type FreshConflictMutation = {
  /** The caller supplies freshly reviewed, semantically explicit request data. */
  data: unknown;
  /** Must be newly generated after conflict review; old keys are rejected. */
  idempotencyKey: string;
};

/**
 * Replaces the oldest conflict with an explicitly supplied new semantic
 * mutation. This never patches revisions or bodies on the queue's behalf.
 */
export const retryConflictAsFreshMutation = async (
  mutationId: string,
  replacement: FreshConflictMutation,
) => {
  const ownerId = await getAuthUserId();
  if (!ownerId) return;
  if (!replacement.idempotencyKey.trim()) {
    throw new Error("A new idempotency key is required.");
  }
  const database = await getDatabase();
  await assertOldestBlockedMutation(database, ownerId, mutationId);
  const existing = await database.getFirstAsync<Pick<QueuedMutationRow, "idempotency_key" | "status">>(
    "SELECT idempotency_key, status FROM offline_mutations WHERE owner_id = ? AND id = ?",
    ownerId,
    mutationId,
  );
  if (!existing || existing.status !== "CONFLICT") {
    throw new Error("This queued change is not a conflict.");
  }
  if (existing.idempotency_key === replacement.idempotencyKey) {
    throw new Error("Use a new idempotency key after resolving a conflict.");
  }
  const body = replacement.data == null
    ? null
    : typeof replacement.data === "string"
      ? replacement.data
      : JSON.stringify(replacement.data);
  const now = Date.now();
  await serializeWrite(async () => {
    await database.runAsync(
      `UPDATE offline_mutations
       SET idempotency_key = ?, body = ?, status = 'PENDING', attempt_count = 0,
           next_attempt_at = ?, updated_at = ?, last_error = NULL, last_status = NULL,
           error_category = NULL, conflict_metadata = NULL
       WHERE owner_id = ? AND id = ? AND status = 'CONFLICT'`,
      replacement.idempotencyKey,
      body,
      now,
      now,
      ownerId,
      mutationId,
    );
  });
  await refreshSyncStatus();
  await processSyncQueue();
};

export const clearOfflineDataForUser = async (ownerId: string) => {
  await serializeWrite(async () => {
    const database = await getDatabase();
    await database.withTransactionAsync(async () => {
      await database.runAsync("DELETE FROM offline_cache WHERE owner_id = ?", ownerId);
      await database.runAsync("DELETE FROM offline_mutations WHERE owner_id = ?", ownerId);
      await database.runAsync("DELETE FROM sync_metadata WHERE owner_id = ?", ownerId);
    });
  });
  await refreshSyncStatus();
};

export const startOfflineSyncLifecycle = () => {
  const unsubscribeNetwork = NetInfo.addEventListener((state) => {
    const isOnline = Boolean(
      state.isConnected && state.isInternetReachable !== false,
    );
    onlineManager.setOnline(isOnline);
    emitSnapshot({ isOnline });
    if (isOnline) void processSyncQueue();
  });

  const appStateSubscription = AppState.addEventListener("change", (state) => {
    if (state === "active") void processSyncQueue();
  });

  void getDatabase().then(() => refreshSyncStatus());
  return () => {
    unsubscribeNetwork();
    appStateSubscription.remove();
    if (retryTimer) clearTimeout(retryTimer);
  };
};

/**
 * The only queue surface new callers should need. Storage schema, replay,
 * redaction, retry ordering, and conflict details remain implementation
 * details of this module. Legacy named exports stay for gradual adoption.
 */
export const syncQueue = {
  enqueue: enqueueMutation,
  cancelPendingDelete: cancelPendingDeleteMutation,
  process: processSyncQueue,
  retryFailed: retryFailedMutation,
  retryAllFailed: retryFailedMutations,
  discard: discardFailedMutation,
  discardAllFailed: discardFailedMutations,
  reloadConflict: reloadConflictAuthoritativeState,
  retryConflictAsFreshMutation,
  getSnapshot: getSyncStatusSnapshot,
  subscribe: subscribeSyncStatus,
};

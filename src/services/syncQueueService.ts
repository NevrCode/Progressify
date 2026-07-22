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
import { onlineManager } from "@tanstack/react-query";
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

export type MutationStatus = "PENDING" | "SYNCING" | "FAILED";

export type SyncStatusSnapshot = {
  pending: number;
  failed: number;
  isSyncing: boolean;
  isOnline: boolean;
};

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
};

type CacheRow = {
  payload: string;
  expires_at: number;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let writeChain: Promise<void> = Promise.resolve();
let processingPromise: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let snapshot: SyncStatusSnapshot = {
  pending: 0,
  failed: 0,
  isSyncing: false,
  isOnline: true,
};
const listeners = new Set<() => void>();

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
            UNIQUE (owner_id, idempotency_key)
          );

          CREATE INDEX IF NOT EXISTS idx_offline_mutations_owner_status_time
          ON offline_mutations (owner_id, status, next_attempt_at, created_at);

          CREATE INDEX IF NOT EXISTS idx_offline_cache_expiry
          ON offline_cache (expires_at);
        `);
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

const refreshSyncStatus = async () => {
  const ownerId = await getAuthUserId();
  if (!ownerId) {
    emitSnapshot({ pending: 0, failed: 0, isSyncing: false });
    return;
  }

  const database = await getDatabase();
  const counts = await database.getFirstAsync<{
    pending: number;
    failed: number;
  }>(
    `SELECT
       SUM(CASE WHEN status IN ('PENDING', 'SYNCING') THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed
     FROM offline_mutations
     WHERE owner_id = ?`,
    ownerId,
  );

  emitSnapshot({
    pending: counts?.pending ?? 0,
    failed: counts?.failed ?? 0,
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
           SET status = 'FAILED', updated_at = ?, last_error = ?
           WHERE id = ?`,
          Date.now(),
          expired
            ? "Synchronization expired before it could be completed."
            : "Synchronization retry limit reached.",
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
        "UPDATE offline_mutations SET status = 'SYNCING', updated_at = ? WHERE id = ?",
        Date.now(),
        item.id,
      );
      await refreshSyncStatus();

      try {
        await executeQueuedMutation(item);
        await database.runAsync("DELETE FROM offline_mutations WHERE id = ?", item.id);
      } catch (error) {
        const status = isAxiosError(error) ? error.response?.status ?? null : null;
        const code = isAxiosError(error) ? error.response?.data?.code : undefined;
        const message = error instanceof Error ? error.message : "Unknown synchronization error";
        const retryable = isRetryableSyncFailure(status, code);

        if (retryable) {
          const attempts = item.attempt_count + 1;
          const delay = syncRetryDelay(attempts);
          await database.runAsync(
            `UPDATE offline_mutations
             SET status = 'PENDING', attempt_count = ?, next_attempt_at = ?,
                 updated_at = ?, last_error = ?, last_status = ?
             WHERE id = ?`,
            attempts,
            Date.now() + delay,
            Date.now(),
            message,
            status,
            item.id,
          );
          scheduleProcessing(delay);
        } else {
          await database.runAsync(
            `UPDATE offline_mutations
             SET status = 'FAILED', updated_at = ?, last_error = ?, last_status = ?
             WHERE id = ?`,
            Date.now(),
            message,
            status,
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
         created_at = ?, updated_at = ?, last_error = NULL, last_status = NULL
     WHERE owner_id = ? AND status = 'FAILED'`,
    Date.now(),
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
    "DELETE FROM offline_mutations WHERE owner_id = ? AND status = 'FAILED'",
    ownerId,
  );
  await refreshSyncStatus();
};

export const clearOfflineDataForUser = async (ownerId: string) => {
  await serializeWrite(async () => {
    const database = await getDatabase();
    await database.withTransactionAsync(async () => {
      await database.runAsync("DELETE FROM offline_cache WHERE owner_id = ?", ownerId);
      await database.runAsync("DELETE FROM offline_mutations WHERE owner_id = ?", ownerId);
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

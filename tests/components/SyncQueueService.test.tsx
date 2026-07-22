/// <reference types="jest" />

import {
  enqueueMutation,
  getSyncStatusSnapshot,
  processSyncQueue,
} from "@/services/syncQueueService";

type Row = {
  id: string;
  owner_id: string;
  idempotency_key: string;
  method: string;
  url: string;
  body: string | null;
  status: "PENDING" | "SYNCING" | "FAILED";
  attempt_count: number;
  next_attempt_at: number;
  created_at: number;
  updated_at: number;
  last_error: string | null;
  last_status: number | null;
};

const mockRows: Row[] = [];
let mockOwnerId = "owner-a";
let mockUuid = 0;

const mockDatabase = {
  execAsync: jest.fn(async () => undefined),
  getFirstAsync: jest.fn(async (sql: string, ...args: unknown[]) => {
    if (sql.includes("SUM(CASE")) {
      const owner = args[0];
      const owned = mockRows.filter((row) => row.owner_id === owner);
      return {
        pending: owned.filter((row) => row.status === "PENDING" || row.status === "SYNCING").length,
        failed: owned.filter((row) => row.status === "FAILED").length,
      };
    }
    if (sql.includes("SELECT * FROM offline_mutations")) {
      const owner = args[0];
      return mockRows
        .filter((row) => row.owner_id === owner && (row.status === "PENDING" || row.status === "FAILED"))
        .sort((left, right) => left.created_at - right.created_at)[0] ?? null;
    }
    return null;
  }),
  runAsync: jest.fn(async (sql: string, ...args: unknown[]) => {
    if (sql.includes("INSERT OR IGNORE INTO offline_mutations")) {
      const [id, owner, key, method, url, body, nextAttempt, created, updated] = args;
      if (!mockRows.some((row) => row.owner_id === owner && row.idempotency_key === key)) {
        mockRows.push({
          id: String(id), owner_id: String(owner), idempotency_key: String(key),
          method: String(method), url: String(url), body: body == null ? null : String(body),
          status: "PENDING", attempt_count: 0, next_attempt_at: Number(nextAttempt),
          created_at: Number(created), updated_at: Number(updated), last_error: null, last_status: null,
        });
      }
    } else if (sql.includes("SET status = 'SYNCING'")) {
      const row = mockRows.find((item) => item.id === args[1]);
      if (row) row.status = "SYNCING";
    } else if (sql.includes("DELETE FROM offline_mutations WHERE id")) {
      const index = mockRows.findIndex((item) => item.id === args[0]);
      if (index >= 0) mockRows.splice(index, 1);
    } else if (sql.includes("SET status = 'FAILED'")) {
      const row = mockRows.find((item) => item.id === args.at(-1));
      if (row) {
        row.status = "FAILED";
        row.last_error = String(args[1]);
        row.last_status = typeof args[2] === "number" ? args[2] : null;
      }
    } else if (sql.includes("SET status = 'PENDING', attempt_count = ?")) {
      const row = mockRows.find((item) => item.id === args[5]);
      if (row) {
        row.status = "PENDING";
        row.attempt_count = Number(args[0]);
        row.next_attempt_at = Number(args[1]);
      }
    }
    return { changes: 1 };
  }),
  withTransactionAsync: jest.fn(async (operation: () => Promise<void>) => operation()),
};

const mockRequest = jest.fn();

jest.mock("@/constants/apiConfig", () => ({ API_BASE_URL: "https://e2e.invalid" }));
jest.mock("@/services/authSessionService", () => ({
  getAccessToken: jest.fn(async () => "access-token"),
  getAuthUserId: jest.fn(async () => mockOwnerId),
}));
jest.mock("@/services/tokenRefreshService", () => ({
  refreshAuthSession: jest.fn(async () => ({ access_token: "refreshed-token" })),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getAllKeys: jest.fn(async () => []), getItem: jest.fn(async () => "1"),
  multiRemove: jest.fn(async () => undefined), setItem: jest.fn(async () => undefined),
}));
jest.mock("@react-native-community/netinfo", () => ({ addEventListener: jest.fn(() => jest.fn()) }));
jest.mock("@tanstack/react-query", () => ({ onlineManager: { setOnline: jest.fn() } }));
jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA256" },
  digestStringAsync: jest.fn(async () => "a".repeat(64)),
  randomUUID: jest.fn(() => `mutation-${++mockUuid}`),
}));
jest.mock("expo-sqlite", () => ({
  deleteDatabaseAsync: jest.fn(async () => undefined),
  openDatabaseAsync: jest.fn(async () => mockDatabase),
}));
jest.mock("axios", () => ({
  __esModule: true,
  default: { request: (...args: unknown[]) => mockRequest(...args) },
  isAxiosError: (error: { isAxiosError?: boolean }) => Boolean(error?.isAxiosError),
}));

describe("offline synchronization queue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRows.splice(0);
    mockOwnerId = "owner-a";
    mockUuid = 0;
    mockRequest.mockReset().mockResolvedValue({ status: 200 });
  });

  afterEach(() => jest.useRealTimers());

  it("deduplicates an owner's idempotency key and replays it unchanged", async () => {
    await enqueueMutation("/v1/gym/session", "POST", { reps: 8 }, "stable-key");
    await enqueueMutation("/v1/gym/session", "POST", { reps: 10 }, "stable-key");
    expect(mockRows).toHaveLength(1);

    await processSyncQueue();
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest.mock.calls[0][0].headers["Idempotency-Key"]).toBe("stable-key");
  });

  it("preserves creation order while replaying queued mutations", async () => {
    jest.setSystemTime(new Date("2026-07-22T00:00:00Z"));
    await enqueueMutation("/first", "POST", { order: 1 }, "first-key");
    jest.setSystemTime(new Date("2026-07-22T00:00:01Z"));
    await enqueueMutation("/second", "PATCH", { order: 2 }, "second-key");

    await processSyncQueue();
    expect(mockRequest.mock.calls.map(([request]) => request.url)).toEqual(["/first", "/second"]);
  });

  it("replays only the authenticated owner's mutations", async () => {
    await enqueueMutation("/owner-a", "POST", null, "shared-key");
    mockOwnerId = "owner-b";
    await enqueueMutation("/owner-b", "POST", null, "shared-key");

    await processSyncQueue();
    expect(mockRequest.mock.calls.map(([request]) => request.url)).toEqual(["/owner-b"]);
    expect(mockRows.map((row) => row.owner_id)).toEqual(["owner-a"]);

    mockOwnerId = "owner-a";
    await processSyncQueue();
    expect(mockRequest.mock.calls.map(([request]) => request.url)).toEqual(["/owner-b", "/owner-a"]);
  });

  it("retains a non-retryable failure for explicit user action", async () => {
    mockRequest.mockRejectedValue({
      isAxiosError: true,
      message: "Validation failed",
      response: { status: 422, data: { code: "VALIDATION_ERROR" } },
    });
    await enqueueMutation("/invalid", "POST", {}, "invalid-key");
    await processSyncQueue();

    expect(mockRows[0].status).toBe("FAILED");
    expect(getSyncStatusSnapshot()).toMatchObject({ pending: 0, failed: 1 });
  });
});

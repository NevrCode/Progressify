import {
  persistHomeQueryCache,
  restoreHomeQueryCache,
} from "@/services/home-query-cache";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("@/services/userScopedStorage", () => ({
  getUserScopedKey: jest.fn(async () =>
    "@progressify_home_query_cache:owner-1"
  ),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("home query persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("restores successful home queries without persisting unrelated data", async () => {
    const source = new QueryClient();
    source.setQueryData(["profile"], { name: "Kevin" });
    source.setQueryData(["diary-summary", "2026-07-22"], { status: "ON_TRACK" });
    source.setQueryData(["gym", "programs"], [{ id: 1, status: "ACTIVE" }]);
    source.setQueryData(["foodDiary", "home-history", 100], {
      data: [{ id: 9, date: "2026-07-22" }],
    });
    source.setQueryData(["accounts"], [{ id: 1 }]);

    await persistHomeQueryCache(source);

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const serialized = storage.setItem.mock.calls[0][1];
    expect(serialized).toContain("diary-summary");
    expect(serialized).toContain("programs");
    expect(serialized).toContain("home-history");
    expect(serialized).not.toContain("accounts");

    storage.getItem.mockResolvedValue(serialized);
    const restored = new QueryClient();
    await restoreHomeQueryCache(restored);

    expect(restored.getQueryData(["profile"])).toEqual({ name: "Kevin" });
    expect(restored.getQueryData(["diary-summary", "2026-07-22"])).toEqual({
      status: "ON_TRACK",
    });
    expect(restored.getQueryData(["accounts"])).toBeUndefined();
    expect(restored.getQueryData(["gym", "programs"])).toEqual([
      { id: 1, status: "ACTIVE" },
    ]);
    expect(
      restored.getQueryData(["foodDiary", "home-history", 100]),
    ).toEqual({
      data: [{ id: 9, date: "2026-07-22" }],
    });

    source.clear();
    restored.clear();
  });
});

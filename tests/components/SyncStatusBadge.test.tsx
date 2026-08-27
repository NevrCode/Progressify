/// <reference types="jest" />

import { fireEvent, render } from "@testing-library/react-native";

import { SyncStatusBadge } from "@/components/base/SyncStatusBadge";
import { useAlert } from "@/context/AlertContext";
import { useSyncStatus } from "@/hooks/useSyncStatus";

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({ theme: { expense: "#ef4444", primary: "#208aef" } }),
}));
jest.mock("@/context/AlertContext", () => ({ useAlert: jest.fn() }));
jest.mock("@/hooks/useSyncStatus", () => ({ useSyncStatus: jest.fn() }));
jest.mock("@/services/syncQueueService", () => ({
  discardFailedMutations: jest.fn(),
  retryFailedMutations: jest.fn(),
}));
jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const mockUseAlert = jest.mocked(useAlert);
const mockUseSyncStatus = jest.mocked(useSyncStatus);

describe("SyncStatusBadge", () => {
  const alert = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAlert.mockReturnValue({ alert } as ReturnType<typeof useAlert>);
  });

  it("renders nothing when online data is synchronized", async () => {
    mockUseSyncStatus.mockReturnValue({ pending: 0, failed: 0, isSyncing: false, isOnline: true, lastSuccessfulSyncAt: null, failedItems: [] });
    expect((await render(<SyncStatusBadge />)).toJSON()).toBeNull();
  });

  it("communicates queued changes while offline", async () => {
    mockUseSyncStatus.mockReturnValue({ pending: 3, failed: 0, isSyncing: false, isOnline: false, lastSuccessfulSyncAt: null, failedItems: [] });
    const screen = await render(<SyncStatusBadge />);
    expect(screen.getByLabelText("3 pending offline")).toBeTruthy();
  });

  it("communicates active synchronization", async () => {
    mockUseSyncStatus.mockReturnValue({ pending: 2, failed: 0, isSyncing: true, isOnline: true, lastSuccessfulSyncAt: null, failedItems: [] });
    const screen = await render(<SyncStatusBadge />);
    expect(screen.getByLabelText("Syncing 2")).toBeTruthy();
  });

  it("requires an explicit retry or discard decision for failed changes", async () => {
    mockUseSyncStatus.mockReturnValue({ pending: 1, failed: 2, isSyncing: false, isOnline: true, lastSuccessfulSyncAt: null, failedItems: [] });
    const screen = await render(<SyncStatusBadge />);
    fireEvent.press(screen.getByRole("button", { name: "2 failed - retry" }));
    expect(alert).toHaveBeenCalledWith(
      "Synchronization failed",
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: "Discard", style: "destructive" }),
        expect.objectContaining({ text: "Retry" }),
      ]),
    );
  });
});

/// <reference types="jest" />

import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { SyncStatusPanel } from "@/components/profile/sync-status-panel";
import { useAlert } from "@/context/AlertContext";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import {
  discardFailedMutation,
  processSyncQueue,
  retryFailedMutation,
  retryFailedMutations,
} from "@/services/syncQueueService";

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#00E676",
      secondary: "#00C853",
      tertiary: "#1B5E20",
      background: "#0A0A0A",
      card: "#161616",
      border: "#1E1E1E",
      text: "#E0E0E0",
      textBlack: "#FAFAFA",
      textLight: "#929292",
      white: "#FFFFFF",
      shadow: "#000000",
      expense: "#FF5252",
      income: "#69F0AE",
      bar: "#00E676",
    },
  }),
}));
jest.mock("@/context/AlertContext", () => ({ useAlert: jest.fn() }));
jest.mock("@/hooks/useSyncStatus", () => ({ useSyncStatus: jest.fn() }));
jest.mock("@/services/syncQueueService", () => ({
  discardFailedMutation: jest.fn(async () => undefined),
  discardFailedMutations: jest.fn(async () => undefined),
  processSyncQueue: jest.fn(async () => undefined),
  retryFailedMutation: jest.fn(async () => undefined),
  retryFailedMutations: jest.fn(async () => undefined),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const mockUseAlert = jest.mocked(useAlert);
const mockUseSyncStatus = jest.mocked(useSyncStatus);
const mockProcessSyncQueue = jest.mocked(processSyncQueue);
const mockRetryFailedMutation = jest.mocked(retryFailedMutation);
const mockRetryFailedMutations = jest.mocked(retryFailedMutations);

describe("SyncStatusPanel", () => {
  const alert = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAlert.mockReturnValue({ alert } as ReturnType<typeof useAlert>);
  });

  it("shows a clear synchronized state without unnecessary actions", async () => {
    mockUseSyncStatus.mockReturnValue({
      pending: 0,
      failed: 0,
      isSyncing: false,
      isOnline: true,
      lastSuccessfulSyncAt: null,
      failedItems: [],
    });
    const screen = await render(<SyncStatusPanel />);

    expect(
      screen.getByRole("header", { name: "Data synchronization" }),
    ).toBeTruthy();
    expect(screen.getAllByText("Synchronized").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "No queued change has synchronized on this device yet.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sync now" })).toBeNull();
  });

  it("explains offline pending data and disables upload attempts", async () => {
    mockUseSyncStatus.mockReturnValue({
      pending: 3,
      failed: 0,
      isSyncing: false,
      isOnline: false,
      lastSuccessfulSyncAt: null,
      failedItems: [],
    });
    const screen = await render(<SyncStatusPanel />);

    expect(screen.getByText("Offline")).toBeTruthy();
    expect(screen.getByLabelText("3 pending changes")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Sync now" }).props
        .accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(screen.getByText("Stored in the owner-scoped device queue before upload.")).toBeTruthy();
  });

  it("retries all failed changes and confirms destructive discard", async () => {
    mockUseSyncStatus.mockReturnValue({
      pending: 1,
      failed: 2,
      isSyncing: false,
      isOnline: true,
      lastSuccessfulSyncAt: Date.UTC(2026, 6, 24, 10, 30),
      failedItems: [],
    });
    const screen = await render(<SyncStatusPanel />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Retry all" }),
    );
    await waitFor(() =>
      expect(mockRetryFailedMutations).toHaveBeenCalledTimes(1),
    );
    expect(mockProcessSyncQueue).not.toHaveBeenCalled();

    await fireEvent.press(
      screen.getByRole("button", { name: "Discard failed" }),
    );
    expect(alert).toHaveBeenCalledWith(
      "Discard failed changes?",
      expect.stringContaining("cannot be recovered"),
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancel", style: "cancel" }),
        expect.objectContaining({ text: "Discard", style: "destructive" }),
      ]),
    );
  });

  it("shows redacted failed items and only enables the oldest item", async () => {
    mockUseSyncStatus.mockReturnValue({
      pending: 0,
      failed: 2,
      isSyncing: false,
      isOnline: true,
      lastSuccessfulSyncAt: null,
      failedItems: [
        {
          id: "internal-first-id",
          method: "POST",
          resource: "Food diary",
          queuedAt: Date.UTC(2026, 6, 24, 10),
          attemptCount: 2,
          errorCategory: "Validation rejected",
        },
        {
          id: "internal-second-id",
          method: "DELETE",
          resource: "Workout",
          queuedAt: Date.UTC(2026, 6, 24, 11),
          attemptCount: 1,
          errorCategory: "Conflicting server change",
        },
      ],
    });
    const screen = await render(<SyncStatusPanel />);

    expect(screen.getByText("POST · Food diary")).toBeTruthy();
    expect(screen.getByText("DELETE · Workout")).toBeTruthy();
    expect(screen.getByText("Validation rejected")).toBeTruthy();
    expect(
      screen.getByText(/Resolve the earlier failed change first/),
    ).toBeTruthy();
    expect(screen.queryByText("internal-first-id")).toBeNull();

    await fireEvent.press(
      screen.getByRole("button", { name: "Retry this" }),
    );
    await waitFor(() =>
      expect(mockRetryFailedMutation).toHaveBeenCalledWith(
        "internal-first-id",
      ),
    );
    expect(screen.getAllByRole("button", { name: "Retry this" })).toHaveLength(
      1,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Discard this" }),
    );
    expect(alert).toHaveBeenCalledWith(
      "Discard failed food diary change?",
      expect.stringContaining("only this failed local change"),
      expect.arrayContaining([
        expect.objectContaining({ text: "Discard", style: "destructive" }),
      ]),
    );
    expect(discardFailedMutation).not.toHaveBeenCalled();
  });
});

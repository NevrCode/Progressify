/// <reference types="jest" />

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import ForgotPasswordScreen from "@/app/(auth)/forgot-password";
import ResetPasswordScreen from "@/app/(auth)/reset-password";
import DeleteAccountScreen from "@/app/(pages)/delete-account";
import { useAlert } from "@/context/AlertContext";
import {
  deleteMyAccount,
  requestPasswordReset,
} from "@/services/authService";

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();
const mockClear = jest.fn();
let mockResetToken: string | undefined = "reset-token";

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      background: "#fff",
      border: "#ddd",
      card: "#fff",
      expense: "#d00",
      primary: "#08f",
      text: "#111",
      textBlack: "#000",
      textLight: "#666",
    },
  }),
}));
jest.mock("@/context/AlertContext", () => ({ useAlert: jest.fn() }));
jest.mock("@/services/authService", () => ({
  confirmPasswordReset: jest.fn(),
  deleteMyAccount: jest.fn(),
  requestPasswordReset: jest.fn(),
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ token: mockResetToken }),
  useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace }),
}));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ clear: mockClear }),
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseAlert = jest.mocked(useAlert);
const mockRequestPasswordReset = jest.mocked(requestPasswordReset);
const mockDeleteMyAccount = jest.mocked(deleteMyAccount);

describe("account recovery and deletion states", () => {
  const alert = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockResetToken = "reset-token";
    mockUseAlert.mockReturnValue({ alert } as ReturnType<typeof useAlert>);
  });

  it("shows password-reset loading and the privacy-preserving success state", async () => {
    let resolveRequest!: () => void;
    mockRequestPasswordReset.mockReturnValue(
      new Promise<void>((resolve) => { resolveRequest = resolve; }),
    );
    const screen = await render(<ForgotPasswordScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText("Email address"), " USER@example.com ");
    const submitPromise = fireEvent.press(screen.getByText("Send reset link"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Email address").props.editable).toBe(false);
    });
    expect(mockRequestPasswordReset).toHaveBeenCalledWith("user@example.com");

    await act(async () => {
      resolveRequest();
      await submitPromise;
    });
    await waitFor(() => {
      expect(screen.getByText(/If an account exists/)).toBeTruthy();
    });
  });

  it("reports a reset request error without replacing the form", async () => {
    mockRequestPasswordReset.mockRejectedValue(new Error("Network unavailable"));
    const screen = await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText("Email address"), "user@example.com");
    await fireEvent.press(screen.getByText("Send reset link"));

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith("Request failed", "Network unavailable");
    });
    expect(screen.getByPlaceholderText("Email address")).toBeTruthy();
  });

  it("rejects an incomplete reset link and mismatched passwords", async () => {
    mockResetToken = undefined;
    const missingToken = await render(<ResetPasswordScreen />);
    expect(
      missingToken.getByRole("button", { name: "Change password" }).props
        .accessibilityState.disabled,
    ).toBe(true);
    await missingToken.unmount();

    mockResetToken = "reset-token";
    const screen = await render(<ResetPasswordScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText("New password"), "new-password");
    await fireEvent.changeText(screen.getByPlaceholderText("Confirm new password"), "different-password");
    await fireEvent.press(screen.getByText("Change password"));
    expect(alert).toHaveBeenCalledWith(
      "Passwords do not match",
      "Enter the same password in both fields.",
    );
  });

  it("confirms deletion before calling the destructive operation", async () => {
    mockDeleteMyAccount.mockResolvedValue(undefined);
    const screen = await render(<DeleteAccountScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "current-password");
    await fireEvent.changeText(screen.getByPlaceholderText("DELETE"), "DELETE");
    await fireEvent.press(screen.getByText("Delete permanently"));

    expect(mockDeleteMyAccount).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2];
    expect(buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: "Cancel", style: "cancel" }),
      expect.objectContaining({ text: "Delete permanently", style: "destructive" }),
    ]));
    await act(async () => {
      await buttons.find((button: { text: string }) => button.text === "Delete permanently").onPress();
    });

    await waitFor(() => {
      expect(mockDeleteMyAccount).toHaveBeenCalledWith("current-password", "DELETE");
      expect(mockClear).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("keeps the deletion screen available after an API failure", async () => {
    mockDeleteMyAccount.mockRejectedValue(new Error("Password is incorrect"));
    const screen = await render(<DeleteAccountScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "wrong-password");
    await fireEvent.changeText(screen.getByPlaceholderText("DELETE"), "DELETE");
    await fireEvent.press(screen.getByText("Delete permanently"));
    await act(async () => {
      await alert.mock.calls[0][2][1].onPress();
    });

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith("Deletion failed", "Password is incorrect");
    });
    expect(screen.getByText("Delete account")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

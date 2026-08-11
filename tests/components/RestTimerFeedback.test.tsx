import { fireEvent, render, waitFor } from "@testing-library/react-native";

import RestTimerFeedbackSettings from "@/app/(pages)/restTimerFeedback";
import {
  DEFAULT_REST_TIMER_FEEDBACK_PREFERENCE,
  createRestTimerCompletionFeedback,
  loadRestTimerFeedbackPreference,
  saveRestTimerFeedbackPreference,
} from "@/features/workout-session/rest-timer-feedback";

const mockAlert = jest.fn();
const mockLoad = jest.mocked(loadRestTimerFeedbackPreference);
const mockSave = jest.mocked(saveRestTimerFeedbackPreference);

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      background: "#101010",
      card: "#1d1d1d",
      border: "#333333",
      textBlack: "#ffffff",
      textLight: "#aaaaaa",
      white: "#ffffff",
      primary: "#00E676",
    },
  }),
}));

jest.mock("@/context/AlertContext", () => ({ useAlert: () => ({ alert: mockAlert }) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock("@expo/vector-icons", () => ({ MaterialIcons: "MaterialIcons" }));
jest.mock("@/services/userScopedStorage", () => ({ getUserScopedKey: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));
jest.mock("@/features/workout-session/rest-timer-feedback", () => {
  const actual = jest.requireActual("@/features/workout-session/rest-timer-feedback");
  return {
    ...actual,
    loadRestTimerFeedbackPreference: jest.fn(),
    saveRestTimerFeedbackPreference: jest.fn(),
  };
});

describe("rest timer feedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoad.mockResolvedValue(DEFAULT_REST_TIMER_FEEDBACK_PREFERENCE);
    mockSave.mockResolvedValue(undefined);
  });

  it("only vibrates for a current foreground completion when the user enabled it", async () => {
    const vibrate = jest.fn();
    const feedback = createRestTimerCompletionFeedback(
      { load: async () => ({ vibrationEnabled: true }) },
      { isSupported: () => true, vibrate },
    );

    await feedback.notifyForegroundCompletion({ isCurrent: () => true });
    await feedback.notifyForegroundCompletion({ isCurrent: () => false });
    await createRestTimerCompletionFeedback(
      { load: async () => ({ vibrationEnabled: false }) },
      { isSupported: () => true, vibrate },
    ).notifyForegroundCompletion({ isCurrent: () => true });
    await createRestTimerCompletionFeedback(
      { load: async () => ({ vibrationEnabled: true }) },
      { isSupported: () => false, vibrate },
    ).notifyForegroundCompletion({ isCurrent: () => true });

    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith([0, 500, 200, 500]);
  });

  it("renders accessible vibration settings and persists a change", async () => {
    const screen = await render(<RestTimerFeedbackSettings />);
    const vibrationToggle = screen.getByRole("switch", { name: "Vibration feedback" });

    await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(1));
    await fireEvent(vibrationToggle, "valueChange", false);

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({ vibrationEnabled: false });
    });
    expect(screen.getByText("Audio feedback")).toBeTruthy();
    expect(screen.getByText(/not available in this build/i)).toBeTruthy();
  });
});

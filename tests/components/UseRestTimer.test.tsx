import { act, renderHook } from "@testing-library/react-native";
import { useRestTimer } from "@/features/workout-session/use-rest-timer";
import { restTimerCompletionFeedback } from "@/features/workout-session/rest-timer-feedback";
import { AppState } from "react-native";

jest.mock("@/features/workout-session/rest-timer-feedback", () => ({
  restTimerCompletionFeedback: { notifyForegroundCompletion: jest.fn() },
}));

const mockNotifyForegroundCompletion = jest.mocked(
  restTimerCompletionFeedback.notifyForegroundCompletion,
);

describe("useRestTimer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(AppState, "currentState", { configurable: true, value: "active" });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("starts, pauses, and exposes a persistable snapshot", async () => {
    const { result } = await renderHook(() => useRestTimer());
    await act(() => result.current.start(75));
    expect(result.current.active).toBe(true);
    expect(result.current.remainingSeconds).toBe(75);

    await act(() => result.current.togglePause());
    expect(result.current.paused).toBe(true);
    expect(result.current.snapshot()).toMatchObject({
      paused: true,
      initialDuration: 75,
      remainingSeconds: 75,
    });
  });

  it("restores a paused timer without creating a new deadline", async () => {
    const { result } = await renderHook(() => useRestTimer());
    await act(() => result.current.restore({
      paused: true,
      initialDuration: 60,
      remainingSeconds: 22,
    }));
    expect(result.current).toMatchObject({
      active: true,
      paused: true,
      initialDuration: 60,
      remainingSeconds: 22,
    });
    expect(result.current.snapshot()).toMatchObject({ paused: true, remainingSeconds: 22 });
  });

  it("sends one feedback request when an active foreground timer completes", async () => {
    const { result } = await renderHook(() => useRestTimer());
    await act(() => result.current.start(1));

    await act(() => jest.advanceTimersByTime(1_250));
    expect(mockNotifyForegroundCompletion).toHaveBeenCalledTimes(1);

    await act(() => jest.advanceTimersByTime(1_000));
    expect(mockNotifyForegroundCompletion).toHaveBeenCalledTimes(1);
  });

  it("does not request feedback for a dismissed or already elapsed restored timer", async () => {
    const { result } = await renderHook(() => useRestTimer());
    await act(() => result.current.start(1));
    await act(() => result.current.dismiss());
    await act(() => jest.advanceTimersByTime(1_250));

    await act(() => result.current.restore({
      paused: false,
      initialDuration: 60,
      endsAt: new Date(Date.now() - 1).toISOString(),
    }));
    await act(() => jest.advanceTimersByTime(1_000));

    expect(mockNotifyForegroundCompletion).not.toHaveBeenCalled();
  });
});

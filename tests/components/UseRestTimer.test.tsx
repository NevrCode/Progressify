import { act, renderHook } from "@testing-library/react-native";
import { useRestTimer } from "@/features/workout-session/use-rest-timer";

describe("useRestTimer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

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
});

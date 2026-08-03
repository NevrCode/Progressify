import {
  createRestTimerSnapshot,
  DEFAULT_REST_SECONDS,
  MAX_REST_SECONDS,
  restoreRestTimerSnapshot,
  type RestTimerSnapshot,
} from "@/features/workout-session/drafts";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Vibration } from "react-native";

export type RestTimer = {
  active: boolean;
  paused: boolean;
  remainingSeconds: number;
  initialDuration: number;
  start: (seconds: number) => void;
  adjust: (seconds: number) => void;
  togglePause: () => void;
  restart: () => void;
  dismiss: () => void;
  restore: (snapshot: RestTimerSnapshot | null | undefined) => void;
  snapshot: () => RestTimerSnapshot | undefined;
};

const now = () => Date.now();

export function useRestTimer(): RestTimer {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [initialDuration, setInitialDuration] = useState(DEFAULT_REST_SECONDS);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(false);
  const endsAtRef = useRef<number | null>(null);
  const feedbackSentRef = useRef(false);
  const stateRef = useRef({ active, paused, remainingSeconds, initialDuration });
  useEffect(() => {
    stateRef.current = { active, paused, remainingSeconds, initialDuration };
  }, [active, paused, remainingSeconds, initialDuration]);

  const dismiss = useCallback(() => {
    endsAtRef.current = null;
    feedbackSentRef.current = false;
    setRemainingSeconds(0);
    setPaused(false);
    setActive(false);
  }, []);

  const start = useCallback((seconds: number) => {
    const duration =
      Number.isInteger(seconds) && seconds >= 0 && seconds <= MAX_REST_SECONDS
        ? seconds
        : DEFAULT_REST_SECONDS;
    if (duration === 0) {
      dismiss();
      return;
    }
    endsAtRef.current = now() + duration * 1000;
    feedbackSentRef.current = false;
    setRemainingSeconds(duration);
    setInitialDuration(duration);
    setPaused(false);
    setActive(true);
  }, [dismiss]);

  const adjust = useCallback((seconds: number) => {
    setRemainingSeconds((current) => {
      const next = Math.max(0, current + seconds);
      const state = stateRef.current;
      if (state.active && !state.paused) {
        endsAtRef.current = next > 0 ? now() + next * 1000 : null;
      }
      return next;
    });
  }, []);

  const togglePause = useCallback(() => {
    const state = stateRef.current;
    if (!state.active || state.remainingSeconds <= 0) return;
    if (state.paused) {
      endsAtRef.current = now() + state.remainingSeconds * 1000;
      setPaused(false);
      return;
    }
    endsAtRef.current = null;
    setPaused(true);
  }, []);

  const restart = useCallback(() => start(stateRef.current.initialDuration), [start]);

  const restore = useCallback((snapshot: RestTimerSnapshot | null | undefined) => {
    const restored = restoreRestTimerSnapshot(snapshot ?? undefined);
    endsAtRef.current = restored?.endsAt ?? null;
    feedbackSentRef.current = false;
    setRemainingSeconds(restored?.remainingSeconds ?? 0);
    setInitialDuration(restored?.initialDuration ?? DEFAULT_REST_SECONDS);
    setPaused(restored?.paused ?? false);
    setActive(restored !== null);
  }, []);

  const snapshot = useCallback(() => {
    const state = stateRef.current;
    return createRestTimerSnapshot({
      ...state,
      endsAt: endsAtRef.current,
    });
  }, []);

  useEffect(() => {
    if (!active || paused) return;
    const tick = () => {
      const endsAt = endsAtRef.current;
      if (endsAt === null) return;
      const next = Math.ceil((endsAt - now()) / 1000);
      if (next > 0) {
        setRemainingSeconds(next);
        return;
      }
      endsAtRef.current = null;
      setRemainingSeconds(0);
      if (!feedbackSentRef.current && Platform.OS !== "web") {
        feedbackSentRef.current = true;
        try {
          Vibration.vibrate([0, 500, 200, 500]);
        } catch {
          // Device feedback must never interrupt the workout.
        }
      }
    };
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [active, paused]);

  return {
    active,
    paused,
    remainingSeconds,
    initialDuration,
    start,
    adjust,
    togglePause,
    restart,
    dismiss,
    restore,
    snapshot,
  };
}

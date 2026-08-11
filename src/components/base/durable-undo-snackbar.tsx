import type { ThemeType } from "@/constants/colors";
import { useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export type DurableUndoSnackbarState =
  | { phase: "countdown"; label: string; expiresAt: number }
  | { phase: "undoing"; label: string }
  | { phase: "restored"; label: string; message?: string }
  | { phase: "unavailable"; label: string; message: string }
  | { phase: "error"; label: string; message: string };

export function DurableUndoSnackbar({
  state,
  onUndo,
  onExpired,
  theme,
}: {
  state: DurableUndoSnackbarState | null;
  onUndo: () => void;
  onExpired: () => void;
  theme: ThemeType;
}) {
  // Start from a deterministic render value; the interval supplies wall-clock
  // time after mount without making render impure.
  const [now, setNow] = useState(0);
  const expiredRef = useRef<number | null>(null);

  useEffect(() => {
    if (state?.phase !== "countdown") return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= state.expiresAt && expiredRef.current !== state.expiresAt) {
        expiredRef.current = state.expiresAt;
        onExpired();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [onExpired, state]);

  if (!state) return null;
  const seconds = state.phase === "countdown"
    ? now === 0
      ? 5
      : Math.max(0, Math.ceil((state.expiresAt - now) / 1000))
    : 0;
  const message = state.phase === "countdown"
    ? `${state.label} deleted. Undo available for ${seconds}s.`
    : state.phase === "undoing"
      ? `Restoring ${state.label}…`
      : state.message ?? `${state.label} restored.`;
  const canUndo = state.phase === "countdown" && seconds > 0;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        alignItems: "center",
        backgroundColor: theme.textBlack,
        borderRadius: 14,
        bottom: 92,
        flexDirection: "row",
        gap: 16,
        left: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        position: "absolute",
        right: 20,
      }}
    >
      <Text style={{ color: theme.background, flex: 1, fontSize: 13, fontWeight: "700" }}>
        {message}
      </Text>
      {canUndo ? (
        <TouchableOpacity
          accessibilityHint="Restores the same deleted record"
          accessibilityLabel={`Undo deleting ${state.label}`}
          accessibilityRole="button"
          onPress={onUndo}
        >
          <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "900" }}>UNDO</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

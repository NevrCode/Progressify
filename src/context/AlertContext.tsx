import { gymStyles } from "@/assets/styles/gym.style";
import { useTheme } from "@/context/ThemeContext";
import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from "react";
import { Animated, Modal, Text, TouchableOpacity, View } from "react-native";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertContextType {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AlertContext = createContext<AlertContextType>({
  alert: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions>({ title: "" });
  const [scaleAnim] = useState(() => new Animated.Value(0.85));
  const [opacityAnim] = useState(() => new Animated.Value(0));

  const alert = useCallback(
    (title: string, message?: string, buttons?: AlertButton[]) => {
      setOptions({
        title,
        message,
        buttons: buttons ?? [{ text: "OK", style: "default" }],
      });
      setVisible(true);

      // Animate in
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 18,
          stiffness: 260,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          useNativeDriver: true,
          duration: 180,
        }),
      ]).start();
    },
    [scaleAnim, opacityAnim],
  );

  const dismiss = useCallback(
    (onPress?: () => void) => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          useNativeDriver: true,
          duration: 140,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          useNativeDriver: true,
          duration: 140,
        }),
      ]).start(() => {
        setVisible(false);
        onPress?.();
      });
    },
    [scaleAnim, opacityAnim],
  );

  const buttons = options.buttons ?? [
    { text: "OK", style: "default" as const },
  ];

  // ── Button style helpers ──────────────────────────────────────────────────

  const getButtonBg = (btnStyle?: AlertButton["style"], index?: number) => {
    if (btnStyle === "destructive") return theme.expense ?? "#e74c3c";
    if (btnStyle === "cancel") return "transparent";
    // If only one button or last button = primary
    if (index === buttons.length - 1) return theme.primary;
    return "transparent";
  };

  const getButtonTextColor = (
    btnStyle?: AlertButton["style"],
    index?: number,
  ) => {
    if (btnStyle === "destructive") return "#fff";
    if (btnStyle === "cancel") return theme.textLight ?? "#999";
    if (index === buttons.length - 1) return theme.white ?? "#fff";
    return theme.primary;
  };

  const getButtonBorder = (btnStyle?: AlertButton["style"], index?: number) => {
    if (btnStyle === "cancel") return theme.border ?? "#ddd";
    if (index !== buttons.length - 1) return theme.border ?? "#ddd";
    return "transparent";
  };

  return (
    <AlertContext.Provider value={{ alert }}>
      {children}

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={() => dismiss()}
        statusBarTranslucent
      >
        {/* Backdrop */}
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
            opacity: opacityAnim,
          }}
        >
          {/* Card */}
          <Animated.View
            style={{
              width: "100%",
              backgroundColor: theme.background ?? "#fff",
              borderRadius: 20,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.18,
              shadowRadius: 24,
              elevation: 12,
              transform: [{ scale: scaleAnim }],
            }}
          >
            {/* Top accent bar */}
            <View style={{ height: 4, backgroundColor: theme.primary }} />

            {/* Content */}
            <View style={{ padding: 24, paddingBottom: 20 }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: theme.textBlack ?? theme.text ?? "#111",
                  marginBottom: options.message ? 8 : 0,
                  textAlign: "center",
                }}
              >
                {options.title}
              </Text>

              {!!options.message && (
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.textLight ?? "#666",
                    textAlign: "center",
                    lineHeight: 20,
                  }}
                >
                  {options.message}
                </Text>
              )}
            </View>

            {/* Divider */}
            <View
              style={{ height: 1, backgroundColor: theme.border ?? "#eee" }}
            />

            {/* Buttons */}
            <View
              style={{
                flexDirection: buttons.length > 2 ? "column" : "row",
              }}
            >
              {buttons.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => dismiss(btn.onPress)}
                  activeOpacity={0.75}
                  style={{
                    flex: buttons.length <= 2 ? 1 : undefined,
                    margin: 10,
                    marginTop: i === 0 || buttons.length > 2 ? 10 : 10,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: getButtonBg(btn.style, i),
                    borderWidth: 1.5,
                    borderColor: getButtonBorder(btn.style, i),
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: btn.style === "cancel" ? "500" : "700",
                      color: getButtonTextColor(btn.style, i),
                    }}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </AlertContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useAlert = () => useContext(AlertContext);

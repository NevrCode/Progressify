import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "@/context/ThemeContext";
import {
  addDaysToDateOnly,
  formatDateOnly,
  formatDateOnlyForDisplay,
  getDateOnlyPickerSelection,
  parseDateOnly,
} from "@/utils/date-only";

type DateOnlyFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const getInitialDraft = (value: string) => parseDateOnly(value) ?? new Date();

/**
 * An API date-only field. Native platforms use the system picker; web keeps a
 * valid-by-construction calendar-day fallback rather than exposing free text.
 */
export function DateOnlyField({
  label,
  value,
  onChange,
  disabled = false,
}: DateOnlyFieldProps) {
  const { theme } = useTheme();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draft, setDraft] = useState(() => getInitialDraft(value));
  const isWeb = Platform.OS === "web";
  const nativeDate = useMemo(() => parseDateOnly(value) ?? new Date(), [value]);
  const displayValue = formatDateOnlyForDisplay(value);

  const openPicker = () => {
    if (disabled) return;
    setDraft(getInitialDraft(value));
    setPickerVisible(true);
  };

  const cancel = () => setPickerVisible(false);

  const confirm = () => {
    onChange(formatDateOnly(draft));
    setPickerVisible(false);
  };

  const changeWebDay = (days: number) => {
    const next = addDaysToDateOnly(formatDateOnly(draft), days);
    if (next) setDraft(parseDateOnly(next) ?? draft);
  };

  const handleAndroidChange = (
    event: { type?: string },
    selectedDate?: Date,
  ) => {
    setPickerVisible(false);
    const selected = getDateOnlyPickerSelection(event.type, selectedDate);
    if (selected) onChange(selected);
  };

  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "800",
          fontFamily: "PlusJakartaSans_800ExtraBold",
          color: theme.textLight,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {label}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Choose ${label}: ${displayValue}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={openPicker}
        activeOpacity={0.72}
        style={{
          minHeight: 46,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.background,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: theme.border,
          paddingHorizontal: 12,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <MaterialCommunityIcons
          name="calendar-month"
          size={18}
          color={theme.primary}
          style={{ marginRight: 8 }}
        />
        <Text
          style={{
            flex: 1,
            color: theme.textBlack,
            fontSize: 14,
            fontFamily: "PlusJakartaSans_600SemiBold",
          }}
        >
          {displayValue}
        </Text>
        <MaterialIcons name="expand-more" size={20} color={theme.textLight} />
      </TouchableOpacity>

      {pickerVisible && Platform.OS === "android" ? (
        <DateTimePicker
          testID="date-only-native-picker"
          value={nativeDate}
          mode="date"
          onChange={handleAndroidChange}
        />
      ) : null}

      {pickerVisible && Platform.OS !== "android" ? (
        <Modal
          transparent
          visible
          animationType="fade"
          onRequestClose={cancel}
          accessibilityViewIsModal
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              padding: 20,
              backgroundColor: "#00000088",
            }}
          >
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 20,
                padding: 18,
                gap: 14,
              }}
            >
              <Text
                accessibilityRole="header"
                style={{
                  color: theme.textBlack,
                  fontSize: 18,
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                }}
              >
                {label}
              </Text>
              {isWeb ? (
                <View style={{ gap: 12 }}>
                  <Text
                    style={{
                      color: theme.textBlack,
                      fontSize: 20,
                      textAlign: "center",
                      fontFamily: "PlusJakartaSans_700Bold",
                    }}
                  >
                    {formatDateOnlyForDisplay(formatDateOnly(draft))}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <DateStepButton
                      accessibilityLabel="Previous day"
                      icon="chevron-left"
                      onPress={() => changeWebDay(-1)}
                    />
                    <DateStepButton
                      accessibilityLabel="Use today"
                      label="Today"
                      onPress={() => setDraft(new Date())}
                    />
                    <DateStepButton
                      accessibilityLabel="Next day"
                      icon="chevron-right"
                      onPress={() => changeWebDay(1)}
                    />
                  </View>
                </View>
              ) : (
                <DateTimePicker
                  testID="date-only-native-picker"
                  value={draft}
                  mode="date"
                  display="inline"
                  onChange={(event, selectedDate) => {
                    const selected = getDateOnlyPickerSelection(
                      event.type,
                      selectedDate,
                    );
                    if (selected) setDraft(parseDateOnly(selected) ?? draft);
                  }}
                />
              )}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <DateActionButton
                  accessibilityLabel={`Cancel choosing ${label}`}
                  label="Cancel"
                  color={theme.textLight}
                  onPress={cancel}
                />
                <DateActionButton
                  accessibilityLabel={`Save ${label}`}
                  label="Done"
                  color={theme.primary}
                  onPress={confirm}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function DateStepButton({
  accessibilityLabel,
  icon,
  label,
  onPress,
}: {
  accessibilityLabel: string;
  icon?: "chevron-left" | "chevron-right";
  label?: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 42,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        backgroundColor: theme.background,
      }}
    >
      {icon ? <MaterialIcons name={icon} size={22} color={theme.primary} /> : null}
      {label ? (
        <Text style={{ color: theme.primary, fontFamily: "PlusJakartaSans_700Bold" }}>
          {label}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

function DateActionButton({
  accessibilityLabel,
  label,
  color,
  onPress,
}: {
  accessibilityLabel: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ color, fontFamily: "PlusJakartaSans_800ExtraBold" }}>{label}</Text>
    </TouchableOpacity>
  );
}

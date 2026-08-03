import { IconButton } from "@/components/base/icon-button";
import type { ThemeType } from "@/constants/colors";
import { useUnitPreference } from "@/context/UnitPreferenceContext";
import type { DraftSet } from "@/features/workout-session/drafts";
import { formatMassInput, massUnitLabel, parseMassInput } from "@/utils/measurement-units";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

type Props = {
  set: DraftSet;
  exerciseName: string;
  theme: ThemeType;
  disabled?: boolean;
  isLast: boolean;
  onChange: (field: "weight" | "reps" | "rir", value: string) => void;
  onToggleType: () => void;
  onComplete: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

export function ActiveWorkoutSetRow({
  set,
  exerciseName,
  theme,
  disabled = false,
  isLast,
  onChange,
  onToggleType,
  onComplete,
  onDuplicate,
  onRemove,
}: Props) {
  const { measurementSystem } = useUnitPreference();
  const locked = disabled || set.completed;
  const runAndClose = (methods: SwipeableMethods, action: () => void) => {
    methods.close();
    action();
  };
  const actionButton = (
    methods: SwipeableMethods,
    label: string,
    color: string,
    icon: "check" | "content-copy" | "delete-outline",
    action: () => void,
    actionDisabled = false,
  ) => (
    <TouchableOpacity
      accessibilityLabel={`${label} set ${set.set_number}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || actionDisabled }}
      disabled={disabled || actionDisabled}
      onPress={() => runAndClose(methods, action)}
      style={{
        alignItems: "center",
        backgroundColor: color,
        justifyContent: "center",
        minWidth: 62,
        opacity: disabled || actionDisabled ? 0.45 : 1,
        paddingHorizontal: 8,
      }}
    >
      <MaterialIcons name={icon} size={18} color={theme.white} />
      <Text style={{ color: theme.white, fontSize: 9, fontWeight: "800" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={64}
      dragOffsetFromRightEdge={24}
      overshootRight={false}
      enabled={!disabled}
      renderRightActions={(_progress, _translation, methods) => (
        <View style={{ flexDirection: "row" }}>
          {actionButton(methods, "Complete", theme.income, "check", onComplete, set.completed)}
          {actionButton(methods, "Duplicate", theme.primary, "content-copy", onDuplicate)}
          {actionButton(methods, "Remove", theme.expense, "delete-outline", onRemove)}
        </View>
      )}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: set.completed
            ? theme.income + "14"
            : set.set_type === "WARMUP"
              ? theme.primary + "0A"
              : theme.background,
          borderBottomColor: theme.border + "50",
          borderBottomWidth: isLast ? 0 : 1,
          flexDirection: "row",
          paddingHorizontal: 8,
          paddingVertical: 6,
        }}
      >
        <TouchableOpacity
          accessibilityLabel={`Set ${set.set_number} is ${set.set_type === "WARMUP" ? "a warm-up set" : "a working set"}. Change to ${set.set_type === "WARMUP" ? "working" : "warm-up"} set`}
          accessibilityRole="button"
          accessibilityState={{ selected: set.set_type === "WARMUP", disabled: locked }}
          disabled={locked}
          onPress={onToggleType}
          style={{ alignItems: "center", flex: 1, justifyContent: "center" }}
        >
          <Text style={{ color: set.set_type === "WARMUP" ? theme.primary : theme.textBlack, fontSize: 12, fontWeight: "900" }}>
            {set.set_type === "WARMUP" ? `W${set.set_number}` : set.set_number}
          </Text>
          <Text style={{ color: theme.textLight, fontSize: 8, fontWeight: "700" }}>
            {set.set_type === "WARMUP" ? "WARM-UP" : "WORK"}
          </Text>
        </TouchableOpacity>

        {(["weight", "reps", "rir"] as const).map((field) => (
          <View key={field} style={{ flex: field === "weight" ? 2.2 : 1.8, paddingHorizontal: 4 }}>
            <TextInput
              accessibilityLabel={`Set ${set.set_number} ${field === "weight" ? `weight in ${massUnitLabel(measurementSystem)}` : field === "reps" ? "repetitions" : "repetitions in reserve"} for ${exerciseName}`}
              editable={!locked}
              keyboardType="numeric"
              onChangeText={(value) => {
                if (field !== "weight") {
                  onChange(field, value);
                  return;
                }
                const canonicalWeight = parseMassInput(value, measurementSystem);
                onChange("weight", canonicalWeight == null ? "" : String(canonicalWeight));
              }}
              style={{
                backgroundColor: theme.card,
                borderColor: set.completed ? theme.income : theme.border,
                borderRadius: 8,
                borderWidth: 1,
                color: theme.textBlack,
                fontSize: 13,
                fontWeight: "600",
                paddingVertical: 6,
                textAlign: "center",
              }}
              value={field === "weight" ? formatMassInput(set.weight ? Number(set.weight) : undefined, measurementSystem) : set[field]}
            />
          </View>
        ))}

        <View style={{ alignItems: "center", flex: 1.6, flexDirection: "row", gap: 4, justifyContent: "center" }}>
          <IconButton
            accessibilityLabel={`Complete set ${set.set_number}`}
            disabled={disabled || set.completed}
            icon={<MaterialIcons name="check" size={14} color={set.completed ? theme.income : theme.primary} />}
            onPress={onComplete}
            visualSize={24}
          />
          <IconButton
            accessibilityLabel={`Duplicate set ${set.set_number}`}
            disabled={disabled}
            icon={<MaterialCommunityIcons name="content-copy" size={13} color={theme.primary} />}
            onPress={onDuplicate}
            visualSize={24}
          />
          <IconButton
            accessibilityLabel={`Remove set ${set.set_number}`}
            disabled={disabled}
            icon={<MaterialIcons name="delete-outline" size={14} color={theme.expense} />}
            onPress={onRemove}
            variant="destructive"
            visualSize={24}
          />
        </View>
      </View>
    </ReanimatedSwipeable>
  );
}

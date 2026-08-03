import { AppButton } from "@/components/base/app-button";
import { FormField } from "@/components/base/form-field";
import { IconButton } from "@/components/base/icon-button";
import { useTheme } from "@/context/ThemeContext";
import {
  createSuperset,
  dissolveSuperset,
  getSupersetLabel,
  moveLayoutBlock,
  moveLayoutRoutine,
  moveSupersetMember,
  setSupersetRest,
  toProgramLayout,
  type LayoutBlock,
  type ProgramLayout,
} from "@/features/program-layout/model";
import type { WorkoutProgramDTO } from "@/services/workoutProgramService";
import { MaterialIcons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useState } from "react";
import { PanResponder, Text, TouchableOpacity, View } from "react-native";

type Props = {
  program: WorkoutProgramDTO;
  saving?: boolean;
  onSave: (layout: ProgramLayout) => Promise<void>;
};

function ReorderHandle({
  label,
  onMove,
}: {
  label: string;
  onMove: (direction: -1 | 1) => void;
}) {
  const { theme } = useTheme();
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 4,
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy <= -24) onMove(-1);
      if (gesture.dy >= 24) onMove(1);
    },
  });
  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: 1 }}>
      <View
        {...responder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Drag ${label} to reorder`}
        accessibilityHint="Drag up or down. Move buttons are also available."
        style={{ padding: 7 }}
      >
        <MaterialIcons name="drag-handle" size={20} color={theme.textLight} />
      </View>
      <IconButton
        accessibilityLabel={`Move ${label} up`}
        icon={<MaterialIcons name="keyboard-arrow-up" size={16} color={theme.primary} />}
        onPress={() => onMove(-1)}
        size="compact"
        variant="neutral"
      />
      <IconButton
        accessibilityLabel={`Move ${label} down`}
        icon={<MaterialIcons name="keyboard-arrow-down" size={16} color={theme.primary} />}
        onPress={() => onMove(1)}
        size="compact"
        variant="neutral"
      />
    </View>
  );
}

export function ProgramLayoutEditor({ program, saving = false, onSave }: Props) {
  const { theme } = useTheme();
  const [layout, setLayout] = useState(() => toProgramLayout(program));
  const [selected, setSelected] = useState<Record<number, Set<number>>>({});
  const [restDrafts, setRestDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const moveRoutine = (routineId: number, direction: -1 | 1) =>
    setLayout((current) => moveLayoutRoutine(current, routineId, direction));
  const moveBlock = (routineId: number, index: number, direction: -1 | 1) =>
    setLayout((current) => moveLayoutBlock(current, routineId, index, direction));
  const moveMember = (routineId: number, groupId: string, memberIndex: number, direction: -1 | 1) =>
    setLayout((current) => moveSupersetMember(current, routineId, groupId, memberIndex, direction));
  const toggleSelected = (routineId: number, exerciseId: number) => {
    setSelected((current) => {
      const next = new Set(current[routineId] ?? []);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return { ...current, [routineId]: next };
    });
  };
  const makeSuperset = (routineId: number) => {
    const ids = Array.from(selected[routineId] ?? []);
    setLayout((current) => createSuperset(current, routineId, ids, Crypto.randomUUID()));
    setSelected((current) => ({ ...current, [routineId]: new Set() }));
  };
  const save = async () => {
    if (saving || submitting) return;
    setSubmitting(true);
    try {
      await onSave(layout);
    } catch {
      // The owner renders the mutation feedback. Swallow here so a press
      // never leaves an unhandled rejected promise in React Native.
    } finally {
      setSubmitting(false);
    }
  };
  const renderBlock = (routineId: number, routineIndex: number, block: LayoutBlock, blockIndex: number) => {
    if (block.type === "SUPERSET") {
      const restKey = block.group.id;
      const rest = restDrafts[restKey] ?? (block.group.rest_after_round_seconds == null ? "" : String(block.group.rest_after_round_seconds));
      return (
        <View key={block.group.id} style={{ backgroundColor: theme.primary + "0D", borderColor: theme.primary + "45", borderCurve: "continuous", borderRadius: 12, borderWidth: 1, gap: 8, padding: 10 }}>
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text selectable style={{ color: theme.primary, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 12 }}>
                {getSupersetLabel(layout.routines[routineIndex], block.group.id)}
              </Text>
              <Text selectable style={{ color: theme.textLight, fontSize: 10 }}>
                Complete each working-set round before resting.
              </Text>
            </View>
            <ReorderHandle label={getSupersetLabel(layout.routines[routineIndex], block.group.id)} onMove={(direction) => moveBlock(routineId, blockIndex, direction)} />
          </View>
          {block.members.map((member, memberIndex) => (
            <View key={member.id} style={{ alignItems: "center", flexDirection: "row", gap: 6 }}>
              <Text selectable style={{ color: theme.textBlack, flex: 1, fontSize: 12 }}>
                {memberIndex + 1}. {member.exercise_name}
              </Text>
              <ReorderHandle label={`${member.exercise_name} in ${getSupersetLabel(layout.routines[routineIndex], block.group.id)}`} onMove={(direction) => moveMember(routineId, block.group.id, memberIndex, direction)} />
            </View>
          ))}
          <FormField
            accessibilityLabel={`Post-round rest for ${getSupersetLabel(layout.routines[routineIndex], block.group.id)}`}
            helperText="Blank uses the last completed exercise's rest. 0 disables it."
            keyboardType="number-pad"
            label="Rest after round (seconds)"
            onChangeText={(value) => setRestDrafts((current) => ({ ...current, [restKey]: value }))}
            value={rest}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <AppButton
              label="Apply rest"
              variant="secondary"
              onPress={() => {
                const parsed = rest.trim() === "" ? null : Number(rest);
                if (parsed === null || (Number.isInteger(parsed) && parsed >= 0 && parsed <= 3600)) {
                  setLayout((current) => setSupersetRest(current, routineId, block.group.id, parsed));
                }
              }}
            />
            <AppButton label="Dissolve" variant="ghost" onPress={() => setLayout((current) => dissolveSuperset(current, routineId, block.group.id))} />
          </View>
        </View>
      );
    }
    const selectedForRoutine = selected[routineId]?.has(block.plannedExercise.id) ?? false;
    return (
      <View key={block.plannedExercise.id} style={{ alignItems: "center", backgroundColor: theme.background, borderColor: selectedForRoutine ? theme.primary : theme.border, borderCurve: "continuous", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 8, padding: 8 }}>
        <TouchableOpacity
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selectedForRoutine }}
          accessibilityLabel={`Select ${block.plannedExercise.exercise_name} for a superset`}
          onPress={() => toggleSelected(routineId, block.plannedExercise.id)}
          style={{ padding: 4 }}
        >
          <MaterialIcons name={selectedForRoutine ? "check-box" : "check-box-outline-blank"} color={theme.primary} size={20} />
        </TouchableOpacity>
        <Text selectable style={{ color: theme.textBlack, flex: 1, fontSize: 12, fontFamily: "PlusJakartaSans_700Bold" }}>
          {block.plannedExercise.exercise_name}
        </Text>
        <ReorderHandle label={block.plannedExercise.exercise_name} onMove={(direction) => moveBlock(routineId, blockIndex, direction)} />
      </View>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      <Text selectable style={{ color: theme.textLight, fontSize: 11, lineHeight: 17 }}>
        Drag a handle up or down to reorder, or use the adjacent Move controls. Changes save as one complete layout.
      </Text>
      {layout.routines.map((routine, routineIndex) => {
        const selectionCount = selected[routine.id]?.size ?? 0;
        return (
          <View key={routine.id} style={{ backgroundColor: theme.card, borderColor: theme.border, borderCurve: "continuous", borderRadius: 14, borderWidth: 1, gap: 10, padding: 12 }}>
            <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
              <Text selectable style={{ color: theme.textBlack, flex: 1, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 15 }}>{routine.name}</Text>
              <ReorderHandle label={routine.name} onMove={(direction) => moveRoutine(routine.id, direction)} />
            </View>
            {routine.blocks.map((block, index) => renderBlock(routine.id, routineIndex, block, index))}
            <AppButton
              label={selectionCount ? `Create superset (${selectionCount})` : "Select 2-10 exercises for a superset"}
              disabled={selectionCount < 2 || selectionCount > 10}
              variant="secondary"
              onPress={() => makeSuperset(routine.id)}
            />
          </View>
        );
      })}
      <AppButton
        label="Save routine layout"
        disabled={saving || submitting}
        loading={saving || submitting}
        onPress={() => void save()}
      />
    </View>
  );
}

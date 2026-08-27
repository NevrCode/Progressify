import { AppButton } from "@/components/base/app-button";
import type { ProgramsStyles } from "@/assets/styles/programs.style";
import type { WorkoutProgramDTO } from "@/services/workoutProgramService";
import { memo } from "react";
import { Text, View } from "react-native";

type InactiveProgramCardProps = {
  program: WorkoutProgramDTO;
  activating: boolean;
  styles: ProgramsStyles;
  onActivate: (programId: number) => void;
};

function InactiveProgramCardComponent({
  program,
  activating,
  styles,
  onActivate,
}: InactiveProgramCardProps) {
  return (
    <View style={styles.card}>
      <Text selectable style={styles.plainTitle}>
        {program.name}
      </Text>
      <Text selectable style={styles.metaTextSmall}>
        {program.status}
      </Text>
      <AppButton
        label="Make active"
        variant="secondary"
        loading={activating}
        onPress={() => onActivate(program.id)}
      />
    </View>
  );
}

export const InactiveProgramCard = memo(InactiveProgramCardComponent);

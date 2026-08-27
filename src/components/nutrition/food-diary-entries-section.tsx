import { gymStyles } from "@/assets/styles/gym.style";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { StatePanel } from "@/components/base/state-panel";
import { FoodDiaryMealList } from "@/components/nutrition/food-diary-meal-list";
import { FoodEntriesSkeleton } from "@/components/nutrition/food-diary-skeletons";
import { useTheme } from "@/context/ThemeContext";
import type { FoodEntryDetailResponseDTO } from "@/services/foodDiaryService";
import { Text, View } from "react-native";

type FoodDiaryEntriesSectionProps = {
  entries?: FoodEntryDetailResponseDTO[];
  isLoading: boolean;
  onAddFood: () => void;
  onDelete: (entry: FoodEntryDetailResponseDTO) => void;
};

export function FoodDiaryEntriesSection({
  entries,
  isLoading,
  onAddFood,
  onDelete,
}: FoodDiaryEntriesSectionProps) {
  const { theme } = useTheme();
  const styles = gymStyles(theme);

  return (
    <ShadowGlowCard
      style={{
        marginTop: 16,
        borderColor: theme.primary + "20",
        borderWidth: 1.5,
      }}
    >
      <View style={[styles.sectionHeader, { marginBottom: 14 }]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text style={styles.sectionTitle}>Today&apos;s Meals</Text>
        </View>
      </View>

      {isLoading ? (
        <FoodEntriesSkeleton />
      ) : entries && entries.length > 0 ? (
        <FoodDiaryMealList
          entries={entries}
          onDelete={onDelete}
          theme={theme}
          styles={styles}
        />
      ) : (
        <StatePanel
          variant="empty"
          compact
          embedded
          title="No meals logged today"
          message="Foods added today will be grouped here by meal."
          primaryAction={{ label: "Add food", onPress: onAddFood }}
        />
      )}
    </ShadowGlowCard>
  );
}

import { AppButton } from "@/components/base/app-button";
import { FormField } from "@/components/base/form-field";
import { ExerciseCatalogListItem } from "@/components/gym/exercise-catalog-list-item";
import { ExerciseCatalogPreview } from "@/components/gym/exercise-catalog-preview";
import { useTheme } from "@/context/ThemeContext";
import { catalogExercises } from "@/data/exercise-catalog";
import type { CatalogExercise } from "@/types/exercise-catalog";
import {
  filterCatalogExercises,
  getCatalogFilterOptions,
} from "@/utils/exercise-catalog-filter";
import { useDeferredValue, useMemo, useState } from "react";
import { FlatList, ScrollView, Text, TouchableOpacity, View } from "react-native";

type ExerciseCatalogPickerProps = {
  exercises?: readonly CatalogExercise[];
  customActionDescription?: string;
  customActionLabel?: string;
  onCreateCustom: () => void;
  onUseExercise: (exercise: CatalogExercise) => void;
};

type FilterStripProps = {
  label: string;
  allLabel: string;
  options: readonly string[];
  value: string | null;
  onChange: (value: string | null) => void;
};

function FilterStrip({
  label,
  allLabel,
  options,
  value,
  onChange,
}: FilterStripProps) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: theme.textLight,
          fontSize: 10,
          fontFamily: "PlusJakartaSans_700Bold",
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 7 }}
      >
        {[{ label: allLabel, value: null }, ...options.map((option) => ({
          label: option,
          value: option,
        }))].map((option) => {
          const selected = value === option.value;
          return (
            <TouchableOpacity
              key={option.value ?? "all"}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${option.label}`}
              activeOpacity={0.72}
              onPress={() => onChange(option.value)}
              style={{
                minHeight: 38,
                justifyContent: "center",
                paddingHorizontal: 12,
                borderRadius: 19,
                borderWidth: 1,
                borderColor: selected ? theme.primary : theme.border,
                backgroundColor: selected
                  ? theme.primary + "18"
                  : theme.background,
              }}
            >
              <Text
                style={{
                  color: selected ? theme.primary : theme.textLight,
                  fontSize: 11,
                  fontFamily: "PlusJakartaSans_700Bold",
                  textTransform: option.value ? "capitalize" : "none",
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ExerciseCatalogPicker({
  exercises = catalogExercises,
  customActionDescription = "Enter an exercise that is not in the catalog",
  customActionLabel = "Create custom exercise",
  onCreateCustom,
  onUseExercise,
}: ExerciseCatalogPickerProps) {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [primaryMuscle, setPrimaryMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] =
    useState<CatalogExercise | null>(null);

  const filterOptions = useMemo(
    () => getCatalogFilterOptions(exercises),
    [exercises],
  );
  const filteredExercises = useMemo(
    () =>
      filterCatalogExercises(exercises, {
        query: deferredQuery,
        primaryMuscle,
        equipment,
      }),
    [deferredQuery, equipment, exercises, primaryMuscle],
  );

  if (selectedExercise) {
    return (
      <ExerciseCatalogPreview
        exercise={selectedExercise}
        onBack={() => setSelectedExercise(null)}
        onUseExercise={onUseExercise}
      />
    );
  }

  const hasFilters = Boolean(query.trim() || primaryMuscle || equipment);

  return (
    <View style={{ gap: 12, minHeight: 0 }}>
      <FormField
        label="Search catalog"
        accessibilityLabel="Search exercise catalog"
        placeholder="Exercise, muscle, or equipment"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        submitBehavior="submit"
      />

      <AppButton
        label={customActionLabel}
        accessibilityLabel={customActionLabel}
        description={customActionDescription}
        variant="secondary"
        onPress={onCreateCustom}
      />

      <FilterStrip
        label="Muscle"
        allLabel="All muscles"
        options={filterOptions.primaryMuscles}
        value={primaryMuscle}
        onChange={setPrimaryMuscle}
      />
      <FilterStrip
        label="Equipment"
        allLabel="All equipment"
        options={filterOptions.equipment}
        value={equipment}
        onChange={setEquipment}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Text
          selectable
          accessibilityLiveRegion="polite"
          style={{
            color: theme.textLight,
            fontSize: 11,
            fontFamily: "PlusJakartaSans_700Bold",
            fontVariant: ["tabular-nums"],
          }}
        >
          {filteredExercises.length} exercises
        </Text>
        {hasFilters ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Clear catalog filters"
            onPress={() => {
              setQuery("");
              setPrimaryMuscle(null);
              setEquipment(null);
            }}
          >
            <Text
              style={{
                color: theme.primary,
                fontSize: 11,
                fontFamily: "PlusJakartaSans_700Bold",
              }}
            >
              Clear filters
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filteredExercises}
        keyExtractor={(exercise) => exercise.id}
        renderItem={({ item }) => (
          <ExerciseCatalogListItem
            exercise={item}
            onPress={setSelectedExercise}
          />
        )}
        style={{ height: 300 }}
        contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        ListEmptyComponent={
          <View
            style={{
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 16,
              paddingVertical: 28,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.background,
            }}
          >
            <Text
              selectable
              style={{
                color: theme.textBlack,
                fontSize: 14,
                fontFamily: "PlusJakartaSans_700Bold",
              }}
            >
              No matching exercises
            </Text>
            <Text
              selectable
              style={{
                color: theme.textLight,
                fontSize: 12,
                fontFamily: "PlusJakartaSans_500Medium",
                textAlign: "center",
                lineHeight: 18,
              }}
            >
              Try clearing the filters or use the custom option above.
            </Text>
          </View>
        }
      />
    </View>
  );
}

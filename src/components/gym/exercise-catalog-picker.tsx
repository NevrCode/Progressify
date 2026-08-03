import { AppButton } from "@/components/base/app-button";
import { FormField } from "@/components/base/form-field";
import { ExerciseCatalogListItem } from "@/components/gym/exercise-catalog-list-item";
import { ExerciseCatalogPreview } from "@/components/gym/exercise-catalog-preview";
import { useTheme } from "@/context/ThemeContext";
import { catalogExercises } from "@/data/exercise-catalog";
import { type DiscoveryItem, useDiscoveryFeed, useToggleDiscoveryFavorite } from "@/services/discoveryService";
import type { CatalogExercise } from "@/types/exercise-catalog";
import { rankDiscovery } from "@/utils/discovery-ranking";
import {
  filterCatalogExercises,
  getCatalogFilterOptions,
} from "@/utils/exercise-catalog-filter";
import { useDeferredValue, useMemo, useState } from "react";
import { SectionList, ScrollView, Text, TouchableOpacity, View } from "react-native";

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

type CatalogDiscoveryItem = CatalogExercise & {
  resource_type: "exercise";
  resource_id: string;
};

const asDiscoveryItem = (exercise: CatalogExercise): CatalogDiscoveryItem => ({
  ...exercise,
  resource_type: "exercise",
  resource_id: `catalog:${exercise.id}`,
});

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
  const discoveryQuery = useDiscoveryFeed("exercise");
  const favoriteMutation = useToggleDiscoveryFavorite("exercise");

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
  const rankedExercises = useMemo(() => {
    const byResourceID = new Map(
      exercises.map((exercise) => {
        const item = asDiscoveryItem(exercise);
        return [item.resource_id, item] as const;
      }),
    );
    const resolve = (item: DiscoveryItem) => byResourceID.get(item.resource_id);
    return rankDiscovery(
      (discoveryQuery.data?.favorites ?? []).map(resolve).filter(Boolean) as CatalogDiscoveryItem[],
      (discoveryQuery.data?.recent ?? []).map(resolve).filter(Boolean) as CatalogDiscoveryItem[],
      filteredExercises.map(asDiscoveryItem),
    );
  }, [discoveryQuery.data, exercises, filteredExercises]);

  const favoriteIDs = useMemo(
    () => new Set((discoveryQuery.data?.favorites ?? []).map((item) => item.resource_id)),
    [discoveryQuery.data],
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

      <SectionList
        sections={[
          { title: "Favorites", data: rankedExercises.favorites },
          { title: "Recent", data: rankedExercises.recent },
          { title: hasFilters ? "Matches" : "All exercises", data: rankedExercises.matches },
        ].filter((section) => section.data.length > 0)}
        keyExtractor={(exercise) => exercise.resource_id}
        renderItem={({ item }) => (
          <ExerciseCatalogListItem
            exercise={item}
            onPress={(exercise) => {
              setSelectedExercise(exercises.find(({ id }) => id === exercise.id) ?? exercise);
            }}
            favorite={favoriteIDs.has(item.resource_id)}
            onToggleFavorite={(exercise, favorite) => favoriteMutation.mutate({
              favorite,
              input: {
                resource_type: "exercise",
                resource_id: `catalog:${exercise.id}`,
                display_name: exercise.name,
                subtitle: [exercise.primaryMuscle, exercise.equipment].filter(Boolean).join(" · "),
              },
            })}
          />
        )}
        renderSectionHeader={({ section }) => (
          <Text
            style={{
              color: theme.textLight,
              fontSize: 10,
              fontFamily: "PlusJakartaSans_700Bold",
              letterSpacing: 0.6,
              marginTop: 4,
              textTransform: "uppercase",
            }}
          >
            {section.title}
          </Text>
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

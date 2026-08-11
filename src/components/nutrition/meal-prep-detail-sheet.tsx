import type { GymStyles } from "@/assets/styles/gym.style";
import {
  ActionStatus,
  type ActionFeedback,
} from "@/components/base/action-status";
import { ThemeType } from "@/constants/colors";
import { MealPrepResponse } from "@/services/mealPrepService";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type MealPrepDetailSheetProps = {
  prep: MealPrepResponse;
  index: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLog: () => void;
  feedback?: ActionFeedback;
  onDismissFeedback: () => void;
  theme: ThemeType;
  style: GymStyles;
};

const accentColors = [
  "#378ADD",
  "#1D9E75",
  "#7F77DD",
  "#EF9F27",
  "#D85A30",
  "#D4537E",
];

function MacroPill({
  label,
  value,
  unit,
  backgroundColor,
  color,
}: {
  label: string;
  value?: number;
  unit: string;
  backgroundColor: string;
  color: string;
}) {
  return (
    <View
      style={{
        backgroundColor,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>
        {label}
        {label ? " " : ""}
        {value?.toFixed(0) ?? "0"}
        {unit}
      </Text>
    </View>
  );
}

export function MealPrepDetailSheet({
  prep,
  index,
  onClose,
  onEdit,
  onDelete,
  onLog,
  feedback,
  onDismissFeedback,
  theme,
  style,
}: MealPrepDetailSheetProps) {
  const accent = accentColors[index % accentColors.length];
  const [showAllItems, setShowAllItems] = useState(false);
  const previewCount = 3;
  const visibleItems = showAllItems
    ? prep.items
    : prep.items.slice(0, previewCount);
  const hasMore = prep.items.length > previewCount;

  return (
    <View
      style={[
        style.modalCard,
        { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
      ]}
    >
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.border ?? "#ddd",
          }}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 4,
            borderRadius: 2,
            backgroundColor: accent,
            alignSelf: "stretch",
            marginRight: 10,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={[style.exerciseName, { marginBottom: 2 }]}>
            {prep.name}
          </Text>
          {!!prep.description && (
            <Text style={style.listMeta}>{prep.description}</Text>
          )}
          <View
            style={{
              flexDirection: "row",
              gap: 5,
              marginTop: 6,
              flexWrap: "wrap",
            }}
          >
            <MacroPill
              label=""
              value={prep.total_calories}
              unit=" kcal"
              backgroundColor="#FAEEDA"
              color="#633806"
            />
            <MacroPill
              label="P"
              value={prep.total_protein}
              unit="g"
              backgroundColor="#E6F1FB"
              color="#0C447C"
            />
            <MacroPill
              label="C"
              value={prep.total_carbohydrate}
              unit="g"
              backgroundColor="#EAF3DE"
              color="#27500A"
            />
            <MacroPill
              label="F"
              value={prep.total_fat}
              unit="g"
              backgroundColor="#FAECE7"
              color="#712B13"
            />
          </View>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Close ${prep.name} details`}
          hitSlop={10}
          onPress={onClose}
          style={{ padding: 4 }}
        >
          <MaterialIcons name="close" size={20} color={theme.textLight} />
        </TouchableOpacity>
      </View>
      <View
        style={{
          height: 0.5,
          backgroundColor: theme.border ?? "#eee",
          marginBottom: 12,
        }}
      />
      <View>
        {visibleItems.map((item, itemIndex) => (
          <View
            key={item.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
              borderBottomWidth:
                itemIndex < visibleItems.length - 1 ? 0.5 : 0,
              borderBottomColor: theme.border ?? "#eee",
              gap: 10,
            }}
          >
            <View
              style={{
                width: 4,
                height: 32,
                borderRadius: 2,
                backgroundColor:
                  accentColors[itemIndex % accentColors.length],
                flexShrink: 0,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: theme.textBlack,
                  marginBottom: 2,
                }}
                numberOfLines={1}
              >
                {item.food_name}
              </Text>
              <Text style={{ fontSize: 11, color: theme.textLight }}>
                {item.gramation?.toFixed(0)}g · {item.calories?.toFixed(0)} kcal
                · P {item.protein?.toFixed(1)}g · C {item.carbohydrate?.toFixed(1)}g · F {item.fat?.toFixed(1)}g
              </Text>
            </View>
          </View>
        ))}
        {hasMore ? (
          <TouchableOpacity
            onPress={() => setShowAllItems(!showAllItems)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              paddingVertical: 10,
            }}
          >
            <MaterialIcons
              name={showAllItems ? "expand-less" : "expand-more"}
              size={16}
              color={theme.primary}
            />
            <Text style={{ fontSize: 12, color: theme.primary, fontWeight: "600" }}>
              {showAllItems ? "Show less" : `Show all ${prep.items.length} foods`}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {feedback ? (
        <View style={{ marginTop: 12 }}>
          <ActionStatus {...feedback} onDismiss={onDismissFeedback} />
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Log ${prep.name} to diary`}
          onPress={onLog}
          style={{
            flex: 2,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: theme.primary,
            borderRadius: 12,
          }}
        >
          <MaterialIcons name="fastfood" size={14} color={theme.textBlack} />
          <Text style={{ color: theme.textBlack, fontSize: 14, fontWeight: "700" }}>
            Eat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Edit ${prep.name}`}
          onPress={onEdit}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            paddingVertical: 16,
            borderWidth: 0.5,
            backgroundColor: theme.background,
            borderColor: theme.border ?? "#eee",
          }}
        >
          <MaterialIcons name="edit" size={16} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Delete ${prep.name}`}
          onPress={onDelete}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: theme.background,
          }}
        >
          <MaterialIcons name="delete-outline" size={18} color="#A32D2D" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

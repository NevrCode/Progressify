import { IconButton } from "@/components/base/icon-button";
import { useTheme } from "@/context/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type PaginationNavigatorProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maximumVisiblePages?: number;
  accessibilityLabel?: string;
};

export function PaginationNavigator({
  page,
  totalPages,
  onPageChange,
  maximumVisiblePages = 5,
  accessibilityLabel = "Pagination",
}: PaginationNavigatorProps) {
  const { theme } = useTheme();
  const pages = useMemo(() => {
    if (totalPages <= maximumVisiblePages) {
      return Array.from({ length: totalPages }, (_, index) => index);
    }
    const radius = Math.floor(maximumVisiblePages / 2);
    const start = Math.min(
      Math.max(page - radius, 0),
      totalPages - maximumVisiblePages,
    );
    return Array.from(
      { length: maximumVisiblePages },
      (_, index) => start + index,
    );
  }, [maximumVisiblePages, page, totalPages]);

  if (totalPages <= 0) return null;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      }}
    >
      <IconButton
        accessibilityLabel="Previous page"
        disabled={page === 0}
        onPress={() => onPageChange(Math.max(page - 1, 0))}
        icon={
          <MaterialIcons name="chevron-left" size={22} color={theme.primary} />
        }
      />
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
        }}
      >
        {pages.map((item) => {
          const selected = item === page;
          return (
            <TouchableOpacity
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`Page ${item + 1}`}
              accessibilityState={{ selected }}
              onPress={() => onPageChange(item)}
              style={{
                minWidth: 32,
                minHeight: 35,
                paddingHorizontal: 5,
                borderRadius: 9,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: selected
                  ? theme.primary + "16"
                  : "transparent",
              }}
            >
              <Text
                style={{
                  color: selected ? theme.primary : theme.textLight,
                  fontSize: 12,
                  fontFamily: selected
                    ? "PlusJakartaSans_800ExtraBold"
                    : "PlusJakartaSans_700Bold",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {item + 1}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <IconButton
        accessibilityLabel="Next page"
        disabled={page >= totalPages - 1}
        onPress={() => onPageChange(Math.min(page + 1, totalPages - 1))}
        icon={
          <MaterialIcons name="chevron-right" size={22} color={theme.primary} />
        }
      />
    </View>
  );
}

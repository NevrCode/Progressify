import { ShimmerSkeleton } from "@/components/base/shimmer-skeleton";
import { useTheme } from "@/context/ThemeContext";
import { View } from "react-native";

export const EXERCISE_PAGE_SIZE = 5;

export function ExerciseProgressionCardSkeletons() {
  const { theme } = useTheme();

  return (
    <View accessibilityLabel="Loading exercise progression page" accessibilityRole="progressbar" style={{ gap: 12 }}>
      {Array.from({ length: EXERCISE_PAGE_SIZE }, (_, index) => (
        <View
          key={index}
          style={{
            backgroundColor: theme.card,
            borderColor: theme.primary + "20",
            borderWidth: 1.5,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <ShimmerSkeleton width={index % 2 === 0 ? "58%" : "46%"} height={16} />
              <View style={{ flexDirection: "row", gap: 6 }}>
                <ShimmerSkeleton width={42} height={18} borderRadius={8} />
                <ShimmerSkeleton width={62} height={18} borderRadius={8} />
                <ShimmerSkeleton width={48} height={18} borderRadius={8} />
              </View>
              <ShimmerSkeleton width={112} height={9} />
            </View>
            <ShimmerSkeleton width={32} height={32} borderRadius={8} />
            <ShimmerSkeleton width={32} height={32} borderRadius={8} />
          </View>
        </View>
      ))}
    </View>
  );
}

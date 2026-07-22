import { ShimmerSkeleton } from "@/components/base/shimmer-skeleton";
import { useTheme } from "@/context/ThemeContext";
import { View } from "react-native";

export function NutritionProfileSkeleton() {
  const { theme } = useTheme();

  return (
    <View
      accessibilityLabel="Loading nutrition profile"
      accessibilityRole="progressbar"
      style={{
        flexDirection: "row",
        borderRadius: 14,
        padding: 12,
        borderWidth: 1.5,
        borderColor: theme.primary + "20",
        marginBottom: 8,
      }}
    >
      {[42, 52, 46].map((width, index) => (
        <View
          key={width}
          style={{
            flex: 1,
            alignItems: "center",
            gap: 7,
            borderLeftWidth: index === 0 ? 0 : 1,
            borderLeftColor: theme.border + "50",
          }}
        >
          <ShimmerSkeleton width={width} height={8} />
          <ShimmerSkeleton width={36} height={14} />
        </View>
      ))}
    </View>
  );
}

export function IntakeSummarySkeleton() {
  const { theme } = useTheme();

  return (
    <View accessibilityLabel="Loading intake summary" accessibilityRole="progressbar">
      <View style={{ flexDirection: "row", marginBottom: 18 }}>
        {[54, 42, 62].map((width, index) => (
          <View
            key={width}
            style={{
              flex: 1,
              alignItems: "center",
              gap: 6,
              borderLeftWidth: index === 0 ? 0 : 1,
              borderLeftColor: theme.border + "50",
            }}
          >
            <ShimmerSkeleton width={width} height={9} />
            <ShimmerSkeleton width={46} height={22} />
            <ShimmerSkeleton width={28} height={8} />
          </View>
        ))}
      </View>
      {["72%", "58%", "46%"].map((progress, index) => (
        <View key={progress} style={{ gap: 7, marginBottom: index === 2 ? 4 : 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <ShimmerSkeleton width={index === 1 ? 92 : 62} height={10} />
            <ShimmerSkeleton width={74} height={10} />
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.border + "50", overflow: "hidden" }}>
            <ShimmerSkeleton width={progress as `${number}%`} height={8} borderRadius={4} />
          </View>
        </View>
      ))}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
        <ShimmerSkeleton width={82} height={12} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <ShimmerSkeleton width={72} height={26} borderRadius={8} />
          <ShimmerSkeleton width={62} height={26} borderRadius={8} />
        </View>
      </View>
    </View>
  );
}

export function FoodDiaryInitialSkeleton() {
  const { theme } = useTheme();
  const cardStyle = {
    backgroundColor: theme.background,
    borderColor: theme.primary + "20",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
  } as const;

  return (
    <View style={{ gap: 16 }}>
      <NutritionProfileSkeleton />
      <View style={cardStyle}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
          <ShimmerSkeleton width={112} height={16} />
          <ShimmerSkeleton width={54} height={10} />
        </View>
        <IntakeSummarySkeleton />
      </View>
      <View style={cardStyle}>
        <ShimmerSkeleton width={106} height={16} style={{ marginBottom: 14 }} />
        <FoodEntriesSkeleton />
      </View>
    </View>
  );
}

export function FoodEntriesSkeleton() {
  return (
    <View accessibilityLabel="Loading food entries" accessibilityRole="progressbar" style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
        <ShimmerSkeleton width={72} height={12} />
        <ShimmerSkeleton width={42} height={20} borderRadius={10} />
      </View>
      {[0, 1].map((item) => (
        <View key={item} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <ShimmerSkeleton width={item === 0 ? "64%" : "48%"} height={14} />
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[42, 38, 44, 34].map((width) => (
                <ShimmerSkeleton key={width} width={width} height={20} borderRadius={8} />
              ))}
            </View>
          </View>
          <ShimmerSkeleton width={32} height={32} borderRadius={8} />
        </View>
      ))}
    </View>
  );
}

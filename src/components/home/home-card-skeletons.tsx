import { ShimmerSkeleton } from "@/components/base/shimmer-skeleton";
import { useTheme } from "@/context/ThemeContext";
import { View } from "react-native";

export function NutritionSummarySkeleton() {
  const { theme } = useTheme();

  return (
    <View accessibilityLabel="Loading nutrition summary">
      <View
        style={{
          width: 140,
          height: 140,
          alignSelf: "center",
          alignItems: "center",
          justifyContent: "center",
          marginVertical: 12,
        }}
      >
        <ShimmerSkeleton width={140} height={140} borderRadius={70} />
        <View
          style={{
            position: "absolute",
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: theme.card,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <ShimmerSkeleton width={58} height={8} borderRadius={4} />
          <ShimmerSkeleton width={48} height={20} borderRadius={6} />
          <ShimmerSkeleton width={28} height={8} borderRadius={4} />
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={{
              flex: 1,
              alignItems: "center",
              gap: 5,
              borderLeftWidth: index === 0 ? 0 : 1,
              borderLeftColor: theme.border,
            }}
          >
            <ShimmerSkeleton width={10} height={10} borderRadius={5} />
            <ShimmerSkeleton width={index === 1 ? 34 : 42} height={9} />
            <ShimmerSkeleton width={58} height={15} />
            <ShimmerSkeleton width={28} height={9} />
          </View>
        ))}
      </View>

      <View style={{ gap: 5, marginTop: 14 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <ShimmerSkeleton width={70} height={9} />
          <ShimmerSkeleton width={112} height={9} />
        </View>
        <ShimmerSkeleton height={8} borderRadius={4} />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <ShimmerSkeleton width={82} height={8} />
          <ShimmerSkeleton width={72} height={8} />
        </View>
      </View>

      <ShimmerSkeleton
        width={132}
        height={34}
        borderRadius={10}
        style={{ alignSelf: "center", marginTop: 16 }}
      />
    </View>
  );
}

export function RecentProgressSkeleton() {
  return (
    <View accessibilityLabel="Loading recent workout progress">
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 12,
          }}
        >
          <ShimmerSkeleton width={36} height={36} borderRadius={10} />
          <View style={{ flex: 1, gap: 7 }}>
            <ShimmerSkeleton width={index === 1 ? "64%" : "78%"} height={13} />
            <ShimmerSkeleton width={index === 2 ? "52%" : "68%"} height={10} />
          </View>
          <View style={{ width: 48, alignItems: "flex-end", gap: 6 }}>
            <ShimmerSkeleton width={48} height={13} />
            <ShimmerSkeleton width={34} height={8} />
          </View>
        </View>
      ))}
    </View>
  );
}

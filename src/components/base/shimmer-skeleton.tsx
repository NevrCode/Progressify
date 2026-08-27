import { useTheme } from "@/context/ThemeContext";
import { getSkeletonColors } from "@/constants/semantic-colors";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import {
  DimensionValue,
  StyleProp,
  useWindowDimensions,
  ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type ShimmerSkeletonProps = {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function ShimmerSkeleton({
  width = "100%",
  height,
  borderRadius = 10,
  style,
}: ShimmerSkeletonProps) {
  const { theme } = useTheme();
  const skeletonColors = getSkeletonColors(theme);
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(-screenWidth);

  useEffect(() => {
    translateX.value = -screenWidth;
    translateX.value = withRepeat(
      withTiming(screenWidth, {
        duration: 1300,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      false,
    );

    return () => cancelAnimation(translateX);
  }, [screenWidth, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius,
          borderCurve: "continuous",
          backgroundColor: skeletonColors.base,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: "100%",
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={[
            skeletonColors.base,
            skeletonColors.highlight,
            skeletonColors.base,
          ]}
          locations={[0.2, 0.5, 0.8]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </Animated.View>
  );
}

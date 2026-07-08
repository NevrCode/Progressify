import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type AnimatedProgressBarProps = {
  color: string;
  progress: number;
  trackColor: string;
  height?: number;
};

export function AnimatedProgressBar({
  color,
  progress,
  trackColor,
  height = 6,
}: AnimatedProgressBarProps) {
  const scale = useSharedValue(0);
  const clampedProgress = Math.min(Math.max(progress, 0), 100) / 100;

  useEffect(() => {
    scale.value = withTiming(clampedProgress, {
      duration: 260,
      reduceMotion: ReduceMotion.System,
    });
  }, [clampedProgress, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scale.value }],
  }));

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: trackColor,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[
          {
            width: "100%",
            height: "100%",
            borderRadius: height / 2,
            backgroundColor: color,
            transformOrigin: "left center",
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

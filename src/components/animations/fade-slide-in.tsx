import { PropsWithChildren } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeInUp, ReduceMotion } from "react-native-reanimated";

type FadeSlideInProps = PropsWithChildren<{
  delay?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function FadeSlideIn({ children, delay = 0, style }: FadeSlideInProps) {
  return (
    <Animated.View
      entering={FadeInUp.duration(220)
        .delay(delay)
        .reduceMotion(ReduceMotion.System)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

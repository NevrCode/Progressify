import {
  FontAwesome,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { ComponentProps, useEffect } from "react";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type FontAwesomeName = ComponentProps<typeof FontAwesome>["name"];
type MaterialIconsName = ComponentProps<typeof MaterialIcons>["name"];
type MaterialCommunityIconsName = ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

type AnimatedTabIconProps =
  | {
      family: "font-awesome";
      name: FontAwesomeName;
      label: string;
      focused: boolean;
      activeColor: string;
      inactiveColor: string;
    }
  | {
      family: "material";
      name: MaterialIconsName;
      label: string;
      focused: boolean;
      activeColor: string;
      inactiveColor: string;
    }
  | {
      family: "material-community";
      name: MaterialCommunityIconsName;
      label: string;
      focused: boolean;
      activeColor: string;
      inactiveColor: string;
    };

export function AnimatedTabIcon({
  family,
  name,
  label,
  focused,
  activeColor,
  inactiveColor,
}: AnimatedTabIconProps) {
  const focusProgress = useSharedValue(focused ? 1 : 0);
  const color = focused ? activeColor : inactiveColor;

  useEffect(() => {
    focusProgress.value = withSpring(focused ? 1 : 0, {
      damping: 17,
      stiffness: 190,
      mass: 0.7,
      reduceMotion: ReduceMotion.System,
    });
  }, [focusProgress, focused]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -5 * focusProgress.value },
      { scale: 1 + 0.06 * focusProgress.value },
    ],
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
    transform: [{ translateX: 8 - 8 * focusProgress.value }],
  }));

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
  }));

  return (
    <Animated.View
      style={{
        height: 44,
        width: 82,
        borderRadius: 22,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            inset: 0,
            borderRadius: 22,
            backgroundColor: activeColor + "14",
            borderWidth: 1.5,
            borderColor: activeColor + "30",
          },
          pillAnimatedStyle,
        ]}
      />
      <Animated.View style={iconAnimatedStyle}>
        {family === "font-awesome" ? (
          <FontAwesome name={name} size={19} color={color} />
        ) : family === "material-community" ? (
          <MaterialCommunityIcons name={name} size={21} color={color} />
        ) : (
          <MaterialIcons name={name} size={21} color={color} />
        )}
      </Animated.View>

      <Animated.Text
        numberOfLines={1}
        style={[
          {
            color,
            fontSize: 11,
            fontWeight: "800",
            fontFamily: "PlusJakartaSans_800ExtraBold",
          },
          labelAnimatedStyle,
        ]}
      >
        {label}
      </Animated.Text>
    </Animated.View>
  );
}

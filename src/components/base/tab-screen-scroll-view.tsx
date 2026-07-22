import { forwardRef } from "react";
import { ScrollView, ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabScreenScrollViewProps = ScrollViewProps & {
  tabBarClearance?: number;
};

export const TabScreenScrollView = forwardRef<
  ScrollView,
  TabScreenScrollViewProps
>(function TabScreenScrollView(
  { contentContainerStyle, tabBarClearance = 90, ...props },
  ref,
) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      ref={ref}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        contentContainerStyle,
        { paddingBottom: Math.max(insets.bottom + tabBarClearance, 110) },
      ]}
      {...props}
    />
  );
});

import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import {
  getNutritionAccents,
  getThemeSemantics,
} from "@/constants/semantic-colors";
import { useTheme } from "@/context/ThemeContext";
import { getWaterIntake, logWaterIntake } from "@/services/waterService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

const WATER_GOAL = 2000; // 2000 ml default

export function WaterTracker() {
  const { theme } = useTheme();
  const nutritionAccents = getNutritionAccents(theme.background);
  const semantics = getThemeSemantics(theme);
  const [waterAmount, setWaterAmount] = useState(0);
  const todayStr = new Date().toISOString().split("T")[0];

  // Animation values
  const [fillAnim] = useState(() => new Animated.Value(0));
  const [waveHorizontalAnim] = useState(() => new Animated.Value(0));
  const [bounceAnim] = useState(() => new Animated.Value(1));

  // Load water data on mount
  useEffect(() => {
    const loadWater = async () => {
      const amount = await getWaterIntake(todayStr);
      setWaterAmount(amount);
    };
    loadWater();
  }, [todayStr]);

  // Animate water level when amount changes
  useEffect(() => {
    const percentage = Math.min(waterAmount / WATER_GOAL, 1);
    Animated.spring(fillAnim, {
      toValue: percentage,
      useNativeDriver: true,
      tension: 20,
      friction: 6,
    }).start();
  }, [waterAmount, fillAnim]);

  // Infinite horizontal wave animation
  useEffect(() => {
    const startWaveAnimation = () => {
      waveHorizontalAnim.setValue(0);
      Animated.loop(
        Animated.timing(waveHorizontalAnim, {
          toValue: -120,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    };
    startWaveAnimation();
  }, [waveHorizontalAnim]);

  const triggerBounce = useCallback(() => {
    bounceAnim.setValue(0.92);
    Animated.spring(bounceAnim, {
      toValue: 1,
      tension: 150,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [bounceAnim]);

  const handleAddWater = async (amount: number) => {
    triggerBounce();
    const updated = await logWaterIntake(todayStr, amount);
    setWaterAmount(updated);
  };

  const handleCupTap = () => {
    // Quick log default of +250ml when tapping the cup itself
    handleAddWater(250);
  };

  // Interpolate translate Y of the water container
  // When percent is 0, water is at the bottom (translateY = 160)
  // When percent is 1, water is at the top (translateY = 15)
  const translateY = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [160, 15],
  });

  const percentageIntake = Math.round((waterAmount / WATER_GOAL) * 100);

  return (
    <ShadowGlowCard
      style={[
        styles.card,
        {
          borderColor: theme.primary + "20",
          borderWidth: 1.5,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <MaterialCommunityIcons
            name="water"
            size={20}
            color={nutritionAccents.water}
          />
          <Text style={[styles.title, { color: theme.textBlack }]}>
            Daily Water
          </Text>
        </View>
        <Text style={[styles.percentageText, { color: theme.primary }]}>
          {percentageIntake}% of Goal
        </Text>
      </View>

      {/* Centered Hero Section */}
      <View style={styles.heroContainer}>
        {/* Interactive Cup */}
        <TouchableOpacity
          onPress={handleCupTap}
          activeOpacity={0.9}
          style={styles.cupTouchable}
        >
          <Animated.View
            style={[
              styles.cupContainer,
              {
                borderColor: theme.border + "60",
                backgroundColor: theme.card,
                transform: [{ scale: bounceAnim }],
              },
            ]}
          >
            {/* Glass inner highlights */}
            <View style={styles.glassReflection} />

            {/* Masked water content */}
            <View style={styles.waterMask}>
              <Animated.View
                style={[
                  styles.waterBodyContainer,
                  {
                    transform: [{ translateY }],
                  },
                ]}
              >
                {/* Wave SVG */}
                <Animated.View
                  style={{
                    transform: [{ translateX: waveHorizontalAnim }],
                    width: 240,
                    height: 25,
                  }}
                >
                  <Svg width="240" height="25" viewBox="0 0 240 25" fill="none">
                    <Path
                      d="M0 15 C30 10, 30 20, 60 15 C90 10, 90 20, 120 15 C150 10, 150 20, 180 15 C210 10, 210 20, 240 15 L240 25 L0 25 Z"
                      fill={nutritionAccents.water}
                      opacity="0.85"
                    />
                  </Svg>
                </Animated.View>

                {/* Solid blue base water */}
                <View
                  style={[
                    styles.solidWater,
                    { backgroundColor: nutritionAccents.water },
                  ]}
                />
              </Animated.View>
            </View>

            {/* Tap prompt if empty, otherwise show current progress */}
            <View style={styles.labelContainer}>
              {waterAmount === 0 ? (
                <>
                  <MaterialCommunityIcons
                    name="gesture-tap"
                    size={20}
                    color={theme.textLight}
                  />
                  <Text
                    style={[styles.tapPromptText, { color: theme.textLight }]}
                  >
                    Tap to Log
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.progressText}>{waterAmount}</Text>
                  <Text style={styles.unitText}>ml</Text>
                </>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* Current status info */}
        <Text style={[styles.statusLabelText, { color: theme.textBlack }]}>
          {waterAmount} ml logged today
        </Text>
        <Text style={[styles.targetLabelText, { color: theme.textLight }]}>
          Target: {WATER_GOAL} ml
        </Text>

        {/* Action Row Toolbar */}
        <View style={styles.toolbarRow}>
          {/* Subtract button */}
          <TouchableOpacity
            style={[
              styles.toolbarCircleButton,
              {
                backgroundColor: semantics.danger + "14",
                borderColor: semantics.danger + "30",
                opacity: waterAmount <= 0 ? 0.4 : 1,
              },
            ]}
            onPress={() => handleAddWater(-250)}
            activeOpacity={0.7}
            disabled={waterAmount <= 0}
          >
            <MaterialCommunityIcons
              name="minus"
              size={16}
              color={semantics.danger}
            />
          </TouchableOpacity>

          {/* Quick Add Pills */}
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[
                styles.toolbarPill,
                {
                  backgroundColor: theme.primary + "08",
                  borderColor: theme.primary + "20",
                },
              ]}
              onPress={() => handleAddWater(250)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, { color: theme.textBlack }]}>
                +250ml
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toolbarPill,
                {
                  backgroundColor: theme.primary + "08",
                  borderColor: theme.primary + "20",
                },
              ]}
              onPress={() => handleAddWater(500)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, { color: theme.textBlack }]}>
                +500ml
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toolbarPill,
                {
                  backgroundColor: theme.primary + "08",
                  borderColor: theme.primary + "20",
                },
              ]}
              onPress={() => handleAddWater(1000)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, { color: theme.textBlack }]}>
                +1L
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ShadowGlowCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  percentageText: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  heroContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  cupTouchable: {
    marginBottom: 12,
  },
  cupContainer: {
    width: 120,
    height: 160,
    borderRadius: 24,
    borderWidth: 2,
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  glassReflection: {
    position: "absolute",
    top: 6,
    left: 10,
    width: 8,
    height: 144,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 4,
    zIndex: 5,
  },
  waterMask: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  waterBodyContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
    width: 120,
  },
  solidWater: {
    height: 160,
    width: "100%",
  },
  labelContainer: {
    position: "absolute",
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  progressText: {
    fontSize: 24,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  unitText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#fff",
    opacity: 0.9,
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginTop: -2,
  },
  tapPromptText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    marginTop: 4,
    textAlign: "center",
  },
  statusLabelText: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    marginBottom: 2,
  },
  targetLabelText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    marginBottom: 16,
  },
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  toolbarCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toolbarPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
});

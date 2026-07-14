import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

const SYNC_QUEUE_KEY = "@progressify_sync_queue";

export function SyncStatusBadge() {
  const { theme } = useTheme();
  const [queueCount, setQueueCount] = useState(0);
  const [spinAnim] = useState(() => new Animated.Value(0));
  const [fadeAnim] = useState(() => new Animated.Value(0));

  // Poll AsyncStorage for sync queue length
  useEffect(() => {
    const checkQueue = async () => {
      try {
        const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        if (raw) {
          const queue = JSON.parse(raw);
          setQueueCount(Array.isArray(queue) ? queue.length : 0);
        } else {
          setQueueCount(0);
        }
      } catch (err) {
        setQueueCount(0);
      }
    };

    // Check immediately
    checkQueue();

    // Check every 3 seconds
    const interval = setInterval(checkQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  // Handle spin and fade animations
  useEffect(() => {
    if (queueCount > 0) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Loop spin animation
      spinAnim.setValue(0);
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      spinAnim.stopAnimation();
    }
  }, [queueCount, fadeAnim, spinAnim]);

  if (queueCount === 0) return null;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          backgroundColor: theme.primary + "15",
          borderColor: theme.primary + "40",
        },
      ]}
    >
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <MaterialCommunityIcons name="sync" size={14} color={theme.primary} />
      </Animated.View>
      <Text style={[styles.text, { color: theme.primary }]}>
        Syncing ({queueCount})
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
});

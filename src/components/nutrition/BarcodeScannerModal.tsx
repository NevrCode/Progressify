import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
  isLoading: boolean;
}

export function BarcodeScannerModal({
  visible,
  onClose,
  onScanned,
  isLoading,
}: BarcodeScannerModalProps) {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [laserAnim] = useState(() => new Animated.Value(0));

  const startLaserAnimation = useCallback(() => {
    laserAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 200,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [laserAnim]);

  // Reset scanned state when modal opens
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setScanned(false);
      }, 0);
      startLaserAnimation();
      return () => clearTimeout(timer);
    }
  }, [visible, startLaserAnimation]);

  // Request camera permission if visible and not determined yet
  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || isLoading) return;
    setScanned(true);
    console.log(`[Barcode Scanner] Code scanned: ${data}`);
    onScanned(data);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header Overlay */}
        <View style={[styles.header, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
          <Text style={styles.headerTitle}>Barcode Scanner</Text>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: "rgba(255,255,255,0.15)" }]}
            onPress={onClose}
          >
            <MaterialIcons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Camera View Area */}
        {!permission ? (
          <View style={[styles.fallbackContainer, { backgroundColor: "#000" }]}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : !permission.granted ? (
          <View style={[styles.fallbackContainer, { backgroundColor: "#000" }]}>
            <MaterialIcons name="videocam-off" size={48} color="#aaa" style={{ marginBottom: 16 }} />
            <Text style={styles.fallbackText}>Camera permission is required to scan barcodes.</Text>
            <TouchableOpacity
              style={[styles.permissionBtn, { backgroundColor: theme.primary }]}
              onPress={requestPermission}
            >
              <Text style={styles.permissionBtnText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned || isLoading ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"],
            }}
          >
            {/* Overlay View Finder Mask */}
            <View style={styles.overlay}>
              <View style={styles.unfocusedRow} />
              
              <View style={styles.focusedRow}>
                <View style={styles.unfocusedCol} />
                
                {/* The Scanning Box */}
                <View style={[styles.scanBox, { borderColor: theme.primary }]}>
                  {/* Laser line */}
                  <Animated.View
                    style={[
                      styles.laserLine,
                      {
                        backgroundColor: theme.primary,
                        transform: [{ translateY: laserAnim }],
                      },
                    ]}
                  />
                  {/* Box Corners to look premium */}
                  <View style={[styles.corner, styles.cornerTL, { borderColor: theme.primary }]} />
                  <View style={[styles.corner, styles.cornerTR, { borderColor: theme.primary }]} />
                  <View style={[styles.corner, styles.cornerBL, { borderColor: theme.primary }]} />
                  <View style={[styles.corner, styles.cornerBR, { borderColor: theme.primary }]} />
                </View>
                
                <View style={styles.unfocusedCol} />
              </View>
              
              <View style={styles.unfocusedRow}>
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#fff" style={{ marginBottom: 8 }} />
                    <Text style={styles.statusText}>Searching product...</Text>
                  </View>
                ) : scanned ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#fff" style={{ marginBottom: 8 }} />
                    <Text style={styles.statusText}>Processing barcode...</Text>
                  </View>
                ) : (
                  <Text style={styles.statusText}>Align barcode inside the box</Text>
                )}
              </View>
            </View>
          </CameraView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
  },
  header: {
    height: 70,
    paddingTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  camera: {
    flex: 1,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  fallbackText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "PlusJakartaSans_500Medium",
    opacity: 0.8,
  },
  permissionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
  },
  permissionBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  unfocusedRow: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  focusedRow: {
    height: 200,
    flexDirection: "row",
  },
  unfocusedCol: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  scanBox: {
    width: 240,
    height: 200,
    borderWidth: 1.5,
    position: "relative",
    backgroundColor: "transparent",
  },
  laserLine: {
    height: 2,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderWidth: 3,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
});

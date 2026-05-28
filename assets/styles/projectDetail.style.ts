import { ThemeType } from "@/constants/colors";
import { StyleSheet } from "react-native";

export const projectStyle = (theme: ThemeType) =>
  StyleSheet.create({
    SafeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      padding: 20,
      paddingBottom: 36,
      gap: 18,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      color: theme.textBlack,
      fontSize: 28,
      fontWeight: "800",
    },
    headerButton: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: theme.white,
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    identityCard: {
      width: "100%",
      backgroundColor: theme.secondary,
      borderRadius: 8,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      shadowColor: theme.primary,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 4,
    },
  });

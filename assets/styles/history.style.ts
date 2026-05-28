import { ThemeType } from "@/constants/colors";
import { StyleSheet } from "react-native";

export const historyStyles = (theme: ThemeType) =>
  StyleSheet.create({
    searchContainer: {
      backgroundColor: theme.white,
      width: "100%",
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 10,
      borderRadius: 20,
      marginBottom: 10,
    },
    historyCard: {
      flexDirection: "row",
      padding: 12,
      backgroundColor: theme.card,
      borderRadius: 12,
      justifyContent: "space-between",
    },
  });

import { ThemeType } from "@/constants/colors";
import { StyleSheet } from "react-native";

export const photoStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.background,
      // padding: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    headerText: {
      fontSize: 14,
      fontWeight: "bold",
      marginBottom: 10,
    },
    addBalanceButton: {
      height: 85,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.primary,
      padding: 10,
      marginRight: 10,
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
    },

    utilButton: {
      width: 50,
      height: 50,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.textLight,
      padding: 10,
      borderRadius: 8,
    },

    takePictureButtonText: {
      color: theme.white,
      fontWeight: "bold",
    },
    utilButtonText: {
      fontSize: 12,
      color: theme.textLight,
      fontWeight: "bold",
    },
    historyItem: {
      padding: 10,
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sumCard: {
      marginHorizontal: 20,
      minWidth: 340,
      paddingRight: 20,
      backgroundColor: "white",
      borderRadius: 8,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.25,
      shadowRadius: 1.84,
      elevation: 0.2,
    },
    card: {
      marginHorizontal: 20,
      minWidth: 340,
      padding: 20,
      backgroundColor: "white",
      borderRadius: 8,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.25,
      shadowRadius: 1.84,
      elevation: 0.2,
    },
    input: {
      height: 40,
      width: 240,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 10,
      paddingHorizontal: 10,
    },
  });

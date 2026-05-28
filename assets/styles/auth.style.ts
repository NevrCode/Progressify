import { ThemeType } from "@/constants/colors";
import { Dimensions, StyleSheet } from "react-native";

const w = Dimensions.get("window").width;
const h = Dimensions.get("window").height;
export const authStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    signInButton: {
      justifyContent: "center",
      width: 120,
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: theme.white,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
    },
    signInButtonText: {
      color: theme.textLight,
      fontWeight: "bold",
    },
    loginButton: {
      width: 120,
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: theme.primary,
      padding: 10,
      borderRadius: 8,
    },
    loginButtonText: {
      color: theme.white,
      fontWeight: "bold",
    },
    card: {
      width: 200,
      padding: 20,
      backgroundColor: "green",
      height: 100,
    },
    input: {
      backgroundColor: theme.white,
      height: 40,
      width: w - 120,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
    },
    headerText: {
      fontWeight: "bold",
      color: theme.border,
    },
  });

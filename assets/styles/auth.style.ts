import { ThemeType } from "@/constants/colors";
import { createWithFont } from "./fontHelper";

export const authStyles = (theme: ThemeType) =>
  createWithFont({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    signInButton: {
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: theme.card,
      padding: 10,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
    },
    signInButtonText: {
      color: theme.textLight,
      fontWeight: "bold",
    },
    loginButton: {
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: theme.primary,
      padding: 10,
      borderRadius: 10,
    },
    loginButtonText: {
      color: theme.background,
      fontWeight: "bold",
    },
    card: {
      width: 200,
      padding: 20,
      backgroundColor: "green",
      height: 100,
    },
    input: {
      backgroundColor: theme.card,
      height: 40,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      color: theme.textBlack,
    },
    headerText: {
      fontWeight: "bold",
      color: theme.border,
    },
  });

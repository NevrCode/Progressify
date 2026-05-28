import { ThemeType } from "@/constants/colors";
import { StyleSheet } from "react-native";

export const whatIfStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      backgroundColor: "white",
      padding: 20,
    },
    dropdown: {
      height: 50,
      borderColor: theme.border,
      borderWidth: 0.5,
      borderRadius: 8,
      paddingHorizontal: 8,
    },
    icon: {
      marginRight: 5,
    },
    label: {
      position: "absolute",
      backgroundColor: "green",
      left: 22,
      top: 8,
      zIndex: 999,
      paddingHorizontal: 8,
      fontSize: 14,
    },
    placeholderStyle: {
      fontSize: 14,
      paddingLeft: 8,
    },
    selectedTextStyle: {
      fontSize: 14,
      paddingLeft: 8,
    },
    iconStyle: {
      width: 20,
      height: 20,
    },
    inputSearchStyle: {
      height: 40,
      fontSize: 14,
      paddingLeft: 8,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.text,
    },
  });

export default whatIfStyles;

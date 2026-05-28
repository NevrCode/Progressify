import { ThemeType } from "@/constants/colors";
import { Dimensions, StyleSheet } from "react-native";

const h = Dimensions.get("window").height;
const w = Dimensions.get("window").width;
export const baseStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.background,
      height: h,
      width: w,
      padding: 20,
    },
    headerText: {
      fontSize: 24,
      fontWeight: "bold",
    },
    TextFieldRow: {
      // backgroundColor: "red",
      flexDirection: "row",
      justifyContent: "space-between",
      alignContent: "center",
    },
    datePicker: {
      width: "80%",
      borderWidth: 1,
      backgroundColor: theme.white,
      borderRadius: 4,
      padding: 12,
      // justifyContent: "flex-end",
      borderColor: theme.border,
    },

    addDataTextField: {
      borderWidth: 0.7,
      backgroundColor: theme.white,
      borderRadius: 12,
      padding: 12,
      borderColor: theme.border,
    },
  });
// width: "80%",

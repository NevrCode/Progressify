import { StyleSheet } from "react-native";

export const mapFont = (style: any) => {
  if (!style) return style;
  const mapped = { ...style };
  if (mapped.fontWeight) {
    const weight = String(mapped.fontWeight);
    if (weight === "900" || weight === "800") {
      mapped.fontFamily = "PlusJakartaSans_800ExtraBold";
      delete mapped.fontWeight;
    } else if (weight === "700") {
      mapped.fontFamily = "PlusJakartaSans_700Bold";
      delete mapped.fontWeight;
    } else if (weight === "600" || weight === "500") {
      mapped.fontFamily = "PlusJakartaSans_500Medium";
      delete mapped.fontWeight;
    } else {
      mapped.fontFamily = "PlusJakartaSans_400Regular";
      delete mapped.fontWeight;
    }
  } else {
    if (
      mapped.fontSize ||
      mapped.color ||
      mapped.lineHeight ||
      mapped.textAlign ||
      mapped.letterSpacing
    ) {
      mapped.fontFamily = "PlusJakartaSans_400Regular";
    }
  }
  return mapped;
};

export const createWithFont = (stylesObj: any) => {
  const result: any = {};
  for (const key in stylesObj) {
    if (Object.prototype.hasOwnProperty.call(stylesObj, key)) {
      result[key] = mapFont(stylesObj[key]);
    }
  }
  return StyleSheet.create(result);
};

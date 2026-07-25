import { FONT_FAMILIES } from "@/constants/typography";
import { StyleSheet } from "react-native";

export const mapFont = (style: any) => {
  if (!style) return style;
  const mapped = { ...style };
  if (mapped.fontWeight) {
    const weight = String(mapped.fontWeight);
    if (weight === "900" || weight === "800") {
      mapped.fontFamily = FONT_FAMILIES.extraBold;
      delete mapped.fontWeight;
    } else if (weight === "700") {
      mapped.fontFamily = FONT_FAMILIES.bold;
      delete mapped.fontWeight;
    } else if (weight === "600") {
      mapped.fontFamily = FONT_FAMILIES.semibold;
      delete mapped.fontWeight;
    } else if (weight === "500") {
      mapped.fontFamily = FONT_FAMILIES.medium;
      delete mapped.fontWeight;
    } else {
      mapped.fontFamily = FONT_FAMILIES.regular;
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
      mapped.fontFamily = FONT_FAMILIES.regular;
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

import { ThemeType } from "@/constants/colors";
import { createWithFont } from "./fontHelper";

export const programsStyles = (theme: ThemeType) =>
  createWithFont({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 48,
      gap: 16,
    },
    card: {
      padding: 16,
      gap: 12,
      borderRadius: 16,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    launcherCard: {
      width: 230,
      justifyContent: "space-between",
      borderColor: theme.primary + "25",
    },
    // Hero treatment for the one card on this screen that matters most: the
    // active program summary. Solid primary fill instead of another
    // bordered `card`, matching the stats-bar "hero" language established on
    // the Gym tab — so across the app, exactly one surface per screen signals
    // "this is the thing," and everything else recedes into the plain card
    // family.
    heroCard: {
      padding: 16,
      gap: 6,
      borderRadius: 16,
      borderCurve: "continuous",
      backgroundColor: theme.primary,
    },
    heroCardLabel: {
      color: theme.background + "E6",
      fontSize: 11,
      fontFamily: "PlusJakartaSans_800ExtraBold",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    heroCardTitle: {
      color: theme.background,
      fontSize: 24,
      fontFamily: "PlusJakartaSans_800ExtraBold",
    },
    heroCardMeta: {
      color: theme.background + "E6",
      fontSize: 12,
    },
    modalCardCentered: {
      backgroundColor: theme.card,
    },
    modalCardSheet: {
      maxHeight: "78%",
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    loadingText: {
      color: theme.textLight,
    },
    sectionLabel: {
      color: theme.primary,
      fontSize: 11,
      fontFamily: "PlusJakartaSans_800ExtraBold",
    },
    titleXL: {
      color: theme.textBlack,
      fontSize: 24,
      fontFamily: "PlusJakartaSans_800ExtraBold",
    },
    titleLG: {
      color: theme.textBlack,
      fontSize: 18,
      fontFamily: "PlusJakartaSans_800ExtraBold",
    },
    titleMD: {
      color: theme.textBlack,
      fontSize: 18,
      fontFamily: "PlusJakartaSans_800ExtraBold",
    },
    titleSM: {
      color: theme.textBlack,
      fontSize: 16,
      fontFamily: "PlusJakartaSans_800ExtraBold",
    },
    titleXS: {
      color: theme.textBlack,
      fontSize: 14,
      fontFamily: "PlusJakartaSans_800ExtraBold",
    },
    plainTitle: {
      color: theme.textBlack,
      fontFamily: "PlusJakartaSans_800ExtraBold",
    },
    metaText: {
      color: theme.textLight,
      fontSize: 12,
    },
    metaTextSmall: {
      color: theme.textLight,
      fontSize: 11,
    },
    subtitleHint: {
      color: theme.textLight,
      fontSize: 11,
      lineHeight: 17,
    },
    sectionGap5: {
      gap: 5,
    },
    launcherScrollContent: {
      gap: 10,
      paddingRight: 20,
    },
    launcherPreview: {
      color: theme.textLight,
      fontSize: 11,
      lineHeight: 15,
      minHeight: 30,
    },
    rowSpaceBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    flexOneGap3: {
      flex: 1,
      gap: 3,
    },
    plannedExerciseWrap: {
      gap: 8,
    },
    modalOverlayCenter: {
      flex: 1,
      justifyContent: "center",
      padding: 20,
      backgroundColor: "rgba(0,0,0,0.7)",
    },
    modalOverlayBottom: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.65)",
    },
    modalActionsRow: {
      flexDirection: "row",
      gap: 10,
    },
    modalActionButton: {
      flex: 1,
    },
    exerciseRowSheet: {
      padding: 14,
      gap: 3,
      borderRadius: 12,
      borderCurve: "continuous",
      backgroundColor: theme.background,
    },
    exerciseSheetScrollContent: {
      gap: 8,
    },
    swipeDeleteAction: {
      alignItems: "center",
      backgroundColor: theme.expense,
      borderRadius: 10,
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      marginRight: 8,
      paddingHorizontal: 16,
    },
    swipeDeleteText: {
      color: theme.white,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 11,
    },
    swipeRowContent: {
      backgroundColor: theme.background,
      borderCurve: "continuous",
      borderRadius: 10,
      justifyContent: "center",
      minHeight: 38,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    swipeRowText: {
      color: theme.textBlack,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 12,
    },
  });

export type ProgramsStyles = ReturnType<typeof programsStyles>;

import { ThemeType } from "@/constants/colors";
import { StyleSheet, TextStyle, ViewStyle } from "react-native";

export type WorkStatus = "planned" | "active" | "review" | "done" | "blocked";
export type WorkPriority = "low" | "medium" | "high";

type IndicatorStyle = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

const statusColors = (
  theme: ThemeType,
): Record<WorkStatus, IndicatorStyle> => ({
  planned: {
    backgroundColor: "#EEF7EF",
    borderColor: theme.border,
    textColor: theme.textLight,
  },

  active: {
    backgroundColor: "#EAF7EC",
    borderColor: theme.primary,
    textColor: theme.primary,
  },

  review: {
    backgroundColor: "#FFF6E8",
    borderColor: theme.teriary,
    textColor: theme.teriary,
  },

  done: {
    backgroundColor: "#EDF8EA",
    borderColor: theme.income,
    textColor: theme.income,
  },

  blocked: {
    backgroundColor: "#FDECEC",
    borderColor: theme.expense,
    textColor: theme.expense,
  },
});

const priorityColors = (
  theme: ThemeType,
): Record<WorkPriority, IndicatorStyle> => ({
  low: {
    backgroundColor: "#EEF7EF",
    borderColor: theme.border,
    textColor: theme.textLight,
  },

  medium: {
    backgroundColor: "#FFF6E8",
    borderColor: theme.teriary,
    textColor: theme.teriary,
  },

  high: {
    backgroundColor: "#FDECEC",
    borderColor: theme.expense,
    textColor: theme.expense,
  },
});

export const workStyles = (theme: ThemeType) =>
  StyleSheet.create({
    safeArea: {
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
      justifyContent: "space-between",
      alignItems: "center",
    },
    eyebrow: {
      color: theme.textLight,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
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
      backgroundColor: theme.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    summaryCard: {
      width: "100%",
      backgroundColor: theme.secondary,
      borderRadius: 8,
      padding: 20,
      shadowColor: theme.primary,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 4,
    },
    summaryTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    summaryLabel: {
      color: theme.white,
      fontSize: 13,
      fontWeight: "700",
      opacity: 0.84,
    },
    summaryTitle: {
      color: theme.white,
      fontSize: 24,
      fontWeight: "800",
      marginTop: 6,
    },
    summaryIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.18)",
      justifyContent: "center",
      alignItems: "center",
    },
    summaryStats: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 22,
      paddingTop: 18,
      borderTopWidth: 1,
      borderTopColor: "rgba(255,255,255,0.18)",
    },
    summaryStat: {
      flex: 1,
    },
    summaryDivider: {
      width: 1,
      height: 34,
      backgroundColor: "rgba(255,255,255,0.2)",
      marginHorizontal: 12,
    },
    summaryStatLabel: {
      color: theme.white,
      fontSize: 12,
      fontWeight: "700",
      opacity: 0.76,
    },
    summaryStatValue: {
      color: theme.white,
      fontSize: 16,
      fontWeight: "800",
      marginTop: 4,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      color: theme.textBlack,
      fontSize: 18,
      fontWeight: "800",
    },
    sectionMeta: {
      color: theme.textLight,
      fontSize: 12,
      fontWeight: "700",
    },
    projectCard: {
      width: "100%",
      backgroundColor: theme.card,
      borderRadius: 8,
      padding: 18,
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 1,
    },
    projectHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 16,
    },
    projectName: {
      color: theme.textBlack,
      fontSize: 16,
      fontWeight: "800",
    },
    projectMeta: {
      color: theme.textLight,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 3,
    },
    projectProgressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    projectProgressLabel: {
      color: theme.textLight,
      fontSize: 12,
      fontWeight: "700",
    },
    budgetRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    budgetLabel: {
      color: theme.textLight,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    budgetValue: {
      color: theme.textBlack,
      fontSize: 14,
      fontWeight: "800",
      marginTop: 3,
    },
    taskCard: {
      width: "100%",
      backgroundColor: theme.card,
      borderRadius: 8,
      padding: 16,
      gap: 14,
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 1,
    },
    taskTopRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
    },
    taskIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: theme.background,
      justifyContent: "center",
      alignItems: "center",
    },
    taskTitle: {
      color: theme.textBlack,
      fontSize: 15,
      fontWeight: "800",
    },
    taskMeta: {
      color: theme.textLight,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 3,
    },
    taskChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    taskFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    taskFooterValue: {
      color: theme.textBlack,
      fontSize: 13,
      fontWeight: "800",
      marginTop: 3,
    },
    backendCard: {
      width: "100%",
      backgroundColor: theme.card,
      borderRadius: 8,
      padding: 18,
      gap: 8,
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 1,
    },
    backendText: {
      color: theme.textLight,
      fontSize: 13,
      fontWeight: "600",
      lineHeight: 20,
    },
  });

const getIndicatorStyle = (indicator: IndicatorStyle): ViewStyle => ({
  backgroundColor: indicator.backgroundColor,
  minHeight: 30,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 10,
  borderRadius: 8,
});

const getIndicatorTextStyle = (indicator: IndicatorStyle): TextStyle => ({
  color: indicator.textColor,
  fontSize: 11,
  fontWeight: "800",
  textTransform: "uppercase",
});
export const getStatusStyle = (
  theme: ThemeType,
  status: WorkStatus,
): ViewStyle => getIndicatorStyle(statusColors(theme)[status]);

export const getStatusTextStyle = (
  theme: ThemeType,
  status: WorkStatus,
): TextStyle => getIndicatorTextStyle(statusColors(theme)[status]);

export const getPriorityStyle = (
  theme: ThemeType,
  priority: WorkPriority,
): ViewStyle => getIndicatorStyle(priorityColors(theme)[priority]);

export const getPriorityTextStyle = (
  theme: ThemeType,
  priority: WorkPriority,
): TextStyle => getIndicatorTextStyle(priorityColors(theme)[priority]);

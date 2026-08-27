import {
  ActionStatus,
  type ActionFeedback,
} from "@/components/base/action-status";
import { DateNavigator } from "@/components/base/date-navigator";
import { PageHeader } from "@/components/base/page-header";

type FoodDiaryPageHeaderProps = {
  feedback?: ActionFeedback;
  onDateChange: (date: string) => void;
  onDismissFeedback: () => void;
  selectedDate: string;
};

const formatDateForApi = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateForApi(date);
};

const formatDateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export function FoodDiaryPageHeader({
  feedback,
  onDateChange,
  onDismissFeedback,
  selectedDate,
}: FoodDiaryPageHeaderProps) {
  return (
    <>
      <PageHeader eyebrow="Nutrition" title="Food Diary" />

      {feedback ? (
        <ActionStatus {...feedback} onDismiss={onDismissFeedback} />
      ) : null}

      <DateNavigator
        label={
          selectedDate === formatDateForApi(new Date())
            ? "Today"
            : formatDateLabel(selectedDate)
        }
        supportingLabel="Tap to reset date"
        onPrevious={() => onDateChange(addDays(selectedDate, -1))}
        onNext={() => onDateChange(addDays(selectedDate, 1))}
        onLabelPress={() => onDateChange(formatDateForApi(new Date()))}
      />
    </>
  );
}

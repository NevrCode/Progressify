import {
  getFoodDiarySummary,
  getFoodEntries,
} from "@/services/foodDiaryService";
import { useQuery } from "@tanstack/react-query";

export const FOOD_DIARY_QUERY_KEY = ["foodDiary"];

export const useFoodDiarySummary = (date: string) =>
  useQuery({
    queryKey: [...FOOD_DIARY_QUERY_KEY, "summary", date],
    queryFn: () => getFoodDiarySummary(date),
  });

export const useFoodEntries = () =>
  useQuery({
    queryKey: [...FOOD_DIARY_QUERY_KEY, "entries"],
    queryFn: () => getFoodEntries(),
  });

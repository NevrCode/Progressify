import {
  getFoodDiarySummary,
  getUserGoals,
  getUserProfile,
  overrideUserGoals,
  recalculateGoals,
  saveUserProfile,
  UserGoalOverrideRequest,
  UserProfileRequest,
} from "@/services/nutritionService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const NUTRITION_PROFILE_KEY = ["nutrition-profile"];
export const NUTRITION_GOALS_KEY = ["nutrition-goals"];
export const DIARY_SUMMARY_KEY = ["diary-summary"];

export const useNutritionProfile = () =>
  useQuery({
    queryKey: NUTRITION_PROFILE_KEY,
    queryFn: getUserProfile,
    retry: false, // 404 = no profile yet, don't spam retries
  });

export const useNutritionGoals = () =>
  useQuery({
    queryKey: NUTRITION_GOALS_KEY,
    queryFn: getUserGoals,
    retry: false,
  });

export const useTodayDiarySummary = (date: string) => {
  return useQuery({
    queryKey: [...DIARY_SUMMARY_KEY, date],
    queryFn: () => getFoodDiarySummary(date),
    enabled: !!date,
  });
};

export const useSaveNutritionProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UserProfileRequest) => saveUserProfile(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NUTRITION_PROFILE_KEY });
      queryClient.invalidateQueries({ queryKey: NUTRITION_GOALS_KEY });
    },
  });
};

export const useOverrideGoals = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UserGoalOverrideRequest) => overrideUserGoals(dto),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: NUTRITION_GOALS_KEY }),
  });
};

export const useRecalculateGoals = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recalculateGoals,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: NUTRITION_GOALS_KEY }),
  });
};

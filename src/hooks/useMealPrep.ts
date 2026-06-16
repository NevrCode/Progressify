import {
    createMealPrep,
    deleteMealPrep,
    getMealPreps,
    logMealPrepToDiary,
    MealPrepCreateRequest,
    MealPrepLogRequest,
    updateMealPrep,
} from "@/services/mealPrepService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const MEAL_PREP_QUERY_KEY = ["meal-prep"];

export const useMealPreps = () =>
  useQuery({
    queryKey: MEAL_PREP_QUERY_KEY,
    queryFn: () => getMealPreps(),
  });

export const useCreateMealPrep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: MealPrepCreateRequest) => createMealPrep(dto),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: MEAL_PREP_QUERY_KEY }),
  });
};

export const useUpdateMealPrep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: MealPrepCreateRequest }) =>
      updateMealPrep(id, dto),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: MEAL_PREP_QUERY_KEY }),
  });
};

export const useDeleteMealPrep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMealPrep(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: MEAL_PREP_QUERY_KEY }),
  });
};

export const useLogMealPrep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: MealPrepLogRequest }) =>
      logMealPrepToDiary(id, dto),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: MEAL_PREP_QUERY_KEY }),
  });
};

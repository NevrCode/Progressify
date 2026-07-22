import { api } from "@/utils/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface CustomFoodResponse {
  id: number;
  food_name: string;
  serving_description?: string;
  metric_serving_amount?: number;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
}

export interface CustomFoodCreateRequest {
  food_name: string;
  serving_description?: string;
  metric_serving_amount?: number;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
}

export const searchCustomFoods = async (
  query?: string,
): Promise<CustomFoodResponse[]> => {
  const res = await api.get("/v1/custom-foods", { params: { search: query } });
  return res.data;
};

export const createCustomFood = async (
  dto: CustomFoodCreateRequest,
): Promise<CustomFoodResponse> => {
  const res = await api.post("/v1/custom-foods", dto);
  return res.data;
};

export const deleteCustomFood = async (id: number): Promise<void> => {
  await api.delete(`/v1/custom-foods/${id}`);
};

export const CUSTOM_FOOD_KEY = ["custom-foods"];

export const useCustomFoodSearch = (query: string) =>
  useQuery({
    queryKey: [...CUSTOM_FOOD_KEY, query],
    queryFn: () => searchCustomFoods(query),
    enabled: query.trim().length >= 1,
  });

export const useCreateCustomFood = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomFood,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CUSTOM_FOOD_KEY }),
  });
};

export const useDeleteCustomFood = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomFood,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CUSTOM_FOOD_KEY }),
  });
};

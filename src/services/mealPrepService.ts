// reuse your existing axios instance
import { api } from "@/utils/api";
import type { OfflineQueuedResponse } from "@/utils/offline-response";
import { MealType } from "./foodDiaryService";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MealPrepItemRequest {
  food_id: string;
  food_name: string;
  serving_id?: string;
  serving_description?: string;
  gramation: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbohydrate?: number;
}

export interface MealPrepItemResponse {
  id: number;
  food_id: string;
  food_name: string;
  serving_id?: string;
  serving_description?: string;
  gramation: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbohydrate?: number;
}

export interface MealPrepResponse {
  id: number;
  name: string;
  description?: string;
  items: MealPrepItemResponse[];
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbohydrate: number;
}

export interface MealPrepCreateRequest {
  name: string;
  description?: string;
  items: MealPrepItemRequest[];
}

export interface MealPrepLogRequest {
  date: string; // epoch day
  meal_type: MealType;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const getMealPreps = async (
  page = 0,
  limit = 20,
): Promise<{
  data: MealPrepResponse[];
  totalElements: number;
  totalPages: number;
}> => {
  const res = await api.get("/v1/meal-prep", {
    params: { page, limit, sortBy: "id", direction: "desc" },
  });
  return res.data;
};

export const getMealPrepById = async (
  id: number,
): Promise<MealPrepResponse> => {
  const res = await api.get(`/v1/meal-prep/${id}`);
  return res.data;
};

export const createMealPrep = async (
  dto: MealPrepCreateRequest,
): Promise<void | OfflineQueuedResponse> => {
  const res = await api.post("/v1/meal-prep", dto);
  return res.data;
};

export const updateMealPrep = async (
  id: number,
  dto: MealPrepCreateRequest,
): Promise<void | OfflineQueuedResponse> => {
  const res = await api.put(`/v1/meal-prep/${id}`, dto);
  return res.data;
};

export const deleteMealPrep = async (
  id: number,
): Promise<void | OfflineQueuedResponse> => {
  const res = await api.delete(`/v1/meal-prep/${id}`);
  return res.data;
};

export const logMealPrepToDiary = async (
  id: number,
  dto: MealPrepLogRequest,
): Promise<void | OfflineQueuedResponse> => {
  const res = await api.post(`/v1/meal-prep/${id}/log`, dto);
  return res.data;
};

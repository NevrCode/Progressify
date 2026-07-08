import { api } from "@/utils/api";

export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export type FoodEntryCreateRequestDTO = {
  food_id: string;
  food_name: string;
  serving_id?: string;
  serving_description?: string;
  quantity: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbohydrate?: number;
  date: string;
  meal_type: MealType;
};

export type FoodEntryUpdateRequestDTO = {
  serving_id?: string;
  serving_description?: string;
  quantity?: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbohydrate?: number;
  date?: number;
  meal_type?: MealType;
};

export type FoodEntryDetailResponseDTO = {
  id: number;
  food_id?: string;
  food_name?: string;
  serving_id?: string;
  serving_description?: string;
  quantity?: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbohydrate?: number;
  date?: string;
  meal_type: MealType;
};

export type FoodDiarySummaryResponseDTO = {
  date?: string;
  calories_goal?: number;
  protein_goal?: number;
  total_calories?: number;
  total_protein?: number;
  total_carbohydrate?: number;
  total_fat?: number;
  calories?: number;
  protein?: number;
  carbohydrate?: number;
  fat?: number;
  entries?: FoodEntryDetailResponseDTO[];
};

export type ResultPageResponseDTO<T> = {
  data?: T[];
  content?: T[];
  total_elements?: number;
  totalElements?: number;
  total_pages?: number;
  totalPages?: number;
};

export type FatSecretSearchFood = {
  food_id: string;
  food_name: string;
  food_type?: string;
  food_description?: string;
  brand_name?: string;
};

export type FatSecretServing = {
  serving_id?: string;
  serving_description?: string;
  metric_serving_amount?: string;
  metric_serving_unit?: string;
  calories?: string;
  protein?: string;
  carbohydrate?: string;
  fat?: string;
};

export type FatSecretFoodDetail = {
  food_id: string;
  food_name: string;
  food_type?: string;
  brand_name?: string;
  serving?: FatSecretServing;
};

type FatSecretSearchResponse = {
  foods?: {
    food?: FatSecretSearchFood[] | FatSecretSearchFood;
  };
};

type FatSecretFoodResponse = {
  food?: FatSecretFoodDetail;
};

const toArray = <T>(value?: T[] | T): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const getApiErrorMessage = (error: any, fallback: string) => {
  const data = error.response?.data;
  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  return error.message || fallback;
};

export const searchFatSecretFoods = async (expression: string) => {
  if (!expression.trim()) return [];

  try {
    const response = await api.get<FatSecretSearchResponse>(
      "/v1/fatsecret/autocomplete",
      {
        params: {
          expression: expression.trim(),
          max_results: 8,
        },
      },
    );

    return toArray(response.data.foods?.food);
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, "Food search failed"));
  }
};

export const getFatSecretFood = async (foodId: string, servingId?: string) => {
  try {
    const response = await api.get<FatSecretFoodResponse>(
      "/v1/fatsecret/food",
      {
        params: {
          food_id: foodId,
          serving_id: servingId,
        },
      },
    );

    if (!response.data.food) {
      throw new Error("Food detail was not returned.");
    }

    return response.data.food;
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, "Food detail failed"));
  }
};

export const getFoodDiarySummary = async (date: string) => {
  try {
    const response = await api.get<FoodDiarySummaryResponseDTO>(
      "/v1/food-diary/summary",
      { params: { date } },
    );
    return response.data;
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, "Food diary summary failed"));
  }
};

export const getFoodEntries = async () => {
  try {
    const response = await api.get<
      ResultPageResponseDTO<FoodEntryDetailResponseDTO>
    >("/v1/food-diary", {
      params: {
        page: 0,
        limit: 25,
        sortBy: "id",
        direction: "desc",
      },
    });

    return response.data;
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, "Food entries failed"));
  }
};

export const createFoodEntry = async (dto: FoodEntryCreateRequestDTO) => {
  try {
    const response = await api.post<string>("/v1/food-diary", dto);
    return response.data;
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, "Create food entry failed"));
  }
};

export const updateFoodEntry = async (
  id: number,
  dto: FoodEntryUpdateRequestDTO,
) => {
  try {
    const response = await api.put<string>(`/v1/food-diary/${id}`, dto);
    return response.data;
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, "Update food entry failed"));
  }
};

export const deleteFoodEntry = async (id: number) => {
  try {
    await api.delete(`/v1/food-diary/${id}`);
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, "Delete food entry failed"));
  }
};

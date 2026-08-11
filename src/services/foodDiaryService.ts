import { logger } from "@/utils/logger";
import { api } from "@/utils/api";
import axios from "axios";
import { getErrorMessage } from "@/utils/apiError";

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

const getApiErrorMessage = (error: unknown, fallback: string) =>
  getErrorMessage(error, fallback);

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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Food diary summary failed"));
  }
};

export type FoodEntryPageOptions = {
  page?: number;
  limit?: number;
  sortBy?: "id" | "date";
  direction?: "asc" | "desc";
};

export const getFoodEntries = async (options: FoodEntryPageOptions = {}) => {
  try {
    const response = await api.get<
      ResultPageResponseDTO<FoodEntryDetailResponseDTO>
    >("/v1/food-diary", {
      params: {
        page: options.page ?? 0,
        limit: options.limit ?? 25,
        sortBy: options.sortBy ?? "id",
        direction: options.direction ?? "desc",
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Food entries failed"));
  }
};

export const createFoodEntry = async (dto: FoodEntryCreateRequestDTO) => {
  try {
    const response = await api.post<string>("/v1/food-diary", dto);
    return response.data;
  } catch (error) {
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
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Update food entry failed"));
  }
};

export const deleteFoodEntry = async (id: number) => {
  try {
    const response = await api.delete(`/v1/food-diary/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Delete food entry failed"));
  }
};

/** Restores the exact soft-deleted diary entry; it never creates a replacement. */
export const restoreFoodEntry = async (id: number) => {
  try {
    const response = await api.post(`/v1/food-diary/${id}/restore`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Restore food entry failed"));
  }
};

/**
 * The proxy forwards FatSecret's response shape verbatim, and
 * `food.find_id_for_barcode` has been observed returning the id under either
 * key depending on the food. Both are optional here for that reason.
 */
type FatSecretBarcodeLookup = {
  results?: { food_id?: string };
  food?: { food_id?: string };
};

export const findFoodByBarcode = async (
  barcode: string,
): Promise<FatSecretFoodDetail> => {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) {
    throw new Error("Barcode is empty.");
  }

  // 1. Try Open Food Facts first (Free, open database)
  try {
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`,
      {
        timeout: 5000,
      },
    );

    if (response.data && response.data.status === 1 && response.data.product) {
      const product = response.data.product;
      const nutriments = product.nutriments || {};

      // Map Open Food Facts to FatSecretFoodDetail format
      const calories =
        nutriments["energy-kcal_100g"] !== undefined
          ? nutriments["energy-kcal_100g"]
          : nutriments["energy-kcal"] !== undefined
            ? nutriments["energy-kcal"]
            : 0;

      return {
        food_id: `OFF_${cleanBarcode}`,
        food_name: product.product_name || `Product ${cleanBarcode}`,
        brand_name: product.brands || "Unknown Brand",
        food_type: "Barcode Scanned",
        serving: {
          serving_id: "1",
          serving_description: "100g",
          metric_serving_amount: "100",
          metric_serving_unit: "g",
          calories: String(calories),
          protein: String(nutriments.proteins_100g || 0),
          carbohydrate: String(nutriments.carbohydrates_100g || 0),
          fat: String(nutriments.fat_100g || 0),
        },
      };
    }
  } catch {
    logger.warn("barcode_open_food_facts_lookup_failed");
  }

  // 2. Fallback to FatSecret barcode lookup
  try {
    // First, look up the food_id for this barcode
    const searchResponse = await api.get<FatSecretBarcodeLookup>("/v1/fatsecret", {
      params: {
        method: "food.find_id_for_barcode",
        barcode: cleanBarcode,
      },
    });

    const foodId =
      searchResponse.data?.results?.food_id ||
      searchResponse.data?.food?.food_id;
    if (foodId) {
      // Then, get the full food details
      return await getFatSecretFood(foodId);
    }
  } catch {
    logger.warn("barcode_fatsecret_lookup_failed");
  }

  throw new Error("Product not found. Please log manually or search by name.");
};

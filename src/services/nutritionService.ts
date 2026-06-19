import { api } from "@/utils/api";
import { FoodEntryDetailResponseDTO } from "./foodDiaryService";

export type Gender = "MALE" | "FEMALE";
export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHTLY_ACTIVE"
  | "MODERATELY_ACTIVE"
  | "VERY_ACTIVE"
  | "EXTRA_ACTIVE";
export type GoalType = "CUT" | "MAINTAIN" | "BULK";

export interface UserProfileRequest {
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: Gender;
  activity_level: ActivityLevel;
  goal_type: GoalType;
}

export interface UserProfileResponse {
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: Gender;
  activity_level: ActivityLevel;
  goal_type: GoalType;
  calculated_tdee: number;
  calculated_calories: number;
}

export interface UserGoalResponse {
  calories_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  fiber_goal: number;
  sodium_goal: number;
  sugar_goal: number;
  cholesterol_goal: number;
  potassium_goal: number;
  manualOverride: boolean;
}

export interface UserGoalOverrideRequest {
  calories_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  fiber_goal?: number;
  sodium_goal?: number;
  sugar_goal?: number;
  cholesterol_goal?: number;
  potassium_goal?: number;
}

export interface MacroProgress {
  consumed: number;
  goal: number;
  remaining: number;
  percentage: number;
}

export interface DailyMacroProgress {
  calories: MacroProgress;
  protein: MacroProgress;
  carbohydrate: MacroProgress;
  fat: MacroProgress;
  fiber: MacroProgress;
  sodium: MacroProgress;
  sugar: MacroProgress;
  cholesterol: MacroProgress;
  potassium: MacroProgress;
}

export interface FoodDiarySummary {
  date: string;
  totals: {
    calories: number;
    protein: number;
    carbohydrate: number;
    fat: number;
    fiber: number;
    sodium: number;
    sugar: number;
    cholesterol: number;
    potassium: number;
  };
  goals: UserGoalResponse;
  progress: DailyMacroProgress;
  status: "UNDER" | "ON_TRACK" | "OVER";
  entries: FoodEntryDetailResponseDTO[];
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const saveUserProfile = async (
  dto: UserProfileRequest,
): Promise<UserProfileResponse> => {
  const res = await api.post("/v1/profile", dto);
  return res.data;
};

export const getUserProfile = async (): Promise<UserProfileResponse> => {
  const res = await api.get("/v1/profile");
  return res.data;
};

export const getUserGoals = async (): Promise<UserGoalResponse> => {
  const res = await api.get("/v1/profile/goals");
  return res.data;
};

export const overrideUserGoals = async (
  dto: UserGoalOverrideRequest,
): Promise<UserGoalResponse> => {
  const res = await api.put("/v1/profile/goals", dto);
  return res.data;
};

export const recalculateGoals = async (): Promise<UserGoalResponse> => {
  const res = await api.post("/v1/profile/goals/recalculate");
  return res.data;
};

export const getFoodDiarySummary = async (
  date: string,
): Promise<FoodDiarySummary> => {
  const res = await api.get("/v1/food-diary/summary", { params: { date } });
  return res.data;
};

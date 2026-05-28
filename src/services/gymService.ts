import { api } from "@/utils/api";
import * as SecureStore from "expo-secure-store";

export type SplitType = "PUSH" | "PULL" | "LEGS";

export interface SplitSummaryDTO {
  id: number;
  split: string;
  next_day?: string;
  next_workout_date?: string;
  exercises?: number;
  exercise_count?: number;
}

export interface SplitWorkoutDTO {
  id: number;
  split: string;
  date?: string;
  workout_date?: string;
  duration?: string;
  exercises?: number;
  exercise_count?: number;
  total_volume?: number;
  focus?: string;
}

export interface WorkoutSetDTO {
  id?: number;
  set_number: number;
  weight: number;
  reps: number;
  rir?: number;
  split_workout_id?: number;
  session_id?: number;
}

export interface ExerciseSessionDTO {
  id: number;
  split_workout_id?: number;
  session_date?: string;
  notes?: string;
  sets?: WorkoutSetDTO[];
}

export interface GymExerciseSessionRequestDTO {
  split_workout_id?: number;
  session_date?: string;
  notes?: string;
  sets?: WorkoutSetDTO[];
}

export interface ProgressPointDTO {
  id: number;
  label?: string;
  top_set_weight?: number;
  weight?: number;
}

export interface ExerciseProgressionDTO {
  id: number;
  split: string;
  name?: string;
  muscle_group?: string;
  target_rep_range?: string;
  last_session_date?: string;
  notes?: string;
  progression?: ProgressPointDTO[];
  workout_sets?: WorkoutSetDTO[];
  last_workout_sets?: WorkoutSetDTO[];
  exercise_sessions?: ExerciseSessionDTO[];
}

export interface GymDashboardResponseDTO {
  split_summary?: SplitSummaryDTO[];
  split_summaries?: SplitSummaryDTO[];
  split_workouts?: SplitWorkoutDTO[];
  exercise_progressions?: ExerciseProgressionDTO[];
}

export interface GymSplitSummaryRequestDTO {
  split: SplitType;
  next_day: string;
  exercises: number;
}

export interface GymSplitWorkoutRequestDTO {
  split: SplitType;
  date: string;
  duration: string;
  exercises: number;
  total_volume: number;
  focus: string;
}

export interface GymExerciseProgressionRequestDTO {
  split: SplitType;
  name: string;
  muscle_group: string;
  target_rep_range: string;
  last_session_date: string;
  notes: string;
}

export interface GymWorkoutSetRequestDTO {
  set_number: number;
  weight: number;
  reps: number;
  rir: number;
  is_drop_set: boolean;
}

export interface GymProgressPointRequestDTO {
  label: string;
  top_set_weight: number;
}

const getAuthHeaders = async () => {
  const token = await SecureStore.getItemAsync("access_token");

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const getApiErrorMessage = (error: any, fallbackMessage: string) => {
  const data = error.response?.data;

  if (!data) return fallbackMessage;
  if (typeof data === "string") return data;
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }
  if (Array.isArray(data.errors) && data.errors.length) {
    return data.errors
      .map((item: any) =>
        typeof item === "string"
          ? item
          : `${item.field ?? item.path ?? "field"}: ${item.message ?? item.defaultMessage ?? "invalid"}`,
      )
      .join("\n");
  }
  if (Array.isArray(data.fieldErrors) && data.fieldErrors.length) {
    return data.fieldErrors
      .map(
        (item: any) =>
          `${item.field ?? item.path ?? "field"}: ${item.message ?? item.defaultMessage ?? "invalid"}`,
      )
      .join("\n");
  }

  return fallbackMessage;
};

const handleApiError = (error: any, fallbackMessage: string) => {
  const message = getApiErrorMessage(error, fallbackMessage);
  console.log("ERROR DATA:", error.response?.data ?? error.message ?? error);
  console.log("STATUS:", error.response?.status);
  throw new Error(message);
};

export const getGymDashboard = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.get<GymDashboardResponseDTO>(
      "/v1/gym/dashboard",
      {
        headers,
      },
    );

    return response.data;
  } catch (error: any) {
    handleApiError(error, "Read gym dashboard failed");
  }
};

export const createSplitSummary = async (dto: GymSplitSummaryRequestDTO) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.post<SplitSummaryDTO>(
      "/v1/gym/split-summary",
      dto,
      {
        headers,
      },
    );

    return response.data;
  } catch (error: any) {
    handleApiError(error, "Create split summary failed");
  }
};

export const updateSplitSummary = async (
  id: number,
  dto: GymSplitSummaryRequestDTO,
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.put<SplitSummaryDTO>(
      `/v1/gym/split-summary/${id}`,
      dto,
      { headers },
    );

    return response.data;
  } catch (error: any) {
    handleApiError(error, "Update split summary failed");
  }
};

export const deleteSplitSummary = async (id: number) => {
  try {
    const headers = await getAuthHeaders();
    await api.delete(`/v1/gym/split-summary/${id}`, { headers });
  } catch (error: any) {
    handleApiError(error, "Delete split summary failed");
  }
};

export const createSplitWorkout = async (dto: GymSplitWorkoutRequestDTO) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.post<SplitWorkoutDTO>(
      "/v1/gym/split-workouts",
      dto,
      {
        headers,
      },
    );

    return response.data;
  } catch (error: any) {
    handleApiError(error, "Create split workout failed");
  }
};

export const updateSplitWorkout = async (
  id: number,
  dto: GymSplitWorkoutRequestDTO,
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.put<SplitWorkoutDTO>(
      `/v1/gym/split-workouts/${id}`,
      dto,
      { headers },
    );

    return response.data;
  } catch (error: any) {
    handleApiError(error, "Update split workout failed");
  }
};
export const deleteSessionProgression = async (id: number) => {
  try {
    const headers = await getAuthHeaders();
    await api.delete(`/v1/gym/exercise-sessions/${id}`, { headers });
  } catch (error: any) {
    handleApiError(error, "Delete session Prog failed");
  }
};

export const deleteSplitWorkout = async (id: number) => {
  try {
    const headers = await getAuthHeaders();
    await api.delete(`/v1/gym/split-workouts/${id}`, { headers });
  } catch (error: any) {
    handleApiError(error, "Delete split workout failed");
  }
};
export const createExerciseSession = async (
  exerciseProgressionId: number,
  dto: GymExerciseSessionRequestDTO,
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.post<ExerciseSessionDTO>(
      `/v1/gym/exercise-progressions/${exerciseProgressionId}/sessions`,
      dto,
      { headers },
    );

    return response.data;
  } catch (error: any) {
    handleApiError(error, "Create exercise session failed");
  }
};
export const updateExerciseSession = async (
  id: number,
  dto: GymExerciseSessionRequestDTO,
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.put<ExerciseSessionDTO>(
      `/v1/gym/exercise-sessions/${id}`,
      dto,
      { headers },
    );

    return response.data;
  } catch (error: any) {
    handleApiError(error, "Update exercise session failed");
  }
};

export const createExerciseProgression = async (
  dto: GymExerciseProgressionRequestDTO,
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.post<ExerciseProgressionDTO>(
      "/v1/gym/exercise-progressions",
      dto,
      { headers },
    );

    return response.data;
  } catch (error: any) {
    handleApiError(error, "Create exercise progression failed");
  }
};

export const updateExerciseProgression = async (
  id: number,
  dto: GymExerciseProgressionRequestDTO,
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.put<ExerciseProgressionDTO>(
      `/v1/gym/exercise-progressions/${id}`,
      dto,
      { headers },
    );

    return response.data;
  } catch (error: any) {
    handleApiError(error, "Update exercise progression failed");
  }
};

export const deleteExerciseProgression = async (id: number) => {
  try {
    const headers = await getAuthHeaders();
    await api.delete(`/v1/gym/exercise-progressions/${id}`, { headers });
  } catch (error: any) {
    handleApiError(error, "Delete exercise progression failed");
  }
};

export const createWorkoutSet = async (
  exerciseProgressionId: number,
  dto: GymWorkoutSetRequestDTO,
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.post<WorkoutSetDTO>(
      `/v1/gym/exercise-progressions/${exerciseProgressionId}/workout-sets`,
      dto,
      { headers },
    );

    return response.data;
  } catch (error: any) {
    handleApiError(error, "Create workout set failed");
  }
};

export const updateWorkoutSet = async (
  id: number,
  dto: GymWorkoutSetRequestDTO,
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.put<WorkoutSetDTO>(
      `/v1/gym/workout-sets/${id}`,
      dto,
      {
        headers,
      },
    );

    return response.data;
  } catch (error: any) {
    handleApiError(error, "Update workout set failed");
  }
};

export const deleteWorkoutSet = async (id: number) => {
  try {
    const headers = await getAuthHeaders();
    await api.delete(`/v1/gym/workout-sets/${id}`, { headers });
  } catch (error: any) {
    handleApiError(error, "Delete workout set failed");
  }
};

export const createProgressPoint = async (
  exerciseProgressionId: number,
  dto: GymProgressPointRequestDTO,
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.post<ProgressPointDTO>(
      `/v1/gym/exercise-progressions/${exerciseProgressionId}/progress-points`,
      dto,
      { headers },
    );

    return response.data;
  } catch (error: any) {
    handleApiError(error, "Create progress point failed");
  }
};

export const updateProgressPoint = async (
  id: number,
  dto: GymProgressPointRequestDTO,
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.put<ProgressPointDTO>(
      `/v1/gym/progress-points/${id}`,
      dto,
      { headers },
    );

    return response.data;
  } catch (error: any) {
    handleApiError(error, "Update progress point failed");
  }
};

export const deleteProgressPoint = async (id: number) => {
  try {
    const headers = await getAuthHeaders();
    await api.delete(`/v1/gym/progress-points/${id}`, { headers });
  } catch (error: any) {
    handleApiError(error, "Delete progress point failed");
  }
};

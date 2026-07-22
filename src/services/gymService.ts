import { getAccessToken } from "@/services/authSessionService";
import { api } from "@/utils/api";
import { getErrorMessage } from "@/utils/apiError";

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
  session_date?: string;
  notes?: string;
  sets?: WorkoutSetDTO[];
}

export interface GymExerciseSessionRequestDTO {
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
  exercise_progressions?: ExerciseProgressionDTO[];
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
  const token = await getAccessToken();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const handleApiError = (error: unknown, fallbackMessage: string): never => {
  const message = getErrorMessage(error, fallbackMessage);
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

export const deleteSessionProgression = async (id: number) => {
  try {
    const headers = await getAuthHeaders();
    await api.delete(`/v1/gym/exercise-sessions/${id}`, { headers });
  } catch (error: any) {
    handleApiError(error, "Delete session Prog failed");
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

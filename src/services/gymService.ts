import { getAccessToken } from "@/services/authSessionService";
import { api } from "@/utils/api";
import { getErrorMessage, toApiError } from "@/utils/apiError";
import {
  type WorkoutSetType,
  withNormalizedWorkoutSetType,
} from "@/types/workout-set";

export interface WorkoutSetDTO {
  id?: number;
  set_number: number;
  weight: number;
  reps: number;
  rir?: number;
  set_type?: WorkoutSetType;
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
  workout_session_id?: number;
  planned_exercise_id?: number;
}

/** Ensures every session write uses the explicit backend set-type contract. */
export const normalizeExerciseSessionRequest = (
  dto: GymExerciseSessionRequestDTO,
): GymExerciseSessionRequestDTO => ({
  ...dto,
  ...(dto.sets
    ? {
        sets: dto.sets.map(withNormalizedWorkoutSetType),
      }
    : {}),
});

export interface ProgressPointDTO {
  id: number;
  label?: string;
  top_set_weight?: number;
  weight?: number;
}

export interface ExerciseProgressionDTO {
  id: number;
  catalog_exercise_id?: string | null;
  name?: string;
  muscle_group?: string;
  target_rep_range?: string;
  last_session_date?: string;
  notes?: string;
  progression?: ProgressPointDTO[];
  workout_sets?: WorkoutSetDTO[];
  last_workout_sets?: WorkoutSetDTO[];
  exercise_sessions?: ExerciseSessionDTO[];
  recommendation?: ProgressionRecommendationDTO;
}

export type ProgressionRecommendationAction =
  | "INCREASE_WEIGHT"
  | "ADD_REPS"
  | "MAINTAIN"
  | "REDUCE_WEIGHT"
  | "INSUFFICIENT_DATA";

export interface ProgressionRecommendationDTO {
  action: ProgressionRecommendationAction;
  suggested_weight?: number | null;
  target_reps_min: number;
  target_reps_max: number;
  target_rir: number;
  target_sets: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
}

export interface GymDashboardResponseDTO {
  exercise_progressions?: ExerciseProgressionDTO[];
}

export interface ExerciseProgressionPageDTO {
  data: ExerciseProgressionDTO[];
  total_elements: number;
  total_pages: number;
  page: number;
}

export interface GymExerciseProgressionRequestDTO {
  catalog_exercise_id: string | null;
  name: string;
  muscle_group: string;
  target_rep_range: string;
  last_session_date?: string;
  notes: string;
}

export interface GymWorkoutSetRequestDTO {
  set_number: number;
  weight: number;
  reps: number;
  rir: number;
  is_drop_set: boolean;
  set_type?: WorkoutSetType;
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
  } catch (error) {
    throw toApiError(error);
  }
};

export const getExerciseProgressionPage = async ({
  page,
  limit,
  search,
}: {
  page: number;
  limit: number;
  search?: string;
}): Promise<ExerciseProgressionPageDTO> => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.get<
      | ExerciseProgressionDTO[]
      | {
          data?: ExerciseProgressionDTO[];
          content?: ExerciseProgressionDTO[];
          total_elements?: number;
          totalElements?: number;
          total_pages?: number;
          totalPages?: number;
          number?: number;
        }
    >("/v1/gym/exercise-progressions", {
      headers,
      params: {
        page,
        limit,
        ...(search ? { search } : {}),
      },
    });

    const payload = response.data;
    if (Array.isArray(payload)) {
      const keyword = search?.toLowerCase();
      const filtered = keyword
        ? payload.filter((exercise) =>
            [
              exercise.name,
              exercise.muscle_group,
              exercise.notes,
            ].some((value) => value?.toLowerCase().includes(keyword)),
          )
        : payload;
      const offset = page * limit;

      return {
        data: filtered.slice(offset, offset + limit),
        total_elements: filtered.length,
        total_pages: Math.ceil(filtered.length / limit),
        page,
      };
    }

    return {
      data: payload.data ?? payload.content ?? [],
      total_elements: payload.total_elements ?? payload.totalElements ?? 0,
      total_pages: payload.total_pages ?? payload.totalPages ?? 0,
      page: payload.number ?? page,
    };
  } catch (error) {
    throw toApiError(error);
  }
};

export const deleteSessionProgression = async (id: number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.delete(`/v1/gym/exercise-sessions/${id}`, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Delete session Prog failed");
  }
};

/** Restores the same saved session and its still-associated sets. */
export const restoreSessionProgression = async (id: number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.post(`/v1/gym/exercise-sessions/${id}/restore`, null, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Restore session failed");
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
      normalizeExerciseSessionRequest(dto),
      { headers },
    );

    return response.data;
  } catch (error) {
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
      normalizeExerciseSessionRequest(dto),
      { headers },
    );

    return response.data;
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    handleApiError(error, "Update exercise progression failed");
  }
};

export const deleteExerciseProgression = async (id: number) => {
  try {
    const headers = await getAuthHeaders();
    await api.delete(`/v1/gym/exercise-progressions/${id}`, { headers });
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    handleApiError(error, "Update workout set failed");
  }
};

export const deleteWorkoutSet = async (id: number) => {
  try {
    const headers = await getAuthHeaders();
    await api.delete(`/v1/gym/workout-sets/${id}`, { headers });
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    handleApiError(error, "Update progress point failed");
  }
};

export const deleteProgressPoint = async (id: number) => {
  try {
    const headers = await getAuthHeaders();
    await api.delete(`/v1/gym/progress-points/${id}`, { headers });
  } catch (error) {
    handleApiError(error, "Delete progress point failed");
  }
};

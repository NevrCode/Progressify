import { getAccessToken } from "@/services/authSessionService";
import { api } from "@/utils/api";
import { toApiError } from "@/utils/apiError";

export type ProgramTemplate =
  | "PUSH_PULL_LEGS"
  | "UPPER_LOWER"
  | "FULL_BODY"
  | "BRO_SPLIT"
  | "CUSTOM";
export type ProgramStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type PlannedExerciseDTO = {
  id: number;
  exercise_progression_id: number;
  exercise_name: string;
  muscle_group?: string;
  catalog_exercise_id?: string | null;
  position: number;
  target_sets?: number;
  target_rep_min?: number;
  target_rep_max?: number;
  target_rir?: number;
  rest_seconds?: number;
  notes?: string;
};

export type WorkoutRoutineDTO = {
  id: number;
  name: string;
  position: number;
  planned_exercises: PlannedExerciseDTO[];
};

export type WorkoutProgramDTO = {
  id: number;
  name: string;
  template_type: ProgramTemplate;
  status: ProgramStatus;
  started_at?: string;
  ended_at?: string;
  routines: WorkoutRoutineDTO[];
};

export type StartedWorkoutDTO = {
  id: number;
  program_id: number;
  routine_id: number;
  routine_name_snapshot: string;
  started_at: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  exercises: PlannedExerciseDTO[];
};

export type PlannedExerciseRequest = {
  exercise_progression_id: number;
  position: number;
  target_sets?: number;
  target_rep_min?: number;
  target_rep_max?: number;
  target_rir?: number;
  rest_seconds?: number;
  notes?: string;
};

const headers = async () => ({
  Authorization: `Bearer ${await getAccessToken()}`,
  "Content-Type": "application/json",
});

const call = async <T>(request: () => Promise<{ data: T }>) => {
  try {
    return (await request()).data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getWorkoutPrograms = () =>
  call<WorkoutProgramDTO[]>(async () =>
    api.get("/v1/gym/programs", { headers: await headers() }),
  );

export const createWorkoutProgram = (name: string, templateType: ProgramTemplate) =>
  call<WorkoutProgramDTO>(async () =>
    api.post(
      "/v1/gym/programs",
      { name, template_type: templateType },
      { headers: await headers() },
    ),
  );

export const activateWorkoutProgram = (id: number) =>
  call<WorkoutProgramDTO>(async () =>
    api.post(`/v1/gym/programs/${id}/activate`, null, { headers: await headers() }),
  );

export const completeWorkoutProgram = (id: number) =>
  call<WorkoutProgramDTO>(async () =>
    api.post(`/v1/gym/programs/${id}/complete`, null, { headers: await headers() }),
  );

export const createWorkoutRoutine = (programId: number, name: string, position: number) =>
  call<WorkoutRoutineDTO>(async () =>
    api.post(
      `/v1/gym/programs/${programId}/routines`,
      { name, position },
      { headers: await headers() },
    ),
  );

export const addPlannedExercise = (routineId: number, request: PlannedExerciseRequest) =>
  call<PlannedExerciseDTO>(async () =>
    api.post(`/v1/gym/routines/${routineId}/exercises`, request, {
      headers: await headers(),
    }),
  );

export const deletePlannedExercise = async (id: number) => {
  try {
    await api.delete(`/v1/gym/planned-exercises/${id}`, { headers: await headers() });
  } catch (error) {
    throw toApiError(error);
  }
};

export const startWorkoutRoutine = (routineId: number) =>
  call<StartedWorkoutDTO>(async () =>
    api.post(`/v1/gym/routines/${routineId}/start`, null, { headers: await headers() }),
  );

export const completeWorkoutSession = (id: number) =>
  call<StartedWorkoutDTO>(async () =>
    api.post(`/v1/gym/workout-sessions/${id}/complete`, null, {
      headers: await headers(),
    }),
  );

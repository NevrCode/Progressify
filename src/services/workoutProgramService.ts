import { getAccessToken } from "@/services/authSessionService";
import { api } from "@/utils/api";
import { toApiError } from "@/utils/apiError";
import * as Crypto from "expo-crypto";

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
  target_sets?: number | null;
  target_rep_min?: number | null;
  target_rep_max?: number | null;
  target_rir?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
  group_id?: string | null;
  group_member_position?: number | null;
};

export type ExerciseGroupDTO = {
  id: string;
  type: "SUPERSET";
  rest_after_round_seconds?: number | null;
};

export type WorkoutRoutineDTO = {
  id: number;
  name: string;
  position: number;
  planned_exercises: PlannedExerciseDTO[];
  exercise_groups?: ExerciseGroupDTO[];
};

export type WorkoutProgramDTO = {
  id: number;
  name: string;
  template_type: ProgramTemplate;
  status: ProgramStatus;
  started_at?: string;
  ended_at?: string;
  routines: WorkoutRoutineDTO[];
  layout_revision?: number;
};

export type StartedWorkoutDTO = {
  id: number;
  program_id: number;
  routine_id: number;
  routine_name_snapshot: string;
  started_at: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  exercises: PlannedExerciseDTO[];
  exercise_groups?: ExerciseGroupDTO[];
  layout_revision_snapshot?: number | null;
};

export type ProgramLayoutBlockRequest =
  | { type: "EXERCISE"; planned_exercise_id: number }
  | {
      type: "SUPERSET";
      group_id: string;
      rest_after_round_seconds: number | null;
      members: { planned_exercise_id: number }[];
    };

export type ProgramLayoutRequest = {
  expected_revision: number;
  routines: { routine_id: number; blocks: ProgramLayoutBlockRequest[] }[];
};

export type ImmutableProgramLayoutMutation = {
  request: ProgramLayoutRequest;
  idempotencyKey: string;
};

export type PlannedExerciseRequest = {
  exercise_progression_id: number;
  position: number;
  target_sets?: number | null;
  target_rep_min?: number | null;
  target_rep_max?: number | null;
  target_rir?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
};

export type WorkoutRoutineRequest = {
  name: string;
  position: number;
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

/**
 * A layout mutation owns its key and complete payload. This is intentionally
 * separate from Axios's default key generation: queued offline requests must
 * replay the exact same semantic operation, never a later edited layout.
 */
export const createProgramLayoutMutation = (
  request: ProgramLayoutRequest,
): ImmutableProgramLayoutMutation => ({
  request,
  idempotencyKey: Crypto.randomUUID(),
});

export const replaceWorkoutProgramLayout = (
  programId: number,
  mutation: ImmutableProgramLayoutMutation,
) =>
  call<WorkoutProgramDTO>(async () =>
    api.put(`/v1/gym/programs/${programId}/layout`, mutation.request, {
      headers: {
        ...(await headers()),
        "Idempotency-Key": mutation.idempotencyKey,
      },
    }),
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

export const duplicateWorkoutRoutine = (id: number) =>
  call<WorkoutRoutineDTO>(async () =>
    api.post(`/v1/gym/routines/${id}/duplicate`, null, { headers: await headers() }),
  );

export const updateWorkoutRoutine = (id: number, request: WorkoutRoutineRequest) =>
  call<WorkoutRoutineDTO>(async () =>
    api.put(`/v1/gym/routines/${id}`, request, { headers: await headers() }),
  );

export const deleteWorkoutRoutine = async (id: number) => {
  try {
    await api.delete(`/v1/gym/routines/${id}`, { headers: await headers() });
  } catch (error) {
    throw toApiError(error);
  }
};

export const addPlannedExercise = (routineId: number, request: PlannedExerciseRequest) =>
  call<PlannedExerciseDTO>(async () =>
    api.post(`/v1/gym/routines/${routineId}/exercises`, request, {
      headers: await headers(),
    }),
  );

export const updatePlannedExercise = (id: number, request: PlannedExerciseRequest) =>
  call<PlannedExerciseDTO>(async () =>
    api.put(`/v1/gym/planned-exercises/${id}`, request, {
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

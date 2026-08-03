import type {
  ExerciseGroupDTO,
  PlannedExerciseDTO,
  ProgramLayoutBlockRequest,
  ProgramLayoutRequest,
  WorkoutProgramDTO,
  WorkoutRoutineDTO,
} from "@/services/workoutProgramService";

export const MAX_ROUTINES_PER_PROGRAM = 20;
export const MAX_EXERCISES_PER_ROUTINE = 50;
export const MAX_SUPERSET_MEMBERS = 10;

export type LayoutExerciseBlock = {
  type: "EXERCISE";
  plannedExercise: PlannedExerciseDTO;
};

export type LayoutSupersetBlock = {
  type: "SUPERSET";
  group: ExerciseGroupDTO;
  members: PlannedExerciseDTO[];
};

export type LayoutBlock = LayoutExerciseBlock | LayoutSupersetBlock;
export type LayoutRoutine = Omit<WorkoutRoutineDTO, "planned_exercises"> & {
  blocks: LayoutBlock[];
};
export type ProgramLayout = {
  programId: number;
  revision: number;
  routines: LayoutRoutine[];
};

const sortPosition = <T extends { id: number; position: number }>(items: T[]) =>
  [...items].sort((left, right) => left.position - right.position || left.id - right.id);

export const toProgramLayout = (program: WorkoutProgramDTO): ProgramLayout => {
  const routines = sortPosition(program.routines).map((routine) => {
    const groups = new Map((routine.exercise_groups ?? []).map((group) => [group.id, group]));
    const grouped = new Map<string, PlannedExerciseDTO[]>();
    const ungrouped: PlannedExerciseDTO[] = [];
    for (const exercise of sortPosition(routine.planned_exercises)) {
      if (exercise.group_id && groups.has(exercise.group_id)) {
        const members = grouped.get(exercise.group_id) ?? [];
        members.push(exercise);
        grouped.set(exercise.group_id, members);
      } else {
        ungrouped.push(exercise);
      }
    }
    const blocks: LayoutBlock[] = [];
    const emitted = new Set<string>();
    for (const exercise of sortPosition(routine.planned_exercises)) {
      if (!exercise.group_id || !groups.has(exercise.group_id)) {
        blocks.push({ type: "EXERCISE", plannedExercise: exercise });
        continue;
      }
      if (emitted.has(exercise.group_id)) continue;
      emitted.add(exercise.group_id);
      const members = [...(grouped.get(exercise.group_id) ?? [])].sort(
        (left, right) =>
          (left.group_member_position ?? Number.MAX_SAFE_INTEGER) -
            (right.group_member_position ?? Number.MAX_SAFE_INTEGER) ||
          left.position - right.position,
      );
      const group = groups.get(exercise.group_id)!;
      // Invalid legacy group rows are displayed safely as independent exercises.
      if (members.length < 2) {
        members.forEach((member) => blocks.push({ type: "EXERCISE", plannedExercise: member }));
      } else {
        blocks.push({ type: "SUPERSET", group, members });
      }
    }
    return { ...routine, blocks };
  });
  return { programId: program.id, revision: program.layout_revision ?? 0, routines };
};

const moveItem = <T,>(items: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export const moveLayoutRoutine = (layout: ProgramLayout, routineId: number, direction: -1 | 1) => {
  const from = layout.routines.findIndex((routine) => routine.id === routineId);
  const routines = moveItem(layout.routines, from, from + direction);
  return routines === layout.routines ? layout : { ...layout, routines };
};

export const moveLayoutBlock = (
  layout: ProgramLayout,
  routineId: number,
  blockIndex: number,
  direction: -1 | 1,
) => ({
  ...layout,
  routines: layout.routines.map((routine) =>
    routine.id !== routineId
      ? routine
      : { ...routine, blocks: moveItem(routine.blocks, blockIndex, blockIndex + direction) },
  ),
});

export const moveSupersetMember = (
  layout: ProgramLayout,
  routineId: number,
  groupId: string,
  memberIndex: number,
  direction: -1 | 1,
) => ({
  ...layout,
  routines: layout.routines.map((routine) =>
    routine.id !== routineId
      ? routine
      : {
          ...routine,
          blocks: routine.blocks.map((block) =>
            block.type === "SUPERSET" && block.group.id === groupId
              ? { ...block, members: moveItem(block.members, memberIndex, memberIndex + direction) }
              : block,
          ),
        },
  ),
});

export const createSuperset = (
  layout: ProgramLayout,
  routineId: number,
  selectedExerciseIds: number[],
  groupId: string,
): ProgramLayout => {
  const picked = new Set(selectedExerciseIds);
  if (picked.size < 2 || picked.size > MAX_SUPERSET_MEMBERS) return layout;
  return {
    ...layout,
    routines: layout.routines.map((routine) => {
      if (routine.id !== routineId) return routine;
      const indices = routine.blocks
        .map((block, index) => (block.type === "EXERCISE" && picked.has(block.plannedExercise.id) ? index : -1))
        .filter((index) => index >= 0);
      if (indices.length !== picked.size) return routine;
      const members = indices.map((index) => (routine.blocks[index] as LayoutExerciseBlock).plannedExercise);
      const first = indices[0];
      return {
        ...routine,
        blocks: routine.blocks.flatMap((block, index) => {
          if (index === first) {
            return [{
              type: "SUPERSET" as const,
              group: { id: groupId, type: "SUPERSET", rest_after_round_seconds: null },
              members,
            }];
          }
          return indices.includes(index) ? [] : [block];
        }),
      };
    }),
  };
};

export const dissolveSuperset = (layout: ProgramLayout, routineId: number, groupId: string) => ({
  ...layout,
  routines: layout.routines.map((routine) =>
    routine.id !== routineId
      ? routine
      : {
          ...routine,
          blocks: routine.blocks.flatMap((block) =>
            block.type === "SUPERSET" && block.group.id === groupId
              ? block.members.map((plannedExercise) => ({ type: "EXERCISE" as const, plannedExercise }))
              : [block],
          ),
        },
  ),
});

export const setSupersetRest = (
  layout: ProgramLayout,
  routineId: number,
  groupId: string,
  restAfterRoundSeconds: number | null,
) => {
  if (restAfterRoundSeconds !== null && (!Number.isInteger(restAfterRoundSeconds) || restAfterRoundSeconds < 0 || restAfterRoundSeconds > 3600)) return layout;
  return {
    ...layout,
    routines: layout.routines.map((routine) =>
      routine.id !== routineId
        ? routine
        : {
            ...routine,
            blocks: routine.blocks.map((block) =>
              block.type === "SUPERSET" && block.group.id === groupId
                ? { ...block, group: { ...block.group, rest_after_round_seconds: restAfterRoundSeconds } }
                : block,
            ),
          },
    ),
  };
};

export const serializeProgramLayout = (layout: ProgramLayout): ProgramLayoutRequest => ({
  expected_revision: layout.revision,
  routines: layout.routines.map((routine) => ({
    routine_id: routine.id,
    blocks: routine.blocks.map((block): ProgramLayoutBlockRequest =>
      block.type === "EXERCISE"
        ? { type: "EXERCISE", planned_exercise_id: block.plannedExercise.id }
        : {
            type: "SUPERSET",
            group_id: block.group.id,
            rest_after_round_seconds: block.group.rest_after_round_seconds ?? null,
            members: block.members.map((member) => ({ planned_exercise_id: member.id })),
          },
    ),
  })),
});

export const getSupersetLabel = (routine: LayoutRoutine, groupId: string) => {
  const index = routine.blocks.findIndex(
    (block) => block.type === "SUPERSET" && block.group.id === groupId,
  );
  const supersetIndex = routine.blocks
    .slice(0, index + 1)
    .filter((block) => block.type === "SUPERSET").length;
  return `Superset ${String.fromCharCode(64 + Math.max(1, supersetIndex))}`;
};

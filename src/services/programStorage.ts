import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserScopedKey } from "@/services/userScopedStorage";
import { logger } from "@/utils/logger";

const PROGRAMS_NAMESPACE = "@progressify_programs";
const LEGACY_PROGRAMS_KEY = "@progressify_programs";

export type WorkoutProgram = {
  id: string;
  name: string;
  split: string;
  exerciseIds: number[];
  createdAt: string;
};

export const savePrograms = async (programs: WorkoutProgram[]) => {
  try {
    const key = await getUserScopedKey(PROGRAMS_NAMESPACE);
    if (!key) return;
    await AsyncStorage.removeItem(LEGACY_PROGRAMS_KEY);
    await AsyncStorage.setItem(key, JSON.stringify(programs));
  } catch (error) {
    logger.warn("workout_program_save_failed", {
      error_type: error instanceof Error ? error.name : "unknown",
    });
  }
};

export const loadPrograms = async (): Promise<WorkoutProgram[]> => {
  try {
    const key = await getUserScopedKey(PROGRAMS_NAMESPACE);
    if (!key) return [];
    await AsyncStorage.removeItem(LEGACY_PROGRAMS_KEY);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as WorkoutProgram[];
  } catch (error) {
    logger.warn("workout_program_load_failed", {
      error_type: error instanceof Error ? error.name : "unknown",
    });
    return [];
  }
};

export const addProgram = async (
  program: Omit<WorkoutProgram, "id" | "createdAt">,
): Promise<WorkoutProgram[]> => {
  const programs = await loadPrograms();
  const newProgram: WorkoutProgram = {
    ...program,
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [...programs, newProgram];
  await savePrograms(updated);
  return updated;
};

export const deleteProgram = async (id: string): Promise<WorkoutProgram[]> => {
  const programs = await loadPrograms();
  const updated = programs.filter((p) => p.id !== id);
  await savePrograms(updated);
  return updated;
};

export const updateProgram = async (
  id: string,
  updates: Partial<Omit<WorkoutProgram, "id" | "createdAt">>,
): Promise<WorkoutProgram[]> => {
  const programs = await loadPrograms();
  const updated = programs.map((p) => (p.id === id ? { ...p, ...updates } : p));
  await savePrograms(updated);
  return updated;
};

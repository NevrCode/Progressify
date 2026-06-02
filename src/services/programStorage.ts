import AsyncStorage from "@react-native-async-storage/async-storage";

const PROGRAMS_KEY = "@progressify_programs";

export type WorkoutProgram = {
  id: string;
  name: string;
  split: string;
  exerciseIds: number[];
  createdAt: string;
};

export const savePrograms = async (programs: WorkoutProgram[]) => {
  try {
    await AsyncStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
  } catch (error) {
    console.warn("Failed to save programs:", error);
  }
};

export const loadPrograms = async (): Promise<WorkoutProgram[]> => {
  try {
    const raw = await AsyncStorage.getItem(PROGRAMS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WorkoutProgram[];
  } catch (error) {
    console.warn("Failed to load programs:", error);
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

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("workout programs prioritize starting a routine over editing it", async () => {
  const source = await readFile("src/app/(pages)/programs.tsx", "utf8");

  const launcher = source.indexOf("Choose today&apos;s workout");
  const management = source.indexOf("Manage program");
  const detailedExercises = source.indexOf(
    "routine.planned_exercises.map((planned)",
  );

  assert.ok(launcher >= 0);
  assert.ok(management > launcher);
  assert.ok(detailedExercises > management);
  assert.match(source, /horizontal/);
  assert.match(source, /label="Start workout"/);
  assert.match(source, /showManage\s*\?/);
  assert.match(source, /ReanimatedSwipeable/);
  assert.match(source, /renderLeftActions/);
  assert.match(source, /accessibilityActions/);
});

test("routine duplication uses one confirmed server operation", async () => {
  const source = await readFile("src/app/(pages)/programs.tsx", "utf8");
  const service = await readFile("src/services/workoutProgramService.ts", "utf8");

  assert.match(source, /useAlert/);
  assert.match(source, /confirmDuplicateRoutine/);
  assert.match(source, /label="Duplicate routine"/);
  assert.match(source, /duplicateRoutineMutation\.mutateAsync\(routine\.id\)/);
  assert.match(source, /queryKey: \["gym", "programs"\]/);
  assert.match(service, /duplicateWorkoutRoutine/);
  assert.match(service, /\/v1\/gym\/routines\/\$\{id\}\/duplicate/);
});

test("planned exercise rest updates preserve the complete PUT contract", async () => {
  const source = await readFile("src/app/(pages)/programs.tsx", "utf8");
  const service = await readFile("src/services/workoutProgramService.ts", "utf8");

  assert.match(source, /plannedExerciseUpdateRequest/);
  assert.match(source, /target_sets: planned\.target_sets \?\? null/);
  assert.match(source, /target_rep_min: planned\.target_rep_min \?\? null/);
  assert.match(source, /target_rep_max: planned\.target_rep_max \?\? null/);
  assert.match(source, /target_rir: planned\.target_rir \?\? null/);
  assert.match(source, /rest_seconds: restSeconds/);
  assert.match(source, /notes: planned\.notes \?\? null/);
  assert.match(source, /restSeconds < 0 \|\| restSeconds > 3600/);
  assert.match(source, /label="Save rest time"/);
  assert.match(service, /export const updatePlannedExercise/);
  assert.match(service, /\/v1\/gym\/planned-exercises\/\$\{id\}/);
});

test("routine launch carries each exercise's rest default into the active workout", async () => {
  const source = await readFile("src/app/(pages)/programs.tsx", "utf8");

  assert.match(source, /const plannedRestMap = Object\.fromEntries/);
  assert.match(source, /exercise\.rest_seconds \?\? 90/);
  assert.match(source, /plannedExerciseRestMap: JSON\.stringify\(plannedRestMap\)/);
});

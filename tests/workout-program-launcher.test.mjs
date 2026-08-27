import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("workout programs prioritize starting a routine over editing it", async () => {
  const [source, launcherCard, manageCard, swipeRow] = await Promise.all([
    readFile("src/app/(pages)/programs.tsx", "utf8"),
    readFile("src/components/gym/routine-launcher-card.tsx", "utf8"),
    readFile("src/components/gym/routine-manage-card.tsx", "utf8"),
    readFile("src/components/gym/swipe-to-delete-exercise-row.tsx", "utf8"),
  ]);

  const launcher = source.indexOf("Choose today&apos;s workout");
  const management = source.indexOf("Manage program");
  const managementSection = source.indexOf("<RoutineManageCard");

  assert.ok(launcher >= 0);
  assert.ok(management > launcher);
  // Per-exercise editing detail was extracted into RoutineManageCard; the
  // screen only reaches that detail after the "Manage program" toggle, and
  // the detail itself (each planned exercise's row) lives in the card.
  assert.ok(managementSection > management);
  assert.match(manageCard, /routine\.planned_exercises\.map\(\(planned\)/);
  assert.match(source, /horizontal/);
  assert.match(launcherCard, /label="Start workout"/);
  assert.match(source, /showManage\s*\?/);
  assert.match(swipeRow, /ReanimatedSwipeable/);
  assert.match(swipeRow, /renderLeftActions/);
  assert.match(swipeRow, /accessibilityActions/);
});

test("routine duplication uses one confirmed server operation", async () => {
  const [source, manageCard, service] = await Promise.all([
    readFile("src/app/(pages)/programs.tsx", "utf8"),
    readFile("src/components/gym/routine-manage-card.tsx", "utf8"),
    readFile("src/services/workoutProgramService.ts", "utf8"),
  ]);

  assert.match(source, /useAlert/);
  assert.match(source, /confirmDuplicateRoutine/);
  assert.match(manageCard, /label="Duplicate routine"/);
  assert.match(source, /duplicateRoutineMutation\.mutateAsync\(routine\.id\)/);
  assert.match(source, /queryKey: \["gym", "programs"\]/);
  assert.match(service, /duplicateWorkoutRoutine/);
  assert.match(service, /\/v1\/gym\/routines\/\$\{id\}\/duplicate/);
});

test("planned exercise rest updates preserve the complete PUT contract", async () => {
  const [source, plannedExerciseRow, service] = await Promise.all([
    readFile("src/app/(pages)/programs.tsx", "utf8"),
    readFile("src/components/gym/planned-exercise-row.tsx", "utf8"),
    readFile("src/services/workoutProgramService.ts", "utf8"),
  ]);

  assert.match(source, /plannedExerciseUpdateRequest/);
  assert.match(source, /target_sets: planned\.target_sets \?\? null/);
  assert.match(source, /target_rep_min: planned\.target_rep_min \?\? null/);
  assert.match(source, /target_rep_max: planned\.target_rep_max \?\? null/);
  assert.match(source, /target_rir: planned\.target_rir \?\? null/);
  assert.match(source, /rest_seconds: restSeconds/);
  assert.match(source, /notes: planned\.notes \?\? null/);
  assert.match(source, /restSeconds < 0 \|\| restSeconds > 3600/);
  assert.match(plannedExerciseRow, /label="Save rest time"/);
  assert.match(service, /export const updatePlannedExercise/);
  assert.match(service, /\/v1\/gym\/planned-exercises\/\$\{id\}/);
});

test("routine launch carries each exercise's rest default into the active workout", async () => {
  const source = await readFile("src/app/(pages)/programs.tsx", "utf8");

  assert.match(source, /const plannedRestMap = Object\.fromEntries/);
  assert.match(source, /exercise\.rest_seconds \?\? 90/);
  assert.match(source, /plannedExerciseRestMap: JSON\.stringify\(plannedRestMap\)/);
});

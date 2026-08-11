/// <reference types="jest" />

import { parseActiveWorkoutRouteLaunch } from "@/features/workout-session/active-workout-launch";

describe("active workout route launch", () => {
  it("parses a full set of route params", () => {
    const launch = parseActiveWorkoutRouteLaunch({
      exerciseIds: "3,1,2",
      workoutSessionId: "77",
      routineName: "Push Day",
      plannedExerciseMap: JSON.stringify({ 1: 11, 2: 22 }),
    });

    expect(launch.exerciseIds).toEqual([3, 1, 2]);
    expect(launch.workoutSessionId).toBe(77);
    expect(launch.routineName).toBe("Push Day");
    expect(launch.plannedExerciseIds).toEqual({ 1: 11, 2: 22 });
  });

  it("preserves the order exercises were selected in", () => {
    expect(
      parseActiveWorkoutRouteLaunch({ exerciseIds: "9,4,7" }).exerciseIds,
    ).toEqual([9, 4, 7]);
  });

  it("drops non-integer and non-positive exercise ids", () => {
    const launch = parseActiveWorkoutRouteLaunch({
      exerciseIds: "1,0,-2,abc,3.5,4",
    });

    expect(launch.exerciseIds).toEqual([1, 4]);
  });

  it("treats a missing or unparseable session id as absent", () => {
    expect(parseActiveWorkoutRouteLaunch({}).workoutSessionId).toBeNull();
    expect(
      parseActiveWorkoutRouteLaunch({ workoutSessionId: "nonsense" })
        .workoutSessionId,
    ).toBeNull();
    expect(
      parseActiveWorkoutRouteLaunch({ workoutSessionId: "0" }).workoutSessionId,
    ).toBeNull();
  });

  it("still yields a usable launch when JSON metadata is malformed", () => {
    // A deep link with a corrupted payload must still start a manual workout
    // rather than throwing on the way into the screen.
    const launch = parseActiveWorkoutRouteLaunch({
      exerciseIds: "5",
      plannedExerciseMap: "{not json",
      plannedExerciseRestMap: "also not json",
      activeWorkoutLayout: "[[",
    });

    expect(launch.exerciseIds).toEqual([5]);
    expect(launch.plannedExerciseIds).toEqual({});
    expect(launch.plannedExerciseRestSeconds).toEqual({});
    expect(launch.layoutSnapshot).toBeUndefined();
  });

  it("ignores planned-exercise entries that are not positive integer pairs", () => {
    const launch = parseActiveWorkoutRouteLaunch({
      plannedExerciseMap: JSON.stringify({
        1: 11,
        2: 0,
        3: "x",
        notANumber: 5,
        "-4": 9,
      }),
    });

    expect(launch.plannedExerciseIds).toEqual({ 1: 11 });
  });

  it("rejects a JSON array for the planned map rather than coercing it", () => {
    const launch = parseActiveWorkoutRouteLaunch({
      plannedExerciseMap: JSON.stringify([1, 2, 3]),
    });

    expect(launch.plannedExerciseIds).toEqual({});
  });

  it("produces an empty launch from empty params", () => {
    const launch = parseActiveWorkoutRouteLaunch({});

    expect(launch.exerciseIds).toEqual([]);
    expect(launch.workoutSessionId).toBeNull();
    expect(launch.routineName).toBeUndefined();
    expect(launch.plannedExerciseIds).toEqual({});
    expect(launch.plannedExerciseRestSeconds).toEqual({});
    expect(launch.layoutSnapshot).toBeUndefined();
  });
});

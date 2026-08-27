import assert from "node:assert/strict";
import test from "node:test";

import {
  centimetresToFeetAndInches,
  displayMass,
  formatHeight,
  formatMass,
  parseHeightInput,
  parseMassInput,
} from "../src/utils/measurement-units.ts";
import { buildCanonicalWorkoutSetRequest } from "../src/features/workout-session/canonical-set-request.ts";

test("mass conversion round-trips kilograms and pounds without mutating canonical values", () => {
  const kilograms = 100;
  const pounds = displayMass(kilograms, "IMPERIAL", 3);
  assert.equal(pounds, 220.462);
  assert.ok(Math.abs(parseMassInput(String(pounds), "IMPERIAL") - kilograms) < 0.001);
  assert.equal(formatMass(kilograms, "METRIC"), "100.0 kg");
  assert.equal(formatMass(kilograms, "IMPERIAL"), "220.5 lb");
});

test("mass parser rejects negative and non-finite values", () => {
  assert.equal(parseMassInput("-1", "METRIC"), null);
  assert.equal(parseMassInput("Infinity", "IMPERIAL"), null);
  assert.equal(parseMassInput("", "METRIC"), null);
});

test("height conversion uses bounded feet/inches and round-trips the common boundary", () => {
  assert.deepEqual(centimetresToFeetAndInches(182.88), { feet: 6, inches: 0 });
  assert.equal(parseHeightInput("", "IMPERIAL", "6", "0"), 182.88);
  assert.equal(formatHeight(182.88, "IMPERIAL"), "6 ft 0 in");
  assert.equal(formatHeight(170, "METRIC"), "170 cm");
});

test("height parser rejects invalid imperial ranges", () => {
  assert.equal(parseHeightInput("", "IMPERIAL", "5", "12"), null);
  assert.equal(parseHeightInput("", "IMPERIAL", "5.5", "2"), null);
  assert.equal(parseHeightInput("", "METRIC"), null);
});

test("imperial workout input reaches the session request as canonical kilograms", () => {
  const weightKg = parseMassInput("220.462", "IMPERIAL");
  const request = buildCanonicalWorkoutSetRequest({
    setNumber: 1,
    weightKg: String(weightKg),
    reps: "5",
    rir: "2",
    setType: "WORKING",
  });

  assert.ok(Math.abs(request.weight - 100) < 0.001);
  assert.equal(request.reps, 5);
  assert.equal(request.set_type, "WORKING");
});

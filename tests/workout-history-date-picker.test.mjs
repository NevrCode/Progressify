import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../src/app/(pages)/manageWorkoutSession.tsx", import.meta.url);
const fieldPath = new URL("../src/components/base/date-only-field.tsx", import.meta.url);

test("workout history uses the reusable date-only field instead of free text", async () => {
  const source = await readFile(pagePath, "utf8");
  assert.match(source, /<DateOnlyField[\s\S]*label="Session date"/);
  assert.doesNotMatch(source, /placeholder="YYYY-MM-DD"/);
  assert.doesNotMatch(source, /onChangeText=\{setSessionDate\}/);
});

test("date-only field explicitly keeps cancellation and web fallback deterministic", async () => {
  const source = await readFile(fieldPath, "utf8");
  assert.match(source, /event\.type/);
  assert.match(source, /setPickerVisible\(false\)/);
  assert.match(source, /Platform\.OS === "web"/);
  assert.match(source, /accessibilityLabel="Previous day"/);
  assert.match(source, /accessibilityLabel=\{`Cancel choosing \$\{label\}`\}/);
});

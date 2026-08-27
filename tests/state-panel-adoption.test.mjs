import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("main product screens use the shared state panel", () => {
  for (const path of [
    "../src/app/(tabs)/home.tsx",
    "../src/app/(tabs)/gymProgression.tsx",
    "../src/app/(tabs)/foodDiary.tsx",
    "../src/app/(tabs)/profile.tsx",
    "../src/app/(pages)/programs.tsx",
  ]) {
    const source = readSource(path);
    assert.match(source, /import \{ StatePanel \}/, path);
    assert.match(source, /<StatePanel/, path);
  }
});

test("the state panel defines every supported semantic state", () => {
  const source = readSource("../src/components/base/state-panel.tsx");
  for (const variant of ["empty", "error", "offline", "success"]) {
    assert.match(source, new RegExp(`"${variant}"`));
  }
  assert.match(source, /accessibilityLiveRegion/);
  assert.match(source, /minWidth: compact \? 104 : 128/);
});

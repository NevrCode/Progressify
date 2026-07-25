import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { THEMES } from "../src/constants/colors.ts";
import { FONT_FAMILIES } from "../src/constants/typography.ts";

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("weight 600 maps to the real Plus Jakarta Sans semibold face", () => {
  assert.equal(FONT_FAMILIES.semibold, "PlusJakartaSans_600SemiBold");
  const source = readSource("../assets/styles/fontHelper.ts");
  assert.match(source, /weight === "600"/);
  assert.match(source, /FONT_FAMILIES\.semibold/);
  assert.doesNotMatch(source, /weight === "600" \|\| weight === "500"/);
});

test("native and React startup surfaces use the default active theme", () => {
  const config = JSON.parse(readSource("../app.json"));
  const splashPlugin = config.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen",
  );
  assert.equal(splashPlugin[1].backgroundColor, THEMES.darkGym.background);

  const layout = readSource("../src/app/_layout.tsx");
  assert.match(layout, /<StatusBar/);
  assert.match(layout, /backgroundColor: theme\.background/);
  assert.match(layout, /relativeLuminance\(theme\.background\)/);
});

test("main dashboard cards rely on the shared card surface", () => {
  for (const path of [
    "../src/app/(tabs)/home.tsx",
    "../src/app/(tabs)/profile.tsx",
    "../src/components/nutrition/WaterTracker.tsx",
    "../src/components/gym/MuscleHeatmap.tsx",
  ]) {
    const source = readSource(path);
    assert.doesNotMatch(
      source,
      /<ShadowGlowCard[\s\S]{0,180}backgroundColor: theme\.background/,
      path,
    );
  }
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { THEMES } from "../src/constants/colors.ts";
import {
  contrastRatio,
  getHighestContrastColor,
  relativeLuminance,
} from "../src/utils/color-contrast.ts";

test("secondary text remains readable on every main theme surface", () => {
  for (const [name, theme] of Object.entries(THEMES)) {
    assert.ok(
      contrastRatio(theme.textLight, theme.background) >= 4.5,
      `${name} secondary text on its background`,
    );
    assert.ok(
      contrastRatio(theme.textLight, theme.card) >= 4.5,
      `${name} secondary text on its card`,
    );
  }
});

test("primary buttons choose the most readable available foreground", () => {
  for (const [name, theme] of Object.entries(THEMES)) {
    const foreground = getHighestContrastColor(theme.primary, [
      theme.background,
      theme.textBlack,
      theme.white,
      theme.shadow,
    ]);
    assert.ok(
      contrastRatio(foreground, theme.primary) >= 4.5,
      `${name} primary button foreground`,
    );
  }
});

test("nutrition labels remain readable while keeping their semantic color", () => {
  const source = readFileSync(
    new URL("../src/constants/semantic-colors.ts", import.meta.url),
    "utf8",
  );
  const colors = [
    ...source.matchAll(
      /(?:calories|protein|carbohydrate|fat|water): "(#[0-9A-Fa-f]{6})"/g,
    ),
  ].map((match) => match[1]);
  assert.equal(colors.length, 10);
  const darkAccents = colors.slice(0, 5);
  const lightAccents = colors.slice(5);

  for (const [name, theme] of Object.entries(THEMES)) {
    const accents =
      relativeLuminance(theme.background) < 0.35
        ? darkAccents
        : lightAccents;
    for (const color of accents) {
      assert.ok(
        contrastRatio(color, theme.background) >= 4.5,
        `${name} nutrition label ${color}`,
      );
    }
  }
});

test("status colors remain readable on every theme surface", () => {
  const source = readFileSync(
    new URL("../src/constants/semantic-colors.ts", import.meta.url),
    "utf8",
  );
  const colors = [
    ...source.matchAll(
      /(?:success|danger|warning|info): "(#[0-9A-Fa-f]{6})"/g,
    ),
  ].map((match) => match[1]);
  assert.equal(colors.length, 8);
  const darkSemantics = colors.slice(0, 4);
  const lightSemantics = colors.slice(4);

  for (const [name, theme] of Object.entries(THEMES)) {
    const semantics =
      relativeLuminance(theme.card) < 0.35
        ? darkSemantics
        : lightSemantics;
    for (const color of semantics) {
      assert.ok(
        contrastRatio(color, theme.card) >= 4.5,
        `${name} status color ${color} on its card`,
      );
      assert.ok(
        contrastRatio(color, theme.background) >= 4.5,
        `${name} status color ${color} on its background`,
      );
    }
  }
});

test("skeleton placeholders remain visible on every theme surface", () => {
  const source = readFileSync(
    new URL("../src/constants/semantic-colors.ts", import.meta.url),
    "utf8",
  );
  const colors = [
    ...source.matchAll(/(?:base|highlight): "(#[0-9A-Fa-f]{6})"/g),
  ].map((match) => match[1]);
  assert.equal(colors.length, 4);
  const darkSkeleton = colors.slice(0, 2);
  const lightSkeleton = colors.slice(2);

  for (const [name, theme] of Object.entries(THEMES)) {
    const skeleton =
      relativeLuminance(theme.card) < 0.35
        ? darkSkeleton
        : lightSkeleton;
    for (const color of skeleton) {
      assert.ok(
        contrastRatio(color, theme.card) >= 1.12,
        `${name} skeleton ${color} on its card`,
      );
      assert.ok(
        contrastRatio(color, theme.background) >= 1.12,
        `${name} skeleton ${color} on its background`,
      );
    }
  }
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { contrastRatio } from "./color-contrast";
import { darkTheme, lightTheme, zoomBrand } from "./theme-tokens";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");

test("light-mode Zoom brand tokens stay #065274 and #019CDF", () => {
  assert.match(css, /--color-zoom-dark:\s*#065274;/);
  assert.match(css, /--color-zoom-light:\s*#019cdf;/);
  assert.equal(zoomBrand.dark.toLowerCase(), "#065274");
  assert.equal(zoomBrand.light.toLowerCase(), "#019cdf");
});

test("light-mode semantic tokens match the approved surface colors", () => {
  assert.match(css, /--background:\s*#f7f8f9;/);
  assert.match(css, /--surface:\s*#ffffff;/);
  assert.match(css, /--color-zoom-navy:\s*#043b54;/);
  assert.match(css, /--color-zoom-charcoal:\s*#3b3b3b;/);
  assert.equal(lightTheme.background.toLowerCase(), "#f7f8f9");
  assert.equal(lightTheme.surface.toLowerCase(), "#ffffff");
});

test("dark mode uses charcoal surfaces instead of white", () => {
  assert.match(css, /\.dark\s*\{[\s\S]*--background:\s*#171b20;/);
  assert.match(css, /\.dark\s*\{[\s\S]*--surface:\s*#252c34;/);
  assert.notEqual(darkTheme.surface.toLowerCase(), "#ffffff");
  assert.notEqual(darkTheme.background.toLowerCase(), "#ffffff");
});

test("dark-mode text pairs meet WCAG AA contrast", () => {
  const pairs: Array<[string, string, number]> = [
    [darkTheme.foreground, darkTheme.background, 4.5],
    [darkTheme.foreground, darkTheme.surface, 4.5],
    [darkTheme.foreground, darkTheme.surfaceElevated, 4.5],
    [darkTheme.textSecondary, darkTheme.background, 4.5],
    [darkTheme.textSecondary, darkTheme.surface, 4.5],
    [darkTheme.heading, darkTheme.background, 4.5],
    [darkTheme.heading, darkTheme.surface, 4.5],
    [darkTheme.accentReadable, darkTheme.surface, 4.5],
    [darkTheme.accentReadable, darkTheme.surfaceElevated, 3],
  ];

  for (const [foreground, background, minimum] of pairs) {
    const ratio = contrastRatio(foreground, background);
    assert.ok(
      ratio >= minimum,
      `${foreground} on ${background} is ${ratio.toFixed(2)}:1, need ${minimum}:1`,
    );
  }
});

test("light-mode text pairs still meet WCAG AA contrast", () => {
  const pairs: Array<[string, string]> = [
    [lightTheme.foreground, lightTheme.background],
    [lightTheme.heading, lightTheme.surface],
    [lightTheme.accentReadable, lightTheme.surface],
    [lightTheme.textSecondary, lightTheme.surface],
  ];

  for (const [foreground, background] of pairs) {
    const ratio = contrastRatio(foreground, background);
    assert.ok(
      ratio >= 4.5,
      `${foreground} on ${background} is ${ratio.toFixed(2)}:1`,
    );
  }
});

test("pale text on navy banners stays light in dark mode", () => {
  assert.doesNotMatch(css, /\.dark\s*\{[\s\S]*--color-zoom-pale:\s*#3d4b57;/);
  assert.match(css, /html\.dark \.text-zoom-pale \{\s*color: #d9f2fc;/);
  const navy = "#043B54";
  const pale = "#D9F2FC";
  assert.ok(
    contrastRatio(pale, navy) >= 4.5,
    `pale on navy is ${contrastRatio(pale, navy).toFixed(2)}:1`,
  );
});

test("dark mode is class-based rather than only prefers-color-scheme", () => {
  assert.match(css, /@custom-variant dark \(&:where\(\.dark, \.dark \*\)\);/);
});

// Generates MD3 palettes for every accent preset and writes:
//   lib/palettes.js       — CJS module for the Host half (settings boot CSS)
//   lib/client-palettes.js — const block spliced into the client bundle
//
// Source of truth: Google's material-color-utilities (HCT engine, TonalSpot
// variant by default). Run with: npm run generate
//
// The mapping section maps Material 3 color roles onto the --dsw-* semantic
// tokens shipped by @deepseek-ai/dsh-client-ui-theme. Tokens not listed here
// keep their base values (neutral alpha borders, masks, state layers, code
// colors) — see README for the rationale.

import {
  SchemeFidelity,
  SchemeMonochrome,
  MaterialDynamicColors,
  Hct,
  argbFromHex,
  hexFromArgb,
} from '@material/material-color-utilities';

// ---------------------------------------------------------------------------
// Presets: id, label, seed hex, and the MCU variant used to derive light/dark.
// ---------------------------------------------------------------------------
const PRESETS = [
  { id: 'deepseek', label: 'DeepSeek Blue', hex: '#4176e6', variant: 'fidelity' },
  { id: 'purple', label: 'Material Purple', hex: '#6750a4', variant: 'fidelity' },
  { id: 'teal', label: 'Teal', hex: '#00796b', variant: 'fidelity' },
  { id: 'green', label: 'Green', hex: '#2e7d32', variant: 'fidelity' },
  { id: 'rose', label: 'Rose', hex: '#c2185b', variant: 'fidelity' },
  { id: 'orange', label: 'Orange', hex: '#e65100', variant: 'fidelity' },
  { id: 'graphite', label: 'Graphite', hex: '#60646c', variant: 'monochrome' },
];

const VARIANTS = {
  'fidelity': SchemeFidelity,
  monochrome: SchemeMonochrome,
};

// ---------------------------------------------------------------------------
// Color helpers (sRGB — same space the state-layer spec uses).
// ---------------------------------------------------------------------------
const toRgb = (argb) => [(argb >> 16) & 0xff, (argb >> 8) & 0xff, argb & 0xff];
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const toHex = (rgb) => '#' + rgb.map((v) => clamp(v).toString(16).padStart(2, '0')).join('');

/** Linear blend of two ARGB colors in sRGB space. t=0 → a, t=1 → b. */
function mix(a, b, t) {
  const ra = toRgb(a);
  const rb = toRgb(b);
  return toHex(ra.map((v, i) => v + (rb[i] - v) * t));
}

/** Composite `fg` at `alpha` over opaque `bg` — an MD3 state layer as one hex. */
function over(fg, alpha, bg) {
  const rf = toRgb(fg);
  const rb = toRgb(bg);
  return toHex(rf.map((v, i) => v * alpha + rb[i] * (1 - alpha)));
}

/** Hex string → ARGB int (for helpers that take hex in). */

// ---------------------------------------------------------------------------
// The MD3 → DSW role map. Each entry receives the resolved role colors for
// one color scheme (light or dark) and returns a CSS value string.
//
// Role names are MaterialDynamicColors accessors. Helpers mix/over receive
// ARGB ints and hex output is written into the token.
// ---------------------------------------------------------------------------
function buildTokenMap(mdc, scheme) {
  const role = (name) => mdc[name]().getArgb(scheme);
  const R = {
    primary: role('primary'),
    onPrimary: role('onPrimary'),
    primaryContainer: role('primaryContainer'),
    onPrimaryContainer: role('onPrimaryContainer'),
    secondaryContainer: role('secondaryContainer'),
    onSecondaryContainer: role('onSecondaryContainer'),
    surface: role('surface'),
    surfaceContainerLowest: role('surfaceContainerLowest'),
    surfaceContainerLow: role('surfaceContainerLow'),
    surfaceContainer: role('surfaceContainer'),
    surfaceContainerHigh: role('surfaceContainerHigh'),
    surfaceContainerHighest: role('surfaceContainerHighest'),
    onSurface: role('onSurface'),
    onSurfaceVariant: role('onSurfaceVariant'),
    outline: role('outline'),
    outlineVariant: role('outlineVariant'),
    error: role('error'),
    errorContainer: role('errorContainer'),
    inverseSurface: role('inverseSurface'),
    inverseOnSurface: role('inverseOnSurface'),
    inversePrimary: role('inversePrimary'),
  };

  // Five-step text ladder: on-surface → on-surface-variant → dimmer greys.
  const textTertiary = mix(R.onSurface, R.surface, 0.45);
  const textCaption = mix(R.onSurface, R.surface, 0.62);
  const textDimmed = mix(R.onSurface, R.surface, 0.78);

  // Hover/active state layers per MD3 (8% resting interaction, 12% pressed).
  const hover = (fg, bg) => over(fg, 0.08, bg);
  const pressed = (fg, bg) => over(fg, 0.14, bg);
  // Primary button hover: darken in light, lighten in dark (matches base DSH).
  const primaryHover = scheme.isDark ? over(0xffffff, 0.12, R.primary) : over(0x000000, 0.12, R.primary);

  return {
    // --- surfaces: tonal containers replace elevation shading --------------
    '--dsw-alias-bg-base': hexFromArgb(R.surface),
    '--dsw-alias-bg-layer-1': hexFromArgb(scheme.isDark ? R.surfaceContainer : R.surfaceContainerLowest),
    '--dsw-alias-bg-layer-2': hexFromArgb(scheme.isDark ? R.surfaceContainerHigh : R.surfaceContainerLow),
    '--dsw-alias-bg-layer-3': hexFromArgb(scheme.isDark ? R.surfaceContainerHighest : R.surfaceContainer),
    '--dsw-alias-bg-module-platform': hexFromArgb(scheme.isDark ? R.surfaceContainerHigh : R.surfaceContainerLow),
    '--dsw-alias-bg-overlay': hexFromArgb(scheme.isDark ? R.surfaceContainerHighest : R.surfaceContainerHigh),
    '--dsw-alias-bg-multi-select': hexFromArgb(R.secondaryContainer),

    // --- brand & primary actions ------------------------------------------
    '--dsw-alias-brand-primary': hexFromArgb(R.primary),
    '--dsw-alias-brand-primary-new-colorprimary-new-color': hexFromArgb(R.primary),
    '--dsw-alias-brand-primary-invert': hexFromArgb(R.onPrimary),
    '--dsw-alias-button-primary-hover': primaryHover,
    '--dsw-alias-button-primary-dimmed': hexFromArgb(R.secondaryContainer),
    '--dsw-alias-button-info-fill': hexFromArgb(R.secondaryContainer),
    '--dsw-alias-button-info-hover': hover(R.onSecondaryContainer, R.secondaryContainer),
    '--dsw-alias-button-ghost-active-fill': hexFromArgb(R.secondaryContainer),
    '--dsw-alias-button-ghost-active-hover': hover(R.onSecondaryContainer, R.secondaryContainer),
    '--dsw-alias-button-ghost-active-border': hexFromArgb(R.outline),
    '--dsw-alias-button-floating-fill': hexFromArgb(R.primaryContainer),
    '--dsw-alias-button-floating-hover': hover(R.onPrimaryContainer, R.primaryContainer),
    '--dsw-alias-button-elevated-fill': hexFromArgb(
      scheme.isDark ? R.surfaceContainerHigh : R.surfaceContainerLowest,
    ),
    '--dsw-alias-button-contrast-fill': hexFromArgb(R.inverseSurface),

    // --- text ladder --------------------------------------------------------
    '--dsw-alias-label-primary': hexFromArgb(R.onSurface),
    '--dsw-alias-label-secondary': hexFromArgb(R.onSurfaceVariant),
    '--dsw-alias-label-tertiary': textTertiary,
    '--dsw-alias-label-caption': textCaption,
    '--dsw-alias-label-dimmed': textDimmed,

    // --- links & brand states ------------------------------------------------
    '--dsw-alias-link': hexFromArgb(R.primary),
    '--dsw-alias-state-business-primary': hexFromArgb(R.primary),
    '--dsw-alias-state-business-tertiary': hexFromArgb(R.primaryContainer),

    // --- error (the one MD3 status role; success/warn keep base colors) ------
    '--dsw-alias-state-error-primary': hexFromArgb(R.error),
    '--dsw-alias-state-error-tertiary': hexFromArgb(R.errorContainer),

    // --- inverse surfaces ----------------------------------------------------
    '--dsw-alias-toast-bg': hexFromArgb(R.inverseSurface),

    // --- component-specific ---------------------------------------------------
    '--dsw-specific-bubble': hexFromArgb(R.secondaryContainer),
    '--dsw-specific-bubble-highlight': hover(R.onSecondaryContainer, R.secondaryContainer),
    '--dsw-specific-input-major': hexFromArgb(
      scheme.isDark ? R.surfaceContainerHigh : R.surfaceContainerLowest,
    ),
    '--dsw-specific-login-input': hexFromArgb(
      scheme.isDark ? R.surfaceContainer : R.surfaceContainerLow,
    ),
    '--dsw-specific-selector': hexFromArgb(R.secondaryContainer),
    '--dsw-specific-sidebar-fill': hexFromArgb(
      scheme.isDark ? R.surfaceContainer : R.surfaceContainerLow,
    ),
    '--dsw-specific-sidebar-nav-item-active': hexFromArgb(R.secondaryContainer),
    '--dsw-specific-sidebar-nav-item-active-accent': hexFromArgb(R.secondaryContainer),

    // --- typography (Roboto is the MD3 default typeface) ----------------------
    '--dsw-font-family':
      "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  };
}

// The shared font stack is scheme-invariant; export it once for both modes.
const FONT_STACK =
  "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------
const mdc = new MaterialDynamicColors();
const presets = PRESETS.map((preset) => {
  const VariantClass = VARIANTS[preset.variant];
  if (!VariantClass) throw new Error(`unknown MCU variant: ${preset.variant}`);
  const sourceHct = Hct.fromInt(argbFromHex(preset.hex));
  const light = new VariantClass(sourceHct, false, 0);
  const dark = new VariantClass(sourceHct, true, 0);

  const lightTokens = { ...buildTokenMap(mdc, light), '--dsw-font-family': FONT_STACK };
  const darkTokens = { ...buildTokenMap(mdc, dark), '--dsw-font-family': FONT_STACK };

  return {
    id: preset.id,
    label: preset.label,
    hex: preset.hex,
    variant: preset.variant,
    light: lightTokens,
    dark: darkTokens,
  };
});

const meta = {
  generatedBy: 'scripts/generate-palettes.mjs',
  engine: '@material/material-color-utilities',
  presetCount: presets.length,
};

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'lib'), { recursive: true });

const asObjectLiteral = (data) =>
  JSON.stringify(data, null, '\t').replace(/^/gm, '  ');

// lib/palettes.js is an ES module: the package declares "type": "module".
const esm = `// AUTO-GENERATED by scripts/generate-palettes.mjs — do not edit by hand.
// Material 3 palettes (HCT) for every accent preset, mapped to --dsw-* tokens.

export const MD3_META = ${JSON.stringify(meta, null, '\t').replace(/^/gm, '  ')};

export const MD3_PRESETS = ${JSON.stringify(
  presets.map(({ id, label, hex, variant }) => ({ id, label, hex, variant })),
  null,
  '\t',
).replace(/^/gm, '  ')};

export const MD3_PALETTES = ${asObjectLiteral(Object.fromEntries(presets.map((p) => [p.id, { light: p.light, dark: p.dark }])))};
`;

const client = `// AUTO-GENERATED by scripts/generate-palettes.mjs — do not edit by hand.
// Spliced into lib/client.js by build.mjs; declares MD3_PALETTES/MD3_PRESETS.
var MD3_META = ${JSON.stringify(meta)};
var MD3_PRESETS = ${JSON.stringify(presets.map(({ id, label, hex, variant }) => ({ id, label, hex, variant })))};
var MD3_PALETTES = ${JSON.stringify(Object.fromEntries(presets.map((p) => [p.id, { light: p.light, dark: p.dark }])))};
`;

writeFileSync(join(root, 'lib', 'palettes.js'), esm);
writeFileSync(join(root, 'lib', 'client-palettes.js'), client);

const tokenCount = Object.keys(presets[0].light).length;
console.log(
  `generated ${presets.length} presets x 2 schemes x ${tokenCount} tokens -> lib/palettes.js, lib/client-palettes.js`,
);
for (const p of presets) {
  console.log(`  ${p.id.padEnd(10)} ${p.hex} (${p.variant})`);
}

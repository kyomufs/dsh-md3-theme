# dsh-md3-theme

Full Material Design 3 (Material You) theme for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — HCT-generated light/dark palettes with seven accent presets **plus a component restyle**: the MD3 shape scale, elevation shadows, motion (enter animations, state transitions, press feedback), focus indicators, scrollbars and press ripple.

The plugin derives every color with Google's [`@material/material-color-utilities`](https://github.com/material-foundation/material-color-utilities) (HCT color space) from a seed color, maps the resulting Material 3 color roles onto the harness `--dsw-*` semantic tokens, and layers them over the active theme via `ctx.theme.overrideTokens`. On top of that, three CSS layers (core → components → motion) mount as `style[data-plugin-css]` tags while the theme is on. The built-in light/dark/system preference keeps working exactly as before.

## Features

- **Full MD3 palette, both modes** — surfaces, tonal containers, text ladder, outlines, primary/secondary/error roles for light *and* dark in every preset (44 tokens per scheme).
- **MD3 elevation** — the harness shadow tokens are re-mapped to the Material 3 ambient + key pairs (level 1–3).
- **MD3 shape scale** — dialogs 28px, cards 12px, bubbles 16px, menus 8px, buttons/chips/nav rows fully rounded, all driven by `--dsh-md3-radius-*` tokens.
- **Motion** — dialogs scale-fade in with emphasised decelerate (400ms), menus fade in, interactive elements get standard state transitions, press scales controls down, hover raises cards a level. All durations/easings are MD3 tokens; `prefers-reduced-motion` disables animation entirely.
- **Press ripple** — one delegated `pointerdown` listener injects a per-press ripple into any `<button>` (skipped for reduced-motion users, skipped while the theme is off).
- **Focus & scrollbars** — 2px primary focus rings, thin rounded scrollbars, accent-tinted text selection.
- **Seven accent presets** — DeepSeek Blue, Material Purple, Teal, Green, Rose, Orange, Graphite. Switch live from Settings; no reload.
- **Settings row** — enable/disable switch plus the accent grid in *Settings → General → Material 3*.
- **Clean toggle** — disabling unmounts every style tag and the ripple listener; the stock UI returns untouched (verified: composer radius goes 16px → 22px → 16px across off/on cycles).
- **Persistence** — the choice is stored in `localStorage` per browser.

## Install

From GitHub:

```bash
dsh plugin --profile web add github:kyomufs/dsh-md3-theme
```

From a local checkout:

```bash
dsh plugin --profile web add link:/absolute/path/to/dsh-md3-theme
```

Restart the harness web server afterwards (`dsh --profile web`), then reload the page.

## Usage

Open **Settings → General**, find the **Material 3** row:

- the switch turns the theme on and off;
- the preset chips pick the accent seed — light/dark palettes re-derive instantly.

The stock color-scheme switch (light/dark/system) continues to control which of the two MD3 palettes is shown.

## Presets

| Preset | Seed | MCU variant |
|---|---|---|
| DeepSeek Blue (default) | `#4176e6` | fidelity |
| Material Purple | `#6750a4` | fidelity |
| Teal | `#00796b` | fidelity |
| Green | `#2e7d32` | fidelity |
| Rose | `#c2185b` | fidelity |
| Orange | `#e65100` | fidelity |
| Graphite | `#60646c` | monochrome |

## How it works

1. `scripts/generate-palettes.mjs` builds light/dark `DynamicScheme`s for every preset and maps MD3 color roles (plus the M3 elevation shadows) onto 44 `--dsw-*` tokens (`lib/palettes.js` for the host, `lib/client-palettes.js` spliced into the client bundle).
2. The client half (`src/client.js`) registers a settings row and runs one *runtime* per apply: `ctx.theme.overrideTokens('dsh-md3-theme', tokens)` for color, and a style manager that mounts/unmounts the three CSS layers and the ripple listener.
3. The CSS lives in `src/styles/` and is inlined by `build.mjs` in load order:
   - `core.css` — motion/shape token declarations, focus rings, state transitions, press scale, scrollbars, selection, reduced-motion guard;
   - `components.css` — component restyle keyed on stable hooks: `role`/`aria-*`, `data-*` attributes, and hashed module classes;
   - `motion.css` — enter animations (dialog scale-fade, menu fade), hover elevation, ripple keyframes.
4. The host half (`lib/index.js`) only mounts the package so the composition loads its `dsh.client` bundle.

### Selector policy

Stable hooks first (`[role="dialog"]`, `button[aria-haspopup="menu"]`, `[data-composer-card]`, …). Hashed css-module classes (`.VOzbGW_panel`, `.uV2eYG_primary`, …) are allowed only when they survive the smoke test: `scripts/smoke.mjs` extracts every module class the CSS references and greps it against the installed harness bundles (`@deepseek-ai/dsh-client-*`). A dsh update that renames a class fails `npm run check` instead of silently breaking the theme — add `DSH_CLIENT_BUNDLES=/path/to/@deepseek-ai` to point the check at a specific install.

### Token mapping

Mapped: backgrounds and tonal containers (`bg-base`, `bg-layer-1..3`, overlays), brand/primary buttons, ghost/tonal/FAB/elevated/contrast buttons, the five-step text ladder (`label-*`), links, business/error states, toasts, component surfaces (user bubble, inputs, selector, sidebar), and the four `--dsw-shadow-lv*` tokens (M3 ambient + key pairs).

Deliberately untouched: neutral alpha borders/masks/skeletons, MD3 state layers (`interactive-bg-*`), success/warn colors (MD3 defines no such roles), markdown/code colors, and inverted tokens — they already read correctly against both palettes.

Known limits: the harness type scale is its own (MD3 type styles do not map 1:1 onto `--dsw-font-*`), markdown text styles stay on the harness scale, and third-party plugin components are not targeted (registry check only covers harness bundles).

## Development

```bash
npm install
npm run generate   # rebuild lib/palettes.js + lib/client-palettes.js from seeds
npm run build      # inline CSS layers + splice palettes + src/client.js into lib/client.js
npm run check      # generate + build + syntax-check + smoke (store/slot API, style
                   # layer lifecycle, ripple listener, token names, selector registry)
```

Client edits need only a page reload (bundles are served with `no-cache`); host/package metadata changes need a server restart.

To add an accent, append an entry to `PRESETS` in `scripts/generate-palettes.mjs` and run `npm run generate && npm run build`.

## License

MIT

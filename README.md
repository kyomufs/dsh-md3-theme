# dsh-md3-theme

Full Material Design 3 (Material You) theme for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — HCT-generated light/dark palettes with seven accent presets **plus a full component restyle aligned with M3 Expressive**: the 10-step shape scale, pressed-state shape morphing, split & connected button groups, tonal elevation, spring-based motion, emphasized typography, state layers, spec-accurate controls (switch/checkbox/radio/slider/chips), spec progress indicators, focus indicators, scrollbars and press ripple.

The plugin derives every color with Google's [`@material/material-color-utilities`](https://github.com/material-foundation/material-color-utilities) (HCT color space) from a seed color, maps the resulting Material 3 color roles onto the harness `--dsw-*` semantic tokens, and layers them over the active theme via `ctx.theme.overrideTokens`. On top of that, three CSS layers (core → components → motion) mount as `style[data-plugin-css]` tags while the theme is on. The built-in light/dark/system preference keeps working exactly as before.

## Features

- **Full MD3 palette, both modes** — surfaces, tonal containers, text ladder, outlines, primary/secondary/error roles for light *and* dark in every preset (44 tokens per scheme).
- **MD3 elevation** — the harness shadow tokens are re-mapped to the Material 3 ambient + key pairs (level 1–3).
- **MD3 shape scale (10 steps)** — dialogs 28px, cards 12px, bubbles 16px, menus 4px, plus the Expressive `20/32/48px` steps as tokens; buttons/nav rows fully rounded; optical nesting (`inner = outer − padding`) inside menus (8px surface − 4px padding = 4px items).
- **Interactive state layers** — every ghost/icon/text button, menu item, session row, settings row and composer control gets the spec state layers: hover = 8% on-surface, pressed = 10% (the harness's own `active` token is 14% — the theme replaces it with the M3 value); filled buttons brighten on hover and compress on press.
- **Shape morph (M3 Expressive)** — every pill button morphs its corners while pressed: `CornerFull → CornerSmall (8dp)` per the spec `PressedContainerShape`, carried by the fast spatial spring (`350ms`, overshooting cubic-bezier) and released with a bounce.
- **Split button** — the model/effort trigger renders the spec split anatomy: outlined fully-round container, leading content region, trailing menu segment (tertiary-container fill, primary icon, 4dp inner corners, 2dp between regions) — clicks keep their original menu behaviour; the trailing segment carries its own hover/pressed state layer.
- **Connected button group** — the dock chrome's icon pair becomes a spec connected group: 2dp padding/gap inside one fully-round outline-variant capsule with 8dp inner corners; the settings accent presets render as a second spec capsule (2dp padding/gap, outline-variant, 8dp inner corners, tonal selected); other clusters (composer toolbar, row actions) match the standard-group spacing (12dp).
- **FAB** — the composer send button follows the small-FAB spec: 40×40, CornerMedium (12dp) shape, 24dp icon, soft elevation that lifts one level on hover, hover brighten + press compress, and the shared pressed shape-morph (12dp → 8dp).
- **M3 switch (real spec)** — 52×32 track with a 2px outline when off; handle grows 16dp → **24dp selected** → 28dp pressed; tonal off / primary on.
- **M3 checkbox & radio** — checkboxes are 18dp boxes with 2px corners that fill primary with a white check when on; radios are 20dp circles with a primary dot; both get hover feedback.
- **M3 slider** — `input[type=range]` gets the visual-refresh shape: 4px rounded track, 4×20 primary handle that stretches on press, primary focus halo.
- **Chips at 8dp** — filter/assist chips and the header menu triggers (subagents / background jobs) follow the M3 chip spec (32dp height, 8dp corner, label-large type); selected chips render emphasized; icon/text buttons stay full pills.
- **Navigation drawer** — workspace folders and session rows render as full-width fully-rounded items (40dp density-adapted): tonal hover, pressed morph to 8dp, and a secondary-container pill for the active session/folder.
- **Baseline menus** — every `role=menu` popup follows the spec: 4dp container corners, lv2 elevation, 48dp items with 12dp leading/trailing padding, square optical-nested item corners, 8%/10% state layers, padded dividers — and while a menu is open its trigger reads as pressed (10% layer).
- **Navigation rail** — collapsing the sidebar now produces the spec narrow rail: 80dp container, the New Session action lifted into a 40×40 small FAB (CornerMedium 12dp, soft elevation that rises on hover), and every icon-only destination gets the 56×32 fully-round rail item indicator with the active panel filled in secondary container.
- **Top app bar** — the session header becomes a spec small top app bar: a 48dp surface-container row with the title/breadcrumb cluster leading, actions and utilities trailing, and a hairline outline separation from the navigation bar below.
- **Navigation bar** — the session tabs become a spec nav bar: full-width 48dp surface strip (CornerNone), 40dp items with fully-round active indicator in secondary container (the baseline underline is replaced by the pill), hover/pressed state layers.
- **Progress & dividers** — linear progress follows the spec: 4dp fully-rounded track in secondary container under a primary active bar (the harness keeps its indeterminate wave); the circular loading spinner renders at 24dp with 4dp thickness, primary arc over a secondary-container ring; `hr`/separators use outline-variant.
- **M3 outlined inputs** — text/search/number fields get an outline-variant border that turns primary with a 2px focus ring.
- **M3 Expressive motion** — enter animations and state transitions use the sanctioned web spring fallbacks from the Expressive motion table: spatial springs (overshoot) for movement, effects springs (never overshoot) for color/opacity; press scales controls down, hover raises cards a level. `prefers-reduced-motion` disables animation entirely.
- **Emphasized typescale** — baseline and emphasized label/title/headline/body styles ship as CSS tokens; selection and actions opt in (active nav item, selected preset chip, primary buttons, badges).
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

Deliberately untouched: neutral alpha borders/masks/skeletons, the harness `interactive-bg-hover` state layer (already the spec 8% on-surface), success/warn colors (MD3 defines no such roles), markdown/code colors, and inverted tokens — they already read correctly against both palettes. The theme's own rules replace `interactive-bg-active` (14%) with the spec 10% pressed layer where it styles buttons and menu items.

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

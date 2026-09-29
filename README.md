# dsh-md3-theme

Material Design 3 (Material You) theme for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — HCT-generated light and dark palettes with seven accent presets, applied through the harness theme-token layer.

The plugin derives every color with Google's [`@material/material-color-utilities`](https://github.com/material-foundation/material-color-utilities) (HCT color space) from a seed color, maps the resulting Material 3 color roles onto the harness `--dsw-*` semantic tokens, and layers them over the active theme via `ctx.theme.overrideTokens`. The built-in light/dark/system preference keeps working exactly as before.

## Features

- **Full MD3 palette, both modes** — surfaces, tonal containers, text ladder, outlines, primary/secondary/error roles for light *and* dark in every preset.
- **Seven accent presets** — DeepSeek Blue, Material Purple, Teal, Green, Rose, Orange, Graphite. Switch live from Settings; no reload.
- **Settings row** — enable/disable switch plus the accent grid in *Settings → General → Material 3*.
- **Zero hard-coded changes** — the plugin only layers tokens; disable it and the stock palette returns untouched.
- **Persistence** — the choice is stored in `localStorage` per browser.

## Install

From npm (after publish):

```bash
dsh plugin --profile web add npm:dsh-md3-theme
```

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

1. `scripts/generate-palettes.mjs` builds light/dark `DynamicScheme`s for every preset and maps MD3 roles onto 41 `--dsw-*` tokens (`lib/palettes.js` for the host, `lib/client-palettes.js` spliced into the client bundle).
2. The client half (`src/client.js`) registers a settings row and calls `ctx.theme.overrideTokens('dsh-md3-theme', tokens)` — one layer per apply; disposing the layer restores the base theme.
3. The host half (`lib/index.js`) only mounts the package so the composition loads its `dsh.client` bundle.

### Token mapping

Mapped: backgrounds and tonal containers (`bg-base`, `bg-layer-1..3`, overlays), brand/primary buttons, ghost/tonal/FAB/elevated/contrast buttons, the five-step text ladder (`label-*`), links, business/error states, toasts, and component surfaces (user bubble, inputs, selector, sidebar).

Deliberately untouched: neutral alpha borders/masks/skeletons, MD3 state layers (`interactive-bg-*`), success/warn colors (MD3 defines no such roles), markdown/code colors, and inverted tokens — they already read correctly against both palettes.

Known harness limits: corner radii are not tokenized (only the global superellipse `corner-shape`), the type scale is the harness's own (MD3 type styles do not map 1:1), and component state layers/motion live in component CSS — this plugin is a palette retokenization, not a component restyle.

## Development

```bash
npm install
npm run generate   # rebuild lib/palettes.js + lib/client-palettes.js from seeds
npm run build      # splice palettes + src/client.js into lib/client.js
npm run check      # generate + build + syntax-check both halves
```

Client edits need only a page reload (bundles are served with `no-cache`); host/package metadata changes need a server restart.

To add an accent, append an entry to `PRESETS` in `scripts/generate-palettes.mjs` and run `npm run generate && npm run build`.

## License

MIT

"use strict";

// Client half of dsh-md3-theme. Declares (in this order, spliced by build.mjs):
//   var MD3_META / MD3_PRESETS / MD3_PALETTES   — generated palette data
// then runs inside the module-loader factory where `require`, `module` and
// `exports` are in scope.

const react = require("react");
const { defineStore } = require("@deepseek-ai/dsh-client-store");

const h = react.createElement;

/** Override-layer source reported to the theme service. */
const SOURCE = "dsh-md3-theme";
/** Locale namespace of this plugin's settings strings. */
const LOCALE_NS = "dsh-md3-theme";
/** Browser-local preference storage (accent choice is a per-browser taste). */
const STORAGE_KEY = "dsh-md3-theme";
/** Default preset when nothing is stored yet. */
const DEFAULT_ACCENT = "deepseek";

// ---------------------------------------------------------------------------
// Preferences: { enabled, accent } persisted in localStorage.
// ---------------------------------------------------------------------------
function readState() {
  const fallback = { enabled: true, accent: DEFAULT_ACCENT };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed.enabled !== false,
      accent: Object.prototype.hasOwnProperty.call(MD3_PALETTES, parsed.accent)
        ? parsed.accent
        : DEFAULT_ACCENT,
    };
  } catch {
    return fallback;
  }
}

function writeState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private mode): the theme still applies live.
  }
}

// ---------------------------------------------------------------------------
// Theme application: one overrideTokens layer per (re)apply.
// ---------------------------------------------------------------------------
function toOverrides(palette) {
  const overrides = {};
  for (const [name, light] of Object.entries(palette.light)) {
    overrides[name] = { light, dark: palette.dark[name] ?? light };
  }
  return overrides;
}

function createThemeApplier(ctx) {
  let dispose = null;
  return function applyState(state) {
    if (dispose) {
      dispose();
      dispose = null;
    }
    if (!state.enabled) return;
    const palette = MD3_PALETTES[state.accent];
    if (!palette) return;
    dispose = ctx.theme.overrideTokens(SOURCE, toOverrides(palette));
  };
}

// ---------------------------------------------------------------------------
// Row styles: one injected style tag, removed with the plugin context.
// ---------------------------------------------------------------------------
const ROW_CSS = `
.dsh-md3-group{display:flex;flex-direction:column;gap:12px;padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2)}
.dsh-md3-head{display:flex;align-items:center;justify-content:space-between;gap:16px}
.dsh-md3-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}
.dsh-md3-sub{color:var(--dsw-alias-label-caption);font-size:12px;line-height:18px}
.dsh-md3-switch{position:relative;flex:none;width:44px;height:24px;padding:0;border:none;border-radius:12px;background:var(--dsw-alias-bg-module-platform);cursor:pointer;transition:background .15s ease}
.dsh-md3-switch:disabled{opacity:.5;cursor:default}
.dsh-md3-switch-on{background:var(--dsw-alias-brand-primary)}
.dsh-md3-thumb{position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:var(--dsw-alias-label-primary);transition:transform .15s ease,background .15s ease}
.dsh-md3-switch-on .dsh-md3-thumb{transform:translateX(20px);background:var(--dsw-alias-brand-primary-invert)}
.dsh-md3-grid{display:flex;flex-wrap:wrap;gap:8px}
.dsh-md3-preset{display:flex;align-items:center;gap:8px;padding:8px 14px;border:.5px solid var(--dsw-alias-border-l4);border-radius:20px;background:transparent;font:inherit;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary);cursor:pointer;transition:background .1s ease,border-color .1s ease}
.dsh-md3-preset:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dsh-md3-preset:disabled{opacity:.5;cursor:default}
.dsh-md3-preset-selected{background:var(--dsw-alias-bg-module-platform);border-color:var(--dsw-static-neutral-bluish-400)}
.dsh-md3-swatch{flex:none;width:16px;height:16px;border-radius:50%;box-shadow:inset 0 0 0 .5px rgba(0,0,0,.12)}
`;

function installRowStyles(ctx) {
  ctx.effect(() => {
    const tag = document.createElement("style");
    tag.dataset.plugin = SOURCE;
    tag.textContent = ROW_CSS;
    document.head.appendChild(tag);
    return () => tag.remove();
  }, SOURCE + ": row styles");
}

// ---------------------------------------------------------------------------
// Settings row: enable switch + accent preset grid.
// ---------------------------------------------------------------------------
function MD3Row({ t, useStore, setEnabled, setAccent }) {
  const enabled = useStore((s) => s.enabled);
  const accent = useStore((s) => s.accent);
  return h(
    "div",
    { className: "dsh-md3-group" },
    h(
      "div",
      { className: "dsh-md3-head" },
      h(
        "div",
        null,
        h("div", { className: "dsh-md3-title" }, t("title")),
        h("div", { className: "dsh-md3-sub" }, enabled ? t("hint.enabled") : t("hint.disabled")),
      ),
      h(
        "button",
        {
          type: "button",
          role: "switch",
          "aria-checked": enabled,
          "aria-label": t("title"),
          className: "dsh-md3-switch" + (enabled ? " dsh-md3-switch-on" : ""),
          onClick: () => setEnabled(!enabled),
        },
        h("span", { className: "dsh-md3-thumb" }),
      ),
    ),
    h(
      "div",
      { className: "dsh-md3-grid" },
      MD3_PRESETS.map((preset) =>
        h(
          "button",
          {
            key: preset.id,
            type: "button",
            "aria-pressed": accent === preset.id,
            disabled: !enabled,
            className: "dsh-md3-preset" + (accent === preset.id ? " dsh-md3-preset-selected" : ""),
            onClick: () => setAccent(preset.id),
            title: preset.hex,
          },
          h("span", { className: "dsh-md3-swatch", style: { background: preset.hex } }),
          preset.label,
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Slot store mirrors the local preference; the row reads it through useStore.
// ---------------------------------------------------------------------------
function createRowStore() {
  return defineStore({
    init: () => ({ enabled: true, accent: DEFAULT_ACCENT }),
    actions: {
      sync: (draft, enabled, accent) => {
        draft.enabled = enabled;
        draft.accent = accent;
      },
    },
  });
}

const inject = ["theme", "slots", "locale"];

function apply(ctx) {
  installRowStyles(ctx);

  ctx.effect(
    () =>
      ctx.locale.register(LOCALE_NS, {
        en: {
          title: "Material 3",
          "hint.enabled": "MD3 palette applied to light and dark themes.",
          "hint.disabled": "Theme off — DeepSeek default palette.",
        },
        ru: {
          title: "Material 3",
          "hint.enabled": "Палитра MD3 применена к светлой и тёмной теме.",
          "hint.disabled": "Тема выключена — стандартная палитра DeepSeek.",
        },
      }),
    SOURCE + ": locale dictionaries",
  );

  const state = readState();
  const applyTheme = createThemeApplier(ctx);
  applyTheme(state);

  const store = createRowStore();
  store.sync(state.enabled, state.accent);
  const update = (next) => {
    const merged = { ...state, ...next };
    state.enabled = merged.enabled;
    state.accent = merged.accent;
    writeState(state);
    store.sync(state.enabled, state.accent);
    applyTheme(state);
  };

  let bound;
  const injected = (actions) => {
    bound = actions;
    bound?.sync(state.enabled, state.accent);
    return {
      setEnabled: (enabled) => update({ enabled }),
      setAccent: (accent) => update({ accent }),
    };
  };

  ctx.slots.inject("settings.general.item", () =>
    ctx.slots.register(
      {
        name: "settings.general.item",
        id: "md3-theme",
        order: 12,
        store,
        locale: LOCALE_NS,
        inject: injected,
      },
      MD3Row,
    ),
  );
}

exports.apply = apply;
exports.inject = inject;

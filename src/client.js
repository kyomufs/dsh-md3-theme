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

// ---------------------------------------------------------------------------
// Ripple: one delegated pointerdown listener injects a span per press on a
// <button>; the CSS layer animates it. Skips reduced-motion users. Mounted
// together with the style layer so a disabled theme leaves nothing behind.
// ---------------------------------------------------------------------------
function createRippleHandler() {
  if (typeof document === "undefined" || typeof document.addEventListener !== "function") {
    return null;
  }
  const handler = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = event.target && event.target.closest ? event.target.closest("button") : null;
    if (!target || target.disabled || target.matches(":disabled")) return;
    if (target.querySelector && target.querySelector(".dsh-md3-ripple")) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const size = Math.max(rect.width, rect.height) * 1.1;
    const span = document.createElement("span");
    span.className = "dsh-md3-ripple";
    span.style.width = size + "px";
    span.style.height = size + "px";
    span.style.left = (event.clientX - rect.left - size / 2) + "px";
    span.style.top = (event.clientY - rect.top - size / 2) + "px";
    if (getComputedStyle(target).position === "static") target.style.position = "relative";
    target.appendChild(span);
    const drop = () => span.remove();
    span.addEventListener("animationend", drop);
    setTimeout(drop, 700); // safety net if the animation never fires
  };
  document.addEventListener("pointerdown", handler, true);
  return () => document.removeEventListener("pointerdown", handler, true);
}

// ---------------------------------------------------------------------------
// Style layer: the MD3 CSS files mount as style[data-plugin-css] tags while
// the theme is enabled and unmount on toggle-off / context dispose, so
// disabling the theme restores the stock UI. The ripple handler follows the
// same switch.
// ---------------------------------------------------------------------------
function createRuntime(ctx) {
  let tags = [];
  let removeRipple = null;
  const set = (active) => {
    for (const tag of tags) tag.remove();
    tags = [];
    if (removeRipple) {
      removeRipple();
      removeRipple = null;
    }
    if (!active || typeof document === "undefined") return;
    for (const name of MD3_CSS_ORDER) {
      const css = MD3_CSS[name];
      if (!css) continue;
      const tag = document.createElement("style");
      tag.dataset.plugin = SOURCE;
      tag.dataset.pluginCss = SOURCE + "/" + name;
      tag.textContent = css;
      document.head.appendChild(tag);
      tags.push(tag);
    }
    removeRipple = createRippleHandler();
  };
  ctx.effect(() => () => set(false), SOURCE + ": md3 style layer");
  return { set };
}

// One palette override + CSS layer per (re)apply.
function createThemeApplier(ctx) {
  const runtime = createRuntime(ctx);
  let dispose = null;
  return function applyState(state) {
    if (dispose) {
      dispose();
      dispose = null;
    }
    runtime.set(state.enabled);
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
.dsh-md3-switch{position:relative;flex:none;box-sizing:border-box;width:52px;height:32px;padding:0;border:2px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-module-platform);cursor:pointer;transition:background var(--dsh-md3-dur-effects) var(--dsh-md3-spring-effects),border-color var(--dsh-md3-dur-effects) var(--dsh-md3-spring-effects)}
.dsh-md3-switch:disabled{opacity:.5;cursor:default}
.dsh-md3-switch-on{background:var(--dsw-alias-brand-primary);border-color:transparent}
.dsh-md3-thumb{position:absolute;top:6px;left:6px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-label-primary);transition:transform var(--dsh-md3-dur-spatial-fast) var(--dsh-md3-spring-spatial-fast),background var(--dsh-md3-dur-effects) var(--dsh-md3-spring-effects)}
.dsh-md3-switch-on .dsh-md3-thumb{transform:translateX(20px) scale(1.5);background:var(--dsw-alias-brand-primary-invert)}
.dsh-md3-switch:active:not(:disabled) .dsh-md3-thumb{transform:scale(1.5)}
.dsh-md3-switch-on:active:not(:disabled) .dsh-md3-thumb{transform:translateX(20px) scale(1.75)}
.dsh-md3-grid{display:flex;flex-wrap:wrap;gap:2px;padding:2px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:9999px;background:var(--dsw-alias-bg-module-platform)}
.dsh-md3-preset{display:flex;align-items:center;gap:8px;box-sizing:border-box;height:32px;padding:0 16px;border:0;border-radius:8px;background:transparent;font:inherit;font-size:14px;font-weight:500;line-height:20px;letter-spacing:.1px;color:var(--dsw-alias-label-primary);cursor:pointer;transition:background var(--dsh-md3-dur-effects) var(--dsh-md3-spring-effects),border-color var(--dsh-md3-dur-effects) var(--dsh-md3-spring-effects)}
.dsh-md3-preset:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dsh-md3-preset:active:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
.dsh-md3-preset:disabled{opacity:.5;cursor:default}
.dsh-md3-preset-selected{background:var(--dsw-alias-state-business-tertiary);border-color:transparent;color:var(--dsw-alias-label-primary);font-weight:700}
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
    init: () => readState(),
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
          "hint.enabled": "Full MD3 applied: palette, shape, elevation, motion, ripple.",
          "hint.disabled": "Theme off — DeepSeek default UI.",
        },
        ru: {
          title: "Material 3",
          "hint.enabled": "Применён полный MD3: палитра, форма, тени, анимации, ripple.",
          "hint.disabled": "Тема выключена — стандартный интерфейс DeepSeek.",
        },
      }),
    SOURCE + ": locale dictionaries",
  );

  const state = readState();
  const applyTheme = createThemeApplier(ctx);
  applyTheme(state);

  const store = createRowStore();
  // The handle itself carries no actions: baked actions live on the instance
  // the framework creates and hands to `inject` below (bound in `injected`).
  let bound;
  const update = (next) => {
    const merged = { ...state, ...next };
    state.enabled = merged.enabled;
    state.accent = merged.accent;
    writeState(state);
    bound?.sync(state.enabled, state.accent);
    applyTheme(state);
  };

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

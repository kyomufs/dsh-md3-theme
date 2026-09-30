// Smoke test: load lib/client.js the way the module loader does, run apply()
// with a mocked ctx, and exercise the settings row end-to-end. Catches API
// misuse (like calling actions on the store handle) before installing.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import vm from "node:vm";

const code = readFileSync("lib/client.js", "utf8");

let entry = null;
const styleTags = [];
const listeners = [];
const context = {
  console,
  window: {
    __ModuleLoader__: { load: (e) => { entry = e; } },
    matchMedia: () => ({ matches: false }),
  },
  document: {
    createElement: (tag) => ({
      tagName: tag,
      dataset: {},
      textContent: "",
      remove() {
        const i = styleTags.indexOf(this);
        if (i >= 0) styleTags.splice(i, 1);
      },
    }),
    head: { appendChild: (el) => styleTags.push(el) },
    querySelector: () => null,
    addEventListener: (type, fn) => listeners.push([type, fn]),
    removeEventListener: (type, fn) => {
      const i = listeners.findIndex(([t, f]) => t === type && f === fn);
      if (i >= 0) listeners.splice(i, 1);
    },
  },
  localStorage: {
    store: { "dsh-md3-theme": JSON.stringify({ enabled: true, accent: "teal" }) },
    getItem(k) { return this.store[k] ?? null; },
    setItem(k, v) { this.store[k] = v; },
  },
};
vm.runInNewContext(code, context, { filename: "lib/client.js" });
if (!entry || entry.id !== "dsh-md3-theme") throw new Error("loader entry missing");

const storeCalls = [];
const themeCalls = [];
const slotSlots = {};
const factory = entry.factory;
const mod = factory((id) => {
  if (id === "react") return { createElement: (...args) => ({ h: args }) };
  if (id === "@deepseek-ai/dsh-client-store") {
    return {
      defineStore: (decl) => ({
        spec: decl,
        create: () => ({
          actions: Object.fromEntries(
            Object.keys(decl.actions).map((k) => [
              k,
              (...p) => { const d = decl.init(); decl.actions[k](d, ...p); storeCalls.push([k, d, p]); },
            ]),
          ),
          getSnapshot: () => decl.init(),
          subscribe: () => () => {},
        }),
      }),
    };
  }
  throw new Error("unexpected require: " + id);
});

const exports = mod.exports ?? mod;
if (typeof exports.apply !== "function") throw new Error("apply export missing");
if (!Array.isArray(exports.inject)) throw new Error("inject export missing");

const ctx = {
  theme: {
    overrideTokens: (source, tokens) => {
      themeCalls.push({ source, tokens });
      for (const v of Object.values(tokens)) {
        if (typeof v.light !== "string" || typeof v.dark !== "string") {
          throw new Error("token pair malformed");
        }
      }
      return () => themeCalls.push({ disposed: source });
    },
  },
  effect: (fn) => (typeof fn() === "function" ? fn() : () => {}),
  locale: { register: (ns, dict) => { if (!dict.en || !dict.ru) throw new Error("dicts"); return () => {}; } },
  slots: {
    inject: (name, fn) => { slotSlots[name] = fn; },
    register: (meta, component) => { slotSlots.meta = meta; slotSlots.component = component; return () => {}; },
  },
};

exports.apply(ctx);
console.log("apply: ok; theme layers:", themeCalls.length, themeCalls[0]?.source);

const dispose = slotSlots["settings.general.item"]();
if (typeof dispose !== "function") throw new Error("slot register must return disposer");
if (slotSlots.meta.store.create === undefined) throw new Error("store seat must be a handle");

const actions = {
  sync: (...args) => storeCalls.push(["sync", args]),
};
let rowProps = null;
const injectedResult = slotSlots.meta.inject(actions);
if (typeof injectedResult.setEnabled !== "function" || typeof injectedResult.setAccent !== "function") {
  throw new Error("inject must return row actions");
}
console.log("inject: ok; sync calls:", JSON.stringify(storeCalls));

injectedResult.setAccent("rose");
injectedResult.setEnabled(false);
console.log("update: ok; localStorage =", context.localStorage.store["dsh-md3-theme"]);
console.log("theme re-applies:", themeCalls.filter((c) => c.source).length, "disposed:", themeCalls.filter((c) => c.disposed).length);

// Style layer: mounted while enabled, unmounted on disable, remounted on
// enable, and every tag carries the plugin identity for lifecycle tracking.
const md3Tags = () =>
  styleTags.filter((t) => t.dataset.pluginCss && t.dataset.pluginCss.startsWith("dsh-md3-theme/"));
if (md3Tags().length) throw new Error("style layer must unmount when the theme is disabled");
injectedResult.setEnabled(true);
const mounted = md3Tags();
if (!mounted.length) throw new Error("style layer must mount when the theme is enabled");
for (const tag of mounted) {
  if (tag.dataset.plugin !== "dsh-md3-theme") throw new Error("style tag missing data-plugin");
  if (!tag.textContent.trim()) throw new Error("style tag mounted with empty css: " + tag.dataset.pluginCss);
}
console.log("style layer: ok (" + mounted.map((t) => t.dataset.pluginCss.split("/")[1]).join(", ") + ")");

if (!listeners.some(([type]) => type === "pointerdown")) throw new Error("ripple listener not installed");
console.log("ripple: ok (delegated pointerdown listener installed)");

// Render the row once (mock useStore reads from a fixed state).
const row = slotSlots.component({
  t: (k) => k,
  useStore: (sel) => sel({ enabled: true, accent: "rose" }),
  setEnabled: injectedResult.setEnabled,
  setAccent: injectedResult.setAccent,
});
if (!row || !row.h) throw new Error("row render failed");
console.log("row render: ok");

// Every palette token must be a real harness token, or it is written to the
// document and read by nobody (the presenter forwards names unchecked).
const baseTokens = new Set(JSON.parse(readFileSync("scripts/base-tokens.json", "utf8")));
const { MD3_PALETTES } = await import("../lib/palettes.js");
const unknownTokens = new Set();
for (const palette of Object.values(MD3_PALETTES)) {
  for (const name of Object.keys(palette.light)) if (!baseTokens.has(name)) unknownTokens.add(name);
}
if (unknownTokens.size) throw new Error(`unknown token names: ${[...unknownTokens].join(", ")}`);
console.log("token names: ok (" + baseTokens.size + " known base tokens)");

// ---- Selector registry: module classes referenced by the CSS layer must
// still exist in the installed harness bundles. A dsh update that renames a
// class fails this check instead of silently breaking the theme.
const cssFiles = readdirSync("src/styles").filter((f) => f.endsWith(".css"));
const classRe = /\.[A-Za-z_][A-Za-z0-9-]*(?:_[A-Za-z0-9-]+)+/g;
const usedClasses = new Set();
for (const f of cssFiles) {
  const css = readFileSync(`src/styles/${f}`, "utf8");
  for (const m of css.matchAll(classRe)) usedClasses.add(m[0].slice(1));
}
const ownClasses = [...usedClasses].filter((c) => c.startsWith("dsh-md3-"));
const foreignClasses = [...usedClasses].filter((c) => !c.startsWith("dsh-md3-"));

function findBundleDirs() {
  const dirs = [];
  if (process.env.DSH_CLIENT_BUNDLES && existsSync(process.env.DSH_CLIENT_BUNDLES)) {
    dirs.push(process.env.DSH_CLIENT_BUNDLES);
    return dirs;
  }
  // Locate @deepseek-ai/dsh/node_modules/@deepseek-ai in any installed dsh.
  let store = [];
  try {
    store = readdirSync("/nix/store").filter((e) => e.includes("-dsh-"));
  } catch { /* not on nix: fall through to skip */ }
  for (const entry of store.sort().reverse()) {
    const p = `/nix/store/${entry}/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai`;
    if (existsSync(p) && existsSync(`${p}/dsh-client-ui-theme/lib/client.js`)) {
      dirs.push(p);
      break;
    }
  }
  return dirs;
}

const bundleDirs = findBundleDirs();
if (!bundleDirs.length) {
  console.warn("WARNING: harness bundles not found — selector registry check skipped");
} else {
  let haystack = "";
  for (const dir of bundleDirs) {
    for (const pkg of readdirSync(dir)) {
      const file = `${dir}/${pkg}/lib/client.js`;
      if (existsSync(file)) haystack += readFileSync(file, "utf8");
    }
  }
  // Also cover the harness core bundle and profile plugin packages (plain
  // domain classes like `dsh_notification_checkbox` live there).
  let store = [];
  try {
    store = readdirSync("/nix/store").filter((e) => e.includes("-dsh-"));
  } catch { /* skip */ }
  for (const entry of store.sort().reverse()) {
    const main = `/nix/store/${entry}/lib/node_modules/@deepseek-ai/dsh/lib/client.js`;
    if (existsSync(main)) { haystack += readFileSync(main, "utf8"); break; }
  }
  const profile = `${process.env.HOME}/.dsh/profiles/web/node_modules`;
  try {
    for (const pkg of readdirSync(profile)) {
      const file = `${profile}/${pkg}/lib/client.js`;
      if (pkg !== "dsh-md3-theme" && existsSync(file)) haystack += readFileSync(file, "utf8");
    }
  } catch { /* skip */ }
  // Cover the built web frontend (docking/tooltip components ship as hashed
  // CSS modules inside dist/assets, not as lib/client.js packages).
  for (const entry of store.sort().reverse()) {
    const assets = `/nix/store/${entry}/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets`;
    if (!existsSync(assets)) continue;
    for (const file of readdirSync(assets)) {
      if (/\.(js|css)$/.test(file)) haystack += readFileSync(`${assets}/${file}`, "utf8");
    }
    break;
  }
  const missing = foreignClasses.filter((c) => !haystack.includes(c));
  if (missing.length) {
    throw new Error(
      `selector classes missing from harness bundles (dsh update drift?): ${missing.join(", ")}`,
    );
  }
  console.log(
    `selector registry: ok (${foreignClasses.length} foreign classes, ${ownClasses.length} own, ${foreignClasses.length - missing.length} found)`,
  );
}

console.log("SMOKE_OK");

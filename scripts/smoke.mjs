// Smoke test: load lib/client.js the way the module loader does, run apply()
// with a mocked ctx, and exercise the settings row end-to-end. Catches API
// misuse (like calling actions on the store handle) before installing.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const code = readFileSync("lib/client.js", "utf8");

let entry = null;
const context = {
  console,
  window: { __ModuleLoader__: { load: (e) => { entry = e; } } },
  document: {
    createElement: () => ({ dataset: {}, textContent: "", remove() {} }),
    head: { appendChild() {} },
    querySelector: () => null,
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

console.log("SMOKE_OK");

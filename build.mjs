// Builds lib/client.js: the module-loader registration wrapper around the
// generated palette data, the CSS layer files and the plugin source. No
// bundler involved — all parts are plain script bodies sharing one factory
// scope.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const header = `window.__ModuleLoader__.load({
	id: ${JSON.stringify(pkg.name)},
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
`;
const footer = `
		return module.exports;
	}
});
`;

const palettes = readFileSync(join(root, "lib", "client-palettes.js"), "utf8");

// CSS layer: core -> components -> motion ordering matters at equal weight.
// Files not listed below are appended alphabetically with a warning.
const CSS_ORDER = ["core.css", "components.css", "motion.css"];
const stylesDir = join(root, "src", "styles");
const files = existsSync(stylesDir)
  ? readdirSync(stylesDir).filter((f) => f.endsWith(".css"))
  : [];
const ordered = [
  ...CSS_ORDER.filter((f) => files.includes(f)),
  ...files.filter((f) => !CSS_ORDER.includes(f)).sort(),
];
for (const f of files) {
  if (!CSS_ORDER.includes(f)) console.warn(`warning: src/styles/${f} not in CSS_ORDER — appended last`);
}
const cssMap = {};
for (const f of ordered) {
  const name = f.replace(/\.css$/, "");
  cssMap[name] = readFileSync(join(stylesDir, f), "utf8");
}
const stylesBlock = `var MD3_CSS_ORDER = ${JSON.stringify(ordered.map((f) => f.replace(/\.css$/, "")))};
var MD3_CSS = ${JSON.stringify(cssMap)};
`;

const client = readFileSync(join(root, "src", "client.js"), "utf8");

const bundle = `${header}${palettes.trimEnd()}\n\n${stylesBlock}\n${client.trimEnd()}\n${footer}`;
writeFileSync(join(root, "lib", "client.js"), bundle);

console.log(
  `built lib/client.js (${bundle.length} bytes: palettes + ${ordered.length} css layers + src/client.js)`,
);

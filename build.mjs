// Builds lib/client.js: the module-loader registration wrapper around the
// generated palette data and the plugin source. No bundler involved — both
// parts are plain script bodies sharing one factory scope.
import { readFileSync, writeFileSync } from "node:fs";
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
const client = readFileSync(join(root, "src", "client.js"), "utf8");

const bundle = `${header}${palettes.trimEnd()}\n\n${client.trimEnd()}\n${footer}`;
writeFileSync(join(root, "lib", "client.js"), bundle);

console.log(
  `built lib/client.js (${bundle.length} bytes: palettes + src/client.js)`,
);

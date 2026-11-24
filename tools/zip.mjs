/**
 * Empaqueta el sistema tal como se publica: `npm run zip` → dist/trueque-noir.zip + dist/system.json.
 * Lo usan igual la release (workflow) y las pruebas locales, y falla si al zip le falta algo imprescindible.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
// Solo lo que Foundry necesita: sin pruebas, herramientas ni capturas del README.
const CONTENIDO = ["system.json", "trueque-noir.mjs", "module", "templates", "styles", "fonts", "lang", "assets", "data", "LICENSE", "README.md", "CHANGELOG.md", "CONTENIDO.md"];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST);
const zip = path.join(DIST, "trueque-noir.zip");
execFileSync("zip", ["-qr", zip, ...CONTENIDO, "-x", "*.DS_Store"], { cwd: ROOT, stdio: "inherit" });
fs.copyFileSync(path.join(ROOT, "system.json"), path.join(DIST, "system.json"));

// Lo que el zip tiene que llevar: el manifiesto, cada script y estilo que declara, plantillas y arte.
const lista = new Set(execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" }).split("\n").filter(Boolean));
const manifiesto = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8"));
const imprescindibles = ["system.json", ...manifiesto.esmodules, ...manifiesto.styles, ...manifiesto.languages.map(l => l.path),
  "module/ventanas.mjs", "module/accesibilidad.mjs", "module/retrato.mjs", "templates/actors/detective-sheet.hbs",
  "assets/logo.webp", "assets/mr-marca.webm", manifiesto.background.replace(`systems/${manifiesto.id}/`, "")];
const faltan = imprescindibles.filter(f => !lista.has(f));
if ([...lista].some(f => /^(tests|tools|docs|\.github)\//.test(f))) faltan.push("(el zip lleva pruebas, herramientas o docs)");
if (faltan.length) { console.error(`✗ Al zip le falta: ${faltan.join(", ")}`); process.exit(1); }
console.log(`✓ ${zip} · ${lista.size} archivos · ${(fs.statSync(zip).size / 1048576).toFixed(1)} MB`);

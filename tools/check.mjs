/**
 * Comprobación estructural del paquete. Sin dependencias: `node tools/check.mjs`.
 * Falla si una plantilla está rota, una ruta no existe o un botón se queda sin acción.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const fail = message => problems.push(message);

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = rel => fs.existsSync(path.join(ROOT, rel));

function walk(dir, extension) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(rel, extension));
    else if (entry.name.endsWith(extension)) out.push(rel);
  }
  return out;
}

const templates = walk("templates", ".hbs");
const modules = ["trueque-noir.mjs", ...walk("module", ".mjs")];

// 1. Handlebars y HTML equilibrados.
const VOID = new Set(["img", "input", "br", "hr", "meta", "link", "source"]);
for (const rel of templates) {
  const text = read(rel);
  const blocks = [];
  for (const match of text.matchAll(/\{\{([#/])([a-zA-Z_][\w.-]*)/g)) {
    if (match[1] === "#") blocks.push(match[2]);
    else if (blocks.pop() !== match[2]) fail(`${rel}: bloque Handlebars mal cerrado en {{/${match[2]}}}`);
  }
  if (blocks.length) fail(`${rel}: bloques Handlebars sin cerrar: ${blocks.join(", ")}`);

  const tags = [];
  for (const match of text.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
    const [, closing, rawName, , selfClose] = match;
    const name = rawName.toLowerCase();
    if (VOID.has(name) || selfClose) continue;
    if (closing) {
      if (tags.pop() !== name) fail(`${rel}: etiqueta mal cerrada </${name}>`);
    } else tags.push(name);
  }
  if (tags.length) fail(`${rel}: etiquetas sin cerrar: ${tags.join(", ")}`);
}

// 2. Rutas del sistema, imports y assets.
for (const rel of modules) {
  const text = read(rel);
  for (const match of text.matchAll(/"systems\/trueque-noir\/([^"]+)"/g)) {
    if (!exists(match[1])) fail(`${rel}: ruta inexistente ${match[1]}`);
  }
  for (const match of text.matchAll(/from "(\.\/[^"]+)"/g)) {
    const target = path.join(ROOT, path.dirname(rel), match[1]);
    if (!fs.existsSync(target)) fail(`${rel}: import roto ${match[1]}`);
  }
}
for (const rel of [...templates, ...walk("styles", ".css")]) {
  const text = read(rel);
  for (const match of text.matchAll(/systems\/trueque-noir\/(assets\/[\w./-]+)/g)) {
    if (!exists(match[1])) fail(`${rel}: asset inexistente ${match[1]}`);
  }
}

// 3. Manifiesto y JSON.
const manifest = JSON.parse(read("system.json"));
for (const rel of [...manifest.esmodules, ...manifest.styles, manifest.template]) {
  if (!exists(rel)) fail(`system.json: declara ${rel}, que no existe`);
}
for (const language of manifest.languages) {
  if (!exists(language.path)) fail(`system.json: idioma inexistente ${language.path}`);
}
const background = manifest.background?.replace("systems/trueque-noir/", "");
if (background && !exists(background)) fail(`system.json: fondo inexistente ${background}`);
for (const rel of ["template.json", "lang/es.json", "data/adventures.json"]) {
  try { JSON.parse(read(rel)); } catch (error) { fail(`${rel}: JSON inválido · ${error.message}`); }
}

// 4. Cada ambientación tiene su fondo de escena en el paquete.
const themes = read("module/themes.mjs");
const sceneFiles = [...themes.matchAll(/\$\{SCENES\}\/([\w-]+\.webp)/g)].map(match => match[1]);
if (!sceneFiles.length) fail("module/themes.mjs: ninguna ambientación declara fondo de escena");
for (const file of sceneFiles) {
  if (!exists(`assets/scenes/${file}`)) fail(`module/themes.mjs: falta assets/scenes/${file}`);
}
for (const asset of ["assets/logo.webp", "assets/token.webp", "assets/portrait.webp", "assets/cigarette.png"]) {
  if (!exists(asset)) fail(`falta el recurso ${asset}`);
}

// 5. Cada data-action de una plantilla tiene quien lo escuche.
const actions = new Set();
for (const rel of templates) {
  for (const match of read(rel).matchAll(/data-action=["']([\w-]+)["']/g)) actions.add(match[1]);
}
const handled = new Set();
for (const rel of modules) {
  const text = read(rel);
  for (const match of text.matchAll(/(?:on|go)\("([\w-]+)"/g)) handled.add(match[1]);
  for (const match of text.matchAll(/data-action=['"]([\w-]+)['"]/g)) handled.add(match[1]);
}
for (const action of actions) {
  if (!handled.has(action)) fail(`data-action="${action}" no tiene manejador en ningún módulo`);
}

// 6. Los ajustes que se leen están registrados.
const registered = new Set();
const config = read("module/config.mjs");
for (const match of config.matchAll(/register\("(\w+)"/g)) registered.add(match[1]);
for (const match of config.matchAll(/game\.settings\.register\(TN\.SYSTEM_ID, "(\w+)"/g)) registered.add(match[1]);
for (const rel of modules) {
  const text = read(rel);
  const used = [
    ...text.matchAll(/game\.settings\.(?:get|set)\(TN\.SYSTEM_ID, "(\w+)"/g),
    // `case-state.mjs` escribe a través de su propio atajo `set(clave, valor)`.
    ...text.matchAll(/(?:^|[^\w.])set\("(\w+)",/g)
  ];
  for (const match of used) {
    if (!registered.has(match[1])) fail(`${rel}: ajuste "${match[1]}" usado pero no registrado`);
  }
}

if (problems.length) {
  console.error(`✗ ${problems.length} problema(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`✓ ${templates.length} plantillas, ${modules.length} módulos, ${sceneFiles.length} ambientaciones y el manifiesto son coherentes.`);

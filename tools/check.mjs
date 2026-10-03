/**
 * Comprobación estructural del paquete. Sin dependencias: `node tools/check.mjs` (o `npm run check`).
 * Falla si una plantilla está rota, una ruta no existe, un botón se queda sin acción,
 * un ajuste se usa sin registrar o la versión no coincide con la etiqueta de la release.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const fail = message => problems.push(message);

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = rel => fs.existsSync(path.join(ROOT, rel));

function walk(dir, extension) {
  const out = [];
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(rel, extension));
    else if (entry.name.endsWith(extension)) out.push(rel);
  }
  return out;
}

const templates = walk("templates", ".hbs");
const modules = ["trueque-noir.mjs", ...walk("module", ".mjs")];
const scripts = [...modules, ...walk("tools", ".mjs"), ...walk("tests", ".mjs")];

// 0. Sintaxis de todo el JavaScript.
for (const rel of scripts) {
  try { execFileSync(process.execPath, ["--check", path.join(ROOT, rel)], { stdio: "pipe" }); }
  catch (error) { fail(`${rel}: ${String(error.stderr).split("\n")[0]}`); }
}

// 1. Handlebars y HTML equilibrados, con una sola raíz por plantilla (ApplicationV2 lo exige).
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
  let roots = 0;
  const sinComentarios = text.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
  for (const match of sinComentarios.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
    const [, closing, rawName, , selfClose] = match;
    const name = rawName.toLowerCase();
    if (VOID.has(name) || selfClose) continue;
    if (closing) {
      if (tags.pop() !== name) fail(`${rel}: etiqueta mal cerrada </${name}>`);
      if (!tags.length) roots += 1;
    } else tags.push(name);
  }
  if (tags.length) fail(`${rel}: etiquetas sin cerrar: ${tags.join(", ")}`);
  if (roots !== 1) fail(`${rel}: debe tener una sola raíz HTML y tiene ${roots}`);
}

// 2. Rutas del sistema, imports y assets.
for (const rel of scripts) {
  const text = read(rel);
  for (const match of text.matchAll(/systems\/trueque-noir\/([\w./-]+\.(?:hbs|webp|png|svg|css|woff2|json|mjs))/g)) {
    if (!exists(match[1])) fail(`${rel}: ruta inexistente ${match[1]}`);
  }
  for (const match of text.matchAll(/\$\{RUTA\}\/([\w./-]+\.(?:hbs|webp|png|json))/g)) {
    if (!exists(match[1])) fail(`${rel}: ruta inexistente ${match[1]}`);
  }
  for (const match of text.matchAll(/from "(\.{1,2}\/[^"]+)"/g)) {
    if (!fs.existsSync(path.join(ROOT, path.dirname(rel), match[1]))) fail(`${rel}: import roto ${match[1]}`);
  }
}
for (const rel of [...templates, ...walk("styles", ".css")]) {
  const text = read(rel);
  for (const match of text.matchAll(/systems\/trueque-noir\/(assets\/[\w./-]+)/g)) {
    if (!exists(match[1])) fail(`${rel}: asset inexistente ${match[1]}`);
  }
}
for (const rel of walk("styles", ".css")) {
  for (const match of read(rel).matchAll(/url\("\.\.\/([^"]+)"\)/g)) {
    if (!exists(match[1])) fail(`${rel}: falta ${match[1]}`);
  }
}

// 3. Manifiesto, versión y JSON.
const manifest = JSON.parse(read("system.json"));
for (const rel of [...manifest.esmodules, ...manifest.styles]) {
  if (!exists(rel)) fail(`system.json: declara ${rel}, que no existe`);
}
for (const language of manifest.languages) {
  if (!exists(language.path)) fail(`system.json: idioma inexistente ${language.path}`);
}
if (manifest.template) fail("system.json: `template` sobra, los datos viven en DataModels");
const background = manifest.background?.replace("systems/trueque-noir/", "");
if (background && !exists(background)) fail(`system.json: fondo inexistente ${background}`);
for (const rel of ["lang/es.json", "data/adventures.json"]) {
  try { JSON.parse(read(rel)); } catch (error) { fail(`${rel}: JSON inválido · ${error.message}`); }
}
if (exists("package.json") && JSON.parse(read("package.json")).version !== manifest.version) {
  fail("package.json y system.json no tienen la misma versión");
}
const etiqueta = process.env.RELEASE_TAG;
if (etiqueta && etiqueta !== `v${manifest.version}`) fail(`La etiqueta ${etiqueta} no coincide con la versión ${manifest.version}`);
if (!read("CHANGELOG.md").includes(`## ${manifest.version}`)) fail(`CHANGELOG.md no tiene entrada para ${manifest.version}`);

// 4. Cada ambientación tiene su fondo de escena en el paquete.
const sceneFiles = [...read("module/themes.mjs").matchAll(/\$\{SCENES\}\/([\w-]+\.webp)/g)].map(match => match[1]);
if (!sceneFiles.length) fail("module/themes.mjs: ninguna ambientación declara fondo de escena");
for (const file of sceneFiles) if (!exists(`assets/scenes/${file}`)) fail(`module/themes.mjs: falta assets/scenes/${file}`);
for (const asset of ["assets/logo.webp", "assets/token.webp", "assets/portrait.webp", "fonts/oswald.woff2", "fonts/barlow-sc-500.woff2"]) {
  if (!exists(asset)) fail(`falta el recurso ${asset}`);
}

// 5. Cada data-action de una plantilla tiene quien lo escuche (acciones de ApplicationV2 o botones del chat).
const handled = new Set(["tab", "editImage"]);
for (const rel of modules) {
  const text = read(rel);
  // Claves de `actions` ({ nombre: función } o método abreviado): heurística amplia, pensada para no dar falsos positivos.
  for (const match of text.matchAll(/(?:^|[{,]\s*)(?:async\s+)?(\w+)\s*(?::\s*[\w.#(]|\([^)]*\)\s*\{)/gm)) handled.add(match[1]);
  for (const match of text.matchAll(/data-action=["'](\w+)["']/g)) handled.add(match[1]);
}
for (const rel of templates) {
  for (const match of read(rel).matchAll(/data-action="(\w+)"/g)) {
    if (!handled.has(match[1])) fail(`${rel}: data-action="${match[1]}" no tiene manejador en ningún módulo`);
  }
}

// 6. Los ajustes que se leen están registrados.
const registered = new Set();
const config = read("module/config.mjs");
for (const match of config.matchAll(/^\s{2}(\w+): \[/gm)) registered.add(match[1]);
for (const match of config.matchAll(/game\.settings\.register(?:Menu)?\(ID, "(\w+)"/g)) registered.add(match[1]);
for (const rel of modules) {
  const text = read(rel);
  const used = [
    ...text.matchAll(/game\.settings\.(?:get|set)\((?:ID|TN\.SYSTEM_ID), "(\w+)"/g),
    ...text.matchAll(/(?:^|[^\w.])(?:poner|ajuste)\("(\w+)"/g)
  ];
  for (const match of used) {
    if (!registered.has(match[1])) fail(`${rel}: ajuste "${match[1]}" usado pero no registrado`);
  }
}

if (problems.length) {
  console.error(`✗ ${problems.length} problema(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`✓ ${scripts.length} scripts, ${templates.length} plantillas, ${sceneFiles.length} ambientaciones y el manifiesto son coherentes.`);

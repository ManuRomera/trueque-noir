/**
 * Verifica las ventanas del sistema en las pantallas habituales, en Foundry de verdad (kit mr-pantallas, versión CDP).
 *
 *   npm run pantallas                          # servidor de pruebas en http://localhost:30015 (Trabajo TN/prueba/montar.sh)
 *   npm run pantallas -- --url http://localhost:30013 --capturas salida/
 *
 * Abre Chrome sin cabeza, entra como el primer usuario sin contraseña (mundo de pruebas), y en cada pantalla abre una a una
 * la ficha, el Panel, la Mesa, los asistentes, el diálogo de tirada… Falla si una se sale de la pantalla, deja su botón
 * principal fuera u ocupa más del 92 % del alto o del ancho en pantallas menores de 1080p. Repite la ficha con el texto
 * al 160 % y la fuente legible.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const opcion = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const URL_BASE = opcion("url", "http://localhost:30015");
const CAPTURAS = opcion("capturas", null);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PANTALLAS = { "1024x640": "tableta pequeña", "1280x650": "portátil 13\" antiguo", "1366x657": "portátil 15\" básico", "1440x780": "MacBook 15\"",
  "1512x860": "MacBook 14\"", "1536x730": "portátil Windows 15\" al 125 %", "1680x900": "monitor 1680", "1920x950": "monitor 1080p", "2560x1300": "monitor 1440p" };

/** Lo que se ejecuta dentro de Foundry: abre cada ventana, la mide y la cierra. */
const EN_PAGINA = async (soloFicha) => {
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const nuestras = () => [...foundry.applications.instances.values()].filter(a => a.element?.classList.contains("trueque-noir"));
  const cerrar = async () => { for (const a of nuestras()) await a.close({ animate: false }); await espera(150); };
  const det = game.actors.find(a => a.type === "detective");
  const pnj = game.actors.find(a => a.type === "npc") ?? await Actor.create({ name: "PNJ de prueba", type: "npc" });
  const T = game.truequeNoir;
  const sobreFicha = ["tirada", "accesibilidad", "retrato"];
  const casos = soloFicha ? { ficha: () => det.sheet.render(true) } : {
    ficha: () => det.sheet.render(true), pnj: () => pnj.sheet.render(true), panel: () => T.abrirPanel(), mesa: () => T.abrirMesa(),
    bienvenida: () => T.abrirBienvenida(), ambientacion: () => T.abrirAmbientacion(), creadorDetective: () => T.abrirCreadorDetective(),
    creadorCiudad: () => T.abrirCreadorCiudad(),
    confirmar: () => { import(`/systems/trueque-noir/module/apps/dialogos.mjs`).then(m => m.confirmar({ title: "Prueba", message: "¿Seguro?" })); },
    tirada: () => det.sheet.element.querySelector("[data-action=tirar][data-tipo=risk]").click(),
    accesibilidad: () => det.sheet.element.querySelector(".tn-a11y-boton").click(),
    retrato: () => det.sheet.element.querySelector("[data-action=encuadrar]").click()
  };
  const W = document.documentElement.clientWidth, H = document.documentElement.clientHeight;
  const informe = [];
  for (const [nombre, abrir] of Object.entries(casos)) {
    await cerrar();
    if (sobreFicha.includes(nombre)) { await det.sheet.render(true); await espera(600); }
    await abrir();
    await espera(900);
    const apps = nuestras();
    const app = sobreFicha.includes(nombre) ? apps.find(a => a !== det.sheet) : apps[0];
    if (!app) { informe.push({ nombre, error: "no se abrió" }); continue; }
    const r = app.element.getBoundingClientRect();
    const boton = app.element.querySelector(".form-footer button, [data-action=tirar], .tn-btn--primary, footer button");
    const rb = boton?.getBoundingClientRect();
    const lim = W < 1920 || H < 950 ? 0.92 : 1, t = 0.5;
    const e = { nombre, escala: app.position.scale, alto: r.height / H, ancho: r.width / W,
      dentro: r.left >= -t && r.top >= -t && r.right <= W + t && r.bottom <= H + t,
      boton: rb ? rb.top >= r.top - t && rb.bottom <= Math.min(H, r.bottom) + t && rb.height > 0 : null,
      // Contenido que se sale por la derecha sin poder desplazarse (texto grande o fuente ancha).
      desborda: [...app.element.querySelectorAll(".window-content")].some(c => c.scrollWidth > c.clientWidth + 2 && getComputedStyle(c).overflowX === "hidden") };
    e.ok = e.dentro && e.boton !== false && e.alto <= lim && e.ancho <= lim && !e.desborda;
    informe.push(e);
  }
  await cerrar();
  return { pantalla: `${W}x${H}`, informe };
};

// ---------------------------------------------------------------- Chrome por CDP
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "tn-pantallas-"));
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${perfil}`, "--window-size=1920,1080", "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
const wsUrl = await new Promise((ok, mal) => {
  let buf = "";
  chrome.stderr.on("data", d => { buf += d; const m = buf.match(/ws:\/\/[^\s]+/); if (m) ok(m[0]); });
  setTimeout(() => mal(new Error("Chrome no arrancó")), 15000);
});
const navegador = new WebSocket(wsUrl);
await new Promise(r => navegador.addEventListener("open", r, { once: true }));
let n = 0;
const pendientes = new Map();
navegador.addEventListener("message", ev => { const m = JSON.parse(ev.data); if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m); pendientes.delete(m.id); } });
const cdp = (method, params = {}, sessionId) => new Promise((ok, mal) => {
  const id = ++n;
  pendientes.set(id, m => (m.error ? mal(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
  navegador.send(JSON.stringify({ id, method, params, sessionId }));
});
const { targetId } = await cdp("Target.createTarget", { url: "about:blank" });
const { sessionId } = await cdp("Target.attachToTarget", { targetId, flatten: true });
const pagina = (m, p) => cdp(m, p, sessionId);
const evaluar = async expr => {
  const r = await pagina("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const dormir = ms => new Promise(r => setTimeout(r, ms));
let fallos = 0;
try {
  await pagina("Page.enable");
  await pagina("Page.navigate", { url: `${URL_BASE}/join` });
  await dormir(2500);
  const usuario = await evaluar(`[...document.querySelectorAll('select[name=userid] option')].find(o => o.value)?.value`);
  if (!usuario) throw new Error(`No hay mundo abierto en ${URL_BASE} (lanza Trabajo TN/prueba/montar.sh)`);
  await evaluar(`fetch('/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', userid: '${usuario}', password: '' }) }).then(r => r.json())`);
  await pagina("Page.navigate", { url: `${URL_BASE}/game` });
  for (let i = 0; i < 60 && !(await evaluar("Boolean(globalThis.game?.ready)").catch(() => false)); i++) await dormir(500);
  await evaluar(`Promise.all(["a11yEscala", "a11yLegible", "escalaVentanas"].map(k => game.settings.set("trueque-noir", k, game.settings.settings.get("trueque-noir." + k).default)))`);
  const tabla = (titulo, informe) => {
    console.log(`\n${titulo}`);
    for (const e of informe) {
      if (e.error) { console.log(`  ${e.nombre.padEnd(17)} ✗ ${e.error}`); fallos++; continue; }
      fallos += !e.ok;
      const motivos = [["fuera de pantalla", !e.dentro], ["sin botón", e.boton === false], ["ocupa demasiado", e.alto > 0.92 || e.ancho > 0.92], ["desborda", e.desborda]].filter(([, c]) => c).map(([t]) => t);
      console.log(`  ${e.nombre.padEnd(17)} ${e.escala.toFixed(2).padStart(5)} ${`${Math.round(e.alto * 100)}%`.padStart(5)} ${`${Math.round(e.ancho * 100)}%`.padStart(5)}  ${e.ok ? "✓" : "✗"} ${motivos.join(", ")}`);
    }
  };
  for (const [tam, nombre] of Object.entries(PANTALLAS)) {
    const [width, height] = tam.split("x").map(Number);
    await pagina("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await evaluar("window.dispatchEvent(new Event('resize'))");
    await dormir(600);
    const { pantalla, informe } = await evaluar(`(${EN_PAGINA})(false)`);
    tabla(`${pantalla}  ${nombre}\n  ventana           escala  alto ancho`, informe);
    if (CAPTURAS) {
      fs.mkdirSync(CAPTURAS, { recursive: true });
      await evaluar(`game.actors.find(a => a.type === "detective").sheet.render(true).then(() => new Promise(r => setTimeout(r, 900)))`);
      const { data } = await pagina("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(CAPTURAS, `${tam}-ficha.png`), Buffer.from(data, "base64"));
      await evaluar(`game.actors.find(a => a.type === "detective").sheet.close()`);
    }
  }
  // Texto al 160 % y fuente legible en la pantalla más justa de un portátil.
  await pagina("Emulation.setDeviceMetricsOverride", { width: 1366, height: 657, deviceScaleFactor: 1, mobile: false });
  await evaluar(`Promise.all([game.settings.set("trueque-noir", "a11yEscala", 160), game.settings.set("trueque-noir", "a11yLegible", true)])`);
  await dormir(400);
  tabla("1366x657 con texto al 160 % y fuente legible", (await evaluar(`(${EN_PAGINA})(true)`)).informe);
  await evaluar(`Promise.all([game.settings.set("trueque-noir", "a11yEscala", 100), game.settings.set("trueque-noir", "a11yLegible", false)])`);
} catch (error) {
  console.error(`✗ ${error.message}`);
  fallos++;
} finally {
  navegador.close();
  chrome.kill();
  await dormir(500);
  try { fs.rmSync(perfil, { recursive: true, force: true }); } catch { /* Chrome aún suelta el perfil: lo borrará el sistema */ }
}
console.log(fallos ? `\n${fallos} ventana(s) con problemas.` : "\nTodo en orden.");
process.exit(fallos ? 1 : 0);

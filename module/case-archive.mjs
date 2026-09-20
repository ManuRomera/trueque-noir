import { TN } from "./config.mjs";
import { confirmAction } from "./prompts.mjs";

/**
 * Importación del archivo de casos incluido en `data/adventures.json`.
 *
 * CONTENIDO EDITORIAL, NO CÓDIGO DEL SISTEMA.
 * Este módulo es la única puerta de entrada a ese contenido y la importación
 * es voluntaria: nada se copia al mundo hasta que La Ciudad lo pide.
 * Consulta CONTENIDO.md antes de redistribuirlo.
 */
const SOURCE = "systems/trueque-noir/data/adventures.json";
const FOLDER_NAME = "Trueque Noir · Archivo de casos";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function caseHtml(entry) {
  let html = escapeHtml(entry.text).replace(/\r/g, "");
  html = html.replace(/\n(CONTEXTO|LA VERDAD DEL CASO|RESOLUCIONES DEL CASO|ENCRUCIJADA FINAL|PISTAS)\n/g, "</p><h2>$1</h2><p>");
  html = html.replace(/\n(Información inicial:|Pistas simples:|Pistas determinantes:)/g, "</p><h3>$1</h3><p>");
  html = html.replace(/\n\s*›\s*/g, "</p><p class='tn-case-clue'>• ");
  html = html.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, " ");
  return `<h1>Caso #${entry.number}: ${escapeHtml(entry.title)}</h1><p><em>${escapeHtml(entry.author)}</em></p><p>${html}</p>`;
}

async function readArchive() {
  const response = await fetch(SOURCE);
  if (!response.ok) throw new Error(`No se pudo leer ${SOURCE}`);
  return response.json();
}

function findFolder() {
  return game.folders.find(folder => folder.type === "JournalEntry" && folder.getFlag(TN.SYSTEM_ID, "adventureFolder"));
}

let cachedCount = null;

/** Cuenta los casos disponibles sin tocar el mundo. Se calcula una sola vez por sesión. */
export async function countArchive() {
  if (cachedCount !== null) return cachedCount;
  try {
    cachedCount = (await readArchive()).length;
  } catch (error) {
    console.warn("trueque-noir | Archivo de casos no disponible", error);
    cachedCount = 0;
  }
  return cachedCount;
}

/**
 * Importa el archivo como diarios privados de La Ciudad.
 * Pide confirmación explícita: es contenido de terceros y ocupa espacio en el mundo.
 */
export async function importCaseArchive({ ask = true } = {}) {
  if (!game.user?.isGM) return ui.notifications.warn("Solo La Ciudad puede importar el archivo de casos.");

  const existing = findFolder();
  if (existing && game.journal.some(entry => entry.folder?.id === existing.id)) {
    ui.notifications.info(`El archivo ya está en el mundo, dentro de «${FOLDER_NAME}».`);
    ui.journal?.render(true);
    return existing;
  }

  const total = await countArchive();
  if (!total) return ui.notifications.error("No se encontró el archivo de casos en el paquete del sistema.");

  if (ask) {
    const confirmed = await confirmAction({
      title: "Importar el archivo de casos",
      message: `Se crearán <strong>${total} diarios privados</strong> para La Ciudad con los casos preparados que acompañan al sistema.`,
      detail: "Es material de aventura escrito por sus autores, no forma parte del código del sistema y solo lo verás tú. Puedes borrarlo después como cualquier otro diario.",
      confirmLabel: `Importar ${total} casos`
    });
    if (!confirmed) return null;
  }

  const folder = existing ?? await Folder.create({
    name: FOLDER_NAME,
    type: "JournalEntry",
    flags: { [TN.SYSTEM_ID]: { adventureFolder: true } }
  });

  const adventures = await readArchive();
  const created = [];
  for (const entry of adventures) {
    const key = `case-${entry.number}`;
    if (game.journal.find(journal => journal.getFlag(TN.SYSTEM_ID, "adventureKey") === key)) continue;
    created.push({
      name: `${String(entry.number).padStart(2, "0")} · ${entry.title}`,
      folder: folder.id,
      pages: [{ name: "Caso completo", type: "text", text: { format: 1, content: caseHtml(entry) } }],
      ownership: { default: 0 },
      flags: { [TN.SYSTEM_ID]: { adventureKey: key, author: entry.author } }
    });
  }
  if (created.length) await JournalEntry.createDocuments(created);

  await game.settings.set(TN.SYSTEM_ID, "caseArchiveImported", true);
  ui.notifications.info(`${created.length} casos importados en «${FOLDER_NAME}».`);
  ui.journal?.render(true);
  return folder;
}

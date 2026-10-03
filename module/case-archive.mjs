import { TN, RUTA } from "./config.mjs";
import { leerCaso } from "./reglas.mjs";
import { confirmar } from "./apps/dialogos.mjs";

/**
 * Archivo de casos incluido en `data/adventures.json`.
 *
 * CONTENIDO EDITORIAL, NO CÓDIGO DEL SISTEMA.
 * Este módulo es la única puerta de entrada a ese contenido. Nada se copia al mundo hasta que
 * La Ciudad lo pide. Consulta CONTENIDO.md antes de redistribuirlo.
 */
const SOURCE = `${RUTA}/data/adventures.json`;
const FOLDER_NAME = "Trueque Noir · Archivo de casos";

const esc = valor => foundry.utils.escapeHTML(String(valor ?? ""));

function caseHtml(entry) {
  let html = esc(entry.text).replace(/\r/g, "");
  html = html.replace(/\n(CONTEXTO|LA VERDAD DEL CASO|RESOLUCIONES DEL CASO|ENCRUCIJADA FINAL|PISTAS)\n/g, "</p><h2>$1</h2><p>");
  html = html.replace(/\n(Información inicial:|Pistas simples:|Pistas determinantes:)/g, "</p><h3>$1</h3><p>");
  html = html.replace(/\n\s*›\s*/g, "</p><p class='tn-case-clue'>• ");
  html = html.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, " ");
  return `<h1>Caso #${entry.number}: ${esc(entry.title)}</h1><p><em>${esc(entry.author)}</em></p><p>${html}</p>`;
}

let cache = null;

async function leerArchivo() {
  if (cache) return cache;
  try {
    const respuesta = await fetch(SOURCE);
    if (!respuesta.ok) throw new Error(`No se pudo leer ${SOURCE}`);
    cache = await respuesta.json();
  } catch (error) {
    console.warn("trueque-noir | Archivo de casos no disponible", error);
    cache = [];
  }
  return cache;
}

/** Los casos del archivo con el dado inicial y los días que fija cada uno. */
export async function listarArchivo() {
  return (await leerArchivo()).map(caso => ({
    number: caso.number, title: caso.title, author: caso.author,
    ...leerCaso(caso.text.replace(/\s+/g, " "))
  }));
}

export async function countArchive() {
  return (await leerArchivo()).length;
}

const findFolder = () => game.folders.find(folder => folder.type === "JournalEntry" && folder.getFlag(TN.SYSTEM_ID, "adventureFolder"));

/**
 * Importa el archivo como diarios privados de La Ciudad.
 * Pide confirmación explícita: es contenido de terceros y ocupa espacio en el mundo.
 */
export async function importCaseArchive({ ask = true } = {}) {
  if (!game.user?.isGM) return ui.notifications.warn("Solo La Ciudad puede importar el archivo de casos.");

  const existing = findFolder();
  if (existing && game.journal.some(entry => entry.folder?.id === existing.id)) {
    ui.notifications.info(`El archivo ya está en el mundo, dentro de «${FOLDER_NAME}».`);
    return existing;
  }

  const total = await countArchive();
  if (!total) return ui.notifications.error("No se encontró el archivo de casos en el paquete del sistema.");

  if (ask) {
    const confirmed = await confirmar({
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

  const created = [];
  for (const entry of await leerArchivo()) {
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
  return folder;
}

/** Abre el diario de un caso importado, si existe. */
export function abrirCasoImportado(number) {
  const diario = game.journal.find(entry => entry.getFlag(TN.SYSTEM_ID, "adventureKey") === `case-${number}`);
  if (diario) diario.sheet.render(true);
  return Boolean(diario);
}

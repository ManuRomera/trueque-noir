import { TN } from "./config.mjs";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}

function caseHtml(entry) {
  let html = escapeHtml(entry.text).replace(/\r/g, "");
  html = html.replace(/\n(CONTEXTO|LA VERDAD DEL CASO|RESOLUCIONES DEL CASO|ENCRUCIJADA FINAL|PISTAS)\n/g, "</p><h2>$1</h2><p>");
  html = html.replace(/\n(Información inicial:|Pistas simples:|Pistas determinantes:)/g, "</p><h3>$1</h3><p>");
  html = html.replace(/\n\s*›\s*/g, "</p><p class='tn-case-clue'>• ");
  html = html.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, " ");
  return `<h1>Caso #${entry.number}: ${escapeHtml(entry.title)}</h1><p><em>${escapeHtml(entry.author)}</em></p><p>${html}</p>`;
}

async function ensureScenes() {
  const specs = [
    { name: "Trueque Noir · Portada", src: "systems/trueque-noir/assets/trueque-noir-cover-v1.png", width: 1536, height: 1024 },
    { name: "Trueque Noir · Construcción de la ciudad", src: "systems/trueque-noir/assets/city-builder-scene.svg", width: 1600, height: 1000 }
  ];
  for (const spec of specs) {
    if (game.scenes.find(scene => scene.getFlag(TN.SYSTEM_ID, "starterScene") === spec.name)) continue;
    await Scene.create({ name: spec.name, width: spec.width, height: spec.height, padding: 0, background: { src: spec.src }, navigation: true, flags: { [TN.SYSTEM_ID]: { starterScene: spec.name } } });
  }
}

async function ensureAdventures() {
  let folder = game.folders.find(f => f.type === "JournalEntry" && f.getFlag(TN.SYSTEM_ID, "adventureFolder"));
  if (!folder) folder = await Folder.create({ name: "Trueque Noir · Archivo de casos", type: "JournalEntry", flags: { [TN.SYSTEM_ID]: { adventureFolder: true } } });
  const response = await fetch("systems/trueque-noir/data/adventures.json");
  const adventures = await response.json();
  for (const entry of adventures) {
    const key = `case-${entry.number}`;
    if (game.journal.find(j => j.getFlag(TN.SYSTEM_ID, "adventureKey") === key)) continue;
    await JournalEntry.create({ name: `${String(entry.number).padStart(2,"0")} · ${entry.title}`, folder: folder.id, pages: [{ name: "Caso completo", type: "text", text: { format: 1, content: caseHtml(entry) } }], ownership: { default: 0 }, flags: { [TN.SYSTEM_ID]: { adventureKey: key, author: entry.author } } });
  }
}

export async function ensureStarterContent() {
  if (!game.user?.isGM) return;
  await ensureScenes();
  await ensureAdventures();
}

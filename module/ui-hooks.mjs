import { TN } from "./config.mjs";
import { registerSceneControl } from "./compat.mjs";

const MACROS = [
  { name: "Trueque Noir · Panel de La Ciudad", command: "game.truequeNoir.openCaseTracker();", img: "icons/svg/city.svg" },
  { name: "Trueque Noir · Mostrar u ocultar la Mesa", command: "game.truequeNoir.toggleSharedCaseBoard();", img: "icons/svg/eye.svg" },
  { name: "Trueque Noir · Mesa del caso", command: "game.truequeNoir.openCaseBoard();", img: "icons/svg/dice-target.svg" }
];

/** Menú único del sistema dentro de los controles de escena. */
export function registerSceneControls() {
  Hooks.on("getSceneControlButtons", controls => {
    const isGM = Boolean(game.user?.isGM);
    const button = (name, title, icon, onChange) => ({ name, title, icon, button: true, onChange });

    // Herramienta en reposo, igual que el «select» de las capas de Foundry:
    // marca que el grupo está elegido y evita disparar una acción al abrirlo.
    const tools = [{ name: "tn-select", title: "Trueque Noir", icon: "fa-solid fa-arrow-pointer" }];

    if (isGM) tools.push(button("tn-panel", "Panel de La Ciudad", "fa-solid fa-city", () => game.truequeNoir.openCaseTracker()));
    tools.push(button("tn-board", "Mesa del caso", "fa-solid fa-table-columns", () => game.truequeNoir.openCaseBoard()));
    if (isGM) tools.push(button("tn-board-toggle", "Mostrar u ocultar la Mesa para el grupo", "fa-solid fa-eye", () => game.truequeNoir.toggleSharedCaseBoard()));
    if (game.user?.can("ACTOR_CREATE")) tools.push(button("tn-detective", "Crear detective", "fa-solid fa-user-secret", () => game.truequeNoir.openCharacterGenerator()));
    if (isGM) {
      tools.push(button("tn-city", "Construir la ciudad", "fa-solid fa-map-location-dot", () => game.truequeNoir.openCityGenerator()));
      tools.push(button("tn-theme", "Ambientación de la portada", "fa-solid fa-image", () => game.truequeNoir.openThemePicker()));
      tools.push(button("tn-cases", "Archivo de casos", "fa-solid fa-folder-tree", () => game.truequeNoir.importCaseArchive()));
    }
    tools.push(button("tn-welcome", "Bienvenida y ayuda", "fa-solid fa-circle-question", () => game.truequeNoir.openWelcome()));

    registerSceneControl(controls, {
      name: "trueque-noir",
      title: "Trueque Noir",
      icon: "fa-solid fa-user-secret",
      activeTool: "tn-select",
      tools
    });
  });
}

/** Único atajo contextual del directorio: crear un detective donde viven los actores. */
export function registerDirectoryButton() {
  Hooks.on("renderActorDirectory", (app, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    const header = root?.querySelector(".directory-header");
    if (!header || header.querySelector(".tn-directory-tools")) return;
    if (!game.user?.can("ACTOR_CREATE")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "tn-directory-tools";
    wrapper.innerHTML = `<button type="button" class="tn-dir-btn"><i class="fa-solid fa-user-secret" aria-hidden="true"></i> Crear detective</button>`;
    wrapper.querySelector("button").addEventListener("click", () => game.truequeNoir.openCharacterGenerator());
    header.append(wrapper);
  });
}

/** Las macros solo se instalan si La Ciudad las pide en los ajustes del sistema. */
export async function ensureUtilityMacros() {
  if (!game.user?.isGM) return;
  if (!game.settings.get(TN.SYSTEM_ID, "installMacros")) return;

  const firstFreeSlot = () => {
    for (let slot = 1; slot <= 50; slot += 1) if (!game.user.hotbar?.[slot]) return slot;
    return null;
  };

  for (const spec of MACROS) {
    let macro = game.macros.find(entry => entry.name === spec.name);
    if (!macro) macro = await Macro.create({ ...spec, type: "script" });
    else if (macro.command !== spec.command) await macro.update({ command: spec.command });

    const assigned = Object.values(game.user.hotbar ?? {}).includes(macro.id);
    if (!assigned) {
      const slot = firstFreeSlot();
      if (slot) await game.user.assignHotbarMacro(macro, slot);
    }
  }
}

/** Preferencia de retrato: el filtro noir se controla desde una clase en el body. */
export function applyPortraitPreference() {
  document.body.classList.toggle("tn-portraits-color", !game.settings.get(TN.SYSTEM_ID, "portraitNoir"));
}

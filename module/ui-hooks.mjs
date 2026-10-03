import { ID } from "./config.mjs";
import { registrarGrupoControles } from "./compat.mjs";

const MACROS = [
  { name: "Trueque Noir · Panel de La Ciudad", command: "game.truequeNoir.abrirPanel();", img: "icons/svg/city.svg" },
  { name: "Trueque Noir · Mostrar u ocultar la Mesa", command: "game.truequeNoir.alternarMesa();", img: "icons/svg/eye.svg" },
  { name: "Trueque Noir · Mesa del caso", command: "game.truequeNoir.abrirMesa();", img: "icons/svg/dice-target.svg" }
];

/** Menú único del sistema dentro de los controles de escena. */
export function registrarControles() {
  Hooks.on("getSceneControlButtons", controles => {
    const gm = Boolean(game.user?.isGM);
    const boton = (name, title, icon, onChange) => ({ name, title, icon, button: true, onChange });

    // Herramienta en reposo, igual que el «select» de las capas de Foundry:
    // marca que el grupo está elegido y evita disparar una acción al abrirlo.
    const tools = [{ name: "tn-select", title: "Trueque Noir", icon: "fa-solid fa-arrow-pointer" }];
    const tn = () => game.truequeNoir;

    if (gm) tools.push(boton("tn-panel", "Panel de La Ciudad", "fa-solid fa-city", () => tn().abrirPanel()));
    tools.push(boton("tn-board", "Mesa del caso", "fa-solid fa-table-columns", () => tn().abrirMesa()));
    if (gm) tools.push(boton("tn-board-toggle", "Mostrar u ocultar la Mesa para el grupo", "fa-solid fa-eye", () => tn().alternarMesa()));
    if (game.user?.can("ACTOR_CREATE")) tools.push(boton("tn-detective", "Crear detective", "fa-solid fa-user-secret", () => tn().abrirCreadorDetective()));
    if (gm) {
      tools.push(boton("tn-city", "Construir la ciudad", "fa-solid fa-map-location-dot", () => tn().abrirCreadorCiudad()));
      tools.push(boton("tn-theme", "Ambientación de la portada", "fa-solid fa-image", () => tn().abrirAmbientacion()));
      tools.push(boton("tn-cases", "Archivo de casos", "fa-solid fa-folder-tree", () => tn().importarCasos()));
    }
    tools.push(boton("tn-welcome", "Bienvenida y ayuda", "fa-solid fa-circle-question", () => tn().abrirBienvenida()));

    registrarGrupoControles(controles, { name: "trueque-noir", title: "Trueque Noir", icon: "fa-solid fa-user-secret", activeTool: "tn-select", tools });
  });
}

/** Único atajo contextual del directorio: crear un detective donde viven los actores. */
export function registrarBotonDirectorio() {
  Hooks.on("renderActorDirectory", (app, html) => {
    const raiz = html instanceof HTMLElement ? html : html?.[0];
    const cabecera = raiz?.querySelector(".directory-header");
    if (!cabecera || cabecera.querySelector(".tn-directory-tools")) return;
    if (!game.user?.can("ACTOR_CREATE")) return;

    const envoltorio = document.createElement("div");
    envoltorio.className = "tn-directory-tools";
    envoltorio.innerHTML = `<button type="button" class="tn-dir-btn"><i class="fa-solid fa-user-secret" aria-hidden="true"></i> Crear detective</button>`;
    envoltorio.querySelector("button").addEventListener("click", () => game.truequeNoir.abrirCreadorDetective());
    cabecera.append(envoltorio);
  });
}

/** Las macros solo se instalan si La Ciudad las pide en los ajustes del sistema. */
export async function instalarMacros() {
  if (!game.user?.isGM || !game.settings.get(ID, "installMacros")) return;

  const primerHueco = () => {
    for (let hueco = 1; hueco <= 50; hueco += 1) if (!game.user.hotbar?.[hueco]) return hueco;
    return null;
  };

  for (const spec of MACROS) {
    let macro = game.macros.find(entrada => entrada.name === spec.name);
    if (!macro) macro = await Macro.create({ ...spec, type: "script" });
    else if (macro.command !== spec.command) await macro.update({ command: spec.command });

    if (!Object.values(game.user.hotbar ?? {}).includes(macro.id)) {
      const hueco = primerHueco();
      if (hueco) await game.user.assignHotbarMacro(macro, hueco);
    }
  }
}

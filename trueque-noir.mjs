/**
 * Trueque Noir · punto de entrada.
 * Aquí solo se registran piezas y hooks; la lógica vive en `module/`.
 */
import { ID, registrarAjustes, aplicarPreferenciaRetratos, refrescar } from "./module/config.mjs";
import { DocumentSheetConfig, ventana, diagnostico, generacion } from "./module/compat.mjs";
import { TruequeNoirActor } from "./module/actor.mjs";
import { TruequeNoirDetectiveData, TruequeNoirNpcData } from "./module/data-models.mjs";
import { HojaDetective } from "./module/hojas/detective.mjs";
import { HojaPnj } from "./module/hojas/pnj.mjs";
import { PanelCiudad } from "./module/apps/panel.mjs";
import { MesaCaso } from "./module/apps/mesa.mjs";
import { Bienvenida } from "./module/apps/bienvenida.mjs";
import { Ambientacion } from "./module/apps/ambientacion.mjs";
import { AsistenteCiudad, AsistenteDetective } from "./module/apps/asistentes.mjs";
import { importCaseArchive } from "./module/case-archive.mjs";
import { ensureCoverScene, bindCoverSceneCamera } from "./module/scene-setup.mjs";
import { registrarControles, registrarBotonDirectorio, instalarMacros } from "./module/ui-hooks.mjs";
import { registrarTarjetas } from "./module/tarjetas.mjs";
import { escucharSocketCaso } from "./module/case-state.mjs";

const soloLaCiudad = mensaje => {
  ui.notifications.warn(mensaje);
  return null;
};

Hooks.once("init", () => {
  console.log("trueque-noir | Inicializando sistema");
  Handlebars.registerHelper("lowercase", valor => String(valor ?? "").toLowerCase());

  registrarAjustes();
  CONFIG.Actor.documentClass = TruequeNoirActor;
  CONFIG.Actor.dataModels.detective = TruequeNoirDetectiveData;
  CONFIG.Actor.dataModels.npc = TruequeNoirNpcData;
  // Atributos que se pueden mostrar bajo el token: la cajetilla como barra.
  CONFIG.Actor.trackableAttributes = {
    detective: { bar: ["cigarettes"], value: ["recognition.total", "stability.person.tension", "stability.place.tension"] },
    npc: { bar: [], value: [] }
  };

  DocumentSheetConfig.registerSheet(Actor, ID, HojaDetective, { types: ["detective"], makeDefault: true, label: "Trueque Noir · Detective" });
  DocumentSheetConfig.registerSheet(Actor, ID, HojaPnj, { types: ["npc"], makeDefault: true, label: "Trueque Noir · PNJ" });

  const api = {
    abrirPanel: () => PanelCiudad.abrir(),
    abrirMesa: () => MesaCaso.abrir(),
    cerrarMesa: () => ventana("trueque-noir-case-board")?.close(),
    abrirBienvenida: () => Bienvenida.abrir(),
    abrirAmbientacion: () => Ambientacion.abrir(),
    abrirCreadorDetective: () => AsistenteDetective.abrir(),
    abrirCreadorCiudad: () => (game.user.isGM ? AsistenteCiudad.abrir() : soloLaCiudad("Solo La Ciudad puede construir la ciudad.")),
    importarCasos: () => importCaseArchive(),
    /** Mostrar u ocultar la Mesa para todo el grupo: cada cliente reacciona al ajuste. */
    alternarMesa: async () => {
      if (!game.user.isGM) return soloLaCiudad("Solo La Ciudad muestra u oculta la Mesa del caso para todo el grupo.");
      const siguiente = !game.settings.get(ID, "tableDisplayVisible");
      await game.settings.set(ID, "tableDisplayVisible", siguiente);
      ui.notifications.info(siguiente ? "Mesa del caso visible para todo el grupo." : "Mesa del caso oculta.");
    },
    diagnostico
  };
  // Nombres anteriores a la 3.0: las macros ya creadas siguen funcionando.
  game.truequeNoir = Object.assign(api, {
    openWelcome: api.abrirBienvenida, openCaseTracker: api.abrirPanel, openCaseBoard: api.abrirMesa, closeCaseBoard: api.cerrarMesa,
    toggleSharedCaseBoard: api.alternarMesa, openCityGenerator: api.abrirCreadorCiudad, openCharacterGenerator: api.abrirCreadorDetective,
    openThemePicker: api.abrirAmbientacion, importCaseArchive: api.importarCasos
  });

  registrarControles();
  registrarBotonDirectorio();
  bindCoverSceneCamera();
});

Hooks.once("ready", async () => {
  console.info(`Trueque Noir ${game.system.version} · Foundry ${game.version} (generación ${generacion()})`);
  aplicarPreferenciaRetratos();
  escucharSocketCaso();
  registrarTarjetas();

  if (game.user.isGM) {
    await ensureCoverScene();
    await instalarMacros();
    if (!game.settings.get(ID, "welcomeSeen")) Bienvenida.abrir();
  }
  if (game.settings.get(ID, "tableDisplayVisible")) MesaCaso.abrir();
});

/** El estado del caso cambia: se repintan las ventanas que lo muestran y la Mesa se abre o se cierra en todos los clientes. */
Hooks.on("updateSetting", setting => {
  if (!setting.key?.startsWith(`${ID}.`)) return;
  refrescar();
  if (setting.key === `${ID}.tableDisplayVisible`) {
    if (setting.value === true || setting.value === "true") MesaCaso.abrir();
    else ventana("trueque-noir-case-board")?.close();
  }
});

/** Los detectives que muestra el Panel cambian con las fichas. */
for (const evento of ["createActor", "updateActor", "deleteActor"]) {
  Hooks.on(evento, actor => {
    if (actor.type === "detective") ventana("trueque-noir-panel")?.render();
  });
}

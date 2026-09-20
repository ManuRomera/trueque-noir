/**
 * Trueque Noir · punto de entrada.
 * Aquí solo se registran hooks y se conectan las piezas; la lógica vive en `module/`.
 */
import { TN, registerSystemSettings, refreshCrimeBoard } from "./module/config.mjs";
import { TruequeNoirActor } from "./module/actor.mjs";
import { TruequeNoirDetectiveSheet } from "./module/sheet.mjs";
import { TruequeNoirCaseTracker, TruequeNoirCaseBoard } from "./module/tracker-app.mjs";
import { TruequeNoirDetectiveData, TruequeNoirNpcData, getDetectiveDefaults, getNpcDefaults } from "./module/data-models.mjs";
import { LegacyActorSheet, ActorsCollection, findWindow } from "./module/compat.mjs";
import { TruequeNoirCityGenerator, TruequeNoirCharacterGenerator } from "./module/generators.mjs";
import { ensureCoverScene, bindCoverSceneCamera } from "./module/scene-setup.mjs";
import { openThemePicker } from "./module/theme-picker.mjs";
import { importCaseArchive } from "./module/case-archive.mjs";
import { openWelcome, maybeOpenWelcome } from "./module/welcome.mjs";
import { registerSceneControls, registerDirectoryButton, ensureUtilityMacros, applyPortraitPreference } from "./module/ui-hooks.mjs";
import { restoreWindowState, persistWindowState } from "./module/window-state.mjs";
import { bindContextHelp } from "./module/context-help.mjs";
import { bindBackgroundHelp } from "./module/background-help.mjs";
import { bindChatActions } from "./module/chat.mjs";
import { handleCaseOp } from "./module/case-state.mjs";

/** Completa las fichas antiguas con los campos que el modelo de datos haya añadido. */
async function migrateLegacyActorSystemData() {
  if (!game.user?.isGM) return;
  const defaultsByType = { detective: getDetectiveDefaults(), npc: getNpcDefaults() };

  for (const actor of game.actors ?? []) {
    const defaults = defaultsByType[actor.type];
    if (!defaults) continue;
    const source = foundry.utils.deepClone(actor.toObject().system ?? {});
    const merged = foundry.utils.mergeObject(foundry.utils.deepClone(defaults), source, {
      inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true
    });
    if (!foundry.utils.isEmpty(foundry.utils.diffObject(source, merged))) {
      await actor.update({ system: merged }, { diff: false, recursive: false });
    }
  }
}

Hooks.once("init", function() {
  console.log("trueque-noir | Inicializando sistema");
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("lowercase", value => String(value ?? "").toLowerCase());

  registerSystemSettings();
  CONFIG.Actor.documentClass = TruequeNoirActor;
  CONFIG.Actor.dataModels.detective = TruequeNoirDetectiveData;
  CONFIG.Actor.dataModels.npc = TruequeNoirNpcData;

  try {
    ActorsCollection.unregisterSheet("core", LegacyActorSheet);
  } catch (error) {
    console.warn("trueque-noir | La hoja base de Foundry ya no estaba registrada", error);
  }
  ActorsCollection.registerSheet(TN.SYSTEM_ID, TruequeNoirDetectiveSheet, { makeDefault: true, types: ["detective", "npc"] });

  game.truequeNoir = {
    openWelcome,
    importCaseArchive,
    openThemePicker,
    openCityGenerator: () => {
      if (!game.user.isGM) return ui.notifications.warn("Solo La Ciudad puede construir la ciudad.");
      return (findWindow("trueque-noir-city-generator") ?? new TruequeNoirCityGenerator()).render(true);
    },
    openCharacterGenerator: () => (findWindow("trueque-noir-character-generator") ?? new TruequeNoirCharacterGenerator()).render(true),
    openCaseTracker: () => {
      if (!game.user.isGM) return ui.notifications.warn("El Panel de La Ciudad solo lo abre quien dirige la partida.");
      return (findWindow("trueque-noir-case-tracker") ?? new TruequeNoirCaseTracker()).render(true);
    },
    openCaseBoard: () => (findWindow("trueque-noir-case-board") ?? new TruequeNoirCaseBoard()).render(true),
    closeCaseBoard: () => findWindow("trueque-noir-case-board")?.close(),
    toggleSharedCaseBoard: async () => {
      if (!game.user.isGM) return ui.notifications.warn("Solo La Ciudad muestra u oculta la Mesa del caso para todo el grupo.");
      const next = !game.settings.get(TN.SYSTEM_ID, "tableDisplayVisible");
      await game.settings.set(TN.SYSTEM_ID, "tableDisplayVisible", next);
      game.socket.emit(TN.SOCKET, { type: next ? "open-board" : "close-board" });
      if (next) game.truequeNoir.openCaseBoard();
      else game.truequeNoir.closeCaseBoard();
      findWindow("trueque-noir-case-tracker")?.render(false);
      ui.notifications.info(next ? "Mesa del caso visible para todo el grupo." : "Mesa del caso oculta.");
    }
  };

  game.socket.on(TN.SOCKET, data => {
    if (data?.type === "open-board") game.truequeNoir.openCaseBoard();
    if (data?.type === "close-board") game.truequeNoir.closeCaseBoard();
    if (data?.type === "case-op") handleCaseOp(data);
  });

  registerSceneControls();
  registerDirectoryButton();
  bindChatActions();
  bindCoverSceneCamera();
});

Hooks.once("ready", async function() {
  applyPortraitPreference();
  if (game.user?.isGM) {
    await migrateLegacyActorSystemData();
    await ensureCoverScene();
    await ensureUtilityMacros();
    await maybeOpenWelcome();
  }
  if (game.settings.get(TN.SYSTEM_ID, "tableDisplayVisible")) game.truequeNoir.openCaseBoard();
});

Hooks.on("renderApplication", (app, html) => {
  if (!(app?.options?.classes ?? []).includes("trueque-noir")) return;
  restoreWindowState(app);
  bindContextHelp(html);
  bindBackgroundHelp(html);
});

Hooks.on("closeApplication", app => {
  if ((app?.options?.classes ?? []).includes("trueque-noir")) persistWindowState(app);
});

Hooks.on("updateSetting", setting => {
  if (setting?.namespace === TN.SYSTEM_ID) refreshCrimeBoard();
});

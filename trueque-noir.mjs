import {
  TN,
  registerSystemSettings,
  getRecognitionAvailable,
  getActorBackgrounds,
  refreshCrimeBoard,
  getCrimeDie,
  getGroupClueState,
  phaseLabel
} from "./module/config.mjs";
import { TruequeNoirActor } from "./module/actor.mjs";
import { TruequeNoirCaseTracker, TruequeNoirCaseBoard } from "./module/tracker-app.mjs";
import {
  TruequeNoirDetectiveData,
  TruequeNoirNpcData,
  getDetectiveDefaults,
  getNpcDefaults
} from "./module/data-models.mjs";
import { LegacyActorSheet, LegacyDialog, openWindows } from "./module/compat.mjs";
import { TruequeNoirCityGenerator, TruequeNoirCharacterGenerator } from "./module/generators.mjs";
import { ensureStarterContent } from "./module/starter-content.mjs";
import { restoreWindowState, persistWindowState } from "./module/window-state.mjs";
import { bindContextHelp } from "./module/context-help.mjs";

class TruequeNoirDetectiveSheet extends LegacyActorSheet {
  constructor(...args) {
    super(...args);
    if (this.actor?.type === "npc") {
      this.options.width = 820;
      this.options.height = 420;
    }
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["trueque-noir", "sheet", "actor", "detective-sheet"],
      width: 1120,
      height: 760,
      submitOnChange: true,
      submitOnClose: true,
      closeOnSubmit: false,
      tabs: [{ navSelector: ".tn-tabs", contentSelector: ".tn-body", initial: "document" }]
    });
  }

  get template() {
    if (this.actor.type === "npc") return "systems/trueque-noir/templates/actors/npc-sheet.hbs";
    return "systems/trueque-noir/templates/actors/detective-sheet.hbs";
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    data.actor = this.actor;
    data.system = this.actor.system;
    data.allBackgrounds = TN.BACKGROUNDS;
    data.actorBackgrounds = getActorBackgrounds(this.actor);
    data.availableRecognition = getRecognitionAvailable(this.actor);
    data.personalStates = TN.PERSONAL_STATES;
    data.cityStates = TN.CITY_STATES;
    data.rumorBonusAvailable = Boolean(game.settings.get(TN.SYSTEM_ID, "rumorBonusAvailable"));
    data.rumorBonusText = game.settings.get(TN.SYSTEM_ID, "rumorBonusText");
    const clueState = getGroupClueState();
    data.crimeDie = getCrimeDie();
    data.groupClues = clueState.total;
    data.groupCluesAvailable = clueState.available;
    data.caseName = game.settings.get(TN.SYSTEM_ID, "caseName");
    data.caseDay = Number(game.settings.get(TN.SYSTEM_ID, "caseDay") ?? 1);
    data.casePhase = phaseLabel(game.settings.get(TN.SYSTEM_ID, "casePhaseIndex"));
    data.canOverexpose = Boolean(this.actor.getFlag(TN.SYSTEM_ID, "lastRoll")?.formula);
    data.activeStates = [
      ...TN.PERSONAL_STATES.filter(state => this.actor.system.personalStates?.[state.id]).map(state => state.label),
      ...TN.CITY_STATES.filter(state => this.actor.system.cityStates?.[state.id]).map(state => state.label)
    ];
    if (this.actor.system.personalStates?.customActive && this.actor.system.personalStates?.custom) data.activeStates.push(this.actor.system.personalStates.custom);
    if (this.actor.system.cityStates?.customActive && this.actor.system.cityStates?.custom) data.activeStates.push(this.actor.system.cityStates.custom);
    data.isGM = game.user?.isGM;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find("[data-action='roll-risk']").on("click", this._onRollRisk.bind(this));
    html.find("[data-action='roll-pursue']").on("click", this._onRollPursue.bind(this));
    html.find("[data-action='increase-person-tension']").on("click", () => this.actor.increasePillarTension("person"));
    html.find("[data-action='increase-place-tension']").on("click", () => this.actor.increasePillarTension("place"));
    html.find("[data-action='recover-cigarette']").on("click", () => this.actor.adjustCigarettes(1));
    html.find("[data-action='spend-cigarette']").on("click", () => this.actor.adjustCigarettes(-1));
    html.find("[data-action='set-pack-9']").on("click", () => this.actor.setCigaretteMax(9));
    html.find("[data-action='set-pack-6']").on("click", () => this.actor.setCigaretteMax(6));
    html.find("[data-action='add-recognition']").on("click", () => this.actor.addRecognition(1));
    html.find("[data-action='spend-recognition']").on("click", () => this.actor.spendRecognition(1));
    html.find("[data-action='create-contact']").on("click", this._onCreateContact.bind(this));
    html.find("[data-action='create-rumor']").on("click", this._onCreateRumor.bind(this));
    html.find("[data-action='overexpose-person']").on("click", () => this.actor.overexposeLastRoll("person"));
    html.find("[data-action='overexpose-place']").on("click", () => this.actor.overexposeLastRoll("place"));
    html.find("[data-action='open-city-tools']").on("click", async () => { await this.submit({ preventClose: true, preventRender: false }); game.truequeNoir.openCaseTracker(); });
    html.find("[data-action='open-case-board']").on("click", async () => { await this.submit({ preventClose: true, preventRender: false }); game.truequeNoir.openCaseBoard(); });
    html.find("[data-doc-tab]").on("click", event => {
      const tab = String(event.currentTarget.dataset.docTab || "identity");
      html.find("[data-doc-tab]").removeClass("is-active");
      $(event.currentTarget).addClass("is-active");
      html.find("[data-doc-section]").attr("hidden", true);
      html.find(`[data-doc-section='${tab}']`).removeAttr("hidden");
    });
  }

  async _saveCurrentForm() {
    return this.submit({ preventClose: true, preventRender: false });
  }

  async close(options = {}) {
    try {
      await this.submit({ preventClose: true, preventRender: false });
    } catch (err) {
      console.error("trueque-noir | Error guardando la ficha al cerrar", err);
    }
    return super.close(options);
  }

  async _updateObject(_event, formData) {
    const data = foundry.utils.expandObject(formData);
    if (data.system?.cigarettes) {
      const currentMax = Number(this.actor.system.cigarettes?.max ?? 0);
      const currentValue = Number(this.actor.system.cigarettes?.value ?? 0);
      const maxValue = Math.max(0, Number(data.system.cigarettes.max ?? currentMax));
      const nextValue = Math.max(0, Math.min(Number(data.system.cigarettes.value ?? currentValue), maxValue));
      data.system.cigarettes.max = maxValue;
      data.system.cigarettes.value = nextValue;
    }

    if (data.system?.recognition) {
      data.system.recognition.total = Number(data.system.recognition.total ?? this.actor.system.recognition?.total ?? 0);
      data.system.recognition.spent = Number(data.system.recognition.spent ?? this.actor.system.recognition?.spent ?? 0);
    }

    if (data.system?.clues) data.system.clues.count = Number(data.system.clues.count ?? this.actor.system.clues?.count ?? 0);
    if (data.system?.caseStats) data.system.caseStats.quietDrinksUsed = Number(data.system.caseStats.quietDrinksUsed ?? this.actor.system.caseStats?.quietDrinksUsed ?? 0);
    if (data.system?.stability?.person) data.system.stability.person.tension = Number(data.system.stability.person.tension ?? this.actor.system.stability?.person?.tension ?? 0);
    if (data.system?.stability?.place) data.system.stability.place.tension = Number(data.system.stability.place.tension ?? this.actor.system.stability?.place?.tension ?? 0);

    return this.actor.update(data);
  }

  async _onCreateContact(event) {
    await this._saveCurrentForm();
    event.preventDefault();
    new LegacyDialog({
      title: `Conozco a un tipo que... · ${this.actor.name}`,
      content: `
        <form class="tn-roll-dialog">
          <div class="form-group"><label>Nombre del contacto</label><input type="text" name="name" /></div>
          <div class="form-group"><label>Zona</label><input type="text" name="zone" placeholder="Norte / Sur / Este / Oeste" /></div>
          <div class="form-group"><label>Localización</label><input type="text" name="location" /></div>
          <div class="form-group">
            <label>Efecto principal</label>
            <select name="effect">
              <option value="pista">Tiene una pista</option>
              <option value="direcciona">Redirige a localizaciones con pistas</option>
            </select>
          </div>
          <div class="form-group"><label>Notas</label><textarea name="notes"></textarea></div>
        </form>`,
      buttons: {
        ok: {
          label: "Gastar 1 cigarrillo",
          callback: async html => {
            const payload = {
              name: String(html.find("[name='name']").val() || ""),
              zone: String(html.find("[name='zone']").val() || ""),
              location: String(html.find("[name='location']").val() || ""),
              effect: String(html.find("[name='effect']").val() || "pista"),
              notes: String(html.find("[name='notes']").val() || "")
            };
            await this.actor.createContactFromCigarette(payload);
            this.render(false);
          }
        },
        cancel: { label: "Cancelar" }
      },
      default: "ok"
    }, { classes: ["trueque-noir", "tn-dialog"] }).render(true);
  }

  async _onCreateRumor(event) {
    await this._saveCurrentForm();
    event.preventDefault();
    new LegacyDialog({
      title: `Aquí han pasado cosas turbias · ${this.actor.name}`,
      content: `
        <form class="tn-roll-dialog">
          <div class="form-group"><label>Localización</label><input type="text" name="location" /></div>
          <div class="form-group"><label>Historia turbia</label><textarea name="story"></textarea></div>
          <p class="notes">Gasta 1 cigarrillo y deja un +2 pendiente para una sola tirada del grupo.</p>
        </form>`,
      buttons: {
        ok: {
          label: "Activar rumor",
          callback: async html => {
            const payload = {
              location: String(html.find("[name='location']").val() || ""),
              story: String(html.find("[name='story']").val() || "")
            };
            await this.actor.createRumorBonus(payload);
            this.render(false);
          }
        },
        cancel: { label: "Cancelar" }
      },
      default: "ok"
    }, { classes: ["trueque-noir", "tn-dialog"] }).render(true);
  }

  async _onRollRisk(event) {
    await this._saveCurrentForm();
    event.preventDefault();
    const backgrounds = this.actor.backgroundOptions;
    const rumorAvailable = game.settings.get(TN.SYSTEM_ID, "rumorBonusAvailable");
    const favorOptions = ["slot1", "slot2"].map(slot => {
      const favor = this.actor.system.favors?.[slot];
      if (!favor?.name || favor.used) return "";
      return `<option value="${slot}">${favor.name}</option>`;
    }).join("");

    const content = `
      <form class="tn-roll-dialog">
        <div class="tn-field-group">
          <label>Trasfondo</label>
          <select name="background">
            <option value="">— Ninguno —</option>
            ${backgrounds.map(bg => `<option value="${bg}">${bg}</option>`).join("")}
          </select>
        </div>
        <div class="tn-field-group">
          <label>Favor (éxito automático)</label>
          <select name="favorSlot">
            <option value="">— Ninguno —</option>
            ${favorOptions}
          </select>
        </div>
        <div class="tn-dialog-options">
          <label class="tn-check"><input type="checkbox" name="useCigarette"><span>Cigarrillo +2</span></label>
          <label class="tn-check"><input type="checkbox" name="useRecognition"><span>Reconocimiento +2</span></label>
          <label class="tn-check ${rumorAvailable ? "" : "tn-check-disabled"}"><input type="checkbox" name="applyRumorBonus" ${rumorAvailable ? "" : "disabled"}><span>Rumor +2</span></label>
          <label class="tn-check"><input type="checkbox" name="nightVisit"><span>Visita nocturna −2</span></label>
          <label class="tn-check"><input type="checkbox" name="penalty"><span>Penalizador extra</span></label>
        </div>
      </form>`;

    new LegacyDialog({
      title: "Tirada de Riesgo",
      content,
      buttons: {
        roll: {
          label: "Tirar",
          callback: async html => {
            await this.actor.rollRisk({
              background: String(html.find("[name='background']").val() || ""),
              penalty: html.find("[name='penalty']").is(":checked"),
              nightVisit: html.find("[name='nightVisit']").is(":checked"),
              useCigarette: html.find("[name='useCigarette']").is(":checked"),
              useRecognition: html.find("[name='useRecognition']").is(":checked"),
              applyRumorBonus: html.find("[name='applyRumorBonus']").is(":checked"),
              favorSlot: String(html.find("[name='favorSlot']").val() || "")
            });
            this.render(false);
          }
        },
        cancel: { label: "Cancelar" }
      },
      default: "roll"
    }, { classes: ["trueque-noir", "tn-dialog"] }).render(true);
  }

  async _onRollPursue(event) {
    await this._saveCurrentForm();
    event.preventDefault();
    const backgrounds = this.actor.backgroundOptions;
    const rumorAvailable = game.settings.get(TN.SYSTEM_ID, "rumorBonusAvailable");
    const object1 = this.actor.system.representativeObjects?.slot1?.name || "";
    const object2 = this.actor.system.representativeObjects?.slot2?.name || "";
    const favorOptions = ["slot1", "slot2"].map(slot => {
      const favor = this.actor.system.favors?.[slot];
      if (!favor?.name || favor.used) return "";
      return `<option value="${slot}">${favor.name}</option>`;
    }).join("");

    const content = `
      <form class="tn-roll-dialog">
        <div class="tn-field-group">
          <label>Trasfondo</label>
          <select name="background">
            <option value="">— Ninguno —</option>
            ${backgrounds.map(bg => `<option value="${bg}">${bg}</option>`).join("")}
          </select>
        </div>
        <div class="tn-field-group">
          <label>Objeto representativo <span class="tn-note">(ignora el dado del crimen)</span></label>
          <select name="objectSlot">
            <option value="">— Ninguno —</option>
            ${object1 ? `<option value="slot1">${object1}</option>` : ""}
            ${object2 ? `<option value="slot2">${object2}</option>` : ""}
          </select>
        </div>
        <div class="tn-field-group">
          <label>Favor (éxito automático)</label>
          <select name="favorSlot">
            <option value="">— Ninguno —</option>
            ${favorOptions}
          </select>
        </div>
        <div class="tn-dialog-options">
          <label class="tn-check"><input type="checkbox" name="useCigarette"><span>Cigarrillo +2</span></label>
          <label class="tn-check"><input type="checkbox" name="useRecognition"><span>Reconocimiento +2</span></label>
          <label class="tn-check ${rumorAvailable ? "" : "tn-check-disabled"}"><input type="checkbox" name="applyRumorBonus" ${rumorAvailable ? "" : "disabled"}><span>Rumor +2</span></label>
          <label class="tn-check"><input type="checkbox" name="nightVisit"><span>Visita nocturna −2</span></label>
          <label class="tn-check"><input type="checkbox" name="penalty"><span>Penalizador extra</span></label>
        </div>
      </form>`;

    new LegacyDialog({
      title: "Perseguir el Crimen",
      content,
      buttons: {
        roll: {
          label: "Tirar",
          callback: async html => {
            await this.actor.rollPursueCrime({
              background: String(html.find("[name='background']").val() || ""),
              penalty: html.find("[name='penalty']").is(":checked"),
              nightVisit: html.find("[name='nightVisit']").is(":checked"),
              useCigarette: html.find("[name='useCigarette']").is(":checked"),
              useRecognition: html.find("[name='useRecognition']").is(":checked"),
              applyRumorBonus: html.find("[name='applyRumorBonus']").is(":checked"),
              objectSlot: String(html.find("[name='objectSlot']").val() || ""),
              favorSlot: String(html.find("[name='favorSlot']").val() || "")
            });
            this.render(false);
          }
        },
        cancel: { label: "Cancelar" }
      },
      default: "roll"
    }, { classes: ["trueque-noir", "tn-dialog"] }).render(true);
  }
}



async function migrateLegacyActorSystemData() {
  if (!game.user?.isGM) return;

  const defaultsByType = {
    detective: getDetectiveDefaults(),
    npc: getNpcDefaults()
  };

  for (const actor of game.actors ?? []) {
    const defaults = defaultsByType[actor.type];
    if (!defaults) continue;

    const sourceSystem = foundry.utils.deepClone(actor.toObject().system ?? {});
    const mergedSystem = foundry.utils.mergeObject(
      foundry.utils.deepClone(defaults),
      sourceSystem,
      { inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true }
    );

    const diff = foundry.utils.diffObject(sourceSystem, mergedSystem);
    if (!foundry.utils.isEmpty(diff)) {
      await actor.update({ system: mergedSystem }, { diff: false, recursive: false });
    }
  }
}


function ensureDirectoryButtons(app, html) {
  const root = html instanceof HTMLElement ? $(html) : html;
  const header = root.find(".directory-header");
  if (!header.length || header.find(".tn-directory-tools").length) return;

  const wrapper = $(
    `<div class="tn-directory-tools">
      ${game.user.isGM ? `<button type="button" class="tn-dir-btn" data-action="open-tracker">Panel de la Ciudad</button>` : ""}
      <button type="button" class="tn-dir-btn" data-action="open-board">Mesa del caso</button>
      ${game.user.isGM ? `<button type="button" class="tn-dir-btn" data-action="create-city">Crear ciudad</button>` : ""}
      <button type="button" class="tn-dir-btn" data-action="create-detective">Crear detective guiado</button>
    </div>`
  );

  wrapper.find("[data-action='open-tracker']").on("click", () => game.truequeNoir.openCaseTracker());
  wrapper.find("[data-action='open-board']").on("click", () => game.truequeNoir.openCaseBoard());
  wrapper.find("[data-action='create-city']").on("click", () => game.truequeNoir.openCityGenerator());
  wrapper.find("[data-action='create-detective']").on("click", () => game.truequeNoir.openCharacterGenerator());
  header.prepend(wrapper);
}


async function ensureUtilityMacros() {
  if (!game.user?.isGM) return;

  const macroSpecs = [
    {
      name: "Trueque Noir · Herramientas de la Ciudad",
      preferredSlot: 1,
      command: 'game.truequeNoir.openCaseTracker();',
      img: 'icons/svg/book.svg'
    },
    {
      name: "Trueque Noir · Mostrar / ocultar mesa",
      preferredSlot: 2,
      command: 'game.truequeNoir.toggleSharedCaseBoard();',
      img: 'icons/svg/dice-target.svg'
    },
    {
      name: "Trueque Noir · Mesa del caso",
      preferredSlot: 3,
      command: 'game.truequeNoir.openCaseBoard();',
      img: 'icons/svg/eye.svg'
    }
  ];

  const hotbarValues = () => Object.values(game.user.hotbar ?? {}).filter(Boolean);
  const firstFreeSlot = () => {
    for (let i = 1; i <= 50; i += 1) {
      if (!game.user.hotbar?.[i]) return i;
    }
    return null;
  };

  for (const spec of macroSpecs) {
    let macro = game.macros.find(m => m.name === spec.name);
    if (!macro) {
      macro = await Macro.create({
        name: spec.name,
        type: 'script',
        command: spec.command,
        img: spec.img
      });
    } else if (macro.command !== spec.command || macro.img !== spec.img) {
      await macro.update({ command: spec.command, img: spec.img });
    }

    const assigned = hotbarValues().includes(macro.id);
    if (!assigned) {
      const preferred = spec.preferredSlot;
      const slot = !game.user.hotbar?.[preferred] ? preferred : firstFreeSlot();
      if (slot) await game.user.assignHotbarMacro(macro, slot);
    }
  }
}


Hooks.once("init", async function() {
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("lowercase", value => String(value ?? "").toLowerCase());
  console.log("trueque-noir | Inicializando sistema");

  registerSystemSettings();
  CONFIG.Actor.documentClass = TruequeNoirActor;
  CONFIG.Actor.dataModels.detective = TruequeNoirDetectiveData;
  CONFIG.Actor.dataModels.npc = TruequeNoirNpcData;

  Actors.unregisterSheet("core", LegacyActorSheet);
  Actors.registerSheet(TN.SYSTEM_ID, TruequeNoirDetectiveSheet, { makeDefault: true, types: ["detective", "npc"] });

  game.truequeNoir = {
    openCityGenerator: () => new TruequeNoirCityGenerator().render(true),
    openCharacterGenerator: () => new TruequeNoirCharacterGenerator().render(true),
    openCaseTracker: () => {
      if (!game.user.isGM) return ui.notifications.warn("Solo La Ciudad puede abrir el Panel de la Ciudad.");
      const existing = openWindows().find(app => app?.options?.id === "trueque-noir-case-tracker");
      if (existing) return existing.render(true);
      return new TruequeNoirCaseTracker().render(true);
    },
    openCaseBoard: () => {
      const existing = openWindows().find(app => app?.options?.id === "trueque-noir-case-board");
      if (existing) return existing.render(true);
      return new TruequeNoirCaseBoard().render(true);
    },
    closeCaseBoard: () => {
      const existing = openWindows().find(app => app?.options?.id === "trueque-noir-case-board");
      if (existing) existing.close();
    },
    toggleSharedCaseBoard: async () => {
      if (!game.user.isGM) return ui.notifications.warn("Solo La Ciudad puede mostrar u ocultar la mesa del caso para todo el grupo.");
      const visible = Boolean(game.settings.get(TN.SYSTEM_ID, "tableDisplayVisible"));
      const next = !visible;
      await game.settings.set(TN.SYSTEM_ID, "tableDisplayVisible", next);
      game.socket.emit(TN.SOCKET, { type: next ? "open-board" : "close-board" });
      if (next) game.truequeNoir.openCaseBoard();
      else game.truequeNoir.closeCaseBoard();
      ui.notifications.info(next ? "Mesa del caso visible para todo el grupo." : "Mesa del caso oculta para todo el grupo.");
    }
  };

  game.socket.on(TN.SOCKET, data => {
    if (!data?.type) return;
    if (data.type === "open-board") game.truequeNoir.openCaseBoard();
    if (data.type === "close-board") game.truequeNoir.closeCaseBoard();
  });
});

Hooks.on("getSceneControlButtons", controls => {
  if (!game.user?.isGM) return;
  const exists = controls.some(control => control.name === "trueque-noir");
  if (exists) return;
  controls.push({
    name: "trueque-noir",
    title: "Trueque Noir",
    icon: "fa-solid fa-user-secret",
    layer: "controls",
    tools: [
      {
        name: "tn-open-tracker",
        title: "Herramientas de la Ciudad",
        icon: "fa-solid fa-book-open",
        button: true,
        onClick: () => game.truequeNoir.openCaseTracker()
      },
      {
        name: "tn-toggle-board",
        title: "Mostrar / ocultar mesa del caso",
        icon: "fa-solid fa-dice-d4",
        button: true,
        onClick: () => game.truequeNoir.toggleSharedCaseBoard()
      }
    ]
  });
});

Hooks.once("ready", async function() {
  if (game.user?.isGM) {
    await migrateLegacyActorSystemData();
    await ensureUtilityMacros();
    await ensureStarterContent();
  }
  if (game.settings.get(TN.SYSTEM_ID, "tableDisplayVisible")) {
    game.truequeNoir.openCaseBoard();
  }
});

Hooks.on("renderActorDirectory", ensureDirectoryButtons);
Hooks.on("renderApplication", (app, html) => {
  const classes = app?.options?.classes ?? [];
  if (classes.includes("trueque-noir")) {
    restoreWindowState(app);
    bindContextHelp(html);
  }
});
Hooks.on("closeApplication", app => {
  const classes = app?.options?.classes ?? [];
  if (classes.includes("trueque-noir")) persistWindowState(app);
});
Hooks.on("updateSetting", setting => {
  if (setting?.namespace === TN.SYSTEM_ID) refreshCrimeBoard();
});

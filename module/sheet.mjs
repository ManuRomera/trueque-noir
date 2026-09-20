import {
  TN,
  CLUES_PER_CRIME_STEP,
  getRecognitionAvailable,
  getActiveStates,
  getCrimeDie,
  isCrimeExploded,
  getGroupClueState,
  phaseLabel
} from "./config.mjs";
import { LegacyActorSheet, LegacyDialog, shouldDeferRender, deferRender } from "./compat.mjs";
import { openRollDialog } from "./roll-dialog.mjs";

export class TruequeNoirDetectiveSheet extends LegacyActorSheet {
  constructor(...args) {
    super(...args);
    if (this.actor?.type === "npc") {
      this.options.width = 640;
      this.options.height = 460;
    }
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["trueque-noir", "sheet", "actor", "detective-sheet"],
      width: 1120,
      height: 780,
      submitOnChange: true,
      submitOnClose: true,
      closeOnSubmit: false,
      tabs: [{ navSelector: ".tn-tabs", contentSelector: ".tn-body", initial: "character" }]
    });
  }

  get template() {
    return this.actor.type === "npc"
      ? "systems/trueque-noir/templates/actors/npc-sheet.hbs"
      : "systems/trueque-noir/templates/actors/detective-sheet.hbs";
  }

  /** No repinta la ficha mientras se escribe en uno de sus campos. */
  render(force = false, options = {}) {
    if (!force && this.rendered && shouldDeferRender(this)) {
      deferRender(this);
      return this;
    }
    return super.render(force, options);
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    const clues = getGroupClueState();
    const crimeDie = getCrimeDie();
    data.actor = this.actor;
    data.system = this.actor.system;
    data.allBackgrounds = TN.BACKGROUNDS;
    data.availableRecognition = getRecognitionAvailable(this.actor);
    data.personalStates = TN.PERSONAL_STATES;
    data.cityStates = TN.CITY_STATES;
    data.activeStates = getActiveStates(this.actor);
    data.rumorBonusAvailable = Boolean(game.settings.get(TN.SYSTEM_ID, "rumorBonusAvailable"));
    data.rumorBonusText = game.settings.get(TN.SYSTEM_ID, "rumorBonusText");
    data.crimeDie = crimeDie;
    data.crimeExploded = isCrimeExploded(crimeDie);
    data.caseClues = clues.total;
    data.caseCluesAvailable = clues.available;
    data.cluesPerStep = CLUES_PER_CRIME_STEP;
    data.caseName = game.settings.get(TN.SYSTEM_ID, "caseName");
    data.caseDay = Number(game.settings.get(TN.SYSTEM_ID, "caseDay") ?? 1);
    data.timeLimit = Number(game.settings.get(TN.SYSTEM_ID, "timeLimit") ?? 4);
    data.casePhase = phaseLabel(game.settings.get(TN.SYSTEM_ID, "casePhaseIndex"));
    data.cigarettesLeft = this.actor.system.cigarettes?.value ?? 0;
    data.isGM = game.user?.isGM;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    const on = (action, handler) => html.find(`[data-action='${action}']`).on("click", handler);

    on("roll-risk", event => this._withSave(event, () => openRollDialog(this.actor, "risk")));
    on("roll-pursue", event => this._withSave(event, () => openRollDialog(this.actor, "pursue")));
    on("increase-person-tension", () => this.actor.increasePillarTension("person"));
    on("increase-place-tension", () => this.actor.increasePillarTension("place"));
    on("lower-person-tension", () => this.actor.lowerPillarTension("person"));
    on("lower-place-tension", () => this.actor.lowerPillarTension("place"));
    on("recover-cigarette", () => this.actor.adjustCigarettes(1));
    on("spend-cigarette", () => this.actor.adjustCigarettes(-1));
    on("set-pack-9", () => this.actor.setCigaretteMax(9));
    on("set-pack-6", () => this.actor.setCigaretteMax(6));
    on("add-recognition", () => this.actor.addRecognition(1));
    on("spend-recognition", () => this.actor.spendRecognition(1));
    on("create-contact", event => this._withSave(event, () => this._onCreateContact()));
    on("create-rumor", event => this._withSave(event, () => this._onCreateRumor()));
    on("open-city-tools", event => this._withSave(event, () => game.truequeNoir.openCaseTracker()));
    on("open-case-board", event => this._withSave(event, () => game.truequeNoir.openCaseBoard()));
  }

  /** Guarda lo escrito antes de abrir cualquier diálogo, para no perder cambios pendientes. */
  async _withSave(event, action) {
    event?.preventDefault();
    try {
      await this.submit({ preventClose: true, preventRender: true });
    } catch (error) {
      console.error("trueque-noir | No se pudo guardar la ficha antes de la acción", error);
    }
    return action();
  }

  async close(options = {}) {
    try {
      await this.submit({ preventClose: true, preventRender: true });
    } catch (error) {
      console.error("trueque-noir | Error guardando la ficha al cerrar", error);
    }
    return super.close(options);
  }

  async _updateObject(_event, formData) {
    const data = foundry.utils.expandObject(formData);
    const number = (value, fallback) => Number(value ?? fallback ?? 0);

    if (data.system?.cigarettes) {
      const max = Math.max(0, number(data.system.cigarettes.max, this.actor.system.cigarettes?.max));
      data.system.cigarettes.max = max;
      data.system.cigarettes.value = Math.max(0, Math.min(number(data.system.cigarettes.value, this.actor.system.cigarettes?.value), max));
    }
    if (data.system?.recognition) {
      data.system.recognition.total = Math.max(0, number(data.system.recognition.total, this.actor.system.recognition?.total));
      data.system.recognition.spent = Math.max(0, Math.min(number(data.system.recognition.spent, this.actor.system.recognition?.spent), data.system.recognition.total));
    }
    if (data.system?.clues) data.system.clues.count = Math.max(0, number(data.system.clues.count, this.actor.system.clues?.count));
    if (data.system?.caseStats) data.system.caseStats.quietDrinksUsed = Math.min(2, Math.max(0, number(data.system.caseStats.quietDrinksUsed, this.actor.system.caseStats?.quietDrinksUsed)));
    for (const pillar of ["person", "place"]) {
      if (data.system?.stability?.[pillar]) {
        data.system.stability[pillar].tension = Math.min(3, Math.max(0, number(data.system.stability[pillar].tension, this.actor.system.stability?.[pillar]?.tension)));
      }
    }
    return this.actor.update(data);
  }

  _onCreateContact() {
    const cigarettes = this.actor.cigarettes;
    if (cigarettes < 1) return ui.notifications.warn(`${this.actor.name} necesita 1 cigarrillo para conocer a un tipo y no le queda ninguno.`);
    new LegacyDialog({
      title: `Conozco a un tipo que… · ${this.actor.name}`,
      content: `
        <form class="tn-roll">
          <p class="tn-roll__blurb">Gastas 1 cigarrillo y añades un contacto a tu agenda.</p>
          <div class="tn-field"><label>Nombre del contacto</label><input type="text" name="name" autofocus /></div>
          <div class="tn-field-row">
            <div class="tn-field"><label>Zona</label><input type="text" name="zone" placeholder="Norte / Sur / Este / Oeste" /></div>
            <div class="tn-field"><label>Localización</label><input type="text" name="location" /></div>
          </div>
          <div class="tn-field">
            <label>¿Qué te da?</label>
            <select name="effect">
              <option value="pista">Tiene una pista o información valiosa</option>
              <option value="direcciona">Redirige a localizaciones con pistas</option>
            </select>
          </div>
          <div class="tn-field"><label>Notas</label><textarea name="notes"></textarea></div>
        </form>`,
      buttons: {
        ok: {
          label: "Gastar 1 cigarrillo",
          callback: async html => {
            const value = name => String(html.find(`[name='${name}']`).val() || "");
            await this.actor.createContactFromCigarette({
              name: value("name"),
              zone: value("zone"),
              location: value("location"),
              effect: value("effect"),
              notes: value("notes")
            });
            this.render(false);
          }
        },
        cancel: { label: "Cancelar" }
      },
      default: "ok"
    }, { classes: ["trueque-noir", "tn-dialog"], width: 460 }).render(true);
  }

  _onCreateRumor() {
    const cigarettes = this.actor.cigarettes;
    if (cigarettes < 1) return ui.notifications.warn(`${this.actor.name} necesita 1 cigarrillo para sembrar un rumor y no le queda ninguno.`);
    if (game.settings.get(TN.SYSTEM_ID, "rumorBonusAvailable")) {
      return ui.notifications.warn("Ya hay un rumor pendiente en el caso. Consúmelo en una tirada antes de sembrar otro.");
    }
    new LegacyDialog({
      title: `Aquí han pasado cosas turbias · ${this.actor.name}`,
      content: `
        <form class="tn-roll">
          <p class="tn-roll__blurb">Gastas 1 cigarrillo y dejas un +2 pendiente para una sola tirada del grupo.</p>
          <div class="tn-field"><label>Localización</label><input type="text" name="location" autofocus /></div>
          <div class="tn-field"><label>Historia turbia</label><textarea name="story"></textarea></div>
        </form>`,
      buttons: {
        ok: {
          label: "Sembrar el rumor",
          callback: async html => {
            await this.actor.createRumorBonus({
              location: String(html.find("[name='location']").val() || ""),
              story: String(html.find("[name='story']").val() || "")
            });
            this.render(false);
          }
        },
        cancel: { label: "Cancelar" }
      },
      default: "ok"
    }, { classes: ["trueque-noir", "tn-dialog"], width: 460 }).render(true);
  }
}

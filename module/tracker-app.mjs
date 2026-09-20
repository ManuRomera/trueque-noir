import {
  TN,
  CLUES_PER_CRIME_STEP,
  CLUES_FOR_ACCUSATION,
  phaseLabel,
  clampCrimeDie,
  getGroupClueState,
  refreshCrimeBoard,
  getCrimeDie,
  isCrimeExploded,
  getDetectives,
  getActiveStates
} from "./config.mjs";
import { LegacyApplication, LegacyDialog, shouldDeferRender, deferRender } from "./compat.mjs";
import { postCityNote } from "./chat.mjs";
import { confirmAction } from "./prompts.mjs";
import { requestCaseOp } from "./case-state.mjs";

function readCityData() {
  const fallback = { cityName: game.settings.get(TN.SYSTEM_ID, "cityName") || "La ciudad", context: "", wanted: "", unwanted: "", zones: [], hasZones: false, hasContent: false };
  try {
    const data = JSON.parse(game.settings.get(TN.SYSTEM_ID, "cityData") || "{}");
    const zones = Array.isArray(data.zones) ? data.zones : [];
    return {
      cityName: data.cityName || fallback.cityName,
      context: data.context || "",
      wanted: data.wanted || "",
      unwanted: data.unwanted || "",
      zones,
      hasZones: zones.length > 0,
      hasContent: Boolean(data.context || zones.length)
    };
  } catch (error) {
    console.warn("trueque-noir | Datos de ciudad ilegibles", error);
    return fallback;
  }
}

export class TruequeNoirCaseTracker extends LegacyApplication {
  constructor(...args) {
    super(...args);
    this._openSections = new Set();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trueque-noir-case-tracker",
      template: "systems/trueque-noir/templates/apps/case-tracker.hbs",
      classes: ["trueque-noir", "tn-app", "tn-case-tracker"],
      width: 720,
      height: 760,
      resizable: true,
      title: "Panel de La Ciudad"
    });
  }

  /** Nunca repinta encima de un campo que se está editando. */
  render(force = false, options = {}) {
    if (!force && this.rendered && shouldDeferRender(this)) {
      deferRender(this);
      return this;
    }
    return super.render(force, options);
  }

  getData() {
    const clues = getGroupClueState();
    const crimeDie = getCrimeDie();
    return {
      isGM: game.user?.isGM,
      caseName: game.settings.get(TN.SYSTEM_ID, "caseName"),
      day: Number(game.settings.get(TN.SYSTEM_ID, "caseDay") ?? 1),
      timeLimit: Number(game.settings.get(TN.SYSTEM_ID, "timeLimit") ?? 4),
      phase: phaseLabel(game.settings.get(TN.SYSTEM_ID, "casePhaseIndex")),
      phases: TN.PHASES,
      phaseIndex: Number(game.settings.get(TN.SYSTEM_ID, "casePhaseIndex") ?? 0),
      crimeDie,
      crimeExploded: isCrimeExploded(crimeDie),
      crimeCanRise: crimeDie < 5,
      crimeCanFall: crimeDie > 1,
      clueTotal: clues.total,
      clueSpent: clues.spent,
      clueAvailable: clues.available,
      cluesPerStep: CLUES_PER_CRIME_STEP,
      canSpendClues: clues.canReduceCrime,
      crimeAfterClues: clampCrimeDie(crimeDie - 1),
      rumorBonusAvailable: Boolean(game.settings.get(TN.SYSTEM_ID, "rumorBonusAvailable")),
      rumorBonusText: game.settings.get(TN.SYSTEM_ID, "rumorBonusText"),
      displayVisible: Boolean(game.settings.get(TN.SYSTEM_ID, "tableDisplayVisible")),
      cityConsequences: TN.TRUEQUE_CITY,
      priceConsequences: TN.TRUEQUE_PRICE,
      detectives: getDetectives().map(actor => ({
        id: actor.id,
        name: actor.name,
        cigarettes: actor.system.cigarettes?.value ?? 0,
        states: getActiveStates(actor).map(state => state.label).join(" · ")
      })),
      selectedDetective: this._selectedDetective ?? getDetectives()[0]?.id ?? "",
      cluesForAccusation: CLUES_FOR_ACCUSATION,
      canAccuse: clues.total >= CLUES_FOR_ACCUSATION,
      caseArchiveImported: Boolean(game.settings.get(TN.SYSTEM_ID, "caseArchiveImported")),
      city: readCityData()
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = html[0] ?? html;

    // Autoguardado: los campos del caso se guardan al cambiar o al perder el foco.
    for (const field of root.querySelectorAll("[data-setting]")) {
      field.addEventListener("change", event => this._saveField(event.currentTarget));
    }

    // Recuerda qué bloques dejó abiertos La Ciudad.
    for (const details of root.querySelectorAll("details[data-section]")) {
      details.open = this._openSections.has(details.dataset.section);
      details.addEventListener("toggle", () => {
        if (details.open) this._openSections.add(details.dataset.section);
        else this._openSections.delete(details.dataset.section);
      });
    }

    root.querySelector("[name='selectedDetective']")?.addEventListener("change", event => {
      this._selectedDetective = event.currentTarget.value;
      this.render(false);
    });

    const on = (action, handler) => {
      for (const button of root.querySelectorAll(`[data-action='${action}']`)) button.addEventListener("click", handler);
    };

    on("next-phase", () => this._shiftPhase(1));
    on("prev-phase", () => this._shiftPhase(-1));
    on("crime-inc", () => this._adjustCrime(1));
    on("crime-dec", () => this._adjustCrime(-1));
    on("crime-set", event => this._setCrimeDie(Number(event.currentTarget.dataset.value || 1)));
    on("apply-clues", () => this._onApplyStoredClues());
    on("toggle-board", () => game.truequeNoir.toggleSharedCaseBoard());
    on("edit-city", () => game.truequeNoir.openCityGenerator());
    on("clear-city", () => this._clearCity());
    on("scene-theme", () => game.truequeNoir.openThemePicker());
    on("quiet-drink", () => this._onQuietDrink());
    on("night-rest", () => this._onNightRest());
    on("recognition-plus", () => this._onRecognitionPlus());
    on("interlude", () => this._onInterlude());
    on("accusation", () => this._onAccusation());
    on("random-trueque", () => this._onRandomTrueque());
    on("reset-case", () => this._onResetCase());
    on("import-cases", () => game.truequeNoir.importCaseArchive());
    on("open-welcome", () => game.truequeNoir.openWelcome());
    on("create-detective", () => game.truequeNoir.openCharacterGenerator());
  }

  /** Guarda un único campo del caso sin repintar el panel bajo el cursor. */
  async _saveField(field) {
    const key = field.dataset.setting;
    if (!key) return;
    const value = field.type === "number" ? Math.max(Number(field.min || 0), Number(field.value || 0)) : String(field.value ?? "");
    if (field.type === "number") field.value = value;
    await game.settings.set(TN.SYSTEM_ID, key, value);
    this._paintCaseHeader();
  }

  /** Vuelca a los ajustes cualquier cambio pendiente antes de una acción que repinta. */
  async _flushPendingEdits() {
    const root = this.element?.[0];
    if (!root) return;
    document.activeElement?.blur?.();
    for (const field of root.querySelectorAll("[data-setting]")) {
      const key = field.dataset.setting;
      const current = game.settings.get(TN.SYSTEM_ID, key);
      const value = field.type === "number" ? Number(field.value || 0) : String(field.value ?? "");
      if (String(current) !== String(value)) await this._saveField(field);
    }
  }

  _paintCaseHeader() {
    const root = this.element?.[0];
    if (!root) return;
    const name = root.querySelector("[data-case-name]");
    const time = root.querySelector("[data-case-time]");
    if (name) name.textContent = game.settings.get(TN.SYSTEM_ID, "caseName");
    if (time) {
      time.textContent = `Día ${game.settings.get(TN.SYSTEM_ID, "caseDay")} de ${game.settings.get(TN.SYSTEM_ID, "timeLimit")} · ${phaseLabel(game.settings.get(TN.SYSTEM_ID, "casePhaseIndex"))}`;
    }
  }

  getSelectedDetective() {
    const id = this.element?.find("[name='selectedDetective']").val() || this._selectedDetective;
    return game.actors.get(id) ?? getDetectives()[0];
  }

  _requireDetective() {
    const detective = this.getSelectedDetective();
    if (!detective) ui.notifications.warn("Todavía no hay ningún detective en la ciudad. Crea uno desde el menú Trueque Noir.");
    return detective;
  }

  async _shiftPhase(direction) {
    await this._flushPendingEdits();
    let phaseIndex = Number(game.settings.get(TN.SYSTEM_ID, "casePhaseIndex") ?? 0) + direction;
    let day = Number(game.settings.get(TN.SYSTEM_ID, "caseDay") ?? 1);
    if (phaseIndex >= TN.PHASES.length) { phaseIndex = 0; day += 1; }
    if (phaseIndex < 0) { phaseIndex = TN.PHASES.length - 1; day = Math.max(1, day - 1); }
    await game.settings.set(TN.SYSTEM_ID, "casePhaseIndex", phaseIndex);
    await game.settings.set(TN.SYSTEM_ID, "caseDay", day);
    await refreshCrimeBoard();
    this.render(false);
  }

  async _adjustCrime(delta) {
    await requestCaseOp("changeCrimeDie", { amount: delta });
    this.render(false);
  }

  async _setCrimeDie(value) {
    await requestCaseOp("setCrimeDie", { value });
    this.render(false);
  }

  async _onApplyStoredClues() {
    if (await requestCaseOp("spendCluesOnCrime")) {
      await postCityNote({
        title: "Pistas gastadas",
        body: `<p>El grupo gasta ${CLUES_PER_CRIME_STEP} pistas para bajar el dado del crimen a <strong>${getCrimeDie()}</strong>.</p>`
      });
    }
    this.render(false);
  }

  async _clearCity() {
    const confirmed = await confirmAction({
      title: "Vaciar la ciudad",
      message: "Se borrará la ciudad guardada en el panel: contexto, límites y las cuatro zonas.",
      detail: "Los diarios ya creados se conservan como archivo.",
      confirmLabel: "Vaciar la ciudad",
      danger: true
    });
    if (!confirmed) return;
    await game.settings.set(TN.SYSTEM_ID, "cityData", "{}");
    await game.settings.set(TN.SYSTEM_ID, "cityName", "La ciudad");
    this.render(false);
  }

  _onQuietDrink() {
    const detective = this._requireDetective();
    if (!detective) return;
    const used = Number(detective.system.caseStats?.quietDrinksUsed ?? 0);
    if (used >= 2) return ui.notifications.warn(`${detective.name} ya ha tomado los 2 tragos tranquilos que permite el caso.`);
    const personalStates = TN.PERSONAL_STATES.filter(state => detective.system.personalStates?.[state.id]);
    const hasStates = personalStates.length || detective.system.personalStates?.customActive;

    new LegacyDialog({
      title: `Un trago tranquilo · ${detective.name}`,
      content: `
        <form class="tn-roll">
          <p class="tn-roll__blurb">Le quedan ${2 - used} trago${2 - used === 1 ? "" : "s"} en este caso.</p>
          <div class="tn-field">
            <label>Beneficio</label>
            <select name="mode">
              <option value="cigarettes">Recobrar 2 cigarrillos</option>
              <option value="state" ${hasStates ? "" : "disabled"}>Recuperar 1 estado personal${hasStates ? "" : " (no tiene ninguno activo)"}</option>
            </select>
          </div>
          <div class="tn-field" data-state-field ${hasStates ? "" : "hidden"}>
            <label>Estado que se cura</label>
            <select name="stateId">
              ${personalStates.map(state => `<option value="${state.id}">${state.label}</option>`).join("")}
              ${detective.system.personalStates?.customActive ? `<option value="custom">${detective.system.personalStates.custom || "Estado libre"}</option>` : ""}
            </select>
          </div>
          <div class="tn-field">
            <label>Hipótesis sobre el caso</label>
            <select name="hypothesis">
              <option value="correct">Va por buen camino</option>
              <option value="wrong">Es errónea · el dado del crimen sube 1</option>
            </select>
          </div>
        </form>`,
      buttons: {
        ok: {
          label: "Tomar el trago",
          callback: async html => {
            await detective.takeQuietDrink({
              mode: String(html.find("[name='mode']").val() || "cigarettes"),
              stateId: String(html.find("[name='stateId']").val() || ""),
              hypothesisCorrect: String(html.find("[name='hypothesis']").val()) !== "wrong"
            });
            await postCityNote({ title: "Un trago tranquilo", body: `<p><strong>${detective.name}</strong> se toma un respiro antes de volver al caso.</p>` });
            this.render(false);
          }
        },
        cancel: { label: "Cancelar" }
      },
      default: "ok",
      render: html => {
        const root = html[0] ?? html;
        const mode = root.querySelector("[name='mode']");
        const stateField = root.querySelector("[data-state-field]");
        mode?.addEventListener("change", () => { if (stateField) stateField.hidden = mode.value !== "state"; });
      }
    }, { classes: ["trueque-noir", "tn-dialog"], width: 460 }).render(true);
  }

  async _onNightRest() {
    const detective = this._requireDetective();
    if (!detective) return;
    await detective.takeNightRest();
    await postCityNote({ title: "Descanso", body: `<p><strong>${detective.name}</strong> pasa la noche descansando y recupera 1 cigarrillo.</p>` });
    this.render(false);
  }

  async _onRecognitionPlus() {
    const detective = this._requireDetective();
    if (!detective) return;
    await detective.addRecognition(1);
    ui.notifications.info(`${detective.name} gana 1 punto de reconocimiento.`);
    this.render(false);
  }

  _onInterlude() {
    const detective = this._requireDetective();
    if (!detective) return;
    new LegacyDialog({
      title: `Interludio · ${detective.name}`,
      content: `
        <form class="tn-roll">
          <p class="tn-roll__blurb">Entre casos, el reconocimiento se convierte en ventajas duraderas.</p>
          <div class="tn-field">
            <label>Beneficio</label>
            <select name="benefit">
              <option value="cigarettes2">1 punto · recuperar 2 cigarrillos</option>
              <option value="personal">1 punto · eliminar un estado personal</option>
              <option value="city">1 punto · eliminar un estado con la ciudad</option>
              <option value="personTension">1 punto · bajar la tensión de la persona</option>
              <option value="placeTension">1 punto · bajar la tensión del lugar</option>
              <option value="fullPack">2 puntos · reponer la cajetilla</option>
              <option value="favor">2 puntos · conseguir un favor</option>
              <option value="background">3 puntos · añadir un trasfondo</option>
            </select>
          </div>
          <div class="tn-field"><label>Detalle</label><input name="detail" type="text" placeholder="Estado, favor o trasfondo, si corresponde" /></div>
        </form>`,
      buttons: {
        apply: {
          label: "Aplicar",
          callback: async html => {
            await detective.applyInterludeBenefit(
              String(html.find("[name='benefit']").val() || ""),
              String(html.find("[name='detail']").val() || "")
            );
            this.render(false);
          }
        },
        cancel: { label: "Cancelar" }
      },
      default: "apply"
    }, { classes: ["trueque-noir", "tn-dialog"], width: 460 }).render(true);
  }

  _onAccusation() {
    const clues = getGroupClueState();
    const short = clues.total < CLUES_FOR_ACCUSATION;
    new LegacyDialog({
      title: "Acusación y detención",
      content: `
        <form class="tn-roll">
          <p class="tn-roll__blurb">El grupo lleva <strong>${clues.total}</strong> pistas. El manual pide al menos ${CLUES_FOR_ACCUSATION} antes de acusar.</p>
          ${short ? `<p class="tn-roll__warning">Faltan ${CLUES_FOR_ACCUSATION - clues.total} pistas: la acusación se publicará marcada como precipitada.</p>` : ""}
          <div class="tn-field"><label>¿A quién se detiene?</label><input type="text" name="who" autofocus /></div>
          <div class="tn-field"><label>¿De qué se le acusa?</label><input type="text" name="what" /></div>
          <div class="tn-field"><label>¿Por qué lo hizo?</label><textarea name="why"></textarea></div>
        </form>`,
      buttons: {
        post: {
          label: "Publicar la acusación",
          callback: async html => {
            const value = name => String(html.find(`[name='${name}']`).val() || "—");
            await postCityNote({
              title: "Acusación",
              tone: short ? "warning" : "",
              body: `
                ${short ? `<p class="tn-note__warning">Acusación precipitada: solo ${clues.total} de ${CLUES_FOR_ACCUSATION} pistas.</p>` : ""}
                <p><strong>¿Quién?</strong> ${value("who")}</p>
                <p><strong>¿Qué?</strong> ${value("what")}</p>
                <p><strong>¿Por qué?</strong> ${value("why")}</p>`
            });
          }
        },
        cancel: { label: "Cancelar" }
      },
      default: "post"
    }, { classes: ["trueque-noir", "tn-dialog"], width: 480 }).render(true);
  }

  async _onRandomTrueque() {
    const city = TN.TRUEQUE_CITY[Math.floor(Math.random() * TN.TRUEQUE_CITY.length)];
    const price = TN.TRUEQUE_PRICE[Math.floor(Math.random() * TN.TRUEQUE_PRICE.length)];
    await postCityNote({
      title: "Trueque",
      body: `<p><strong>La ciudad se revuelve.</strong> ${city}</p><p><strong>Pagar el precio.</strong> ${price}</p><p class="tn-note__foot">El detective elige cuál de las dos sufre.</p>`
    });
  }

  async _onResetCase() {
    const confirmed = await confirmAction({
      title: "Reiniciar el caso",
      message: "Reiniciar el caso eliminará el progreso actual de tiempo, pistas, rumor y recursos asociados al caso.",
      detail: "Se restablecen día y franja, límite de días, dado del crimen, pistas del grupo, rumor pendiente, favores y objetos gastados, tragos tranquilos y las pistas de cada detective. La ciudad y las fichas se conservan.",
      confirmLabel: "REINICIAR CASO",
      danger: true
    });
    if (!confirmed) return;

    await requestCaseOp("resetCase");
    for (const actor of getDetectives()) await actor.resetCaseState();
    ui.notifications.info("Caso reiniciado. La ciudad y los detectives siguen en su sitio.");
    this.render(false);
  }
}

export class TruequeNoirCaseBoard extends LegacyApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trueque-noir-case-board",
      template: "systems/trueque-noir/templates/apps/case-board.hbs",
      classes: ["trueque-noir", "tn-app", "tn-case-board"],
      width: 820,
      height: 280,
      popOut: true,
      minimizable: true,
      resizable: true,
      title: "Mesa del caso"
    });
  }

  getData() {
    const clues = getGroupClueState();
    const crimeDie = getCrimeDie();
    return {
      caseName: game.settings.get(TN.SYSTEM_ID, "caseName"),
      day: Number(game.settings.get(TN.SYSTEM_ID, "caseDay") ?? 1),
      timeLimit: Number(game.settings.get(TN.SYSTEM_ID, "timeLimit") ?? 4),
      phase: phaseLabel(game.settings.get(TN.SYSTEM_ID, "casePhaseIndex")),
      crimeDie,
      exploded: isCrimeExploded(crimeDie),
      clueTotal: clues.total,
      clueAvailable: clues.available,
      cluesPerStep: CLUES_PER_CRIME_STEP,
      rumorBonusAvailable: Boolean(game.settings.get(TN.SYSTEM_ID, "rumorBonusAvailable")),
      rumorBonusText: game.settings.get(TN.SYSTEM_ID, "rumorBonusText")
    };
  }
}

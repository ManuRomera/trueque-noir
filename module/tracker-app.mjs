import {
  TN,
  phaseLabel,
  clampCrimeDie,
  getGroupClueState,
  refreshCrimeBoard,
  getCrimeDie
} from "./config.mjs";

function detectiveOptions() {
  return game.actors.filter(actor => actor.type === "detective").map(actor => ({ id: actor.id, name: actor.name }));
}

export class TruequeNoirCaseTracker extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trueque-noir-case-tracker",
      template: "systems/trueque-noir/templates/apps/case-tracker.hbs",
      classes: ["trueque-noir", "tn-app", "tn-case-tracker"],
      width: 1080,
      height: 720,
      resizable: true,
      title: "Panel de la Ciudad"
    });
  }

  getData() {
    const phaseIndex = Number(game.settings.get(TN.SYSTEM_ID, "casePhaseIndex") ?? 0);
    const clueState = getGroupClueState();
    return {
      caseName: game.settings.get(TN.SYSTEM_ID, "caseName"),
      day: Number(game.settings.get(TN.SYSTEM_ID, "caseDay") ?? 1),
      timeLimit: Number(game.settings.get(TN.SYSTEM_ID, "timeLimit") ?? 4),
      phase: phaseLabel(phaseIndex),
      crimeDie: getCrimeDie(),
      crimeExploded: getCrimeDie() > 4,
      clueTotal: clueState.total,
      clueSpent: clueState.spent,
      clueAvailable: clueState.available,
      rumorBonusAvailable: Boolean(game.settings.get(TN.SYSTEM_ID, "rumorBonusAvailable")),
      rumorBonusText: game.settings.get(TN.SYSTEM_ID, "rumorBonusText"),
      displayVisible: Boolean(game.settings.get(TN.SYSTEM_ID, "tableDisplayVisible")),
      cityConsequences: TN.TRUEQUE_CITY,
      priceConsequences: TN.TRUEQUE_PRICE,
      detectives: detectiveOptions()
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='save']").on("click", this._onSave.bind(this));
    html.find("[data-action='next-phase']").on("click", this._onNextPhase.bind(this));
    html.find("[data-action='prev-phase']").on("click", this._onPrevPhase.bind(this));
    html.find("[data-action='crime-inc']").on("click", () => this._adjustCrime(1));
    html.find("[data-action='crime-dec']").on("click", () => this._adjustCrime(-1));
    html.find("[data-action='crime-set']").on("click", ev => this._setCrimeDie(Number(ev.currentTarget?.dataset?.value || 1)));
    html.find("[data-action='apply-clues']").on("click", this._onApplyStoredClues.bind(this));
    html.find("[data-action='reset-case']").on("click", this._onResetCase.bind(this));
    html.find("[data-action='random-trueque']").on("click", this._onRandomTrueque.bind(this));
    html.find("[data-action='toggle-board']").on("click", this._onToggleBoard.bind(this));
    html.find("[data-action='quiet-drink']").on("click", this._onQuietDrink.bind(this));
    html.find("[data-action='night-rest']").on("click", this._onNightRest.bind(this));
    html.find("[data-action='recognition-plus']").on("click", this._onRecognitionPlus.bind(this));
    html.find("[data-action='accusation']").on("click", this._onAccusation.bind(this));
  }

  getSelectedDetective() {
    const select = this.element.find("[name='selectedDetective']").val();
    return game.actors.get(select);
  }

  async _onSave(event) {
    event.preventDefault();
    const form = this.element.find("form")[0];
    const fd = new FormData(form);
    await game.settings.set(TN.SYSTEM_ID, "caseName", String(fd.get("caseName") || "Caso abierto"));
    await game.settings.set(TN.SYSTEM_ID, "caseDay", Math.max(1, Number(fd.get("day") || 1)));
    await game.settings.set(TN.SYSTEM_ID, "timeLimit", Math.max(1, Number(fd.get("timeLimit") || 4)));
    await refreshCrimeBoard();
    this.render(false);
  }

  async _adjustCrime(delta) {
    const current = getCrimeDie();
    const next = clampCrimeDie(current + Number(delta || 0));
    await game.settings.set(TN.SYSTEM_ID, "crimeDie", next);
    if (next > 4) {
      ui.notifications.warn("El dado del crimen ha explotado.");
    }
    await refreshCrimeBoard();
    this.render(false);
  }

  async _setCrimeDie(value) {
    const next = clampCrimeDie(value);
    await game.settings.set(TN.SYSTEM_ID, "crimeDie", next);
    await refreshCrimeBoard();
    this.render(false);
  }

  async _onNextPhase(event) {
    event.preventDefault();
    let phaseIndex = Number(game.settings.get(TN.SYSTEM_ID, "casePhaseIndex") ?? 0) + 1;
    let day = Number(game.settings.get(TN.SYSTEM_ID, "caseDay") ?? 1);
    if (phaseIndex >= TN.PHASES.length) {
      phaseIndex = 0;
      day += 1;
    }
    await game.settings.set(TN.SYSTEM_ID, "casePhaseIndex", phaseIndex);
    await game.settings.set(TN.SYSTEM_ID, "caseDay", day);
    await refreshCrimeBoard();
    this.render(false);
  }

  async _onPrevPhase(event) {
    event.preventDefault();
    let phaseIndex = Number(game.settings.get(TN.SYSTEM_ID, "casePhaseIndex") ?? 0) - 1;
    let day = Number(game.settings.get(TN.SYSTEM_ID, "caseDay") ?? 1);
    if (phaseIndex < 0) {
      phaseIndex = TN.PHASES.length - 1;
      day = Math.max(1, day - 1);
    }
    await game.settings.set(TN.SYSTEM_ID, "casePhaseIndex", phaseIndex);
    await game.settings.set(TN.SYSTEM_ID, "caseDay", day);
    await refreshCrimeBoard();
    this.render(false);
  }

  async _onApplyStoredClues(event) {
    event.preventDefault();
    const detective = this.getSelectedDetective() ?? game.actors.find(a => a.type === "detective");
    if (!detective) return ui.notifications.warn("No hay detectives disponibles.");
    const ok = await detective.useStoredCluesBand();
    if (ok) {
      await ChatMessage.create({
        speaker: { alias: "La Ciudad" },
        content: `<div class="tn-chat-card"><h3>Pistas guardadas</h3><p>El grupo gasta 3 pistas acumuladas para reducir el dado del crimen en 1.</p></div>`
      });
    }
    this.render(false);
  }

  async _onToggleBoard(event) {
    event.preventDefault();
    const visible = Boolean(game.settings.get(TN.SYSTEM_ID, "tableDisplayVisible"));
    const next = !visible;
    await game.settings.set(TN.SYSTEM_ID, "tableDisplayVisible", next);
    game.socket.emit(TN.SOCKET, { type: next ? "open-board" : "close-board" });
    if (next) {
      game.truequeNoir.openCaseBoard();
    } else {
      game.truequeNoir.closeCaseBoard();
    }
    this.render(false);
  }

  async _onQuietDrink(event) {
    event.preventDefault();
    const detective = this.getSelectedDetective();
    if (!detective) return ui.notifications.warn("Selecciona un detective.");

    const personalStates = TN.PERSONAL_STATES.filter(state => detective.system.personalStates?.[state.id]);
    new Dialog({
      title: `Un trago tranquilo · ${detective.name}`,
      content: `
        <form class="tn-roll-dialog">
          <div class="form-group">
            <label>Beneficio</label>
            <select name="mode">
              <option value="cigarettes">Recobrar 2 cigarrillos</option>
              <option value="state">Recuperar 1 estado personal</option>
            </select>
          </div>
          <div class="form-group">
            <label>Estado personal a recuperar</label>
            <select name="stateId">
              <option value="">—</option>
              ${personalStates.map(state => `<option value="${state.id}">${state.label}</option>`).join("")}
              ${detective.system.personalStates?.customActive ? `<option value="custom">${detective.system.personalStates.custom || "Estado libre"}</option>` : ""}
            </select>
          </div>
          <div class="form-group">
            <label>Hipótesis sobre el caso</label>
            <select name="hypothesis">
              <option value="correct">La hipótesis sigue el camino correcto</option>
              <option value="wrong">La hipótesis es errónea (+1 dado del crimen)</option>
            </select>
          </div>
          <p class="notes">Cada detective puede tomar un trago tranquilo hasta 2 veces por caso.</p>
        </form>`,
      buttons: {
        ok: {
          label: "Aplicar",
          callback: async html => {
            const mode = String(html.find("[name='mode']").val() || "cigarettes");
            const stateId = String(html.find("[name='stateId']").val() || "");
            const hypothesisCorrect = String(html.find("[name='hypothesis']").val()) !== "wrong";
            await detective.takeQuietDrink({ mode, stateId, hypothesisCorrect });
            await ChatMessage.create({
              speaker: { alias: "La Ciudad" },
              content: `<div class="tn-chat-card"><h3>Un trago tranquilo</h3><p><strong>${detective.name}</strong> toma un respiro antes de seguir con el caso.</p></div>`
            });
            this.render(false);
          }
        },
        cancel: { label: "Cancelar" }
      },
      default: "ok"
    }, { classes: ["trueque-noir", "tn-dialog"] }).render(true);
  }

  async _onNightRest(event) {
    event.preventDefault();
    const detective = this.getSelectedDetective();
    if (!detective) return ui.notifications.warn("Selecciona un detective.");
    await detective.takeNightRest();
    await ChatMessage.create({
      speaker: { alias: "La Ciudad" },
      content: `<div class="tn-chat-card"><h3>Descanso</h3><p>${detective.name} pasa la noche descansando y recupera 1 cigarrillo.</p></div>`
    });
    this.render(false);
  }

  async _onRecognitionPlus(event) {
    event.preventDefault();
    const detective = this.getSelectedDetective();
    if (!detective) return ui.notifications.warn("Selecciona un detective.");
    await detective.addRecognition(1);
    this.render(false);
  }

  async _onAccusation(event) {
    event.preventDefault();
    const clueState = getGroupClueState();
    new Dialog({
      title: "Acusación y detención",
      content: `
        <form class="tn-roll-dialog">
          <p class="notes">Pistas descubiertas por el grupo: <strong>${clueState.total}</strong>. El manual exige al menos 6 pistas para hacer una acusación.</p>
          <div class="form-group">
            <label>¿A quién se va a detener?</label>
            <input type="text" name="who" />
          </div>
          <div class="form-group">
            <label>¿De qué delito se le acusa?</label>
            <input type="text" name="what" />
          </div>
          <div class="form-group">
            <label>¿Por qué cometió este delito?</label>
            <textarea name="why"></textarea>
          </div>
        </form>`,
      buttons: {
        post: {
          label: "Publicar en chat",
          callback: async html => {
            const who = String(html.find("[name='who']").val() || "");
            const what = String(html.find("[name='what']").val() || "");
            const why = String(html.find("[name='why']").val() || "");
            const warning = clueState.total < 6 ? `<p><strong>Advertencia:</strong> el grupo aún no ha llegado a 6 pistas.</p>` : "";
            await ChatMessage.create({
              speaker: { alias: "La Ciudad" },
              content: `
                <div class="tn-chat-card">
                  <h3>Acusación</h3>
                  ${warning}
                  <p><strong>¿Quién?</strong> ${who || "—"}</p>
                  <p><strong>¿Qué?</strong> ${what || "—"}</p>
                  <p><strong>¿Por qué?</strong> ${why || "—"}</p>
                </div>`
            });
          }
        },
        cancel: { label: "Cancelar" }
      },
      default: "post"
    }, { classes: ["trueque-noir", "tn-dialog"] }).render(true);
  }

  async _onRandomTrueque(event) {
    event.preventDefault();
    const city = TN.TRUEQUE_CITY[Math.floor(Math.random() * TN.TRUEQUE_CITY.length)];
    const price = TN.TRUEQUE_PRICE[Math.floor(Math.random() * TN.TRUEQUE_PRICE.length)];
    await ChatMessage.create({
      speaker: { alias: "La Ciudad" },
      content: `
        <div class="tn-chat-card">
          <h3>Trueque</h3>
          <p><strong>La ciudad se revuelve:</strong> ${city}</p>
          <p><strong>Pagar el precio:</strong> ${price}</p>
          <p>El detective elige una de las dos consecuencias.</p>
        </div>`
    });
  }

  async _onResetCase(event) {
    event.preventDefault();
    await game.settings.set(TN.SYSTEM_ID, "caseName", "Caso abierto");
    await game.settings.set(TN.SYSTEM_ID, "caseDay", 1);
    await game.settings.set(TN.SYSTEM_ID, "casePhaseIndex", 0);
    await game.settings.set(TN.SYSTEM_ID, "timeLimit", 4);
    await game.settings.set(TN.SYSTEM_ID, "crimeDie", 1);
    await game.settings.set(TN.SYSTEM_ID, "groupCluesTotal", 0);
    await game.settings.set(TN.SYSTEM_ID, "groupCluesSpent", 0);
    await game.settings.set(TN.SYSTEM_ID, "rumorBonusAvailable", false);
    await game.settings.set(TN.SYSTEM_ID, "rumorBonusText", "");

    for (const actor of game.actors.filter(actor => actor.type === "detective")) {
      await actor.resetCaseState();
    }

    await refreshCrimeBoard();
    this.render(false);
  }
}

export class TruequeNoirCaseBoard extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trueque-noir-case-board",
      template: "systems/trueque-noir/templates/apps/case-board.hbs",
      classes: ["trueque-noir", "tn-app", "tn-case-board"],
      width: 820,
      height: 330,
      popOut: true,
      minimizable: true,
      resizable: true,
      title: "Mesa del caso"
    });
  }

  getData() {
    const phaseIndex = Number(game.settings.get(TN.SYSTEM_ID, "casePhaseIndex") ?? 0);
    const clueState = getGroupClueState();
    const crimeDie = getCrimeDie();
    return {
      caseName: game.settings.get(TN.SYSTEM_ID, "caseName"),
      day: Number(game.settings.get(TN.SYSTEM_ID, "caseDay") ?? 1),
      timeLimit: Number(game.settings.get(TN.SYSTEM_ID, "timeLimit") ?? 4),
      phase: phaseLabel(phaseIndex),
      crimeDie,
      clueAvailable: clueState.available,
      clueTotal: clueState.total,
      rumorBonusAvailable: Boolean(game.settings.get(TN.SYSTEM_ID, "rumorBonusAvailable")),
      rumorBonusText: game.settings.get(TN.SYSTEM_ID, "rumorBonusText"),
      exploded: crimeDie > 4
    };
  }
}

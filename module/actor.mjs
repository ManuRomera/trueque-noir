import {
  TN,
  getRecognitionAvailable,
  classifyResult,
  clampCrimeDie,
  getCrimeDie,
  getGroupClueState,
  canUseFavorForType,
  refreshCrimeBoard
} from "./config.mjs";

function rollFormula({ helpfulBackground = false, penalty = false } = {}) {
  if (penalty && helpfulBackground) return "1d10";
  if (penalty) return "2d10kl";
  if (helpfulBackground) return "2d10kh";
  return "1d10";
}

function niceScope(scope) {
  return scope || "Libre";
}

function buildChatFlavor({
  type,
  actorName,
  background,
  cigarette,
  recognition,
  nightVisit,
  rumorBonus,
  objectName,
  favorName,
  crimeDie,
  ignoredCrimeDie,
  resultClass,
  autoSuccess = false
}) {
  const typeLabel = type === "risk" ? "Tirada de Riesgo" : "Perseguir el Crimen";

  const verdictText = autoSuccess ? "Exito automatico"
    : resultClass === "clean" ? "Exito limpio"
    : resultClass === "mixed" ? "Trueque"
    : "Resultado duro";

  // Solo mostramos los modificadores que realmente se usaron
  const mods = [];
  if (favorName) mods.push(`<span class="tn-mod tn-mod-favor">Favor: ${favorName}</span>`);
  if (background) mods.push(`<span class="tn-mod">Trasfondo: ${background}</span>`);
  if (nightVisit) mods.push(`<span class="tn-mod tn-mod-neg">Visita nocturna · penalizador</span>`);
  if (cigarette)  mods.push(`<span class="tn-mod">Cigarrillo +2</span>`);
  if (recognition) mods.push(`<span class="tn-mod">Reconocimiento +2</span>`);
  if (rumorBonus) mods.push(`<span class="tn-mod">Rumor consumido +2</span>`);

  let crimeDieLine = "";
  if (type === "pursue" && !autoSuccess) {
    if (ignoredCrimeDie) {
      crimeDieLine = `<div class="tn-chat-mods"><span class="tn-mod tn-mod-favor">Objeto: ${objectName} · dado del crimen ignorado</span></div>`;
    } else if (crimeDie > 0) {
      crimeDieLine = `<div class="tn-chat-mods"><span class="tn-mod tn-mod-neg">Dado del crimen −${crimeDie}</span></div>`;
    }
  }

  const modsHtml = mods.length
    ? `<div class="tn-chat-mods">${mods.join("")}</div>`
    : "";

  const clueNote = type === "pursue"
    ? `<div class="tn-chat-clue-note">+1 pista al grupo</div>`
    : "";

  const outcomeHtml = type === "risk"
    ? riskOutcomeText(resultClass, autoSuccess)
    : pursueOutcomeText(resultClass, autoSuccess);

  return `
  <div class="tn-chat-card tn-result-${resultClass}">
    <div class="tn-chat-header">
      <span class="tn-chat-type-label">${typeLabel}</span>
      <span class="tn-chat-actor-name">${actorName}</span>
    </div>
    <div class="tn-chat-verdict tn-verdict-${resultClass}">${verdictText}</div>
    ${modsHtml}
    ${crimeDieLine}
    ${clueNote}
    ${outcomeHtml}
  </div>`;
}

function riskOutcomeText(resultClass, autoSuccess = false) {
  if (autoSuccess || resultClass === "clean") {
    return `<div class="tn-chat-consequence">El detective narra cómo lo logra. La Ciudad puede conceder un beneficio: reconocimiento, favor o mejora del entorno.</div>`;
  }
  if (resultClass === "mixed") {
    return `<div class="tn-chat-consequence tn-consequence-mixed">La Ciudad propone 2 consecuencias: una de <em>La ciudad se revuelve</em> y una de <em>Pagar el precio</em>. El detective elige cuál sufrir.</div>`;
  }
  return `<div class="tn-chat-consequence tn-consequence-hard">La Ciudad impone 1 consecuencia negativa a su elección.</div>`;
}

function pursueOutcomeText(resultClass, autoSuccess = false) {
  if (autoSuccess || resultClass === "clean") {
    return `<div class="tn-chat-consequence">Pista conseguida sin consecuencias. La Ciudad puede conceder reconocimiento o información adicional.</div>`;
  }
  if (resultClass === "mixed") {
    return `<div class="tn-chat-consequence tn-consequence-mixed">Pista conseguida con trueque. La Ciudad propone 2 consecuencias y el detective elige 1.</div>`;
  }
  return `<div class="tn-chat-consequence tn-consequence-hard">Pista conseguida. El dado del crimen sube 1 y no deberían buscarse más pistas en esa localización.</div>`;
}

async function appendTextField(actor, path, block) {
  const current = String(foundry.utils.getProperty(actor.system, path.replace(/^system\./, "")) ?? "").trim();
  const next = current ? `${current}\n${block}` : block;
  return actor.update({ [path]: next });
}

export class TruequeNoirActor extends Actor {
  get backgroundOptions() {
    return [this.system.background1, this.system.background2, this.system.background3].filter(Boolean);
  }

  async setCigarettes(value) {
    const max = Math.max(0, Number(this.system.cigarettes?.max ?? 0));
    const next = Math.max(0, Math.min(Number(value ?? 0), max));
    await this.update({ "system.cigarettes.value": next });
    return next;
  }

  async setCigaretteMax(maxValue, { fill = true } = {}) {
    const nextMax = Math.max(0, Number(maxValue ?? 0));
    const current = Number(this.system.cigarettes?.value ?? 0);
    const value = fill ? nextMax : Math.min(current, nextMax);
    await this.update({
      "system.cigarettes.max": nextMax,
      "system.cigarettes.value": value
    });
    return nextMax;
  }

  async adjustCigarettes(delta) {
    const current = Number(this.system.cigarettes?.value ?? 0);
    return this.setCigarettes(current + Number(delta || 0));
  }

  async spendCigarette(amount = 1, warningText = "no tiene suficientes cigarrillos") {
    const current = Number(this.system.cigarettes?.value ?? 0);
    const cost = Math.max(0, Number(amount || 0));
    if (current < cost) {
      ui.notifications.warn(`${this.name} ${warningText}.`);
      return false;
    }
    await this.setCigarettes(current - cost);
    return true;
  }

  async spendRecognition(points = 1) {
    const available = getRecognitionAvailable(this);
    if (available < points) {
      ui.notifications.warn(`${this.name} no tiene reconocimiento disponible.`);
      return false;
    }
    const spent = Number(this.system.recognition?.spent ?? 0) + points;
    await this.update({ "system.recognition.spent": spent });
    return true;
  }

  async addRecognition(points = 1) {
    const total = Number(this.system.recognition?.total ?? 0) + points;
    await this.update({ "system.recognition.total": total });
    return total;
  }

  async markRepresentativeObjectUsed(slot, used = true) {
    await this.update({ [`system.representativeObjects.${slot}.used`]: used });
  }

  async setFavorUsed(slot, used = true) {
    await this.update({ [`system.favors.${slot}.used`]: used });
  }

  async increasePillarTension(kind) {
    const current = Number(this.system.stability?.[kind]?.tension ?? 0);
    await this.update({ [`system.stability.${kind}.tension`]: Math.min(current + 1, 3) });
  }

  async lowerPillarTension(kind) {
    const current = Number(this.system.stability?.[kind]?.tension ?? 0);
    await this.update({ [`system.stability.${kind}.tension`]: Math.max(current - 1, 0) });
  }

  async recoverPersonalState(stateId = "") {
    if (!stateId) return false;
    if (stateId === "custom") {
      await this.update({ "system.personalStates.customActive": false });
      return true;
    }
    await this.update({ [`system.personalStates.${stateId}`]: false });
    return true;
  }

  async recoverCityState(stateId = "") {
    if (!stateId) return false;
    if (stateId === "custom") {
      await this.update({ "system.cityStates.customActive": false });
      return true;
    }
    await this.update({ [`system.cityStates.${stateId}`]: false });
    return true;
  }

  async addGroupClue() {
    const ownClues = Number(this.system.clues?.count ?? 0) + 1;
    await this.update({ "system.clues.count": ownClues });

    const state = getGroupClueState();
    await game.settings.set(TN.SYSTEM_ID, "groupCluesTotal", state.total + 1);
    await this.autoSpendCluesAgainstCrimeDie();
    await refreshCrimeBoard();
  }

  async autoSpendCluesAgainstCrimeDie() {
    let { total, spent, available } = getGroupClueState();
    let crimeDie = getCrimeDie();
    let reductions = 0;

    while (available >= 3 && crimeDie > 1) {
      spent += 3;
      available -= 3;
      crimeDie = clampCrimeDie(crimeDie - 1);
      reductions += 1;
    }

    if (reductions > 0) {
      await game.settings.set(TN.SYSTEM_ID, "groupCluesSpent", spent);
      await game.settings.set(TN.SYSTEM_ID, "crimeDie", crimeDie);
      ui.notifications.info(`Las pistas acumuladas reducen el dado del crimen en ${reductions}.`);
    }

    return { total, spent, available, crimeDie };
  }

  async useStoredCluesBand() {
    const { total, spent, available } = getGroupClueState();
    const crimeDie = getCrimeDie();
    if (available < 3) {
      ui.notifications.warn("No hay 3 pistas guardadas disponibles para reducir el dado del crimen.");
      return false;
    }
    if (crimeDie <= 1) {
      ui.notifications.warn("El dado del crimen ya está en 1.");
      return false;
    }

    await game.settings.set(TN.SYSTEM_ID, "groupCluesSpent", spent + 3);
    await game.settings.set(TN.SYSTEM_ID, "crimeDie", clampCrimeDie(crimeDie - 1));
    await refreshCrimeBoard();
    return true;
  }

  async increaseCrimeDie(amount = 1, { checkStoredClues = false } = {}) {
    const current = getCrimeDie();
    const next = clampCrimeDie(current + Number(amount || 0));
    await game.settings.set(TN.SYSTEM_ID, "crimeDie", next);
    if (next > 4) {
      ui.notifications.warn("El dado del crimen ha explotado. El caso debería cerrarse abruptamente.");
    } else if (checkStoredClues) {
      const { available } = getGroupClueState();
      if (available >= 3) {
        ui.notifications.info("Hay pistas guardadas suficientes para volver a bajar el dado del crimen.");
      }
    }
    await refreshCrimeBoard();
    return next;
  }

  async consumeRumorBonus() {
    const available = Boolean(game.settings.get(TN.SYSTEM_ID, "rumorBonusAvailable"));
    if (!available) return false;
    await game.settings.set(TN.SYSTEM_ID, "rumorBonusAvailable", false);
    await game.settings.set(TN.SYSTEM_ID, "rumorBonusText", "");
    await refreshCrimeBoard();
    return true;
  }

  async createContactFromCigarette({ name = "", zone = "", location = "", effect = "pista", notes = "" } = {}) {
    const ok = await this.spendCigarette(1, "no tiene cigarrillos para crear un contacto");
    if (!ok) return false;

    const entry = `• ${name || "Contacto sin nombre"} — ${zone || "Zona sin definir"}${location ? ` / ${location}` : ""}. ${effect === "direcciona" ? "Puede redirigir a localizaciones con pistas." : "Tiene una pista o información valiosa."}${notes ? ` ${notes}` : ""}`;
    await appendTextField(this, "system.contacts.notes", entry);
    return true;
  }

  async createRumorBonus({ location = "", story = "" } = {}) {
    const ok = await this.spendCigarette(1, "no tiene cigarrillos para activar un rumor");
    if (!ok) return false;
    const text = `${this.name}${location ? ` · ${location}` : ""}${story ? ` · ${story}` : ""}`;
    await game.settings.set(TN.SYSTEM_ID, "rumorBonusAvailable", true);
    await game.settings.set(TN.SYSTEM_ID, "rumorBonusText", text);
    await refreshCrimeBoard();
    return true;
  }

  async useFavor(slot, type) {
    const favor = this.system.favors?.[slot];
    if (!favor?.name) {
      ui.notifications.warn("Ese favor no está definido.");
      return null;
    }
    if (favor.used) {
      ui.notifications.warn("Ese favor ya se ha gastado en este caso.");
      return null;
    }
    if (!canUseFavorForType(favor.scope, type)) {
      ui.notifications.warn(`Ese favor está marcado para ${niceScope(favor.scope)} y no encaja con esta acción.`);
      return null;
    }
    await this.setFavorUsed(slot, true);
    return favor;
  }

  async createAutoSuccessMessage({ type, favorName, background = "", nightVisit = false, rumorBonus = false }) {
    const resultClass = "clean";
    const flavor = buildChatFlavor({
      type,
      actorName: this.name,
      background,
      cigarette: false,
      recognition: false,
      nightVisit,
      rumorBonus,
      favorName,
      finalTotal: 9,
      resultClass,
      autoSuccess: true,
      crimeDie: getCrimeDie(),
      ignoredCrimeDie: true
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: flavor
    });
  }

  async takeQuietDrink({ mode = "cigarettes", stateId = "", hypothesisCorrect = true } = {}) {
    const used = Number(this.system.caseStats?.quietDrinksUsed ?? 0);
    if (used >= 2) {
      ui.notifications.warn(`${this.name} ya ha tomado 2 tragos tranquilos en este caso.`);
      return false;
    }

    if (mode === "cigarettes") {
      await this.adjustCigarettes(2);
    }
    if (mode === "state" && stateId) {
      await this.recoverPersonalState(stateId);
    }

    await this.update({ "system.caseStats.quietDrinksUsed": used + 1 });

    if (hypothesisCorrect === false) {
      await this.increaseCrimeDie(1, { checkStoredClues: true });
    }

    return true;
  }

  async takeNightRest() {
    await this.adjustCigarettes(1);
    return true;
  }

  async overexposeLastRoll(pillar = "person") {
    const last = foundry.utils.deepClone(this.getFlag(TN.SYSTEM_ID, "lastRoll") ?? {});
    if (!last.formula) return ui.notifications.warn("No hay una tirada reciente que repetir.");
    if (last.used) return ui.notifications.warn("Solo puedes sobreexponerte una vez por tirada.");
    if (!this.system.stability?.[pillar]?.name) return ui.notifications.warn("Define ese pilar de estabilidad antes de sobreexponerte.");
    if (Number(this.system.stability?.[pillar]?.tension ?? 0) >= 3) return ui.notifications.warn("Ese pilar ya ha alcanzado su tensión máxima.");

    await this.increasePillarTension(pillar);
    if (last.type === "pursue" && last.crimeRaised) {
      await game.settings.set(TN.SYSTEM_ID, "crimeDie", clampCrimeDie(getCrimeDie() - 1));
    }

    const roll = await (new Roll(last.formula)).evaluate();
    const resultClass = classifyResult(roll.total);
    const crimeRaised = last.type === "pursue" && resultClass === "hard";
    if (crimeRaised) await this.increaseCrimeDie(1, { checkStoredClues: true });

    await this.setFlag(TN.SYSTEM_ID, "lastRoll", { ...last, used: true, resultClass, crimeRaised });
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `<div class="tn-chat-card tn-result-${resultClass}"><div class="tn-chat-header"><span class="tn-chat-type-label">Sobreexposición</span><span class="tn-chat-actor-name">${this.name}</span></div><div class="tn-chat-verdict tn-verdict-${resultClass}">${resultClass === "clean" ? "Éxito limpio" : resultClass === "mixed" ? "Trueque" : "Resultado duro"}</div><div class="tn-chat-consequence">Aumenta en 1 la tensión de ${pillar === "person" ? "su persona" : "su lugar"}. Este resultado sustituye al anterior.</div></div>`
    });
    await refreshCrimeBoard();
    return { roll, total: roll.total, resultClass };
  }

  async applyInterludeBenefit(benefit, detail = "") {
    const costs = { cigarettes2: 1, personal: 1, city: 1, personTension: 1, placeTension: 1, fullPack: 2, favor: 2, background: 3 };
    const cost = costs[benefit];
    if (!cost) return false;

    const personal = TN.PERSONAL_STATES.find(state => state.label.toLowerCase() === detail.trim().toLowerCase())?.id
      ?? TN.PERSONAL_STATES.find(state => this.system.personalStates?.[state.id])?.id;
    const city = TN.CITY_STATES.find(state => state.label.toLowerCase() === detail.trim().toLowerCase())?.id
      ?? TN.CITY_STATES.find(state => this.system.cityStates?.[state.id])?.id;
    const freeFavor = ["slot1", "slot2"].find(slot => !this.system.favors?.[slot]?.name);

    if (benefit === "personal" && !personal && !this.system.personalStates?.customActive) return ui.notifications.warn("No hay un estado personal activo que eliminar.");
    if (benefit === "city" && !city && !this.system.cityStates?.customActive) return ui.notifications.warn("No hay un estado de la ciudad activo que eliminar.");
    if (benefit === "favor" && (!detail.trim() || !freeFavor)) return ui.notifications.warn("Escribe el favor y deja un hueco libre.");
    if (benefit === "background" && (!detail.trim() || this.system.background3)) return ui.notifications.warn("Escribe el trasfondo y deja libre el hueco Extra.");
    if (!await this.spendRecognition(cost)) return false;

    if (benefit === "cigarettes2") await this.adjustCigarettes(2);
    if (benefit === "fullPack") await this.setCigarettes(this.system.cigarettes?.max);
    if (benefit === "personTension") await this.lowerPillarTension("person");
    if (benefit === "placeTension") await this.lowerPillarTension("place");
    if (benefit === "personal") await this.recoverPersonalState(personal || "custom");
    if (benefit === "city") await this.recoverCityState(city || "custom");
    if (benefit === "favor") await this.update({ [`system.favors.${freeFavor}.name`]: detail.trim(), [`system.favors.${freeFavor}.scope`]: "Libre", [`system.favors.${freeFavor}.used`]: false });
    if (benefit === "background") await this.update({ "system.background3": detail.trim() });

    await ChatMessage.create({ speaker: { alias: "La Ciudad" }, content: `<div class="tn-chat-card"><h3>Interludio</h3><p><strong>${this.name}</strong> gasta ${cost} punto${cost === 1 ? "" : "s"} de reconocimiento.</p></div>` });
    return true;
  }

  async resetCaseState() {
    await this.update({
      "system.representativeObjects.slot1.used": false,
      "system.representativeObjects.slot2.used": false,
      "system.favors.slot1.used": false,
      "system.favors.slot2.used": false,
      "system.caseStats.quietDrinksUsed": 0,
      "system.clues.count": 0
    });
  }

  async rollRisk({
    background = "",
    useCigarette = false,
    useRecognition = false,
    penalty = false,
    nightVisit = false,
    applyRumorBonus = false,
    favorSlot = ""
  } = {}) {
    const helpfulBackground = Boolean(background);
    const effectivePenalty = Boolean(penalty || nightVisit);

    if (useCigarette && useRecognition) {
      ui.notifications.warn("Debes elegir entre cigarrillo o reconocimiento.");
      return null;
    }

    let rumorBonus = false;
    if (applyRumorBonus) {
      rumorBonus = await this.consumeRumorBonus();
      if (!rumorBonus) ui.notifications.warn("No hay ningún rumor pendiente para consumir.");
    }

    if (nightVisit) {
      const okNight = await this.spendCigarette(1, "no tiene cigarrillos para una visita nocturna");
      if (!okNight) return null;
    }

    if (favorSlot) {
      const favor = await this.useFavor(favorSlot, "risk");
      if (!favor) return null;
      await this.createAutoSuccessMessage({
        type: "risk",
        favorName: favor.name,
        background,
        nightVisit,
        rumorBonus
      });
      return { total: 9, resultClass: "clean", autoSuccess: true };
    }

    if (useCigarette) {
      const okCig = await this.spendCigarette(1, "no tiene suficientes cigarrillos para obtener sangre fría");
      if (!okCig) return null;
    }
    if (useRecognition) {
      const okRec = await this.spendRecognition(1);
      if (!okRec) return null;
    }

    const formula = rollFormula({ helpfulBackground, penalty: effectivePenalty });
    const modifier = (useCigarette || useRecognition ? 2 : 0) + (rumorBonus ? 2 : 0);
    const roll = await (new Roll(`${formula}${modifier ? ` + ${modifier}` : ""}`)).evaluate();
    const total = roll.total;
    const resultClass = classifyResult(total);

    await this.setFlag(TN.SYSTEM_ID, "lastRoll", {
      type: "risk",
      formula: roll.formula,
      used: false,
      resultClass,
      crimeRaised: false
    });

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: buildChatFlavor({
        type: "risk",
        actorName: this.name,
        background,
        cigarette: useCigarette,
        recognition: useRecognition,
        nightVisit,
        rumorBonus,
        favorName: "",
        finalTotal: total,
        resultClass
      })
    });

    await refreshCrimeBoard();
    return { roll, total, resultClass };
  }

  async rollPursueCrime({
    background = "",
    useCigarette = false,
    useRecognition = false,
    penalty = false,
    nightVisit = false,
    applyRumorBonus = false,
    objectSlot = "",
    favorSlot = ""
  } = {}) {
    const helpfulBackground = Boolean(background);
    const effectivePenalty = Boolean(penalty || nightVisit);
    const objectName = objectSlot ? this.system.representativeObjects?.[objectSlot]?.name : "";
    const ignoredCrimeDie = Boolean(objectSlot && objectName);

    if (useCigarette && useRecognition) {
      ui.notifications.warn("Debes elegir entre cigarrillo o reconocimiento.");
      return null;
    }

    let rumorBonus = false;
    if (applyRumorBonus) {
      rumorBonus = await this.consumeRumorBonus();
      if (!rumorBonus) ui.notifications.warn("No hay ningún rumor pendiente para consumir.");
    }

    if (nightVisit) {
      const okNight = await this.spendCigarette(1, "no tiene cigarrillos para una visita nocturna");
      if (!okNight) return null;
    }

    if (favorSlot) {
      const favor = await this.useFavor(favorSlot, "pursue");
      if (!favor) return null;
      await this.addGroupClue();
      await this.createAutoSuccessMessage({
        type: "pursue",
        favorName: favor.name,
        background,
        nightVisit,
        rumorBonus
      });
      return { total: 9, resultClass: "clean", autoSuccess: true };
    }

    if (useCigarette) {
      const okCig = await this.spendCigarette(1, "no tiene suficientes cigarrillos para obtener sangre fría");
      if (!okCig) return null;
    }
    if (useRecognition) {
      const okRec = await this.spendRecognition(1);
      if (!okRec) return null;
    }
    if (ignoredCrimeDie) {
      const alreadyUsed = Boolean(this.system.representativeObjects?.[objectSlot]?.used);
      if (alreadyUsed) {
        ui.notifications.warn("Ese objeto representativo ya se ha usado en este caso.");
        return null;
      }
      await this.markRepresentativeObjectUsed(objectSlot, true);
    }

    const formula = rollFormula({ helpfulBackground, penalty: effectivePenalty });
    const modifier = (useCigarette || useRecognition ? 2 : 0) + (rumorBonus ? 2 : 0);
    const crimeDie = getCrimeDie();
    const subtraction = ignoredCrimeDie ? 0 : crimeDie;
    const roll = await (new Roll(`${formula}${modifier ? ` + ${modifier}` : ""}${subtraction ? ` - ${subtraction}` : ""}`)).evaluate();
    const total = roll.total;
    const resultClass = classifyResult(total);

    await this.addGroupClue();

    if (resultClass === "hard") {
      await this.increaseCrimeDie(1, { checkStoredClues: true });
    }

    await this.setFlag(TN.SYSTEM_ID, "lastRoll", {
      type: "pursue",
      formula: roll.formula,
      used: false,
      resultClass,
      crimeRaised: resultClass === "hard"
    });

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: buildChatFlavor({
        type: "pursue",
        actorName: this.name,
        background,
        cigarette: useCigarette,
        recognition: useRecognition,
        nightVisit,
        rumorBonus,
        objectName,
        favorName: "",
        crimeDie,
        ignoredCrimeDie,
        finalTotal: total,
        resultClass
      })
    });

    await refreshCrimeBoard();
    return { roll, total, resultClass };
  }
}

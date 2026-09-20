import {
  TN,
  getRecognitionAvailable,
  classifyResult,
  getCrimeDie,
  canUseFavorForType,
  refreshCrimeBoard
} from "./config.mjs";
import { buildRollCard, postCityNote, refreshChatMessage } from "./chat.mjs";
import { requestCaseOp } from "./case-state.mjs";

/**
 * Fórmula del manual: 1d10 base, 2d10 conservando el mejor con un trasfondo que ayude
 * y 2d10 conservando el peor con penalizador. Si coinciden, se anulan y queda 1d10.
 */
export function rollFormula({ helpfulBackground = false, penalty = false } = {}) {
  if (penalty && helpfulBackground) return "1d10";
  if (penalty) return "2d10kl";
  if (helpfulBackground) return "2d10kh";
  return "1d10";
}

function niceScope(scope) {
  return scope || "Libre";
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

  get cigarettes() {
    return Number(this.system.cigarettes?.value ?? 0);
  }

  /** Favores todavía utilizables en una tirada de este tipo. */
  availableFavors(type) {
    return ["slot1", "slot2"]
      .map(slot => ({ slot, ...(this.system.favors?.[slot] ?? {}) }))
      .filter(favor => favor.name && !favor.used && canUseFavorForType(favor.scope, type));
  }

  /** Objetos representativos sin gastar en este caso. */
  availableObjects() {
    return ["slot1", "slot2"]
      .map(slot => ({ slot, ...(this.system.representativeObjects?.[slot] ?? {}) }))
      .filter(object => object.name && !object.used);
  }

  async setCigarettes(value) {
    const max = Math.max(0, Number(this.system.cigarettes?.max ?? 0));
    const next = Math.max(0, Math.min(Number(value ?? 0), max));
    await this.update({ "system.cigarettes.value": next });
    return next;
  }

  async setCigaretteMax(maxValue, { fill = true } = {}) {
    const nextMax = Math.max(0, Number(maxValue ?? 0));
    const current = this.cigarettes;
    await this.update({
      "system.cigarettes.max": nextMax,
      "system.cigarettes.value": fill ? nextMax : Math.min(current, nextMax)
    });
    return nextMax;
  }

  async adjustCigarettes(delta) {
    return this.setCigarettes(this.cigarettes + Number(delta || 0));
  }

  async spendCigarette(amount = 1, purpose = "esta acción") {
    const cost = Math.max(0, Number(amount || 0));
    if (this.cigarettes < cost) {
      ui.notifications.warn(`${this.name} necesita ${cost} cigarrillo${cost === 1 ? "" : "s"} para ${purpose} y solo tiene ${this.cigarettes}. Recupéralos con un trago tranquilo o un descanso.`);
      return false;
    }
    await this.setCigarettes(this.cigarettes - cost);
    return true;
  }

  async spendRecognition(points = 1) {
    const available = getRecognitionAvailable(this);
    if (available < points) {
      ui.notifications.warn(`${this.name} necesita ${points} punto${points === 1 ? "" : "s"} de reconocimiento disponible${points === 1 ? "" : "s"} y tiene ${available}. La Ciudad concede reconocimiento en los éxitos limpios.`);
      return false;
    }
    await this.update({ "system.recognition.spent": Number(this.system.recognition?.spent ?? 0) + points });
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
    if (stateId === "custom") return !!(await this.update({ "system.personalStates.customActive": false }));
    await this.update({ [`system.personalStates.${stateId}`]: false });
    return true;
  }

  async recoverCityState(stateId = "") {
    if (!stateId) return false;
    if (stateId === "custom") return !!(await this.update({ "system.cityStates.customActive": false }));
    await this.update({ [`system.cityStates.${stateId}`]: false });
    return true;
  }

  /** La pista propia la escribe el detective; la del grupo la aplica La Ciudad. */
  async addGroupClue() {
    await this.update({ "system.clues.count": Number(this.system.clues?.count ?? 0) + 1 });
    await requestCaseOp("gainClue");
  }

  async increaseCrimeDie(amount = 1) {
    return requestCaseOp("changeCrimeDie", { amount });
  }

  async consumeRumorBonus() {
    if (!game.settings.get(TN.SYSTEM_ID, "rumorBonusAvailable")) return false;
    await requestCaseOp("setRumor", { text: "" });
    return true;
  }

  async createContactFromCigarette({ name = "", zone = "", location = "", effect = "pista", notes = "" } = {}) {
    if (!await this.spendCigarette(1, "conocer a un tipo")) return false;
    const entry = `• ${name || "Contacto sin nombre"} — ${zone || "Zona sin definir"}${location ? ` / ${location}` : ""}. ${effect === "direcciona" ? "Puede redirigir a localizaciones con pistas." : "Tiene una pista o información valiosa."}${notes ? ` ${notes}` : ""}`;
    await appendTextField(this, "system.contacts.notes", entry);
    return true;
  }

  async createRumorBonus({ location = "", story = "" } = {}) {
    if (!await this.spendCigarette(1, "sembrar un rumor")) return false;
    const text = `${this.name}${location ? ` · ${location}` : ""}${story ? ` · ${story}` : ""}`;
    await requestCaseOp("setRumor", { text });
    return true;
  }

  async useFavor(slot, type) {
    const favor = this.system.favors?.[slot];
    if (!favor?.name) {
      ui.notifications.warn("Ese hueco de favor está vacío. Escribe el favor en la ficha antes de usarlo.");
      return null;
    }
    if (favor.used) {
      ui.notifications.warn(`«${favor.name}» ya se gastó en este caso. Se recupera al reiniciar el caso.`);
      return null;
    }
    if (!canUseFavorForType(favor.scope, type)) {
      ui.notifications.warn(`«${favor.name}» está reservado para ${niceScope(favor.scope)} y esta acción no encaja.`);
      return null;
    }
    await this.setFavorUsed(slot, true);
    return favor;
  }

  async takeQuietDrink({ mode = "cigarettes", stateId = "", hypothesisCorrect = true } = {}) {
    const used = Number(this.system.caseStats?.quietDrinksUsed ?? 0);
    if (used >= 2) {
      ui.notifications.warn(`${this.name} ya ha tomado los 2 tragos tranquilos que permite el caso.`);
      return false;
    }
    if (mode === "cigarettes") await this.adjustCigarettes(2);
    if (mode === "state" && stateId) await this.recoverPersonalState(stateId);
    await this.update({ "system.caseStats.quietDrinksUsed": used + 1 });
    if (hypothesisCorrect === false) await this.increaseCrimeDie(1);
    return true;
  }

  async takeNightRest() {
    await this.adjustCigarettes(1);
    return true;
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

    if (benefit === "personal" && !personal && !this.system.personalStates?.customActive) return ui.notifications.warn(`${this.name} no tiene ningún estado personal activo que eliminar.`);
    if (benefit === "city" && !city && !this.system.cityStates?.customActive) return ui.notifications.warn(`${this.name} no tiene ningún estado con la ciudad que eliminar.`);
    if (benefit === "favor" && (!detail.trim() || !freeFavor)) return ui.notifications.warn("Escribe el nombre del favor y deja libre uno de los dos huecos de la ficha.");
    if (benefit === "background" && (!detail.trim() || this.system.background3)) return ui.notifications.warn("Escribe el trasfondo nuevo; el hueco «Extra» de la ficha debe estar libre.");
    if (!await this.spendRecognition(cost)) return false;

    if (benefit === "cigarettes2") await this.adjustCigarettes(2);
    if (benefit === "fullPack") await this.setCigarettes(this.system.cigarettes?.max);
    if (benefit === "personTension") await this.lowerPillarTension("person");
    if (benefit === "placeTension") await this.lowerPillarTension("place");
    if (benefit === "personal") await this.recoverPersonalState(personal || "custom");
    if (benefit === "city") await this.recoverCityState(city || "custom");
    if (benefit === "favor") await this.update({ [`system.favors.${freeFavor}.name`]: detail.trim(), [`system.favors.${freeFavor}.scope`]: "Libre", [`system.favors.${freeFavor}.used`]: false });
    if (benefit === "background") await this.update({ "system.background3": detail.trim() });

    await postCityNote({
      title: "Interludio",
      body: `<p><strong>${this.name}</strong> gasta ${cost} punto${cost === 1 ? "" : "s"} de reconocimiento.</p>`
    });
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
    await this.unsetFlag(TN.SYSTEM_ID, "lastRoll").catch(() => {});
  }

  /** Guarda la última tirada y engancha la sobreexposición a su mensaje de chat. */
  async _registerLastRoll(message, data) {
    const previous = this.getFlag(TN.SYSTEM_ID, "lastRoll");
    await this.setFlag(TN.SYSTEM_ID, "lastRoll", { ...data, messageId: message?.id ?? null, used: false });
    if (previous?.messageId && previous.messageId !== message?.id) refreshChatMessage(previous.messageId);
  }

  async _postRollCard(roll, cardData, flagData) {
    const message = await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: buildRollCard(cardData),
      flags: { [TN.SYSTEM_ID]: { overexpose: { actorId: this.id } } }
    });
    await this._registerLastRoll(message, flagData);
    return message;
  }

  /**
   * Resuelve los costes comunes a Riesgo y Perseguir el Crimen.
   * Devuelve null si algo impide tirar, para abortar antes de gastar nada más.
   */
  async _payRollCosts({ useCigarette, useRecognition, nightVisit, applyRumorBonus }) {
    if (useCigarette && useRecognition) {
      ui.notifications.warn("Cigarrillo y reconocimiento no se acumulan: elige solo una de las dos ayudas.");
      return null;
    }
    const cigaretteCost = (nightVisit ? 1 : 0) + (useCigarette ? 1 : 0);
    if (cigaretteCost > this.cigarettes) {
      ui.notifications.warn(`Esta tirada cuesta ${cigaretteCost} cigarrillos y ${this.name} tiene ${this.cigarettes}.`);
      return null;
    }

    let rumorBonus = false;
    if (applyRumorBonus) {
      rumorBonus = await this.consumeRumorBonus();
      if (!rumorBonus) ui.notifications.warn("Ya no queda ningún rumor pendiente que consumir.");
    }
    if (nightVisit && !await this.spendCigarette(1, "una visita nocturna")) return null;
    if (useCigarette && !await this.spendCigarette(1, "una calada de sangre fría")) return null;
    if (useRecognition && !await this.spendRecognition(1)) return null;
    return { rumorBonus };
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
    const paid = await this._payRollCosts({ useCigarette, useRecognition, nightVisit, applyRumorBonus });
    if (!paid) return null;
    const { rumorBonus } = paid;

    if (favorSlot) {
      const favor = await this.useFavor(favorSlot, "risk");
      if (!favor) return null;
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: buildRollCard({ type: "risk", actorName: this.name, resultClass: "clean", autoSuccess: true, favorName: favor.name, background, nightVisit, rumorBonus })
      });
      await this.setFlag(TN.SYSTEM_ID, "lastRoll", { type: "risk", used: true, messageId: null });
      return { total: 9, resultClass: "clean", autoSuccess: true };
    }

    const formula = rollFormula({ helpfulBackground: Boolean(background), penalty: Boolean(penalty || nightVisit) });
    const modifier = (useCigarette || useRecognition ? 2 : 0) + (rumorBonus ? 2 : 0);
    const roll = await (new Roll(`${formula}${modifier ? ` + ${modifier}` : ""}`)).evaluate();
    const resultClass = classifyResult(roll.total);

    await this._postRollCard(
      roll,
      { type: "risk", actorName: this.name, total: roll.total, resultClass, background, cigarette: useCigarette, recognition: useRecognition, rumorBonus, nightVisit, penalty },
      { type: "risk", formula: roll.formula, resultClass, crimeRaised: false }
    );
    await refreshCrimeBoard();
    return { roll, total: roll.total, resultClass };
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
    const objectName = objectSlot ? this.system.representativeObjects?.[objectSlot]?.name : "";
    const ignoredCrimeDie = Boolean(objectSlot && objectName);
    if (ignoredCrimeDie && this.system.representativeObjects?.[objectSlot]?.used) {
      ui.notifications.warn(`«${objectName}» ya se usó en este caso. Cada objeto representativo sirve una sola vez.`);
      return null;
    }

    const paid = await this._payRollCosts({ useCigarette, useRecognition, nightVisit, applyRumorBonus });
    if (!paid) return null;
    const { rumorBonus } = paid;

    if (favorSlot) {
      const favor = await this.useFavor(favorSlot, "pursue");
      if (!favor) return null;
      await this.addGroupClue();
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: buildRollCard({ type: "pursue", actorName: this.name, resultClass: "clean", autoSuccess: true, favorName: favor.name, background, nightVisit, rumorBonus })
      });
      await this.setFlag(TN.SYSTEM_ID, "lastRoll", { type: "pursue", used: true, messageId: null });
      return { total: 9, resultClass: "clean", autoSuccess: true };
    }

    if (ignoredCrimeDie) await this.markRepresentativeObjectUsed(objectSlot, true);

    const formula = rollFormula({ helpfulBackground: Boolean(background), penalty: Boolean(penalty || nightVisit) });
    const modifier = (useCigarette || useRecognition ? 2 : 0) + (rumorBonus ? 2 : 0);
    const crimeDie = getCrimeDie();
    const subtraction = ignoredCrimeDie ? 0 : crimeDie;
    const roll = await (new Roll(`${formula}${modifier ? ` + ${modifier}` : ""}${subtraction ? ` - ${subtraction}` : ""}`)).evaluate();
    const resultClass = classifyResult(roll.total);

    await this.addGroupClue();
    if (resultClass === "hard") await this.increaseCrimeDie(1);

    await this._postRollCard(
      roll,
      { type: "pursue", actorName: this.name, total: roll.total, resultClass, background, cigarette: useCigarette, recognition: useRecognition, rumorBonus, nightVisit, penalty, objectName, ignoredCrimeDie, crimeDie },
      { type: "pursue", formula: roll.formula, resultClass, crimeRaised: resultClass === "hard" }
    );
    await refreshCrimeBoard();
    return { roll, total: roll.total, resultClass };
  }

  /** Repite la última tirada a cambio de tensar un pilar. Solo una vez por tirada. */
  async overexposeLastRoll(pillar = "person") {
    const last = foundry.utils.deepClone(this.getFlag(TN.SYSTEM_ID, "lastRoll") ?? {});
    const pillarName = this.system.stability?.[pillar]?.name;
    const pillarLabel = pillar === "person" ? "persona" : "lugar";
    if (!last.formula) return ui.notifications.warn("No hay ninguna tirada reciente que repetir.");
    if (last.used) return ui.notifications.warn("Esa tirada ya se sobreexpuso: solo se permite una vez por tirada.");
    if (!pillarName) return ui.notifications.warn(`Escribe en la ficha qué ${pillarLabel} sostiene a ${this.name} antes de sobreexponerte.`);
    if (Number(this.system.stability?.[pillar]?.tension ?? 0) >= 3) return ui.notifications.warn(`${pillarName} ya está en tensión 3, el máximo: no puede sostener otra sobreexposición.`);

    await this.increasePillarTension(pillar);
    // La tirada anterior se sustituye: si había subido el dado del crimen, se deshace antes de repetir.
    if (last.type === "pursue" && last.crimeRaised) await this.increaseCrimeDie(-1);

    const roll = await (new Roll(last.formula)).evaluate();
    const resultClass = classifyResult(roll.total);
    const crimeRaised = last.type === "pursue" && resultClass === "hard";
    if (crimeRaised) await this.increaseCrimeDie(1);

    const message = await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: buildRollCard({
        type: last.type,
        label: "Sobreexposición",
        actorName: this.name,
        total: roll.total,
        resultClass,
        showGain: false,
        extra: `<p class="tn-card__overexposed"><i class="fa-solid fa-fire"></i> ${pillarName} sube a tensión ${Number(this.system.stability?.[pillar]?.tension ?? 0)}. Este resultado sustituye al anterior.</p>`
      })
    });
    await this.setFlag(TN.SYSTEM_ID, "lastRoll", { ...last, used: true, resultClass, crimeRaised, messageId: message?.id ?? last.messageId });
    if (last.messageId) refreshChatMessage(last.messageId);
    await refreshCrimeBoard();
    return { roll, total: roll.total, resultClass };
  }
}

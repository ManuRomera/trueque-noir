import { ID, TN, getRecognitionAvailable, estadoCaso } from "./config.mjs";
import * as R from "./reglas.mjs";
import { buildRollCard, dadosDe, postCityNote } from "./chat.mjs";
import { requestCaseOp } from "./case-state.mjs";

const HUECOS = ["slot1", "slot2"];
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export class TruequeNoirActor extends Actor {
  get cigarettes() {
    return Number(this.system.cigarettes?.value ?? 0);
  }

  get backgroundOptions() {
    return [this.system.background1, this.system.background2, this.system.background3].filter(Boolean);
  }

  /** Favores todavía utilizables en una tirada de este tipo. */
  availableFavors(type) {
    return HUECOS
      .map(slot => ({ slot, ...(this.system.favors?.[slot] ?? {}) }))
      .filter(favor => favor.name && !favor.used && R.favorValido(favor.scope, type));
  }

  /** Objetos representativos sin gastar en este caso. */
  availableObjects() {
    return HUECOS
      .map(slot => ({ slot, ...(this.system.representativeObjects?.[slot] ?? {}) }))
      .filter(object => object.name && !object.used);
  }

  /** Un hueco de favor vale si está vacío o su favor ya se cobró: gastar un favor lo consume (p. 56). */
  freeFavorSlot() {
    return HUECOS.find(slot => !this.system.favors?.[slot]?.name || this.system.favors[slot].used);
  }

  // ---------------------------------------------------------------- Recursos

  async setCigarettes(value) {
    const max = Math.max(0, Number(this.system.cigarettes?.max ?? 0));
    const next = Math.max(0, Math.min(Number(value ?? 0), max));
    await this.update({ "system.cigarettes.value": next });
    return next;
  }

  async setCigaretteMax(maxValue, { fill = true } = {}) {
    const nextMax = Math.max(0, Number(maxValue ?? 0));
    await this.update({
      "system.cigarettes.max": nextMax,
      "system.cigarettes.value": fill ? nextMax : Math.min(this.cigarettes, nextMax)
    });
    return nextMax;
  }

  adjustCigarettes(delta) {
    return this.setCigarettes(this.cigarettes + Number(delta || 0));
  }

  async spendCigarette(amount = 1, purpose = "esta acción") {
    const cost = Math.max(0, Number(amount || 0));
    if (this.cigarettes < cost) {
      ui.notifications.warn(`${this.name} necesita ${plural(cost, "cigarrillo", "cigarrillos")} para ${purpose} y solo tiene ${this.cigarettes}. Recupéralos con un trago tranquilo o un descanso.`);
      return false;
    }
    await this.setCigarettes(this.cigarettes - cost);
    return true;
  }

  async spendRecognition(points = 1) {
    const available = getRecognitionAvailable(this);
    if (available < points) {
      ui.notifications.warn(`${this.name} necesita ${plural(points, "punto", "puntos")} de reconocimiento disponible y tiene ${available}. La Ciudad concede reconocimiento en los éxitos limpios.`);
      return false;
    }
    await this.update({ "system.recognition.spent": Number(this.system.recognition?.spent ?? 0) + points });
    return true;
  }

  /** Puede ser negativo: perder un punto sin tenerlo deja el reconocimiento en -1 (p. 46). */
  async addRecognition(points = 1) {
    const total = Number(this.system.recognition?.total ?? 0) + points;
    await this.update({ "system.recognition.total": total });
    return total;
  }

  async markRepresentativeObjectUsed(slot, used = true) {
    await this.update({ [`system.representativeObjects.${slot}.used`]: used });
  }

  // ---------------------------------------------------------------- Pilares

  /** Sube la tensión de un pilar y anota la escena flotante de esta noche (p. 27-28). */
  async increasePillarTension(kind) {
    const pilar = this.system.stability?.[kind];
    const actual = Number(pilar?.tension ?? 0);
    if (actual >= R.TENSION_MAXIMA) return actual;
    const tension = actual + 1;
    await this.update({ [`system.stability.${kind}.tension`]: tension });
    await requestCaseOp("addFloating", { actorId: this.id, actorName: this.name, pillar: kind, pillarName: pilar?.name ?? "", tension });
    return tension;
  }

  async lowerPillarTension(kind) {
    const actual = Number(this.system.stability?.[kind]?.tension ?? 0);
    await this.update({ [`system.stability.${kind}.tension`]: Math.max(actual - 1, 0) });
  }

  // ----------------------------------------------------------------- Estados

  async setState(kind, stateId, active = true) {
    if (!stateId) return false;
    const grupo = kind === "city" ? "cityStates" : "personalStates";
    await this.update({ [`system.${grupo}.${stateId === "custom" ? "customActive" : stateId}`]: active });
    return true;
  }

  recoverPersonalState(stateId) { return this.setState("personal", stateId, false); }
  recoverCityState(stateId) { return this.setState("city", stateId, false); }

  // ------------------------------------------------------------ Pistas y rumor

  /** La pista propia la escribe el detective; la del grupo la aplica La Ciudad. */
  async addGroupClue() {
    await this.update({ "system.clues.count": Number(this.system.clues?.count ?? 0) + 1 });
    await requestCaseOp("gainClue");
  }

  increaseCrimeDie(amount = 1) {
    return requestCaseOp("changeCrimeDie", { amount });
  }

  /** El rumor es un +2 para el grupo, pero nunca para quien lo cuenta (p. 50). */
  canUseRumor() {
    const { rumor } = estadoCaso();
    return rumor.activo && rumor.por !== this.id;
  }

  async consumeRumorBonus() {
    if (!this.canUseRumor()) return false;
    await requestCaseOp("setRumor", { text: "" });
    return true;
  }

  /** «Conozco a un tipo que…»: 1 cigarrillo y un contacto en la agenda (p. 49). */
  async createContactFromCigarette({ name = "", zone = "", place = "", offer = "pista", notes = "" } = {}) {
    if (!await this.spendCigarette(1, "conocer a un tipo")) return false;
    const lista = foundry.utils.deepClone(this.system.contacts?.list ?? []).map(c => ({ ...c }));
    lista.push({ name: name || "Contacto sin nombre", zone, place, offer: offer === "ruta" ? "ruta" : "pista", done: false });
    const update = { "system.contacts.list": lista };
    if (notes) update["system.contacts.notes"] = [this.system.contacts?.notes, `${name || "Contacto"}: ${notes}`].filter(Boolean).join("\n");
    await this.update(update);
    return true;
  }

  /** «Aquí han pasado cosas turbias»: 1 cigarrillo y un +2 pendiente para el grupo, no para quien lo cuenta. */
  async createRumorBonus({ location = "", story = "" } = {}) {
    if (!await this.spendCigarette(1, "sembrar un rumor")) return false;
    const text = `${this.name}${location ? ` · ${location}` : ""}${story ? ` · ${story}` : ""}`;
    await requestCaseOp("setRumor", { text, by: this.id });
    return true;
  }

  /** Cede cigarrillos a otro detective: solo en momentos de sosiego (p. 31). */
  async giveCigarette(targetId, amount = 1) {
    if (this.cigarettes < amount) return ui.notifications.warn(`${this.name} no tiene cigarrillos que ceder.`);
    const destino = game.actors.get(targetId);
    if (!destino || destino.type !== "detective") return false;
    if (!destino.isOwner && !game.user.isGM) return requestCaseOp("giveCigarette", { fromId: this.id, toId: targetId, amount });
    return TruequeNoirActor.transferCigarettes(this, destino, amount);
  }

  static async transferCigarettes(origen, destino, amount = 1) {
    const sitio = Number(destino.system.cigarettes.max) - destino.cigarettes;
    const cantidad = Math.min(amount, origen.cigarettes, sitio);
    if (cantidad < 1) {
      ui.notifications.warn(`${destino.name} ya lleva la cajetilla llena: nunca se puede pasar del máximo.`);
      return false;
    }
    await origen.setCigarettes(origen.cigarettes - cantidad);
    await destino.setCigarettes(destino.cigarettes + cantidad);
    const esc = foundry.utils.escapeHTML;
    await postCityNote({ title: "Cigarrillos", body: `<p><strong>${esc(origen.name)}</strong> le pasa ${plural(cantidad, "cigarrillo", "cigarrillos")} a <strong>${esc(destino.name)}</strong>.</p>` });
    return true;
  }

  // ------------------------------------------------------------------ Favores

  async useFavor(slot, type) {
    const favor = this.system.favors?.[slot];
    if (!favor?.name) {
      ui.notifications.warn("Ese hueco de favor está vacío. Escribe el favor en la ficha antes de usarlo.");
      return null;
    }
    if (favor.used) {
      ui.notifications.warn(`«${favor.name}» ya se cobró. Un favor se gasta una sola vez.`);
      return null;
    }
    if (!R.favorValido(favor.scope, type)) {
      ui.notifications.warn(`«${favor.name}» solo sirve para ${favor.scope === "riesgo" ? "tiradas de riesgo" : "perseguir el crimen"}.`);
      return null;
    }
    await this.update({ [`system.favors.${slot}.used`]: true });
    return favor;
  }

  /** Un favor nuevo ocupa un hueco libre (máximo 2, p. 31). */
  async addFavor({ name, scope = "libre", zone = "" }) {
    const slot = this.freeFavorSlot();
    if (!slot) {
      ui.notifications.warn(`${this.name} ya guarda ${R.FAVORES_MAXIMOS} favores: cobra uno antes de aceptar otro.`);
      return false;
    }
    await this.update({ [`system.favors.${slot}`]: { name, scope: R.normalizarAlcance(scope), zone, used: false } });
    return true;
  }

  // ------------------------------------------------------ Trago, descanso, entre casos

  async takeQuietDrink({ mode = "cigarettes", stateId = "", hypothesisCorrect = true } = {}) {
    const usados = Number(this.system.caseStats?.quietDrinksUsed ?? 0);
    if (usados >= R.TRAGOS_POR_CASO) {
      ui.notifications.warn(`${this.name} ya ha tomado los ${R.TRAGOS_POR_CASO} tragos tranquilos que permite el caso.`);
      return false;
    }
    if (mode === "state" && !stateId) return false;
    if (mode === "cigarettes") await this.adjustCigarettes(2);
    else await this.recoverPersonalState(stateId);
    await this.update({ "system.caseStats.quietDrinksUsed": usados + 1 });
    if (hypothesisCorrect === false) await this.increaseCrimeDie(1);
    return true;
  }

  async takeNightRest() {
    await this.adjustCigarettes(1);
    return true;
  }

  /**
   * Ventajas entre casos a cambio de reconocimiento (p. 54-55).
   * `choice` lleva lo que el beneficio necesita: `state`, `name`, `scope`, `zone` o `background`.
   */
  async applyInterludeBenefit(benefit, choice = {}) {
    const cost = R.COSTE_INTERLUDIO[benefit];
    if (!cost) return false;
    const aviso = texto => { ui.notifications.warn(texto); return false; };

    if (benefit === "personal" && !choice.state) return aviso(`${this.name} no tiene ningún estado personal que eliminar.`);
    if (benefit === "city" && !choice.state) return aviso(`${this.name} no tiene ningún estado con la ciudad que eliminar.`);
    if (benefit === "favor" && !choice.name?.trim()) return aviso("Escribe el favor que consigue.");
    if (benefit === "favor" && !this.freeFavorSlot()) return aviso(`${this.name} ya guarda ${R.FAVORES_MAXIMOS} favores.`);
    if (benefit === "background" && !choice.background) return aviso("Elige el trasfondo nuevo.");
    if (benefit === "background" && this.system.background3) return aviso(`${this.name} ya tiene su tercer trasfondo.`);
    if (!await this.spendRecognition(cost)) return false;

    if (benefit === "cigarettes2") await this.adjustCigarettes(2);
    if (benefit === "fullPack") await this.setCigarettes(this.system.cigarettes?.max);
    if (benefit === "personTension") await this.lowerPillarTension("person");
    if (benefit === "placeTension") await this.lowerPillarTension("place");
    if (benefit === "personal") await this.recoverPersonalState(choice.state);
    if (benefit === "city") await this.recoverCityState(choice.state);
    if (benefit === "favor") await this.addFavor({ name: choice.name.trim(), scope: choice.scope, zone: choice.zone ?? "" });
    if (benefit === "background") await this.update({ "system.background3": choice.background });

    await postCityNote({
      title: "Interludio",
      body: `<p><strong>${foundry.utils.escapeHTML(this.name)}</strong> gasta ${plural(cost, "punto", "puntos")} de reconocimiento.</p>`
    });
    return true;
  }

  /** Un caso nuevo recupera los objetos y los tragos; los favores cobrados se consumen, los demás se conservan (p. 56). */
  async resetCaseState() {
    const update = {
      "system.representativeObjects.slot1.used": false,
      "system.representativeObjects.slot2.used": false,
      "system.caseStats.quietDrinksUsed": 0,
      "system.clues.count": 0
    };
    for (const slot of HUECOS) {
      if (this.system.favors?.[slot]?.used) update[`system.favors.${slot}`] = { name: "", scope: "libre", zone: "", used: false };
    }
    await this.update(update);
    await this.unsetFlag(ID, "lastRoll").catch(() => {});
  }

  // ------------------------------------------------------------------ Tiradas

  /** Resuelve los costes comunes a Riesgo y Perseguir el Crimen. Devuelve null si algo impide tirar. */
  async _payRollCosts({ useCigarette, useRecognition, nightVisit, applyRumorBonus }) {
    if (useCigarette && useRecognition) {
      ui.notifications.warn("Cigarrillo y reconocimiento no se acumulan: elige solo una de las dos ayudas.");
      return null;
    }
    const coste = (nightVisit ? 1 : 0) + (useCigarette ? 1 : 0);
    if (coste > this.cigarettes) {
      ui.notifications.warn(`Esta tirada cuesta ${coste} cigarrillos y ${this.name} tiene ${this.cigarettes}.`);
      return null;
    }
    if (useRecognition && getRecognitionAvailable(this) < 1) {
      ui.notifications.warn(`${this.name} no tiene reconocimiento disponible.`);
      return null;
    }
    if (applyRumorBonus && !this.canUseRumor()) {
      ui.notifications.warn(estadoCaso().rumor.por === this.id
        ? "Quien cuenta el rumor no puede aprovecharlo: es un aviso para sus compañeros."
        : "Ya no queda ningún rumor pendiente que consumir.");
      return null;
    }
    const rumorBonus = applyRumorBonus ? await this.consumeRumorBonus() : false;
    if (nightVisit && !await this.spendCigarette(1, "una visita nocturna")) return null;
    if (useCigarette && !await this.spendCigarette(1, "una calada de sangre fría")) return null;
    if (useRecognition && !await this.spendRecognition(1)) return null;
    return { rumorBonus };
  }

  rollRisk(options = {}) { return this._roll("risk", options); }
  rollPursueCrime(options = {}) { return this._roll("pursue", options); }

  async _roll(type, {
    background = "", useCigarette = false, useRecognition = false, penalty = false, nightVisit = false,
    applyRumorBonus = false, objectSlot = "", favorSlot = ""
  } = {}) {
    const pursue = type === "pursue";
    const speaker = ChatMessage.getSpeaker({ actor: this });
    const flags = extra => ({ [ID]: { tn: { type, actorId: this.id, resolved: {}, ...extra } } });

    // Un favor resuelve la acción sin tirar: no se paga ninguna otra ayuda.
    if (favorSlot) {
      const favor = await this.useFavor(favorSlot, type);
      if (!favor) return null;
      const previa = this.getFlag(ID, "lastRoll")?.messageId;
      const message = await ChatMessage.create({
        speaker, flags: flags({ cls: "clean", auto: true }),
        content: buildRollCard({ type, actorName: this.name, resultClass: "clean", autoSuccess: true, tags: [{ text: `Favor: ${favor.name}`, tone: "favor", icon: "fa-solid fa-handshake" }] })
      });
      await this.setFlag(ID, "lastRoll", { type, used: true, messageId: message?.id ?? null });
      await this._sustituir(previa);
      if (pursue) await this.addGroupClue();
      return { total: 9, resultClass: "clean", autoSuccess: true };
    }

    const objeto = pursue && objectSlot ? this.system.representativeObjects?.[objectSlot] : null;
    if (objeto?.name && objeto.used) {
      ui.notifications.warn(`«${objeto.name}» ya se usó en este caso. Cada objeto representativo sirve una sola vez.`);
      return null;
    }
    const ignoraDado = Boolean(objeto?.name);

    const paid = await this._payRollCosts({ useCigarette, useRecognition, nightVisit, applyRumorBonus });
    if (!paid) return null;
    if (ignoraDado) await this.markRepresentativeObjectUsed(objectSlot, true);

    const dado = estadoCaso().dado;
    const modificador = (useCigarette || useRecognition ? 2 : 0) + (paid.rumorBonus ? 2 : 0);
    const resta = pursue && !ignoraDado ? dado : 0;
    const peor = Boolean(penalty || nightVisit);
    const formula = R.formulaTirada({ trasfondo: Boolean(background), penalizador: peor });
    const expresion = `${formula}${modificador ? ` + ${modificador}` : ""}${resta ? ` - ${resta}` : ""}`;
    const roll = await new Roll(expresion).evaluate();
    const resultClass = R.clasificar(roll.total);

    const tags = [];
    if (background) tags.push({ text: `${background}${peor ? " · anula el penalizador" : " · mejor de 2d10"}`, icon: "fa-solid fa-book" });
    if (useCigarette) tags.push({ text: "+2 Cigarrillo", tone: "plus" });
    if (useRecognition) tags.push({ text: "+2 Reconocimiento", tone: "plus" });
    if (paid.rumorBonus) tags.push({ text: "+2 Rumor", tone: "plus" });
    if (nightVisit) tags.push({ text: "Visita nocturna · peor de 2d10", tone: "minus", icon: "fa-solid fa-moon" });
    else if (penalty && !background) tags.push({ text: "Penalizador · peor de 2d10", tone: "minus" });
    if (pursue) {
      if (ignoraDado) tags.push({ text: `${objeto.name} · ignora el dado del crimen`, tone: "favor", icon: "fa-solid fa-gem" });
      else tags.push({ text: `Dado del crimen −${dado}`, tone: "minus" });
    }

    const previa = this.getFlag(ID, "lastRoll")?.messageId;
    const message = await roll.toMessage({
      speaker, flags: flags({ cls: resultClass }),
      content: buildRollCard({ type, actorName: this.name, total: roll.total, resultClass, dice: dadosDe(roll), formula: roll.formula, tags })
    });
    await this.setFlag(ID, "lastRoll", { type, formula: roll.formula, resultClass, crimeRaised: pursue && resultClass === "hard", messageId: message?.id ?? null, used: false });
    await this._sustituir(previa);

    if (pursue) {
      await this.addGroupClue();
      if (resultClass === "hard") await this.increaseCrimeDie(1);
    }
    return { roll, total: roll.total, resultClass };
  }

  /** Repite la última tirada a cambio de tensar un pilar. Solo una vez por tirada (p. 27). */
  async overexposeLastRoll(pillar = "person") {
    const last = foundry.utils.deepClone(this.getFlag(ID, "lastRoll") ?? {});
    const pilar = this.system.stability?.[pillar];
    const etiqueta = TN.PILLARS[pillar].toLowerCase();
    const aviso = texto => { ui.notifications.warn(texto); return null; };
    if (!last.formula) return aviso("No hay ninguna tirada reciente que repetir.");
    if (last.used) return aviso("Esa tirada ya se sobreexpuso o se aceptó: solo se permite una vez por tirada.");
    if (!pilar?.name) return aviso(`Escribe en la ficha qué ${etiqueta} sostiene a ${this.name} antes de sobreexponerte.`);
    if (Number(pilar.tension) >= R.TENSION_MAXIMA) return aviso(`${pilar.name} ya está en tensión ${R.TENSION_MAXIMA}: no puede sostener otra sobreexposición.`);

    const tension = await this.increasePillarTension(pillar);
    // La tirada anterior se sustituye: si había subido el dado del crimen, se deshace antes de repetir.
    if (last.type === "pursue" && last.crimeRaised) await this.increaseCrimeDie(-1);

    const roll = await new Roll(last.formula).evaluate();
    const resultClass = R.clasificar(roll.total);
    const crimeRaised = last.type === "pursue" && resultClass === "hard";
    if (crimeRaised) await this.increaseCrimeDie(1);

    const message = await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      // Una sobreexposición es definitiva: su tarjeta nace cerrada, sin volver a ofrecer sobreexponer.
      flags: { [ID]: { tn: { type: last.type, actorId: this.id, cls: resultClass, resolved: {}, closed: true } } },
      content: buildRollCard({
        type: last.type, label: "Sobreexposición", actorName: this.name, total: roll.total, resultClass,
        dice: dadosDe(roll), formula: roll.formula, gain: false,
        note: `<p class="tn-card__overexposed"><i class="fa-solid fa-fire" aria-hidden="true"></i> ${foundry.utils.escapeHTML(pilar.name)} sube a tensión ${tension}. Este resultado sustituye al anterior.</p>`
      })
    });
    await this.setFlag(ID, "lastRoll", { ...last, used: true, resultClass, crimeRaised, messageId: message?.id ?? last.messageId });
    await this._sustituir(last.messageId);
    return { roll, total: roll.total, resultClass };
  }

  /** La tarjeta de una tirada anterior deja de ofrecer acciones: ya no es la vigente. */
  async _sustituir(messageId) {
    const anterior = messageId ? game.messages.get(messageId) : null;
    if (anterior && (anterior.isOwner || game.user.isGM)) await anterior.update({ [`flags.${ID}.tn.superseded`]: true });
  }
}

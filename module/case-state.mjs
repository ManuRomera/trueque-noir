import { ID, TN, estadoCaso, leerEscenasFlotantes, refrescar, getDetectives } from "./config.mjs";
import * as R from "./reglas.mjs";
import { postCityNote } from "./chat.mjs";

/**
 * Estado compartido del caso: reloj, pistas, dado del crimen, rumor y escenas flotantes.
 *
 * Foundry solo deja escribir ajustes de mundo a quien dirige la partida, así que los
 * detectives no podrían sumar su propia pista al perseguir el crimen. Cada cambio se
 * describe como una operación y, si quien la pide es un jugador, la aplica el GM activo.
 * Así la regla se ejecuta una sola vez y siempre con los valores actualizados.
 * Solo las operaciones de la lista `JUGADOR` pueden pedirse desde un cliente no GM,
 * y su carga se valida: un cliente manipulado no puede, por ejemplo, fijar el dado a 1.
 */
const poner = (clave, valor) => game.settings.set(ID, clave, valor);
const numero = (valor, [min, max]) => Math.max(min, Math.min(Math.trunc(Number(valor)) || 0, max));

const OPERACIONES = {
  /** Una pista nueva del grupo; cada tres sin gastar bajan el dado del crimen. */
  async gainClue() {
    await poner("groupCluesTotal", estadoCaso().pistas.total + 1);
    await OPERACIONES.autoSpendClues();
  },

  async autoSpendClues() {
    const caso = estadoCaso();
    const { dado, pasos, gastadas } = R.gastarPistas({ dado: caso.dado, disponibles: caso.pistas.disponibles });
    if (!pasos) return refrescar();
    await poner("groupCluesSpent", caso.pistas.gastadas + gastadas);
    await poner("crimeDie", dado);
    await postCityNote({
      title: "Las pistas aprietan",
      body: `<p>El grupo gasta ${gastadas} pistas: el dado del crimen baja a <strong>${dado}</strong>.</p>`
    });
    refrescar();
  },

  /** Gasto manual de pistas guardadas (el dado estaba en 1 y volvió a subir). */
  async spendClues() {
    const caso = estadoCaso();
    if (!caso.pistas.puedeGastar) return false;
    await poner("groupCluesSpent", caso.pistas.gastadas + R.PISTAS_POR_PASO);
    await poner("crimeDie", caso.dado - 1);
    refrescar();
    return true;
  },

  async changeCrimeDie({ amount = 1 } = {}) {
    const antes = estadoCaso();
    const dado = R.limitarDado(antes.dado + numero(amount, [-4, 4]));
    await poner("crimeDie", dado);
    if (R.dadoExplotado(dado) && !antes.explotado) {
      await postCityNote({
        title: "El dado del crimen ha explotado",
        tone: "warning",
        body: "<p>El caso se cierra de golpe: el crimen se hace con la ciudad y el culpable queda fuera de alcance. La Ciudad puede tirar 1d4 para decidir cómo termina.</p>"
      });
    }
    refrescar();
    return dado;
  },

  async setCrimeDie({ value = 1 } = {}) {
    await poner("crimeDie", R.limitarDado(value));
    refrescar();
  },

  /** Mueve el reloj. Avisa al llegar la noche (escenas flotantes) y al agotarse el tiempo. */
  async shiftPhase({ delta = 1 } = {}) {
    const antes = estadoCaso();
    const paso = R.moverFranja({ franja: antes.franja, dia: antes.dia, limite: antes.limite }, numero(delta, [-3, 3]));
    await poner("casePhaseIndex", paso.franja);
    await poner("caseDay", paso.dia);
    if (paso.finTiempo && !antes.finTiempo) {
      await postCityNote({
        title: "Se acaba el tiempo",
        tone: "warning",
        body: "<p>Termina el último día de investigación. Si nadie ha sido detenido, el culpable es ya intocable, ha desaparecido o ha completado su objetivo.</p>"
      });
    }
    if (paso.franja === 2) await OPERACIONES.recordFloating();
    refrescar();
  },

  /** Salta directamente a un día y franja (clic en el reloj del Panel). No dispara avisos. */
  async setClock({ dia = 1, franja = 0 } = {}) {
    await poner("caseDay", numero(dia, [1, 99]));
    await poner("casePhaseIndex", numero(franja, [0, R.FRANJAS.length - 1]));
    refrescar();
  },

  async setRumor({ text = "", by = "" } = {}) {
    const limpio = String(text).slice(0, 400);
    await poner("rumorBonusAvailable", Boolean(limpio));
    await poner("rumorBonusText", limpio);
    await poner("rumorBy", limpio ? String(by).slice(0, 40) : "");
    refrescar();
  },

  /** Marcar una casilla de tensión anota una escena flotante para esta noche (p. 28). */
  async addFloating({ actorId = "", actorName = "", pillar = "person", pillarName = "", tension = 1 } = {}) {
    if (!["person", "place"].includes(pillar)) return;
    const nivel = numero(tension, [1, R.TENSION_MAXIMA]);
    const lista = leerEscenasFlotantes();
    lista.push({
      id: foundry.utils.randomID(), actorId: String(actorId).slice(0, 40), actorName: String(actorName).slice(0, 80),
      pillar, pillarName: String(pillarName).slice(0, 120), tension: nivel, text: R.escenaFlotante(pillar, nivel)
    });
    await poner("floatingScenes", JSON.stringify(lista));
    refrescar();
  },

  async resolveFloating({ id = "" } = {}) {
    await poner("floatingScenes", JSON.stringify(leerEscenasFlotantes().filter(escena => escena.id !== id)));
    refrescar();
  },

  /** Al caer la noche, recuerda a La Ciudad (solo a ella) las escenas que debe narrar. */
  async recordFloating() {
    const lista = leerEscenasFlotantes();
    if (!lista.length) return;
    const escapar = foundry.utils.escapeHTML;
    const filas = lista.map(e => `<li><strong>${escapar(e.actorName)}</strong> · ${TN.PILLARS[e.pillar]} (${escapar(e.pillarName || "sin nombre")}), tensión ${e.tension}. ${e.text}</li>`).join("");
    await postCityNote({
      title: "Escenas flotantes de esta noche",
      body: `<ul>${filas}</ul><p class="tn-note__foot">Son breves y los detectives no están presentes. Márcalas como narradas desde el Panel.</p>`,
      whisper: ChatMessage.getWhisperRecipients("GM").map(user => user.id)
    });
  },

  /** Caso nuevo: reloj, pistas, dado, rumor y escenas a cero. La crónica y la ciudad se conservan. */
  async startCase({ name = "Caso abierto", crimeDie = 1, days = 4 } = {}) {
    await poner("caseName", String(name).slice(0, 120) || "Caso abierto");
    await poner("caseDay", 1);
    await poner("casePhaseIndex", 0);
    await poner("timeLimit", numero(days, [1, 9]) || 4);
    await poner("crimeDie", R.limitarDado(crimeDie));
    await poner("groupCluesTotal", 0);
    await poner("groupCluesSpent", 0);
    await poner("rumorBonusAvailable", false);
    await poner("rumorBonusText", "");
    await poner("rumorBy", "");
    await poner("floatingScenes", "[]");
    await poner("caseResult", "");
    refrescar();
  },

  /** Un jugador cede cigarrillos a un compañero: el GM los mueve porque no es dueño de la ficha ajena. */
  async giveCigarette({ fromId, toId, amount = 1 } = {}, remitente) {
    const origen = game.actors.get(fromId);
    const destino = game.actors.get(toId);
    if (origen?.type !== "detective" || destino?.type !== "detective") return;
    const usuario = remitente ? game.users.get(remitente) : game.user;
    if (!usuario || !origen.testUserPermission(usuario, "OWNER")) return;
    await origen.constructor.transferCigarettes(origen, destino, numero(amount, [1, 9]));
  },

  async setChronicle({ value = 1 } = {}) {
    await poner("chronicleCase", numero(value, [1, 99]));
    refrescar();
  },

  async setResult({ text = "" } = {}) {
    await poner("caseResult", String(text).slice(0, 400));
    refrescar();
  }
};

/** Lo único que un cliente jugador puede pedir, con el rango que se le tolera. */
const JUGADOR = {
  gainClue: () => ({}),
  changeCrimeDie: p => ({ amount: numero(p?.amount, [-1, 1]) }),
  setRumor: p => ({ text: String(p?.text ?? "").slice(0, 400), by: String(p?.by ?? "").slice(0, 40) }),
  addFloating: p => ({ ...p }),
  giveCigarette: p => ({ fromId: String(p?.fromId ?? ""), toId: String(p?.toId ?? ""), amount: numero(p?.amount, [1, 9]) })
};

/** Pide un cambio en el estado del caso. El GM lo aplica; los jugadores lo solicitan. */
export async function requestCaseOp(op, payload = {}) {
  if (!OPERACIONES[op]) throw new Error(`trueque-noir | Operación de caso desconocida: ${op}`);
  if (game.user?.isGM) return OPERACIONES[op](payload);
  if (!JUGADOR[op]) {
    ui.notifications.warn("Esa acción solo la puede hacer La Ciudad.");
    return null;
  }
  if (!game.users.activeGM) {
    ui.notifications.warn("La Ciudad no está conectada: el caso no puede actualizarse ahora mismo.");
    return null;
  }
  game.socket.emit(TN.SOCKET, { type: "case-op", op, payload: JUGADOR[op](payload) });
  return null;
}

/** Solo el GM activo aplica la operación, para no escribirla dos veces. */
export function escucharSocketCaso() {
  game.socket.on(TN.SOCKET, (data, remitente) => {
    if (data?.type !== "case-op" || !game.users.activeGM?.isSelf) return;
    if (!JUGADOR[data.op]) return;
    OPERACIONES[data.op](JUGADOR[data.op](data.payload ?? {}), remitente);
  });
}

/** Detectives que abandonan la ciudad al cerrar el caso (estado «quebrado» o «acabado»). */
export const detectivesFinales = () =>
  getDetectives().filter(actor => actor.system.personalStates?.quebrado || actor.system.cityStates?.acabado);

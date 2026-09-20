import {
  TN,
  CLUES_PER_CRIME_STEP,
  clampCrimeDie,
  getCrimeDie,
  getGroupClueState,
  isCrimeExploded,
  refreshCrimeBoard
} from "./config.mjs";
import { postCityNote } from "./chat.mjs";

/**
 * Estado compartido del caso: pistas, dado del crimen y rumor.
 *
 * Foundry solo deja escribir ajustes de mundo a quien dirige la partida, así que los
 * detectives no podrían sumar su propia pista al perseguir el crimen. Cada cambio se
 * describe como una operación y, si quien la pide es un jugador, la aplica La Ciudad.
 * Así la regla se ejecuta una sola vez y siempre con los valores actualizados.
 */
const set = (key, value) => game.settings.set(TN.SYSTEM_ID, key, value);

const OPERATIONS = {
  /** Una pista nueva del grupo; cada tres sin gastar bajan el dado del crimen. */
  async gainClue() {
    const { total } = getGroupClueState();
    await set("groupCluesTotal", total + 1);
    await OPERATIONS.autoSpendClues();
  },

  async autoSpendClues() {
    let { spent, available } = getGroupClueState();
    let crimeDie = getCrimeDie();
    let steps = 0;

    while (available >= CLUES_PER_CRIME_STEP && crimeDie > 1) {
      spent += CLUES_PER_CRIME_STEP;
      available -= CLUES_PER_CRIME_STEP;
      crimeDie = clampCrimeDie(crimeDie - 1);
      steps += 1;
    }
    if (!steps) return;

    await set("groupCluesSpent", spent);
    await set("crimeDie", crimeDie);
    await postCityNote({
      title: "Las pistas aprietan",
      body: `<p>El grupo gasta ${steps * CLUES_PER_CRIME_STEP} pistas: el dado del crimen baja a <strong>${crimeDie}</strong>.</p>`
    });
    await refreshCrimeBoard();
  },

  /** Gasto manual de pistas desde el Panel. */
  async spendCluesOnCrime() {
    const { spent, available } = getGroupClueState();
    const crimeDie = getCrimeDie();
    if (available < CLUES_PER_CRIME_STEP) {
      ui.notifications.warn(`Hacen falta ${CLUES_PER_CRIME_STEP} pistas sin gastar y el caso solo tiene ${available}.`);
      return false;
    }
    if (crimeDie <= 1) {
      ui.notifications.warn("El dado del crimen ya está en 1: no puede bajar más.");
      return false;
    }
    await set("groupCluesSpent", spent + CLUES_PER_CRIME_STEP);
    await set("crimeDie", clampCrimeDie(crimeDie - 1));
    await refreshCrimeBoard();
    return true;
  },

  async changeCrimeDie({ amount = 1 } = {}) {
    const next = clampCrimeDie(getCrimeDie() + Number(amount || 0));
    await set("crimeDie", next);
    if (isCrimeExploded(next)) {
      await postCityNote({
        title: "El dado del crimen ha explotado",
        tone: "warning",
        body: "<p>El caso se cierra abruptamente: el crimen ha ganado la ciudad.</p>"
      });
    }
    await refreshCrimeBoard();
    return next;
  },

  async setCrimeDie({ value = 1 } = {}) {
    const next = clampCrimeDie(value);
    await set("crimeDie", next);
    await refreshCrimeBoard();
    return next;
  },

  async setRumor({ text = "" } = {}) {
    await set("rumorBonusAvailable", Boolean(text));
    await set("rumorBonusText", text);
    await refreshCrimeBoard();
  },

  async resetCase() {
    await set("caseName", "Caso abierto");
    await set("caseDay", 1);
    await set("casePhaseIndex", 0);
    await set("timeLimit", 4);
    await set("crimeDie", 1);
    await set("groupCluesTotal", 0);
    await set("groupCluesSpent", 0);
    await set("rumorBonusAvailable", false);
    await set("rumorBonusText", "");
    await refreshCrimeBoard();
  }
};

/** Pide un cambio en el estado del caso. La Ciudad lo aplica; los detectives lo solicitan. */
export async function requestCaseOp(op, payload = {}) {
  if (!OPERATIONS[op]) throw new Error(`trueque-noir | Operación de caso desconocida: ${op}`);
  if (game.user?.isGM) return OPERATIONS[op](payload);

  const gm = game.users.find(user => user.isGM && user.active);
  if (!gm) {
    ui.notifications.warn("La Ciudad no está conectada: el caso no puede actualizarse ahora mismo.");
    return null;
  }
  game.socket.emit(TN.SOCKET, { type: "case-op", op, payload, gmId: gm.id });
  return null;
}

/** Solo el primer GM activo aplica la operación, para no escribirla dos veces. */
export function handleCaseOp(data) {
  if (data?.type !== "case-op") return;
  if (game.user?.id !== data.gmId) return;
  OPERATIONS[data.op]?.(data.payload ?? {});
}

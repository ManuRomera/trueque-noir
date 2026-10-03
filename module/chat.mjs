import { ID, TN } from "./config.mjs";

const esc = valor => foundry.utils.escapeHTML(String(valor ?? ""));

const ICONO = {
  clean: "fa-solid fa-circle-check",
  mixed: "fa-solid fa-right-left",
  hard: "fa-solid fa-triangle-exclamation"
};

const ETIQUETA = { risk: "Tirada de Riesgo", pursue: "Perseguir el Crimen", overexpose: "Sobreexposición" };

/** Qué ocurre con cada resultado, tal como lo fija el manual (p. 34 y 38). */
const RESULTADO = {
  risk: {
    clean: "Supera la situación sin consecuencias en su contra y narra cómo lo ha conseguido.",
    mixed: "Supera la situación, pero hay trueque: La Ciudad propone una consecuencia de <em>La ciudad se revuelve</em> y otra de <em>Pagar el precio</em>, y el detective elige.",
    hard: "La Ciudad decide cómo acaba la acción, salga bien o mal, y aplica ya una consecuencia negativa."
  },
  pursue: {
    clean: "Pista conseguida sin consecuencias. El resto del grupo puede seguir buscando aquí.",
    mixed: "Pista conseguida, pero hay trueque. El resto del grupo puede seguir buscando aquí.",
    hard: "Pista conseguida, pero sucede algo nefasto: nadie más buscará pistas aquí, el crimen se propaga (dado +1) y La Ciudad puede añadir otra consecuencia."
  }
};

/** Chips de dados: el que cuenta, lleno; el descartado, tachado. */
function dados(lista = []) {
  if (!lista.length) return "";
  return `<ul class="tn-card__dice" aria-label="Dados">${lista.map(d =>
    `<li class="tn-die${d.kept ? "" : " is-dropped"}">${d.value}</li>`).join("")}</ul>`;
}

function etiquetas({ tags = [] }) {
  if (!tags.length) return "";
  return `<ul class="tn-card__mods">${tags.map(t => `<li class="tn-tag tn-tag--${t.tone ?? "base"}">${t.icon ? `<i class="${t.icon}" aria-hidden="true"></i>` : ""}${esc(t.text)}</li>`).join("")}</ul>`;
}

/**
 * Tarjeta de resultado de una tirada. Es el `content` del mensaje: así el núcleo
 * no añade encima su propio desglose y el resultado ocupa una sola pieza.
 * El pie con acciones (sobreexponer, trueque, premio) lo inyecta `tarjetas.mjs`.
 */
export function buildRollCard({
  type, label, actorName, total, resultClass, autoSuccess = false, dice = [], formula = "",
  tags = [], note = "", gain = type === "pursue"
}) {
  const veredicto = autoSuccess ? "Éxito automático" : TN.RESULT_LABEL[resultClass];
  const icono = autoSuccess ? "fa-solid fa-handshake" : ICONO[resultClass];
  const texto = RESULTADO[type === "overexpose" ? "risk" : type]?.[autoSuccess ? "clean" : resultClass] ?? "";
  return `
  <div class="tn-chat-card tn-card--${autoSuccess ? "clean tn-card--auto" : resultClass}" data-tn-card>
    <header class="tn-card__head">
      <span class="tn-card__kind">${esc(label ?? ETIQUETA[type] ?? "")}</span>
      <span class="tn-card__actor">${esc(actorName)}</span>
    </header>
    <div class="tn-card__verdict">
      ${autoSuccess ? "" : `<span class="tn-card__total" title="Resultado final">${total}</span>`}
      <div class="tn-card__verdict-text">
        <span class="tn-card__verdict-label"><i class="${icono}" aria-hidden="true"></i> ${veredicto}</span>
        ${formula ? `<span class="tn-card__formula">${esc(formula)}</span>` : ""}
      </div>
      ${dados(dice)}
    </div>
    ${etiquetas({ tags })}
    ${gain ? `<p class="tn-card__gain"><i class="fa-solid fa-fingerprint" aria-hidden="true"></i> +1 pista para el caso</p>` : ""}
    <p class="tn-card__outcome">${texto}</p>
    ${note}
  </div>`;
}

/** Dados de una tirada ya evaluada, para mostrarlos dentro de la tarjeta. */
export const dadosDe = roll => roll.dice.flatMap(d => d.results.map(r => ({ value: r.result, kept: r.active })));

/** Tarjeta sobria para avisos narrativos de La Ciudad. */
export function cityNote({ title, body, tone = "" }) {
  return `
  <div class="tn-chat-card tn-note${tone ? ` tn-note--${tone}` : ""}">
    <div class="tn-note__title">${esc(title)}</div>
    <div class="tn-note__body">${body}</div>
  </div>`;
}

/** Aviso de La Ciudad. Con `whisper` solo lo ven esos usuarios (escenas flotantes, notas privadas). */
export async function postCityNote({ whisper, ...options }) {
  const data = { speaker: { alias: "La Ciudad" }, content: cityNote(options), flags: { [ID]: { nota: true } } };
  if (whisper?.length) data.whisper = whisper;
  return ChatMessage.create(data);
}

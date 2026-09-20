import { TN, RESULT_LABEL } from "./config.mjs";
import { onRenderChatMessage } from "./compat.mjs";

const VERDICT_ICON = {
  clean: "fa-solid fa-circle-check",
  mixed: "fa-solid fa-right-left",
  hard: "fa-solid fa-triangle-exclamation"
};

const TYPE_LABEL = {
  risk: "Tirada de Riesgo",
  pursue: "Perseguir el Crimen",
  overexpose: "Sobreexposición"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function modifierTags({ background, cigarette, recognition, rumorBonus, nightVisit, penalty, favorName, objectName, crimeDie, ignoredCrimeDie, type, autoSuccess }) {
  const tags = [];
  if (favorName) tags.push(`<li class="tn-tag tn-tag--favor"><i class="fa-solid fa-handshake"></i> Favor: ${escapeHtml(favorName)}</li>`);
  if (background) tags.push(`<li class="tn-tag"><i class="fa-solid fa-book"></i> ${escapeHtml(background)} · 2d10 conserva mejor</li>`);
  if (cigarette) tags.push(`<li class="tn-tag tn-tag--plus">+2 Cigarrillo</li>`);
  if (recognition) tags.push(`<li class="tn-tag tn-tag--plus">+2 Reconocimiento</li>`);
  if (rumorBonus) tags.push(`<li class="tn-tag tn-tag--plus">+2 Rumor</li>`);
  if (nightVisit) tags.push(`<li class="tn-tag tn-tag--minus">Visita nocturna · 2d10 conserva peor</li>`);
  if (penalty && !nightVisit) tags.push(`<li class="tn-tag tn-tag--minus">Penalizador · 2d10 conserva peor</li>`);
  if (type === "pursue" && !autoSuccess) {
    if (ignoredCrimeDie && objectName) tags.push(`<li class="tn-tag tn-tag--favor"><i class="fa-solid fa-gem"></i> ${escapeHtml(objectName)} · ignora el dado del crimen</li>`);
    else if (!ignoredCrimeDie && crimeDie > 0) tags.push(`<li class="tn-tag tn-tag--minus">Dado del crimen −${crimeDie}</li>`);
  }
  return tags.length ? `<ul class="tn-card__mods">${tags.join("")}</ul>` : "";
}

function outcomeText(type, resultClass, autoSuccess) {
  if (type === "risk") {
    if (autoSuccess || resultClass === "clean") return "El detective narra cómo lo consigue. La Ciudad puede conceder reconocimiento, un favor o una mejora del entorno.";
    if (resultClass === "mixed") return "La Ciudad propone dos consecuencias —una de <em>La ciudad se revuelve</em> y otra de <em>Pagar el precio</em>— y el detective elige cuál sufre.";
    return "La Ciudad impone una consecuencia negativa a su elección.";
  }
  if (autoSuccess || resultClass === "clean") return "Pista conseguida sin consecuencias. La Ciudad puede añadir reconocimiento o información extra.";
  if (resultClass === "mixed") return "Pista conseguida con trueque: La Ciudad propone dos consecuencias y el detective elige una.";
  return "Pista conseguida, pero el dado del crimen sube 1 y esa localización ya no debería dar más pistas.";
}

/** Tarjeta de resultado de tirada. El pie de sobreexposición se inyecta al renderizar. */
export function buildRollCard({
  type,
  label,
  actorName,
  total,
  resultClass,
  autoSuccess = false,
  extra = "",
  showGain,
  ...mods
}) {
  const verdict = autoSuccess ? "Éxito automático" : RESULT_LABEL[resultClass];
  const icon = autoSuccess ? "fa-solid fa-handshake" : VERDICT_ICON[resultClass];
  const gain = (showGain ?? type === "pursue") ? `<p class="tn-card__gain"><i class="fa-solid fa-fingerprint"></i> +1 pista para el caso</p>` : "";
  return `
  <div class="tn-chat-card tn-card--${resultClass}${autoSuccess ? " tn-card--auto" : ""}" data-tn-card>
    <header class="tn-card__head">
      <span class="tn-card__kind">${label ?? TYPE_LABEL[type] ?? ""}</span>
      <span class="tn-card__actor">${escapeHtml(actorName)}</span>
    </header>
    <div class="tn-card__verdict">
      <i class="${icon}" aria-hidden="true"></i>
      <span class="tn-card__verdict-label">${verdict}</span>
      ${autoSuccess ? "" : `<span class="tn-card__total" title="Resultado final">${total}</span>`}
    </div>
    ${modifierTags({ ...mods, type, autoSuccess })}
    ${gain}
    <p class="tn-card__outcome">${outcomeText(type, resultClass, autoSuccess)}</p>
    ${extra}
  </div>`;
}

/** Tarjeta sobria para avisos narrativos de La Ciudad. */
export function cityNote({ title, body, tone = "" }) {
  return `
  <div class="tn-chat-card tn-note${tone ? ` tn-note--${tone}` : ""}">
    <div class="tn-note__title">${escapeHtml(title)}</div>
    <div class="tn-note__body">${body}</div>
  </div>`;
}

export async function postCityNote(options) {
  return ChatMessage.create({ speaker: { alias: "La Ciudad" }, content: cityNote(options) });
}

/** Fuerza a repintar un mensaje para que sus acciones contextuales desaparezcan. */
export function refreshChatMessage(messageId) {
  if (!messageId) return;
  const message = game.messages?.get(messageId);
  if (!message) return;
  try {
    ui.chat?.updateMessage?.(message);
  } catch (error) {
    console.warn("trueque-noir | No se pudo repintar el mensaje de chat", error);
  }
}

function pillarButton(actor, pillar, label) {
  const data = actor.system.stability?.[pillar];
  const name = data?.name?.trim();
  const tension = Number(data?.tension ?? 0);
  if (!name) return `<button type="button" class="tn-btn tn-btn--ghost" disabled title="Define ${label.toLowerCase()} en la ficha para poder sobreexponerte.">Sobreexponer ${label}</button>`;
  if (tension >= 3) return `<button type="button" class="tn-btn tn-btn--ghost" disabled title="${escapeHtml(name)} ya está en tensión 3, el máximo.">Sobreexponer ${label}</button>`;
  return `<button type="button" class="tn-btn tn-btn--contextual" data-tn-overexpose="${pillar}" title="${escapeHtml(name)} · tensión ${tension} → ${tension + 1}">Sobreexponer ${label}</button>`;
}

/**
 * Inyecta las acciones de sobreexposición dentro de la tarjeta de la tirada.
 * Solo aparecen para el dueño del detective y solo mientras la tirada siga siendo la última.
 */
export function bindChatActions() {
  onRenderChatMessage((message, html) => {
    if (!html) return;
    const meta = message.getFlag(TN.SYSTEM_ID, "overexpose");
    if (!meta) return;
    const card = html.querySelector("[data-tn-card]");
    if (!card || card.dataset.tnBound) return;
    const actor = game.actors?.get(meta.actorId);
    if (!actor?.isOwner) return;
    const last = actor.getFlag(TN.SYSTEM_ID, "lastRoll");
    if (!last || last.messageId !== message.id || last.used) return;

    card.dataset.tnBound = "true";
    const footer = document.createElement("footer");
    footer.className = "tn-card__actions";
    footer.innerHTML = `
      <p class="tn-card__actions-hint">¿Aceptas este resultado o fuerzas a quien te sostiene?</p>
      <div class="tn-card__actions-row">
        <button type="button" class="tn-btn" data-tn-accept>Aceptar resultado</button>
        ${pillarButton(actor, "person", "Persona")}
        ${pillarButton(actor, "place", "Lugar")}
      </div>`;
    card.appendChild(footer);

    footer.querySelector("[data-tn-accept]")?.addEventListener("click", async () => {
      await actor.setFlag(TN.SYSTEM_ID, "lastRoll", { ...last, used: true });
      footer.remove();
    });
    for (const button of footer.querySelectorAll("[data-tn-overexpose]")) {
      button.addEventListener("click", async () => {
        footer.querySelectorAll("button").forEach(btn => { btn.disabled = true; });
        await actor.overexposeLastRoll(button.dataset.tnOverexpose);
        refreshChatMessage(message.id);
      });
    }
  });
}

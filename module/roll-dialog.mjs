import { TN, getRecognitionAvailable, getCrimeDie } from "./config.mjs";
import { LegacyDialog } from "./compat.mjs";
import { BACKGROUND_HELP } from "./background-help.mjs";

const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

const TYPE = {
  risk: {
    title: "Tirada de Riesgo",
    question: "¿Cómo afrontas esta situación?",
    blurb: "Actúas bajo presión y la ciudad decide qué te cuesta."
  },
  pursue: {
    title: "Perseguir el Crimen",
    question: "¿Cómo buscas la pista?",
    blurb: "Siempre consigues la pista: lo que está en juego es el precio."
  }
};

function block(title, body, { note = "", modifier = "" } = {}) {
  return `
    <section class="tn-roll__block${modifier ? ` ${modifier}` : ""}">
      <h3 class="tn-roll__legend">${title}${note ? `<span>${note}</span>` : ""}</h3>
      ${body}
    </section>`;
}

function choice({ name, value, label, detail = "", disabled = false, reason = "", checked = false, type = "radio" }) {
  return `
    <label class="tn-choice${disabled ? " is-disabled" : ""}"${disabled && reason ? ` title="${escape(reason)}"` : ""}>
      <input type="${type}" name="${name}" value="${value}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
      <span class="tn-choice__label">${label}</span>
      ${detail ? `<small class="tn-choice__detail">${detail}</small>` : ""}
    </label>`;
}

export function buildContent(actor, type) {
  const meta = TYPE[type];
  const backgrounds = actor.backgroundOptions;
  const cigarettes = actor.cigarettes;
  const recognition = getRecognitionAvailable(actor);
  const favors = actor.availableFavors(type);
  const objects = actor.availableObjects();
  const rumorAvailable = Boolean(game.settings.get(TN.SYSTEM_ID, "rumorBonusAvailable"));
  const rumorText = game.settings.get(TN.SYSTEM_ID, "rumorBonusText");

  const backgroundBlock = block("Trasfondo", backgrounds.length
    ? `<select name="background">
        <option value="">Ninguno · tira 1d10</option>
        ${backgrounds.map(bg => `<option value="${escape(bg)}">${escape(bg)}</option>`).join("")}
      </select>
      <p class="tn-roll__hint" data-background-hint></p>`
    : `<p class="tn-roll__empty">Este detective todavía no tiene trasfondos. Elígelos en su ficha para tirar 2d10 conservando el mejor.</p>`,
    { note: "conserva el mejor" });

  const helpBlock = block("Ayuda", `
    <div class="tn-choice-row">
      ${choice({ name: "help", value: "", label: "Sin ayuda", checked: true })}
      ${choice({ name: "help", value: "cigarette", label: "+2 Cigarrillo", detail: `${cigarettes} en la cajetilla`, disabled: cigarettes < 1, reason: "No le quedan cigarrillos." })}
      ${choice({ name: "help", value: "recognition", label: "+2 Reconocimiento", detail: `${recognition} disponible${recognition === 1 ? "" : "s"}`, disabled: recognition < 1, reason: "No tiene reconocimiento disponible." })}
    </div>`, { note: "solo una" });

  const rumorBlock = rumorAvailable
    ? block("Rumor", `
        ${choice({ type: "checkbox", name: "applyRumorBonus", value: "1", label: "+2 Consumir el rumor pendiente", detail: escape(rumorText) })}
        <p class="tn-roll__hint">El rumor desaparece del caso en cuanto se usa.</p>`)
    : "";

  const favorBlock = favors.length
    ? block("Favor", `
        <select name="favorSlot">
          <option value="">No gastar ningún favor</option>
          ${favors.map(favor => `<option value="${favor.slot}">${escape(favor.name)}${favor.scope ? ` · ${escape(favor.scope)}` : ""}</option>`).join("")}
        </select>
        <p class="tn-roll__hint">Gastar un favor resuelve la acción sin tirar.</p>`, { note: "éxito automático" })
    : "";

  const objectBlock = (type === "pursue" && objects.length)
    ? block("Objeto representativo", `
        <select name="objectSlot">
          <option value="">No usar ninguno</option>
          ${objects.map(object => `<option value="${object.slot}">${escape(object.name)}</option>`).join("")}
        </select>
        <p class="tn-roll__hint">Ignora el dado del crimen. Cada objeto solo sirve una vez por caso.</p>`, { note: "ignora el dado del crimen" })
    : "";

  const costBlock = block("Coste añadido", `
    <div class="tn-choice-col">
      ${choice({ type: "checkbox", name: "nightVisit", value: "1", label: "Visita nocturna", detail: "Cuesta 1 cigarrillo y tiras 2d10 conservando el peor.", disabled: cigarettes < 1, reason: "No le quedan cigarrillos." })}
      ${choice({ type: "checkbox", name: "penalty", value: "1", label: "Penalizador de la situación", detail: "La Ciudad impone 2d10 conservando el peor." })}
    </div>`, { modifier: "tn-roll__block--muted" });

  return `
    <form class="tn-roll" autocomplete="off">
      <p class="tn-roll__question">${meta.question}</p>
      <p class="tn-roll__blurb">${meta.blurb}</p>
      <div class="tn-roll__auto" data-auto hidden>
        <strong>Éxito automático</strong>
        <span data-auto-text></span>
      </div>
      <div class="tn-roll__blocks">
        ${backgroundBlock}
        ${helpBlock}
        ${favorBlock}
        ${rumorBlock}
        ${objectBlock}
        ${costBlock}
      </div>
      <aside class="tn-roll__summary" data-summary aria-live="polite"></aside>
    </form>`;
}

function readForm(form) {
  const data = new FormData(form);
  const help = data.get("help") || "";
  return {
    background: String(data.get("background") || ""),
    useCigarette: help === "cigarette",
    useRecognition: help === "recognition",
    applyRumorBonus: Boolean(data.get("applyRumorBonus")),
    nightVisit: Boolean(data.get("nightVisit")),
    penalty: Boolean(data.get("penalty")),
    favorSlot: String(data.get("favorSlot") || ""),
    objectSlot: String(data.get("objectSlot") || "")
  };
}

function formulaLine({ background, nightVisit, penalty }) {
  const worse = nightVisit || penalty;
  if (background && worse) return "1d10 · el trasfondo y el penalizador se anulan";
  if (background) return "2d10 · conserva el mejor";
  if (worse) return "2d10 · conserva el peor";
  return "1d10";
}

function summaryLines(actor, type, values) {
  if (values.favorSlot) {
    const favor = actor.system.favors?.[values.favorSlot];
    return [`<li class="is-auto">Gastas «${escape(favor?.name ?? "")}»: la acción se resuelve sin tirar.</li>`];
  }
  const lines = [`<li class="is-formula">${formulaLine(values)}</li>`];
  if (values.background) lines.push(`<li>Trasfondo: ${escape(values.background)}</li>`);
  if (values.useCigarette) lines.push(`<li class="is-plus">+2 Cigarrillo · gasta 1</li>`);
  if (values.useRecognition) lines.push(`<li class="is-plus">+2 Reconocimiento · gasta 1</li>`);
  if (values.applyRumorBonus) lines.push(`<li class="is-plus">+2 Rumor · se consume</li>`);
  if (values.nightVisit) lines.push(`<li class="is-minus">Visita nocturna · gasta 1 cigarrillo</li>`);
  if (values.penalty && !values.nightVisit) lines.push(`<li class="is-minus">Penalizador de la situación</li>`);
  if (type === "pursue") {
    const objectName = values.objectSlot ? actor.system.representativeObjects?.[values.objectSlot]?.name : "";
    if (objectName) lines.push(`<li class="is-plus">${escape(objectName)} · ignora el dado del crimen</li>`);
    else {
      const crimeDie = getCrimeDie();
      if (crimeDie > 0) lines.push(`<li class="is-minus">Dado del crimen −${crimeDie}</li>`);
    }
    lines.push(`<li class="is-gain">Consigues 1 pista para el caso</li>`);
  }
  return lines;
}

/** Diálogo de tirada: decide primero qué quieres hacer y después enseña qué va a pasar. */
export function openRollDialog(actor, type) {
  const meta = TYPE[type];

  const dialog = new LegacyDialog({
    title: `${meta.title} · ${actor.name}`,
    content: buildContent(actor, type),
    buttons: {
      roll: {
        label: "Tirar",
        callback: async html => {
          const root = html[0] ?? html;
          const form = (root.closest?.(".app") ?? root).querySelector("form");
          const values = readForm(form);
          if (type === "risk") await actor.rollRisk(values);
          else await actor.rollPursueCrime(values);
        }
      },
      cancel: { label: "Cancelar" }
    },
    default: "roll",
    render: html => bindDialog(html, actor, type, dialog)
  }, { classes: ["trueque-noir", "tn-dialog", "tn-roll-dialog"], width: 520 });

  dialog.render(true);
  return dialog;
}

function bindDialog(html, actor, type, dialog) {
  const root = html[0] ?? html;
  // Dialog entrega distintos nodos según la versión: buscamos hacia dentro y hacia fuera.
  const scope = root.closest?.(".app") ?? root;
  const form = scope.querySelector("form") ?? (root.matches?.("form") ? root : null);
  if (!form) return console.warn("trueque-noir | No se encontró el formulario del diálogo de tirada");
  const summary = scope.querySelector("[data-summary]");
  const auto = scope.querySelector("[data-auto]");
  const autoText = scope.querySelector("[data-auto-text]");
  const backgroundHint = scope.querySelector("[data-background-hint]");
  const rollButton = scope.querySelector("button.roll");

  const update = () => {
    const values = readForm(form);
    const usingFavor = Boolean(values.favorSlot);

    // Con un favor la acción ya está resuelta: el resto de opciones no tendría efecto.
    for (const field of form.querySelectorAll("input[name='help'], input[name='nightVisit'], input[name='penalty'], input[name='applyRumorBonus'], select[name='objectSlot'], select[name='background']")) {
      field.disabled = usingFavor ? true : field.dataset.tnLocked === "true";
      if (usingFavor && field.type === "checkbox") field.checked = false;
      if (usingFavor && field.type === "radio") field.checked = field.value === "";
      field.closest(".tn-choice")?.classList.toggle("is-disabled", field.disabled);
      field.closest(".tn-roll__block")?.classList.toggle("is-inactive", usingFavor);
    }
    form.querySelector("[name='favorSlot']")?.closest(".tn-roll__block")?.classList.remove("is-inactive");

    // Una visita nocturna y una calada gastan un cigarrillo cada una: no se permite pedir más de los que quedan.
    if (!usingFavor) {
      const nightBox = form.querySelector("input[name='nightVisit']");
      const cigaretteBox = form.querySelector("input[name='help'][value='cigarette']");
      const shortOnCigarettes = actor.cigarettes < 2;
      const lock = (field, locked, reason) => {
        if (!field || field.dataset.tnLocked === "true") return;
        field.disabled = locked;
        const wrapper = field.closest(".tn-choice");
        wrapper?.classList.toggle("is-disabled", locked);
        if (wrapper) wrapper.title = locked ? reason : "";
      };
      lock(nightBox, shortOnCigarettes && values.useCigarette, "Con un solo cigarrillo no puedes pagar la calada y la visita nocturna.");
      lock(cigaretteBox, shortOnCigarettes && values.nightVisit, "El cigarrillo que queda ya se gasta en la visita nocturna.");
    }

    if (auto) {
      auto.hidden = !usingFavor;
      if (usingFavor && autoText) {
        const favor = actor.system.favors?.[values.favorSlot];
        autoText.textContent = `«${favor?.name ?? ""}» resuelve la acción sin tirar dados${type === "pursue" ? " y consigues la pista" : ""}.`;
      }
    }
    if (backgroundHint) {
      backgroundHint.textContent = values.background ? (BACKGROUND_HELP[values.background] ?? "") : "";
      backgroundHint.hidden = !values.background;
    }
    if (rollButton) rollButton.textContent = usingFavor ? "Gastar el favor" : "Tirar";

    if (summary) summary.innerHTML = `<h4>Vas a hacer esto</h4><ul>${summaryLines(actor, type, readForm(form)).join("")}</ul>`;

    // El contenido cambia de alto al elegir opciones: la ventana se reajusta
    // para que los botones nunca queden fuera del área pulsable.
    dialog?.setPosition?.({ height: "auto" });
  };

  // Los campos deshabilitados por falta de recursos no deben reactivarse solos.
  for (const field of form.querySelectorAll("input:disabled, select:disabled")) field.dataset.tnLocked = "true";
  form.addEventListener("change", update);
  update();
}

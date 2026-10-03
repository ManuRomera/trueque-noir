/**
 * Acciones dentro de la tarjeta de una tirada. Se pintan al renderizar cada mensaje a partir de
 * sus banderas, así que todos los clientes ven el mismo estado y nada se pierde al recargar:
 *  · el dueño del detective puede aceptar el resultado o sobreexponerse (p. 27), solo mientras
 *    esa tirada siga siendo la última;
 *  · La Ciudad resuelve el trueque de un 5-8 o impone la consecuencia de un 4- (p. 40-46), y concede
 *    UN premio —reconocimiento, favor o mejora del entorno— tras un éxito limpio (p. 34-38).
 */
import { ID, TN } from "./config.mjs";
import { alRenderizarMensaje } from "./compat.mjs";
import { postCityNote } from "./chat.mjs";
import { DialogoTrueque } from "./trueque.mjs";
import { concederFavor } from "./apps/dialogos.mjs";

const esc = valor => foundry.utils.escapeHTML(String(valor ?? ""));

function botonPilar(actor, pilar) {
  const datos = actor.system.stability?.[pilar];
  const etiqueta = TN.PILLARS[pilar];
  const nombre = datos?.name?.trim();
  const tension = Number(datos?.tension ?? 0);
  if (!nombre) return `<button type="button" class="tn-btn tn-btn--ghost" disabled title="Define ${etiqueta.toLowerCase()} en la ficha para poder sobreexponerte.">${etiqueta}</button>`;
  if (tension >= 3) return `<button type="button" class="tn-btn tn-btn--ghost" disabled title="${esc(nombre)} ya está en tensión 3, el máximo.">${etiqueta}</button>`;
  return `<button type="button" class="tn-btn tn-btn--contextual" data-tn-sobreexponer="${pilar}" title="${esc(nombre)} · tensión ${tension} → ${tension + 1}"><i class="fa-solid fa-fire" aria-hidden="true"></i> ${etiqueta}</button>`;
}

function pieDueno(message, actor, tn) {
  if (tn.closed) return null;
  const pie = document.createElement("footer");
  pie.className = "tn-card__actions";
  pie.innerHTML = `
    <p class="tn-card__actions-hint">¿Aceptas el resultado o fuerzas a quien te sostiene?</p>
    <div class="tn-card__actions-row">
      <button type="button" class="tn-btn" data-tn-aceptar><i class="fa-solid fa-check" aria-hidden="true"></i> Aceptar</button>
      ${botonPilar(actor, "person")}${botonPilar(actor, "place")}
    </div>`;
  pie.querySelector("[data-tn-aceptar]").addEventListener("click", async () => {
    pie.querySelectorAll("button").forEach(b => { b.disabled = true; });
    const ultima = actor.getFlag(ID, "lastRoll");
    if (ultima) await actor.setFlag(ID, "lastRoll", { ...ultima, used: true });
    await message.update({ [`flags.${ID}.tn.closed`]: true });
  });
  for (const boton of pie.querySelectorAll("[data-tn-sobreexponer]")) {
    boton.addEventListener("click", async () => {
      pie.querySelectorAll("button").forEach(b => { b.disabled = true; });
      await actor.overexposeLastRoll(boton.dataset.tnSobreexponer);
    });
  }
  return pie;
}

/** Qué puede conceder La Ciudad tras un éxito limpio: solo una cosa, y favor y entorno solo en tiradas de riesgo. */
const PREMIOS = {
  risk: [
    ["reconocimiento", "fa-solid fa-medal", "+1 reconocimiento", "Ayudó a alguien, mantuvo el orden o actuó de forma impecable."],
    ["favor", "fa-solid fa-handshake", "Un favor", "Alguien le debe un favor de los grandes."],
    ["entorno", "fa-solid fa-lightbulb", "Mejorar el entorno", "Quita penalizadores a los compañeros o resuelve una acción conjunta."]
  ],
  pursue: [
    ["reconocimiento", "fa-solid fa-medal", "+1 reconocimiento", "Sabueso excepcional."],
    ["informacion", "fa-solid fa-circle-info", "Información extra", "Contextualiza la pista o redirige a otra localización."]
  ]
};

function pieCiudad(message, tn, actor) {
  const resuelto = tn.resolved ?? {};
  const pie = document.createElement("footer");
  pie.className = "tn-card__actions tn-card__actions--city";
  const dura = tn.cls === "hard";

  if (tn.auto) return null;
  if (tn.cls === "mixed" || dura) {
    pie.innerHTML = resuelto.trueque
      ? `<p class="tn-card__done"><i class="fa-solid fa-check" aria-hidden="true"></i> ${dura ? "Consecuencia" : "Trueque"} resuelto: ${esc(resuelto.trueque)}</p>`
      : `<p class="tn-card__actions-hint">La Ciudad</p><div class="tn-card__actions-row"><button type="button" class="tn-btn tn-btn--contextual" data-tn-trueque><i class="fa-solid fa-right-left" aria-hidden="true"></i> ${dura ? "Imponer una consecuencia" : "Resolver el trueque"}</button></div>`;
    pie.querySelector("[data-tn-trueque]")?.addEventListener("click", () => DialogoTrueque.resolver({ actorId: tn.actorId, mensajeId: message.id }));
    return pie;
  }

  if (resuelto.premio) {
    pie.innerHTML = `<p class="tn-card__done"><i class="fa-solid fa-check" aria-hidden="true"></i> Premio concedido: ${esc(resuelto.premio)}</p>`;
    return pie;
  }
  const opciones = PREMIOS[tn.type] ?? PREMIOS.risk;
  pie.innerHTML = `
    <p class="tn-card__actions-hint">La Ciudad puede conceder una cosa, nunca varias</p>
    <div class="tn-card__actions-row">${opciones.map(([id, icono, texto, ayuda]) =>
      `<button type="button" class="tn-btn tn-btn--contextual" data-tn-premio="${id}" title="${esc(ayuda)}"><i class="${icono}" aria-hidden="true"></i> ${texto}</button>`).join("")}</div>`;
  for (const boton of pie.querySelectorAll("[data-tn-premio]")) {
    boton.addEventListener("click", () => conceder(message, actor, boton.dataset.tnPremio));
  }
  return pie;
}

async function conceder(message, actor, premio) {
  if (!actor) return;
  let etiqueta = "";
  if (premio === "reconocimiento") {
    await actor.addRecognition(1);
    etiqueta = "+1 reconocimiento";
    await postCityNote({ title: "Reconocimiento", body: `<p><strong>${esc(actor.name)}</strong> gana 1 punto de reconocimiento: la ciudad recordará esto.</p>` });
  } else if (premio === "favor") {
    if (!await concederFavor(actor)) return;
    etiqueta = "un favor";
  } else if (premio === "entorno") {
    etiqueta = "mejora del entorno";
    await postCityNote({ title: "El entorno mejora", body: `<p>La actuación de <strong>${esc(actor.name)}</strong> facilita las cosas a sus compañeros: La Ciudad retira penalizadores o da por buena una acción conjunta.</p>` });
  } else {
    etiqueta = "información extra";
    await postCityNote({ title: "Información extra", body: `<p>La Ciudad aporta contexto a la pista de <strong>${esc(actor.name)}</strong> o la redirige a otra localización. No cuenta como pista.</p>` });
  }
  await message.update({ [`flags.${ID}.tn.resolved.premio`]: etiqueta });
}

export function registrarTarjetas() {
  alRenderizarMensaje((message, html) => {
    const tn = message.getFlag(ID, "tn");
    const tarjeta = html.querySelector("[data-tn-card]");
    if (!tn || !tarjeta || tarjeta.querySelector(".tn-card__actions, .tn-card__done")) return;
    if (tn.superseded) return;
    const actor = game.actors.get(tn.actorId);
    if (!actor) return;
    if (actor.isOwner && !tn.auto) {
      const pie = pieDueno(message, actor, tn);
      if (pie) tarjeta.append(pie);
    }
    if (game.user.isGM) {
      const pie = pieCiudad(message, tn, actor);
      if (pie) tarjeta.append(pie);
    }
  });
}

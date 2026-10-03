/**
 * Diálogos de juego. Todos recuerdan dónde se abrieron la última vez y avisan de lo que
 * costarán antes de aplicarlo: el resto de la interfaz previene el error en lugar de preguntar.
 */
import { DialogV2 } from "../compat.mjs";
import { ConMemoria } from "../memoria.mjs";
import { TN, estadoCaso, leerCiudad, getDetectives, getActiveStates, getRecognitionAvailable } from "../config.mjs";
import * as R from "../reglas.mjs";
import { postCityNote } from "../chat.mjs";

const esc = valor => foundry.utils.escapeHTML(String(valor ?? ""));

class DialogoTN extends ConMemoria(DialogV2) {
  static DEFAULT_OPTIONS = { classes: ["trueque-noir", "tn-dialog"], position: { width: 460 } };
  static CAMPOS_MEMORIA = ["left", "top", "width"];
}

/** Opción de una lista de radios con aspecto de ficha. */
const eleccion = (name, value, label, { detail = "", checked = false, disabled = false, reason = "" } = {}) => `
  <label class="tn-choice${disabled ? " is-disabled" : ""}"${disabled && reason ? ` title="${esc(reason)}"` : ""}>
    <input type="radio" name="${name}" value="${esc(value)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
    <span class="tn-choice__label">${label}</span>${detail ? `<small class="tn-choice__detail">${detail}</small>` : ""}
  </label>`;

const campo = (etiqueta, control, { hidden = false, id = "" } = {}) =>
  `<div class="tn-field"${id ? ` data-campo="${id}"` : ""} ${hidden ? "hidden" : ""}><label>${etiqueta}</label>${control}</div>`;

const opciones = (lista, seleccionada = "") =>
  lista.map(([valor, texto]) => `<option value="${esc(valor)}" ${valor === seleccionada ? "selected" : ""}>${esc(texto)}</option>`).join("");

/** Zonas de la ciudad construida, o las cuatro del manual si todavía no hay ciudad. */
export const zonas = () => {
  const { zones } = leerCiudad();
  return zones.length ? zones.map(z => z.zone) : ["Norte", "Sur", "Este", "Oeste"];
};

async function pedir({ memoria, titulo, icono, contenido, boton, iconoBoton = "fa-solid fa-check", peligro = false, render, ancho }) {
  // Las claves ausentes no deben viajar como `undefined`: ApplicationV2 las fusionaría como listas vacías.
  const opciones = { memoria, window: { title: titulo, icon: icono } };
  if (ancho) opciones.position = { width: ancho };
  if (peligro) opciones.classes = ["trueque-noir", "tn-dialog", "tn-dialog--danger"];
  const respuesta = await DialogoTN.wait({
    ...opciones,
    content: `<div class="tn-dialog__body">${contenido}</div>`,
    buttons: [
      { action: "ok", label: boton, icon: iconoBoton, default: !peligro, callback: (event, b) => Object.fromEntries(new FormData(b.form)) },
      { action: "no", label: "Cancelar", icon: "fa-solid fa-xmark", default: peligro }
    ],
    render: render ? (event, dialogo) => render(dialogo.element) : undefined,
    rejectClose: false
  });
  return respuesta && respuesta !== "no" ? respuesta : null;
}

/** Confirmación con las palabras exactas de la acción. Reservada para lo destructivo o irreversible. */
export async function confirmar({ title, message, detail = "", confirmLabel = "Confirmar", danger = false } = {}) {
  const r = await pedir({
    memoria: "dialogo-confirmar", titulo: title, icono: danger ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-circle-question",
    contenido: `<p class="tn-dialog__lead">${message}</p>${detail ? `<p class="tn-dialog__detail">${detail}</p>` : ""}`,
    boton: confirmLabel, iconoBoton: danger ? "fa-solid fa-trash-can" : "fa-solid fa-check", peligro: danger
  });
  return Boolean(r);
}

/** Un trago tranquilo: 2 cigarrillos o un estado personal, y una hipótesis sobre el caso (p. 65). */
export async function tragoTranquilo(actor) {
  const usados = Number(actor.system.caseStats?.quietDrinksUsed ?? 0);
  if (usados >= R.TRAGOS_POR_CASO) return ui.notifications.warn(`${actor.name} ya ha tomado los ${R.TRAGOS_POR_CASO} tragos tranquilos que permite el caso.`);
  const estados = getActiveStates(actor).filter(s => s.kind === "personal");
  const lleno = actor.cigarettes >= Number(actor.system.cigarettes.max);
  const r = await pedir({
    memoria: "dialogo-trago", titulo: `Un trago tranquilo · ${actor.name}`, icono: "fa-solid fa-whiskey-glass", boton: "Tomar el trago", iconoBoton: "fa-solid fa-whiskey-glass",
    contenido: `
      <p class="tn-dialog__lead">Le quedan ${R.TRAGOS_POR_CASO - usados} de ${R.TRAGOS_POR_CASO} en este caso. No cuesta ninguna franja de tiempo.</p>
      <div class="tn-field"><label>Beneficio · uno solo</label><div class="tn-choice-col">
        ${eleccion("mode", "cigarettes", "Recobrar 2 cigarrillos", { checked: true, detail: lleno ? "La cajetilla ya está llena" : `Lleva ${actor.cigarettes} de ${actor.system.cigarettes.max}` })}
        ${eleccion("mode", "state", "Recuperar un estado personal", { disabled: !estados.length, reason: "No tiene ningún estado personal activo.", detail: estados.length ? "" : "Ningún estado personal activo" })}
      </div></div>
      ${campo("Estado que se cura", `<select name="stateId">${opciones(estados.map(s => [s.id, s.label]))}</select>`, { hidden: true, id: "estado" })}
      <div class="tn-field"><label>Ahora que tienes un poco de tranquilidad… ¿qué crees que está pasando?</label><div class="tn-choice-col">
        ${eleccion("hypothesis", "correct", "La hipótesis va por buen camino", { checked: true, detail: "El dado del crimen se mantiene" })}
        ${eleccion("hypothesis", "wrong", "La hipótesis es errónea", { detail: "El dado del crimen sube 1" })}
      </div></div>`,
    render: el => {
      const alternar = () => { el.querySelector("[data-campo=estado]").hidden = el.querySelector("[name=mode]:checked")?.value !== "state"; };
      el.querySelectorAll("[name=mode]").forEach(radio => radio.addEventListener("change", alternar));
    }
  });
  if (!r) return false;
  const hecho = await actor.takeQuietDrink({ mode: r.mode, stateId: r.stateId, hypothesisCorrect: r.hypothesis !== "wrong" });
  if (hecho) await postCityNote({ title: "Un trago tranquilo", body: `<p><strong>${esc(actor.name)}</strong> se toma un respiro antes de volver al caso.${r.hypothesis === "wrong" ? " Su hipótesis era errónea: el crimen se propaga." : ""}</p>` });
  return hecho;
}

/** Ventajas entre casos que se pagan con reconocimiento (p. 54-55). */
export async function interludio(actor) {
  const disponible = getRecognitionAvailable(actor);
  const personales = getActiveStates(actor).filter(s => s.kind === "personal");
  const ciudad = getActiveStates(actor).filter(s => s.kind === "city");
  const favorLibre = Boolean(actor.freeFavorSlot());
  const trasfondos = TN.BACKGROUNDS.filter(b => b !== actor.system.background1 && b !== actor.system.background2);
  const lleno = actor.cigarettes >= Number(actor.system.cigarettes.max);
  const beneficios = [
    ["cigarettes2", "Recuperar 2 cigarrillos", lleno && "La cajetilla ya está llena"],
    ["personal", "Eliminar un estado personal", !personales.length && "No tiene estados personales"],
    ["city", "Eliminar un estado con la ciudad", !ciudad.length && "No tiene estados con la ciudad"],
    ["personTension", "Bajar la tensión de la persona", !Number(actor.system.stability.person.tension) && "Su persona está en tensión 0"],
    ["placeTension", "Bajar la tensión del lugar", !Number(actor.system.stability.place.tension) && "Su lugar está en tensión 0"],
    ["fullPack", "Reponer la cajetilla entera", lleno && "La cajetilla ya está llena"],
    ["favor", "Conseguir el favor de un grupo o PNJ", !favorLibre && `Ya guarda ${R.FAVORES_MAXIMOS} favores`],
    ["background", "Añadir un tercer trasfondo", actor.system.background3 && "Ya tiene su tercer trasfondo"]
  ];
  const primero = beneficios.find(([id, , bloqueo]) => !bloqueo && R.COSTE_INTERLUDIO[id] <= disponible)?.[0];
  const r = await pedir({
    memoria: "dialogo-interludio", titulo: `Interludio · ${actor.name}`, icono: "fa-solid fa-hourglass-half", boton: "Aplicar", iconoBoton: "fa-solid fa-medal",
    contenido: `
      <p class="tn-dialog__lead">Entre casos, el reconocimiento se convierte en ventajas duraderas. <strong>${esc(actor.name)}</strong> tiene <strong>${disponible}</strong> ${disponible === 1 ? "punto" : "puntos"} disponibles.</p>
      <div class="tn-field"><label>Ventaja</label><div class="tn-choice-col tn-choice-col--scroll">
        ${beneficios.map(([id, texto, bloqueo]) => {
          const coste = R.COSTE_INTERLUDIO[id];
          const sinPuntos = coste > disponible;
          return eleccion("benefit", id, texto, {
            detail: `${coste} ${coste === 1 ? "punto" : "puntos"}${bloqueo ? ` · ${bloqueo}` : sinPuntos ? " · faltan puntos" : ""}`,
            checked: id === primero, disabled: Boolean(bloqueo) || sinPuntos
          });
        }).join("")}
      </div></div>
      ${campo("Estado que desaparece", `<select name="statePersonal">${opciones(personales.map(s => [s.id, s.label]))}</select>`, { hidden: true, id: "personal" })}
      ${campo("Estado que desaparece", `<select name="stateCity">${opciones(ciudad.map(s => [s.id, s.label]))}</select>`, { hidden: true, id: "city" })}
      ${campo("Trasfondo nuevo", `<select name="background">${opciones(trasfondos.map(b => [b, b]))}</select>`, { hidden: true, id: "background" })}
      <div data-campo="favor" hidden>
        ${campo("Quién te debe el favor", `<input type="text" name="name" placeholder="Un grupo criminal, un PNJ…">`)}
        <div class="tn-field-row">
          ${campo("Sirve para", `<select name="scope">${opciones([["libre", "Cualquier tirada"], ["riesgo", "Tiradas de riesgo"], ["crimen", "Perseguir el crimen"]])}</select>`)}
          ${campo("Zona (opcional)", `<select name="zone"><option value="">Toda la ciudad</option>${opciones(zonas().map(z => [z, z]))}</select>`)}
        </div>
      </div>`,
    render: el => {
      const mostrar = () => {
        const id = el.querySelector("[name=benefit]:checked")?.value;
        for (const [campoId, activo] of [["personal", id === "personal"], ["city", id === "city"], ["background", id === "background"], ["favor", id === "favor"]]) {
          el.querySelector(`[data-campo=${campoId}]`).hidden = !activo;
        }
      };
      el.querySelectorAll("[name=benefit]").forEach(radio => radio.addEventListener("change", mostrar));
      mostrar();
    }
  });
  if (!r?.benefit) return false;
  const estado = r.benefit === "personal" ? r.statePersonal : r.benefit === "city" ? r.stateCity : "";
  return actor.applyInterludeBenefit(r.benefit, { state: estado, name: r.name, scope: r.scope, zone: r.zone, background: r.background });
}

/** «Conozco a un tipo que…» (p. 49). */
export async function contacto(actor) {
  if (actor.cigarettes < 1) return ui.notifications.warn(`${actor.name} necesita 1 cigarrillo para conocer a un tipo y no le queda ninguno.`);
  const r = await pedir({
    memoria: "dialogo-contacto", titulo: `Conozco a un tipo que… · ${actor.name}`, icono: "fa-solid fa-user-tie", boton: "Gastar 1 cigarrillo", iconoBoton: "fa-solid fa-smoking",
    contenido: `
      <p class="tn-dialog__lead">Gastas 1 cigarrillo y añades un contacto a tu agenda. Siempre tendrá algo que ofrecer.</p>
      ${campo("Nombre", `<input type="text" name="name" autofocus placeholder="Mickey, el que siempre anda trapicheando">`)}
      <div class="tn-field-row">
        ${campo("Zona", `<select name="zone">${opciones(zonas().map(z => [z, z]))}</select>`)}
        ${campo("Localización", `<input type="text" name="place" placeholder="Biblioteca, suburbios…">`)}
      </div>
      <div class="tn-field"><label>¿Qué te da?</label><div class="tn-choice-col">
        ${eleccion("offer", "pista", "Tiene una pista", { checked: true, detail: "Se revela con una tirada de perseguir el crimen" })}
        ${eleccion("offer", "ruta", "Redirige a localizaciones con pistas", { detail: "La Ciudad elige cuáles" })}
      </div></div>`
  });
  if (!r) return false;
  return actor.createContactFromCigarette({ name: r.name?.trim(), zone: r.zone, place: r.place?.trim(), offer: r.offer });
}

/** «Aquí han pasado cosas turbias» (p. 50). */
export async function rumor(actor) {
  if (actor.cigarettes < 1) return ui.notifications.warn(`${actor.name} necesita 1 cigarrillo para sembrar un rumor y no le queda ninguno.`);
  if (estadoCaso().rumor.activo) return ui.notifications.warn("Ya hay un rumor pendiente en el caso. Que alguien lo consuma en una tirada antes de sembrar otro.");
  const r = await pedir({
    memoria: "dialogo-rumor", titulo: `Aquí han pasado cosas turbias · ${actor.name}`, icono: "fa-solid fa-comment-dots", boton: "Sembrar el rumor", iconoBoton: "fa-solid fa-smoking",
    contenido: `
      <p class="tn-dialog__lead">Gastas 1 cigarrillo y dejas un +2 pendiente para una sola tirada de tus compañeros. Tú no podrás usarlo. Todo lo que cuentes pasa a ser verdad en la ciudad.</p>
      ${campo("Localización", `<input type="text" name="location" autofocus placeholder="Existente o nueva">`)}
      ${campo("La historia turbia", `<textarea name="story" rows="3"></textarea>`)}`
  });
  if (!r) return false;
  return actor.createRumorBonus({ location: r.location?.trim(), story: r.story?.trim() });
}

/** Ceder cigarrillos a un compañero en un momento de sosiego (p. 31). */
export async function cederCigarrillo(actor) {
  const otros = getDetectives().filter(d => d.id !== actor.id && d.cigarettes < Number(d.system.cigarettes.max));
  if (!actor.cigarettes) return ui.notifications.warn(`${actor.name} no tiene cigarrillos que ceder.`);
  if (!otros.length) return ui.notifications.warn("Ningún compañero tiene hueco en la cajetilla.");
  const r = await pedir({
    memoria: "dialogo-ceder", titulo: `Ceder cigarrillos · ${actor.name}`, icono: "fa-solid fa-hand-holding-hand", boton: "Pasarlo", iconoBoton: "fa-solid fa-smoking",
    contenido: `
      <p class="tn-dialog__lead">Solo en un momento de sosiego, no en una escena de acción.</p>
      ${campo("A quién", `<select name="to">${opciones(otros.map(d => [d.id, `${d.name} · ${d.cigarettes}/${d.system.cigarettes.max}`]))}</select>`)}
      ${campo("Cuántos", `<input type="number" name="amount" min="1" max="${actor.cigarettes}" value="1">`)}`
  });
  if (!r) return false;
  return actor.giveCigarette(r.to, Math.max(1, Math.min(Number(r.amount) || 1, actor.cigarettes)));
}

/** La Ciudad concede un favor tras un éxito limpio de riesgo (p. 34). */
export async function concederFavor(actor) {
  if (!actor.freeFavorSlot()) return ui.notifications.warn(`${actor.name} ya guarda ${R.FAVORES_MAXIMOS} favores.`);
  const r = await pedir({
    memoria: "dialogo-favor", titulo: `Un favor para ${actor.name}`, icono: "fa-solid fa-handshake", boton: "Conceder el favor", iconoBoton: "fa-solid fa-handshake",
    contenido: `
      <p class="tn-dialog__lead">Alguien le debe un favor de los grandes. Se traduce en un éxito automático cuando se cumplan las condiciones.</p>
      ${campo("Quién se lo debe", `<input type="text" name="name" autofocus placeholder="Un grupo criminal, un PNJ…">`)}
      <div class="tn-field-row">
        ${campo("Sirve para", `<select name="scope">${opciones([["libre", "Cualquier tirada"], ["riesgo", "Tiradas de riesgo"], ["crimen", "Perseguir el crimen"]])}</select>`)}
        ${campo("Zona (opcional)", `<select name="zone"><option value="">Toda la ciudad</option>${opciones(zonas().map(z => [z, z]))}</select>`)}
      </div>`
  });
  if (!r?.name?.trim()) return false;
  return actor.addFavor({ name: r.name.trim(), scope: r.scope, zone: r.zone });
}

/** Un caso nuevo a mano: nombre, dado inicial y duración (p. 81). */
export async function nuevoCaso() {
  const caso = estadoCaso();
  const r = await pedir({
    memoria: "dialogo-nuevo-caso", titulo: "Empezar un caso", icono: "fa-solid fa-folder-plus", boton: "Empezar el caso", iconoBoton: "fa-solid fa-play",
    contenido: `
      <p class="tn-dialog__lead">Se ponen a cero el reloj, las pistas, el rumor y las escenas flotantes. La ciudad y los detectives se conservan.</p>
      ${campo("Nombre del caso", `<input type="text" name="name" autofocus placeholder="Uno que evoque, pero no cuente nada">`)}
      <div class="tn-field-row">
        ${campo("Dado del crimen inicial", `<select name="dado">${opciones([["1", "1 · Fácil"], ["2", "2 · Medio"], ["3", "3 · Difícil"], ["4", "4 · Extremo"]], "2")}</select>`)}
        ${campo("Duración", `<select name="dias">${opciones([["3", "3 días · corto"], ["4", "4 días"], ["5", "5 días"], ["6", "6 días · largo"]], String(caso.limite >= 3 && caso.limite <= 6 ? caso.limite : 4))}</select>`)}
      </div>`
  });
  return r ? { name: r.name?.trim() || "Caso abierto", crimeDie: Number(r.dado), days: Number(r.dias) } : null;
}

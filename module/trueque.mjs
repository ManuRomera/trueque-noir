/**
 * El trueque (p. 40-46): La Ciudad propone dos consecuencias —una de «La ciudad se revuelve» y otra
 * de «Pagar el precio»— o las deja en manos de 2d4, y el detective elige cuál sufre.
 * Esta ventana recoge la decisión y aplica el efecto mecánico: dado del crimen, estados,
 * cigarrillos, reconocimiento, tensión de un pilar y tiempo del caso.
 */
import { ID, RUTA, TN, getDetectives } from "./config.mjs";
import * as R from "./reglas.mjs";
import { TRUEQUE_CIUDAD, TRUEQUE_PRECIO, SACRIFICIOS } from "./tablas.mjs";
import { postCityNote } from "./chat.mjs";
import { requestCaseOp } from "./case-state.mjs";
import { AppTN } from "./apps/base.mjs";
import { ventana } from "./compat.mjs";

const esc = valor => foundry.utils.escapeHTML(String(valor ?? ""));

/** Aplica una consecuencia sobre un detective y devuelve cómo contarla en el chat. */
async function aplicar(actor, tipo, id, d = {}) {
  if (tipo === "ciudad") {
    if (id === "propaga") { await requestCaseOp("changeCrimeDie", { amount: 1 }); return "El dado del crimen sube 1."; }
    if (id === "descuido") {
      const franjas = Math.max(1, Math.min(Number(d.franjas) || 1, 3));
      await requestCaseOp("shiftPhase", { delta: franjas });
      return `El tiempo se acorta: el reloj avanza ${franjas} ${franjas === 1 ? "franja" : "franjas"} y el culpable se aleja.`;
    }
    return id === "indeseables"
      ? "Aparece un grupo de enemigos: La Ciudad lo narra."
      : "Un contacto o PNJ queda expuesto: muere o queda marcado. La Ciudad lo narra.";
  }

  if (id === "problemas") {
    await actor.setState("personal", d.estadoPersonal, true);
    return `Adquiere el estado personal «${TN.PERSONAL_STATES.find(s => s.id === d.estadoPersonal)?.label ?? d.estadoPersonal}».`;
  }
  if (id === "recuerda") {
    await actor.setState("city", d.estadoCiudad, true);
    return `Adquiere el estado con la ciudad «${TN.CITY_STATES.find(s => s.id === d.estadoCiudad)?.label ?? d.estadoCiudad}».`;
  }
  if (id === "cara") {
    const pilar = actor.system.stability?.[d.pilar];
    const tension = await actor.increasePillarTension(d.pilar);
    return `${TN.PILLARS[d.pilar]} «${esc(pilar?.name || "sin nombre")}»: tensión ${tension}. Habrá una escena flotante esta noche.`;
  }
  // Sacrificio
  if (d.sacrificio === "cigarrillos") {
    const perdida = R.perdidaMitad(actor.cigarettes);
    await actor.setCigarettes(actor.cigarettes - perdida);
    return `Pierde la mitad de sus cigarrillos (${perdida}).`;
  }
  if (d.sacrificio === "reconocimiento") {
    await actor.addRecognition(-1);
    return "Pierde 1 punto de reconocimiento por sus métodos.";
  }
  const franjas = Math.max(1, Math.min(Number(d.franjas) || 1, 3));
  await requestCaseOp("shiftPhase", { delta: franjas });
  return `Pasa ${franjas === 1 ? "una franja" : `${franjas} franjas`} más en la localización: el reloj avanza.`;
}

export class DialogoTrueque extends AppTN {
  static DEFAULT_OPTIONS = {
    id: "trueque-noir-trueque",
    classes: ["tn-dialog", "tn-trueque-dialog"],
    tag: "form",
    position: { width: 680, height: "auto" },
    window: { title: "Trueque", icon: "fa-solid fa-right-left", resizable: false },
    actions: { azar: DialogoTrueque.#azar, aplicar: DialogoTrueque.#aplicar, cancelar() { this.close(); } }
  };

  static CAMPOS_MEMORIA = ["left", "top"];
  static PARTS = { cuerpo: { template: `${RUTA}/templates/apps/trueque.hbs` } };

  /** Abre el trueque de un detective, opcionalmente enlazado a la tarjeta de tirada que lo provocó. */
  static async resolver({ actorId = "", mensajeId = "" } = {}) {
    if (!game.user.isGM) return ui.notifications.warn("El trueque lo resuelve La Ciudad.");
    if (!getDetectives().length) return ui.notifications.warn("Todavía no hay ningún detective en la ciudad.");
    await ventana("trueque-noir-trueque")?.close();
    return new this({ actorId, mensajeId }).render({ force: true });
  }

  constructor({ actorId, mensajeId, ...options } = {}) {
    super(options);
    this.estado = { actorId, mensajeId, ciudad: "", precio: "", elige: "" };
  }

  get actor() {
    const detectives = getDetectives();
    return detectives.find(a => a.id === this.estado.actorId) ?? detectives[0];
  }

  async _prepareContext() {
    const actor = this.actor;
    const s = actor.system;
    const marca = (lista, elegido) => lista.map(fila => ({ ...fila, marcada: fila.id === elegido }));
    return {
      detectives: getDetectives().map(a => ({ id: a.id, name: a.name, seleccionado: a.id === actor.id })),
      ciudad: marca(TRUEQUE_CIUDAD, this.estado.ciudad),
      precio: marca(TRUEQUE_PRECIO, this.estado.precio),
      estadosPersonales: TN.PERSONAL_STATES.map(e => ({ ...e, activo: Boolean(s.personalStates[e.id]) })),
      estadosCiudad: TN.CITY_STATES.map(e => ({ ...e, activo: Boolean(s.cityStates[e.id]) })),
      sacrificios: SACRIFICIOS,
      pilares: Object.entries(TN.PILLARS).map(([id, etiqueta]) => ({
        id, etiqueta, name: s.stability[id].name || "sin nombre", tension: s.stability[id].tension, lleno: s.stability[id].tension >= R.TENSION_MAXIMA
      }))
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.addEventListener("change", event => {
      const campo = event.target;
      if (campo.name === "actorId") { this.estado.actorId = campo.value; return this.render(); }
      if (["ciudad", "precio", "elige"].includes(campo.name)) this.estado[campo.name] = campo.value;
      this.#sincronizar();
    });
    this.#sincronizar();
  }

  /** Muestra solo lo que hace falta según lo elegido y activa «Aplicar» cuando la decisión está completa. */
  #sincronizar() {
    const el = this.element;
    const { ciudad, precio, elige } = this.estado;
    const filaCiudad = TRUEQUE_CIUDAD.find(f => f.id === ciudad);
    const filaPrecio = TRUEQUE_PRECIO.find(f => f.id === precio);
    for (const etiqueta of el.querySelectorAll(".tn-trueque__col .tn-choice")) etiqueta.classList.toggle("is-picked", etiqueta.querySelector("input").checked);

    const bloque = el.querySelector("[data-elige]");
    bloque.hidden = !(filaCiudad && filaPrecio);
    if (filaCiudad && filaPrecio) {
      const marcas = { ciudad: filaCiudad, precio: filaPrecio };
      el.querySelector("[data-opciones-elige]").innerHTML = ["ciudad", "precio"].map(clave => `
        <label class="tn-pick"><input type="radio" name="elige" value="${clave}" ${elige === clave ? "checked" : ""}><span>${clave === "ciudad" ? "Se revuelve" : "Paga"}: ${esc(marcas[clave].titulo)}</span></label>`).join("");
    }

    const elegida = elige === "ciudad" ? filaCiudad : elige === "precio" ? filaPrecio : null;
    for (const c of el.querySelectorAll("[data-campo]")) c.hidden = true;
    const mostrar = nombre => { el.querySelector(`[data-campo=${nombre}]`).hidden = false; };
    el.querySelector("[data-detalle]").hidden = !elegida;
    if (elegida) {
      if (elegida.id === "descuido") mostrar("tiempo");
      if (elegida.id === "problemas") mostrar("estadoPersonal");
      if (elegida.id === "recuerda") mostrar("estadoCiudad");
      if (elegida.id === "cara") mostrar("pilar");
      if (elegida.id === "sacrificio") {
        mostrar("sacrificio");
        const tipo = el.querySelector("[name=sacrificio]:checked")?.value;
        if (tipo === "tiempo") mostrar("tiempo");
        el.querySelector("[data-pista-sacrificio]").textContent = tipo === "cigarrillos"
          ? `${this.actor.name} lleva ${this.actor.cigarettes} y perdería ${R.perdidaMitad(this.actor.cigarettes)}.` : "";
      }
    }
    const sinPilar = elegida?.id === "cara" && el.querySelector("[name=pilar]:checked") === null;
    el.querySelector("[data-boton-aplicar]").disabled = !elegida || sinPilar;
  }

  static async #azar() {
    const roll = await new Roll("2d4").evaluate();
    const [d1, d2] = roll.dice[0].results.map(r => r.result);
    this.estado.ciudad = TRUEQUE_CIUDAD[d1 - 1].id;
    this.estado.precio = TRUEQUE_PRECIO[d2 - 1].id;
    this.estado.elige = "";
    await roll.toMessage({
      speaker: { alias: "La Ciudad" },
      flavor: `Trueque al azar para ${esc(this.actor.name)}: <strong>${esc(TRUEQUE_CIUDAD[d1 - 1].titulo)}</strong> (1d4 = ${d1}) o <strong>${esc(TRUEQUE_PRECIO[d2 - 1].titulo)}</strong> (1d4 = ${d2}).`
    });
    this.render();
  }

  static async #aplicar() {
    const { ciudad, precio, elige, mensajeId } = this.estado;
    const filas = { ciudad: TRUEQUE_CIUDAD.find(f => f.id === ciudad), precio: TRUEQUE_PRECIO.find(f => f.id === precio) };
    const elegida = filas[elige];
    if (!elegida) return;
    const datos = Object.fromEntries(new FormData(this.element));
    const actor = this.actor;
    const efecto = await aplicar(actor, elige, elegida.id, {
      estadoPersonal: datos.estadoPersonal, estadoCiudad: datos.estadoCiudad, pilar: datos.pilar, sacrificio: datos.sacrificio, franjas: datos.franjas
    });
    const otra = elige === "ciudad" ? filas.precio : filas.ciudad;
    await postCityNote({
      title: "Trueque",
      body: `<p><strong>${esc(actor.name)}</strong> elige <strong>${esc(elegida.titulo)}</strong> y deja pasar «${esc(otra.titulo)}».</p><p>${efecto}</p>`
    });
    const mensaje = game.messages.get(mensajeId);
    if (mensaje) await mensaje.update({ [`flags.${ID}.tn.resolved.trueque`]: elegida.titulo });
    this.close();
  }
}

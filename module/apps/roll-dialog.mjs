import { RUTA, estadoCaso, getRecognitionAvailable } from "../config.mjs";
import * as R from "../reglas.mjs";
import { BACKGROUND_HELP } from "../background-help.mjs";
import { AppTN } from "./base.mjs";

const TIPO = {
  risk: { titulo: "Riesgo", icono: "fa-solid fa-bolt", pregunta: "¿Cómo afrontas esta situación?", resumen: "Actúas bajo presión y La Ciudad decide qué te cuesta." },
  pursue: { titulo: "Perseguir el Crimen", icono: "fa-solid fa-magnifying-glass", pregunta: "¿Cómo buscas la pista?", resumen: "Siempre la consigues: lo que está en juego es el precio." }
};

const esc = valor => foundry.utils.escapeHTML(String(valor ?? ""));

/** Diálogo de tirada: decides qué quieres hacer y ves qué va a pasar antes de tirar. */
export class DialogoTirada extends AppTN {
  static DEFAULT_OPTIONS = {
    classes: ["tn-dialog", "tn-roll-dialog"],
    tag: "form",
    position: { width: 520, height: "auto" },
    window: { resizable: false },
    actions: { tirar: DialogoTirada.#tirar, cancelar() { this.close(); } }
  };

  static CAMPOS_MEMORIA = ["left", "top"];
  static PARTS = { cuerpo: { template: `${RUTA}/templates/apps/roll-dialog.hbs` } };

  /** Un diálogo por detective y tipo de tirada. */
  static abrir(actor, type) {
    return new this({ actor, type, memoria: `dialogo-tirada-${type}`, window: { title: `${TIPO[type].titulo} · ${actor.name}`, icon: TIPO[type].icono } }).render({ force: true });
  }

  constructor({ actor, type, ...options }) {
    super(options);
    this.actor = actor;
    this.type = type;
  }

  async _prepareContext() {
    const actor = this.actor;
    const caso = estadoCaso();
    const reconocimiento = getRecognitionAvailable(actor);
    return {
      meta: TIPO[this.type],
      trasfondos: actor.backgroundOptions.map(nombre => ({ nombre, ayuda: BACKGROUND_HELP[nombre] ?? "" })),
      cigarrillos: actor.cigarettes,
      reconocimiento,
      reconocimientoPositivo: reconocimiento >= 1,
      rumor: { activo: caso.rumor.activo, texto: caso.rumor.texto, bloqueado: caso.rumor.por === actor.id },
      objetos: this.type === "pursue" ? actor.availableObjects() : [],
      favores: actor.availableFavors(this.type),
      esNoche: caso.esNoche
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const form = this.element;
    // Los controles apagados por falta de recursos no deben reactivarse solos.
    for (const campo of form.querySelectorAll("input:disabled")) campo.dataset.tnBloqueado = "true";
    form.addEventListener("change", () => this.#actualizar());
    this.#actualizar();
  }

  #valores() {
    const datos = new FormData(this.element);
    const ayuda = datos.get("help") || "";
    return {
      background: String(datos.get("background") || ""),
      useCigarette: ayuda === "cigarette",
      useRecognition: ayuda === "recognition",
      applyRumorBonus: Boolean(datos.get("applyRumorBonus")),
      nightVisit: Boolean(datos.get("nightVisit")),
      penalty: Boolean(datos.get("penalty")),
      favorSlot: String(datos.get("favorSlot") || ""),
      objectSlot: String(datos.get("objectSlot") || "")
    };
  }

  #actualizar() {
    const form = this.element;
    const actor = this.actor;
    const v = this.#valores();
    const conFavor = Boolean(v.favorSlot);

    // Con un favor la acción ya está resuelta: el resto de opciones no tendría efecto.
    for (const campo of form.querySelectorAll("[data-bloque]:not([data-bloque=favor]) input")) {
      campo.disabled = conFavor || campo.dataset.tnBloqueado === "true";
      if (conFavor && campo.type === "checkbox") campo.checked = false;
      if (conFavor && campo.type === "radio") campo.checked = campo.value === "";
    }
    for (const bloque of form.querySelectorAll("[data-bloque]:not([data-bloque=favor])")) bloque.classList.toggle("is-inactive", conFavor);

    // Una calada y una visita nocturna gastan un cigarrillo cada una: con uno solo no se permiten a la vez.
    if (!conFavor && actor.cigarettes < 2) {
      const noche = form.querySelector("[name=nightVisit]");
      const calada = form.querySelector("[name=help][value=cigarette]");
      const bloquear = (campo, motivo) => {
        if (!campo || campo.dataset.tnBloqueado === "true") return;
        campo.disabled = Boolean(motivo);
        campo.closest("label")?.classList.toggle("is-disabled", Boolean(motivo));
        if (motivo) campo.closest("label").dataset.tooltip = motivo;
      };
      bloquear(noche, v.useCigarette && "Con un solo cigarrillo no puedes pagar la calada y la visita nocturna.");
      bloquear(calada, v.nightVisit && "El cigarrillo que queda ya se gasta en la visita nocturna.");
    }

    form.querySelector("[data-boton-tirar] span").textContent = conFavor ? "Cobrar el favor" : "Tirar";
    form.querySelector("[data-resumen]").innerHTML = this.#resumen(v);
    this.setPosition({ height: "auto" });
  }

  #resumen(v) {
    const caso = estadoCaso();
    const peor = v.nightVisit || v.penalty;
    const pursue = this.type === "pursue";
    if (v.favorSlot) {
      const favor = this.actor.system.favors?.[v.favorSlot];
      return `<h4>Vas a hacer esto</h4><ul><li class="is-auto">Cobras «${esc(favor?.name)}»: la acción sale bien sin tirar${pursue ? " y consigues la pista" : ""}.</li></ul>`;
    }
    const formula = R.formulaTirada({ trasfondo: Boolean(v.background), penalizador: peor });
    const explicada = { "1d10": "1d10", "2d10kh": "2d10 · conservas el mejor", "2d10kl": "2d10 · conservas el peor" }[formula];
    const lineas = [`<li class="is-formula">${v.background && peor ? "1d10 · el trasfondo y el penalizador se anulan" : explicada}</li>`];
    if (v.useCigarette) lineas.push(`<li class="is-plus">+2 Cigarrillo · gastas 1</li>`);
    if (v.useRecognition) lineas.push(`<li class="is-plus">+2 Reconocimiento · gastas 1</li>`);
    if (v.applyRumorBonus) lineas.push(`<li class="is-plus">+2 Rumor · se consume</li>`);
    if (v.nightVisit) lineas.push(`<li class="is-minus">Visita nocturna · gastas 1 cigarrillo, sin bonificación</li>`);
    if (pursue) {
      const objeto = v.objectSlot && this.actor.system.representativeObjects?.[v.objectSlot]?.name;
      lineas.push(objeto ? `<li class="is-plus">${esc(objeto)} · ignoras el dado del crimen</li>` : `<li class="is-minus">Dado del crimen −${caso.dado}</li>`);
      lineas.push(`<li class="is-gain">Consigues 1 pista para el caso</li>`);
    }
    return `<h4>Vas a hacer esto</h4><ul>${lineas.join("")}</ul>`;
  }

  static async #tirar() {
    const valores = this.#valores();
    const resultado = this.type === "risk" ? await this.actor.rollRisk(valores) : await this.actor.rollPursueCrime(valores);
    // Si algo impidió tirar (sin recursos, favor ya cobrado…), el diálogo sigue abierto para corregirlo.
    if (resultado) this.close();
  }
}

export const abrirDialogoTirada = (actor, type) => DialogoTirada.abrir(actor, type);

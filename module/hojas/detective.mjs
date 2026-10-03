/**
 * Hoja del detective. Tres pestañas pensadas para la mesa:
 *  · Detective: todo lo que se toca jugando (trasfondos, pilares, objetos, favores, estados).
 *  · Investigación: pistas, contactos, rumor y el expediente de notas.
 *  · Historia: identidad y balada triste, lo que se escribe una vez.
 * La cabecera y el tablero de recursos son fijos. El modo compacto deja una tira estrecha
 * (cabecera, tablero, pilares y estados) para tener la ficha siempre a la vista sin tapar el mapa.
 */
import { ActorSheetV2, HandlebarsApplicationMixin } from "../compat.mjs";
import { ConMemoria } from "../memoria.mjs";
import { RUTA, TN, ESTADOS_FINALES, estadoCaso, getActiveStates, getRecognitionAvailable } from "../config.mjs";
import * as R from "../reglas.mjs";
import { BACKGROUND_HELP } from "../background-help.mjs";
import { abrirDialogoTirada } from "../apps/roll-dialog.mjs";
import { tragoTranquilo, contacto, rumor, cederCigarrillo, zonas } from "../apps/dialogos.mjs";
import { postCityNote } from "../chat.mjs";

const casillas = (valor, max) => Array.from({ length: max }, (_, i) => ({ n: i + 1, llena: i < valor }));

export class HojaDetective extends ConMemoria(HandlebarsApplicationMixin(ActorSheetV2)) {
  static DEFAULT_OPTIONS = {
    classes: ["trueque-noir", "tn-ficha", "tn-detective"],
    position: { width: 940, height: 660 },
    window: { icon: "fa-solid fa-user-secret", resizable: true },
    form: { submitOnChange: true },
    actions: {
      tirar: HojaDetective.#tirar,
      cigarrillo: HojaDetective.#cigarrillo,
      reconocimiento: HojaDetective.#reconocimiento,
      tension: HojaDetective.#tension,
      trago: HojaDetective.#trago,
      descanso: HojaDetective.#descanso,
      ceder: HojaDetective.#ceder,
      contacto: HojaDetective.#contacto,
      rumor: HojaDetective.#rumor,
      anadirContacto: HojaDetective.#anadirContacto,
      quitarContacto: HojaDetective.#quitarContacto,
      limpiarFavor: HojaDetective.#limpiarFavor,
      cajetilla: HojaDetective.#cajetilla,
      compacto: HojaDetective.#compacto,
      abrirPanel: () => game.truequeNoir.abrirPanel(),
      abrirMesa: () => game.truequeNoir.abrirMesa()
    }
  };

  static COMPACTO = { width: 400, height: 640 };
  static SCROLL_MEMORIA = [".tn-cuerpo"];
  static PARTS = { hoja: { template: `${RUTA}/templates/actors/detective-sheet.hbs`, scrollable: [".tn-cuerpo"] } };
  static REACTIVA = true;

  static TABS = {
    primary: {
      initial: "juego",
      tabs: [
        { id: "juego", label: "Detective", icon: "fa-solid fa-user-secret" },
        { id: "investigacion", label: "Investigación", icon: "fa-solid fa-magnifying-glass" },
        { id: "historia", label: "Historia", icon: "fa-solid fa-feather-pointed" }
      ]
    }
  };

  get title() {
    return this.document.name;
  }

  async _prepareContext(options) {
    const base = await super._prepareContext(options);
    const actor = this.document;
    const s = actor.system;
    const caso = estadoCaso();
    const recDisponible = getRecognitionAvailable(actor);
    const estados = getActiveStates(actor);
    const tab = this.tabGroups.primary ?? "juego";

    const trasfondos = [1, 2, 3].map(n => {
      const valor = s[`background${n}`];
      return {
        n, campo: `system.background${n}`, valor,
        etiqueta: n === 3 ? "Extra" : `Trasfondo ${n}`,
        ayuda: n === 3 ? "Tercer trasfondo: se adquiere entre casos con 3 puntos de reconocimiento." : "Si el trasfondo ayuda en la acción, tiras 2d10 y conservas el mejor.",
        descripcion: BACKGROUND_HELP[valor] ?? "",
        opciones: TN.BACKGROUNDS.map(b => ({ b, seleccionada: b === valor, bloqueada: b !== valor && [1, 2, 3].some(m => m !== n && s[`background${m}`] === b) }))
      };
    });

    const pilares = Object.entries(TN.PILLARS).map(([id, etiqueta]) => {
      const p = s.stability[id];
      return {
        id, etiqueta, campo: `system.stability.${id}`, name: p.name, tension: p.tension,
        casillas: casillas(p.tension, R.TENSION_MAXIMA), roto: p.tension >= R.TENSION_MAXIMA,
        pista: id === "person" ? "¿Quién te mantiene en pie?" : "¿Qué lugar te da paz?"
      };
    });

    const huecos = ["slot1", "slot2"];
    const alcances = [["libre", "Cualquier tirada"], ["riesgo", "Solo riesgo"], ["crimen", "Solo perseguir el crimen"]];
    const favores = huecos.map((slot, i) => ({ slot, n: i + 1, ...s.favors[slot], alcances: alcances.map(([v, t]) => ({ v, t, sel: v === s.favors[slot].scope })) }));
    const objetos = huecos.map((slot, i) => ({ slot, n: i + 1, ...s.representativeObjects[slot] }));

    const grupo = (lista, valores, personalizado, activoPersonalizado, tipo) => ({
      tipo,
      lista: lista.map(e => ({ ...e, activo: Boolean(valores[e.id]), final: ESTADOS_FINALES.includes(e.id) })),
      personalizado, activoPersonalizado
    });

    return Object.assign(base, {
      actor, system: s,
      isGM: game.user.isGM,
      editable: this.isEditable,
      compacto: this.compacto,
      tab,
      tabs: this.constructor.TABS.primary.tabs.map(t => ({ ...t, activa: t.id === tab })),
      caso,
      sellos: estados,
      cigarrillos: { valor: s.cigarettes.value, max: s.cigarettes.max, casillas: casillas(s.cigarettes.value, s.cigarettes.max) },
      reconocimiento: { disponible: recDisponible, total: s.recognition.total, gastado: s.recognition.spent, negativo: recDisponible < 0 },
      trasfondos, pilares, favores, objetos,
      estadosPersonales: grupo(TN.PERSONAL_STATES, s.personalStates, s.personalStates.custom, s.personalStates.customActive, "personalStates"),
      estadosCiudad: grupo(TN.CITY_STATES, s.cityStates, s.cityStates.custom, s.cityStates.customActive, "cityStates"),
      tragos: { usados: s.caseStats.quietDrinksUsed, restantes: R.TRAGOS_POR_CASO - s.caseStats.quietDrinksUsed },
      contactos: s.contacts.list.map((c, i) => ({ ...c, i })),
      zonas: zonas(),
      ajusteAbierto: this.abierto("ajuste", false),
      rumorActivo: caso.rumor.activo,
      saleDeLaCiudad: estados.some(e => e.final),
      pistaProgreso: casillas(caso.pistas.progreso, R.PISTAS_POR_PASO)
    });
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.classList.toggle("compacto", this.compacto);
    this.changeTab(this.tabGroups.primary ?? "juego", "primary", { force: true });
    // Escribir en un estado libre lo activa: la casilla va dentro de la propia etiqueta y no se ve.
    for (const texto of this.element.querySelectorAll(".tn-estado--libre input[type=text]")) {
      texto.addEventListener("input", () => { texto.closest("label").querySelector("input[type=checkbox]").checked = texto.value.trim() !== ""; });
    }
  }

  /** Un tamaño de cajetilla absurdo se corrige al guardar: el valor nunca pasa del máximo. */
  _processFormData(event, form, formData) {
    const datos = super._processFormData(event, form, formData);
    const s = datos.system;
    if (s?.cigarettes) {
      const max = Math.max(0, Math.trunc(Number(s.cigarettes.max ?? this.document.system.cigarettes.max)));
      s.cigarettes.max = max;
      s.cigarettes.value = Math.max(0, Math.min(Math.trunc(Number(s.cigarettes.value ?? this.document.system.cigarettes.value)), max));
    }
    return datos;
  }

  // -------------------------------------------------------------- Acciones

  static #tirar(event, boton) {
    abrirDialogoTirada(this.document, boton.dataset.tipo);
  }

  /** Clic en un cigarrillo: lo deja como valor; clic en el último lleno, lo gasta. */
  static #cigarrillo(event, boton) {
    const n = Number(boton.dataset.n);
    this.document.setCigarettes(n === this.document.cigarettes ? n - 1 : n);
  }

  static #cajetilla(event, boton) {
    this.document.setCigaretteMax(Number(boton.dataset.max));
  }

  static #reconocimiento(event, boton) {
    if (boton.dataset.sentido === "gastar") this.document.spendRecognition(1);
    else this.document.addRecognition(1);
  }

  /** Subir la tensión es un hecho del juego (anota una escena flotante); bajarla, una corrección o un interludio. */
  static #tension(event, boton) {
    const { pilar, sentido } = boton.dataset;
    if (sentido === "subir") this.document.increasePillarTension(pilar);
    else this.document.lowerPillarTension(pilar);
  }

  static #trago() {
    tragoTranquilo(this.document);
  }

  static async #descanso() {
    const actor = this.document;
    await actor.takeNightRest();
    await postCityNote({ title: "Descanso", body: `<p><strong>${foundry.utils.escapeHTML(actor.name)}</strong> pasa la noche en su pilar de estabilidad y recupera 1 cigarrillo.</p>` });
  }

  static #ceder() { cederCigarrillo(this.document); }
  static #contacto() { contacto(this.document); }
  static #rumor() { rumor(this.document); }

  static async #anadirContacto() {
    const lista = this.document.system.toObject().contacts.list;
    lista.push({ name: "", zone: "", place: "", offer: "pista", done: false });
    await this.document.update({ "system.contacts.list": lista });
  }

  static async #quitarContacto(event, boton) {
    const lista = this.document.system.toObject().contacts.list;
    lista.splice(Number(boton.dataset.i), 1);
    await this.document.update({ "system.contacts.list": lista });
  }

  static #limpiarFavor(event, boton) {
    this.document.update({ [`system.favors.${boton.dataset.slot}`]: { name: "", scope: "libre", zone: "", used: false } });
  }

  static #compacto() {
    this.alternarCompacto();
  }
}

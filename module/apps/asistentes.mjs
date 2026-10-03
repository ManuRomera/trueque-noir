/**
 * Los dos asistentes del sistema: construir la ciudad (4 pasos) y crear un detective (5 pasos).
 * Siguen el orden del manual y generan una propuesta completa al azar con las tablas de la
 * ambientación elegida. Con Intro se avanza de paso.
 */
import { ID, RUTA, TN, getDetectives } from "../config.mjs";
import * as R from "../reglas.mjs";
import { THEME_LIST, getTheme, themeTables, DEFAULT_THEME } from "../themes.mjs";
import { applySceneTheme } from "../scene-setup.mjs";
import { AppTN } from "./base.mjs";

const ZONAS = ["Norte", "Sur", "Este", "Oeste"];
const esc = valor => foundry.utils.escapeHTML(String(valor ?? ""));
const uno = lista => lista[Math.floor(Math.random() * lista.length)];
const varios = (lista, n) => [...lista].sort(() => Math.random() - 0.5).slice(0, n);

const temaActivo = () => game.settings.get(ID, "cityTheme") ?? DEFAULT_THEME;
const opcionesTema = elegido => THEME_LIST.map(t => `<option value="${t.id}" ${t.id === elegido ? "selected" : ""}>${esc(t.label)}</option>`).join("");

class Asistente extends AppTN {
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["tn-app", "tn-wizard-app"],
    position: { width: 780, height: "auto" },
    form: { handler: Asistente.#intro, submitOnChange: false, closeOnSubmit: false },
    actions: {
      irPaso(event, boton) { this.mostrar(Number(boton.dataset.paso)); },
      azar() { this.azar(); },
      crear() { return this.crear(); }
    }
  };

  static CAMPOS_MEMORIA = ["left", "top", "width"];
  paso = 1;

  /** Intro dentro de un campo avanza al paso siguiente en lugar de enviar el formulario. */
  static #intro() {
    const ultimo = this.element.querySelectorAll(".tn-wizard__step").length;
    if (this.paso < ultimo) this.mostrar(this.paso + 1);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.mostrar(this.paso);
    if (options.isFirstRender) this.alAbrir?.();
  }

  mostrar(paso) {
    this.paso = paso;
    const el = this.element;
    for (const seccion of el.querySelectorAll(".tn-wizard__step")) seccion.hidden = Number(seccion.dataset.paso) !== paso;
    for (const boton of el.querySelectorAll(".tn-stepper [data-paso]")) {
      const n = Number(boton.dataset.paso);
      boton.classList.toggle("is-active", n === paso);
      boton.classList.toggle("is-done", n < paso);
    }
    this.alPaso?.(paso);
    this.setPosition({ height: "auto" });
    el.querySelector(`.tn-wizard__step[data-paso="${paso}"] input:not([type=hidden]), .tn-wizard__step[data-paso="${paso}"] textarea`)?.focus();
  }

  valor(nombre) {
    return String(this.element.querySelector(`[name='${nombre}']`)?.value ?? "").trim();
  }

  rellenar(valores) {
    for (const [nombre, valor] of Object.entries(valores)) {
      const campo = this.element.querySelector(`[name='${nombre}']`);
      if (campo) campo.value = valor;
    }
  }

  /** Ambientación elegida en el propio asistente, o la de la ciudad si no hay selector. */
  get tema() {
    return themeTables(this.valor("theme") || temaActivo());
  }
}

// ──────────────────────────────────────────────────────────── Detective

const CAMPOS_DETECTIVE = ["name", "roleTag", "look", "belief", "temperament", "age", "motivation", "background1", "background2", "object1", "object2", "person", "place", "rumor"];

function detectiveAlAzar(tema) {
  const fondos = varios(TN.BACKGROUNDS, 2);
  const objetos = varios(tema.objects, 2);
  return {
    name: `${uno(tema.names)} ${uno(tema.surnames)}`, roleTag: uno(tema.roles), look: uno(tema.looks), belief: uno(tema.beliefs),
    temperament: uno(tema.temperaments), age: String(27 + Math.floor(Math.random() * 33)), motivation: uno(tema.motivations),
    background1: fondos[0], background2: fondos[1], object1: objetos[0], object2: objetos[1],
    person: uno(tema.people), place: uno(tema.places), rumor: uno(tema.rumors)
  };
}

export class AsistenteDetective extends Asistente {
  static DEFAULT_OPTIONS = {
    id: "trueque-noir-character-generator",
    window: { title: "Crear detective", icon: "fa-solid fa-user-plus", resizable: false }
  };

  static PARTS = { cuerpo: { template: `${RUTA}/templates/apps/character-generator.hbs` } };
  static MEMORIA = "asistente-detective";

  async _prepareContext() {
    return { backgrounds: TN.BACKGROUNDS, themeOptions: opcionesTema(temaActivo()) };
  }

  alAbrir() {
    this.rellenar({ background1: TN.BACKGROUNDS[0], background2: TN.BACKGROUNDS[1] });
    this.element.querySelector("[name=background1]").addEventListener("change", () => this.#fondosDistintos());
    this.element.querySelector("[name=background2]").addEventListener("change", () => this.#fondosDistintos());
    this.#fondosDistintos();
  }

  /** Dos trasfondos distintos: cada selector no ofrece el que ya eligió el otro. */
  #fondosDistintos() {
    const [a, b] = ["background1", "background2"].map(n => this.element.querySelector(`[name=${n}]`));
    for (const [campo, otro] of [[a, b], [b, a]]) for (const opcion of campo.options) opcion.disabled = opcion.value === otro.value;
  }

  alPaso(paso) {
    if (paso !== 5) return;
    const d = Object.fromEntries(CAMPOS_DETECTIVE.map(c => [c, this.valor(c)]));
    const fila = (etiqueta, valor) => `<div class="tn-summary__row"><dt>${etiqueta}</dt><dd>${esc(valor) || "<em>sin definir</em>"}</dd></div>`;
    this.element.querySelector("[data-summary]").innerHTML = `
      <h3 class="tn-summary__name">${esc(d.name) || "Detective sin nombre"}</h3>
      <p class="tn-summary__role">${esc(d.roleTag)}</p>
      <dl class="tn-summary__list">
        ${fila("Físico", d.look)}${fila("Trasfondos", [d.background1, d.background2].filter(Boolean).join(" · "))}
        ${fila("Objetos", [d.object1, d.object2].filter(Boolean).join(" · "))}${fila("Persona", d.person)}${fila("Lugar", d.place)}
        ${fila("Motivación", d.motivation)}${fila("Se cuenta de él", d.rumor)}
      </dl>`;
    this.element.querySelector("[data-boton-crear]").disabled = !d.name;
    this.element.querySelector("[data-aviso]").hidden = Boolean(d.name);
  }

  azar() {
    this.rellenar(detectiveAlAzar(this.tema));
    this.#fondosDistintos();
  }

  async crear() {
    const d = Object.fromEntries(CAMPOS_DETECTIVE.map(c => [c, this.valor(c)]));
    if (!d.name) return ui.notifications.warn("El detective necesita un nombre antes de entrar en la ciudad.");
    // La cajetilla se reparte entre el grupo: 9 con dos detectives, 6 con tres (p. 31).
    const cajetilla = R.cigarrillosPorDetective(getDetectives().length + 1);
    const actor = await Actor.create({
      name: d.name, type: "detective", img: TN.PORTRAIT,
      prototypeToken: { texture: { src: TN.TOKEN }, name: d.name, actorLink: true },
      system: {
        roleTag: d.roleTag, look: d.look, belief: d.belief, temperament: d.temperament, age: d.age, motivation: d.motivation,
        background1: d.background1, background2: d.background2,
        cigarettes: { value: cajetilla, max: cajetilla },
        representativeObjects: { slot1: { name: d.object1 }, slot2: { name: d.object2 } },
        stability: { person: { name: d.person }, place: { name: d.place } },
        baladaRumor: d.rumor
      }
    });
    this.close();
    if (actor) {
      actor.sheet.render(true);
      ui.notifications.info(`${d.name} ya camina por la ciudad.`);
    }
  }
}

// ─────────────────────────────────────────────────────────────── Ciudad

export class AsistenteCiudad extends Asistente {
  static DEFAULT_OPTIONS = {
    id: "trueque-noir-city-generator",
    position: { width: 860 },
    window: { title: "Construir la ciudad", icon: "fa-solid fa-city", resizable: false }
  };

  static PARTS = { cuerpo: { template: `${RUTA}/templates/apps/city-generator.hbs` } };
  static MEMORIA = "asistente-ciudad";

  async _prepareContext() {
    return { zones: ZONAS, themeOptions: opcionesTema(temaActivo()), commonLocations: getTheme(temaActivo()).locations };
  }

  alAbrir() {
    this.#cargarCiudad();
    this.element.querySelector("[name=theme]").addEventListener("change", () => this.#pintarLocalizaciones());
    this.#pintarLocalizaciones();
  }

  /** Las catorce localizaciones comunes, dichas con las palabras de la ambientación. */
  #pintarLocalizaciones() {
    this.element.querySelector("[data-locations]").innerHTML = this.tema.locations.map(n => `<span class="tn-chip">${esc(n)}</span>`).join("");
  }

  /** Editar la ciudad existente no obliga a reescribirla desde cero. */
  #cargarCiudad() {
    try {
      const ciudad = JSON.parse(game.settings.get(ID, "cityData") || "{}");
      if (ciudad.theme) this.rellenar({ theme: ciudad.theme });
      this.rellenar(Object.fromEntries(["cityName", "context", "wanted", "unwanted"].map(c => [c, ciudad[c] || ""])));
      for (const zona of ciudad.zones || []) {
        const prefijo = String(zona.zone || "").toLowerCase();
        if (prefijo) this.rellenar(Object.fromEntries(["name", "traits", "controller", "extra"].map(c => [`${prefijo}${c[0].toUpperCase()}${c.slice(1)}`, zona[c] || ""])));
      }
    } catch (error) {
      console.warn("trueque-noir | Datos de ciudad no válidos", error);
    }
  }

  #leerZonas() {
    return ZONAS.map(zona => {
      const id = zona.toLowerCase();
      return { zone: zona, name: this.valor(`${id}Name`), traits: this.valor(`${id}Traits`), controller: this.valor(`${id}Controller`), extra: this.valor(`${id}Extra`) };
    });
  }

  alPaso(paso) {
    if (paso !== 4) return;
    const nombre = this.valor("cityName");
    this.element.querySelector("[data-summary]").innerHTML = `
      <h3 class="tn-summary__name">${esc(nombre) || "Ciudad sin nombre"}</h3>
      <p class="tn-summary__role">${esc(getTheme(this.valor("theme")).label)} · ${esc(this.valor("context"))}</p>
      <div class="tn-zonas">${this.#leerZonas().map(z => `
        <article class="tn-zona"><span class="tn-zona__rumbo">${z.zone}</span><strong>${esc(z.name) || "—"}</strong>
          <small>${esc(z.traits)}</small><small>Controla: ${esc(z.controller) || "—"}</small><em>${esc(z.extra)}</em></article>`).join("")}</div>
      <p class="tn-ciudad__limites"><strong>Queremos ver:</strong> ${esc(this.valor("wanted")) || "—"} · <strong>No queremos ver:</strong> ${esc(this.valor("unwanted")) || "—"}</p>`;
    this.element.querySelector("[data-boton-crear]").disabled = !nombre;
    this.element.querySelector("[data-aviso]").hidden = Boolean(nombre);
  }

  azar() {
    const tema = this.tema;
    this.rellenar({ cityName: `${uno(tema.city.prefix)} ${uno(tema.city.suffix)}`, context: uno(tema.contexts), wanted: uno(tema.wanted), unwanted: uno(tema.unwanted) });
    const nombres = varios(tema.zones, ZONAS.length);
    const mandos = varios(tema.controllers, ZONAS.length);
    const extras = varios(tema.extras, ZONAS.length);
    ZONAS.forEach((zona, i) => {
      const id = zona.toLowerCase();
      this.rellenar({ [`${id}Name`]: `${zona} · ${nombres[i]}`, [`${id}Traits`]: varios(tema.traits, 2).join(", "), [`${id}Controller`]: mandos[i], [`${id}Extra`]: extras[i] });
    });
  }

  async crear() {
    const nombre = this.valor("cityName");
    if (!nombre) return ui.notifications.warn("La ciudad necesita un nombre antes de guardarse.");
    const temaId = this.valor("theme") || temaActivo();
    const tema = getTheme(temaId);
    const zonas = this.#leerZonas();
    const [contexto, queremos, noQueremos] = ["context", "wanted", "unwanted"].map(c => this.valor(c));

    const htmlZonas = zonas.map(z => `<h2>${esc(z.zone)}: ${esc(z.name)}</h2><p><strong>Rasgos:</strong> ${esc(z.traits)}</p><p><strong>Control:</strong> ${esc(z.controller)}</p><p><strong>Localización propia:</strong> ${esc(z.extra)}</p>`).join("");
    const paginas = [
      { name: "Contexto y límites", type: "text", text: { content: `<h1>${esc(nombre)}</h1><p><em>${esc(tema.label)}</em></p><p>${esc(contexto)}</p><h2>Queremos ver</h2><p>${esc(queremos)}</p><h2>No queremos ver</h2><p>${esc(noQueremos)}</p>` } },
      { name: "Cuatro zonas", type: "text", text: { content: htmlZonas } },
      { name: "Localizaciones comunes", type: "text", text: { content: `<p>${tema.locations.map(esc).join(" · ")}</p>` } }
    ];

    // Editar la ciudad actualiza su diario en lugar de acumular copias. La ciudad la construye toda la mesa: todos pueden leerla.
    const existente = game.journal.find(e => e.getFlag(ID, "generatedCity"));
    if (existente) await existente.delete();
    await JournalEntry.create({ name: `Ciudad · ${nombre}`, pages: paginas, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER }, flags: { [ID]: { generatedCity: true } } });

    await game.settings.set(ID, "cityName", nombre);
    await game.settings.set(ID, "cityData", JSON.stringify({ cityName: nombre, theme: temaId, context: contexto, wanted: queremos, unwanted: noQueremos, zones: zonas }));
    if (this.element.querySelector("[name=applyScene]")?.checked) await applySceneTheme(temaId);
    else await game.settings.set(ID, "cityTheme", temaId);

    ui.notifications.info(`${nombre} ya está en el Panel de La Ciudad.`);
    this.close();
    game.truequeNoir.abrirPanel();
  }
}

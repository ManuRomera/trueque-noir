import { TN } from "./config.mjs";
import { LegacyApplication } from "./compat.mjs";

const ZONES = ["Norte", "Sur", "Este", "Oeste"];
const COMMON_LOCATIONS = ["Bloques de viviendas", "Comisaría", "Cementerio", "Suburbio", "Morgue", "Afueras", "Periódico local", "Pub", "Iglesia local", "Biblioteca", "Tienda de antigüedades", "Hostal", "Psiquiátrico", "Pequeño hospital"];
const NAMES = ["Ada", "Alma", "Bruno", "Cora", "Dante", "Elena", "Félix", "Greta", "Héctor", "Inés", "Jano", "Lara", "Mara", "Nico", "Olivia", "Rocco", "Sara", "Tomás", "Vera", "Walter"];
const SURNAMES = ["Black", "Vega", "Salvat", "Cross", "Montalbán", "Rivas", "Noir", "Doyle", "Caine", "Valdés", "Stone", "Ferrara", "Grey", "Lorca", "Marlow"];
const LOOKS = ["gabardina gastada y mirada insomne", "traje impecable que nunca encaja con el barrio", "cicatriz en la ceja y manos de boxeador", "ropa práctica, pelo corto y ojos que no olvidan", "sombrero viejo, barba de dos días y una leve cojera", "aspecto frágil, voz firme y dedos manchados de tinta"];
const BELIEFS = ["la bondad existe, pero siempre llega tarde", "Dios dejó de mirar esta ciudad", "toda persona tiene un precio", "la verdad importa aunque destruya a quien la encuentra", "la decadencia humana es una elección", "nadie nace culpable"];
const TEMPERAMENTS = ["metódico y distante", "irónico y protector", "impulsivo pero leal", "paciente hasta que deja de serlo", "obstinado y compasivo", "silencioso y feroz"];
const MOTIVATIONS = ["limpiar las calles", "cumplir una promesa", "conseguir un ascenso", "vengarse de quien arruinó a su familia", "salir algún día de la ciudad", "demostrar que un caso antiguo fue cerrado en falso"];
const OBJECTS = ["un mechero grabado", "una placa antigua", "una cámara plegable", "un revólver heredado", "una libreta impermeable", "un reloj detenido", "una petaca de plata", "una fotografía rota", "una ganzúa artesanal", "un rosario ennegrecido"];
const PEOPLE = ["su hermana", "un antiguo compañero", "la dueña del pub", "su padre enfermo", "una periodista local", "un confidente de los suburbios"];
const PLACES = ["la azotea de la comisaría", "una mesa del pub", "el archivo de la biblioteca", "el banco del cementerio", "el viejo muelle", "una capilla abandonada"];
const RUMORS = ["dejó morir a un compañero", "aceptó dinero de una banda", "falsificó una prueba para salvar a alguien", "conoce la identidad de un asesino nunca detenido", "incendió el lugar donde creció"];
const ROLES = ["Inspectora", "Sabueso", "Forense", "Agente de homicidios", "Policía de barrio", "Detective veterano"];
const EXTRA_LOCATIONS = ["casino clandestino", "gimnasio de boxeo", "estación de radio", "club de jazz", "matadero", "archivo municipal", "cine abandonado", "mercado nocturno", "astillero", "laboratorio privado", "hotel de lujo", "lavandería abierta de madrugada"];
const ZONE_TRAITS = ["próspera", "industrial", "decadente", "inundada", "vigilada", "bohemia", "calcinada", "aislada", "corrupta", "superpoblada", "silenciosa", "violenta"];
const CONTROLLERS = ["un sindicato de estibadores", "una familia de empresarios", "una banda de moteros", "un predicador y sus fieles", "la policía corrupta", "una red de contrabando", "un cacique inmobiliario", "un club de veteranos"];
const CITY_PREFIX = ["Cape", "Grey", "Saint", "New", "Port", "Black"];
const CITY_SUFFIX = ["Hook", "Haven", "Mercy", "Vega", "Cross", "Bay"];
const CITY_CONTEXTS = ["Años 20, ley seca y lluvia incesante", "Años 90, ciudad portuaria aislada", "Distopía industrial bajo vigilancia", "Metrópolis costera contemporánea en decadencia", "Ciudad victoriana cubierta de niebla"];

const pick = list => list[Math.floor(Math.random() * list.length)];
const sample = (list, count) => [...list].sort(() => Math.random() - 0.5).slice(0, count);
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

/** Lógica común de los dos asistentes: pasos, puntos de progreso y lectura del formulario. */
class TruequeNoirWizard extends LegacyApplication {
  activateListeners(html) {
    super.activateListeners(html);
    const root = html[0] ?? html;
    this._root = root;
    this._step = 1;

    for (const button of root.querySelectorAll("[data-next]")) {
      button.addEventListener("click", () => this.goTo(Number(button.dataset.next)));
    }
    for (const button of root.querySelectorAll("[data-prev]")) {
      button.addEventListener("click", () => this.goTo(Number(button.dataset.prev)));
    }
    for (const dot of root.querySelectorAll("[data-step-dot]")) {
      dot.addEventListener("click", () => this.goTo(Number(dot.dataset.stepDot)));
    }
    this.goTo(1);
  }

  goTo(step) {
    const root = this._root;
    if (!root) return;
    this._step = step;
    for (const section of root.querySelectorAll("[data-step]")) {
      section.hidden = Number(section.dataset.step) !== step;
    }
    for (const dot of root.querySelectorAll("[data-step-dot]")) {
      const index = Number(dot.dataset.stepDot);
      dot.classList.toggle("is-active", index === step);
      dot.classList.toggle("is-done", index < step);
    }
    this.onStep?.(step);
  }

  value(name) {
    return String(this._root?.querySelector(`[name='${name}']`)?.value ?? "").trim();
  }

  fill(values) {
    for (const [name, value] of Object.entries(values)) {
      const field = this._root?.querySelector(`[name='${name}']`);
      if (field) field.value = value;
    }
  }
}

function randomDetective() {
  const backgrounds = sample(TN.BACKGROUNDS, 2);
  const objects = sample(OBJECTS, 2);
  return {
    name: `${pick(NAMES)} ${pick(SURNAMES)}`,
    roleTag: pick(ROLES),
    look: pick(LOOKS),
    belief: pick(BELIEFS),
    temperament: pick(TEMPERAMENTS),
    age: String(27 + Math.floor(Math.random() * 33)),
    motivation: pick(MOTIVATIONS),
    background1: backgrounds[0],
    background2: backgrounds[1],
    object1: objects[0],
    object2: objects[1],
    person: pick(PEOPLE),
    place: pick(PLACES),
    rumor: pick(RUMORS)
  };
}

const DETECTIVE_FIELDS = ["name", "roleTag", "look", "belief", "temperament", "age", "motivation", "background1", "background2", "object1", "object2", "person", "place", "rumor"];

export class TruequeNoirCharacterGenerator extends TruequeNoirWizard {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trueque-noir-character-generator",
      classes: ["trueque-noir", "tn-app", "tn-wizard-app"],
      title: "Crear detective",
      template: "systems/trueque-noir/templates/apps/character-generator.hbs",
      width: 720,
      height: 700,
      resizable: true
    });
  }

  getData() {
    return { backgrounds: TN.BACKGROUNDS };
  }

  activateListeners(html) {
    super.activateListeners(html);
    this._root.querySelector("[data-action='randomize']")?.addEventListener("click", () => this.fill(randomDetective()));
    this._root.querySelector("[data-action='create']")?.addEventListener("click", () => this._create());
  }

  onStep(step) {
    if (step !== 5) return;
    const data = Object.fromEntries(DETECTIVE_FIELDS.map(field => [field, this.value(field)]));
    const row = (label, value) => `<div class="tn-summary__row"><dt>${label}</dt><dd>${escape(value) || "<em>sin definir</em>"}</dd></div>`;
    const summary = this._root.querySelector("[data-summary]");
    if (summary) {
      summary.innerHTML = `
        <h3 class="tn-summary__name">${escape(data.name) || "Detective sin nombre"}</h3>
        <p class="tn-summary__role">${escape(data.roleTag)}</p>
        <dl class="tn-summary__list">
          ${row("Físico", data.look)}
          ${row("Trasfondos", [data.background1, data.background2].filter(Boolean).join(" · "))}
          ${row("Objetos", [data.object1, data.object2].filter(Boolean).join(" · "))}
          ${row("Persona", data.person)}
          ${row("Lugar", data.place)}
          ${row("Motivación", data.motivation)}
          ${row("Rumor", data.rumor)}
        </dl>`;
    }
    const create = this._root.querySelector("[data-action='create']");
    const warning = this._root.querySelector("[data-summary-warning]");
    if (create) create.disabled = !data.name;
    if (warning) warning.hidden = Boolean(data.name);
  }

  async _create() {
    const data = Object.fromEntries(DETECTIVE_FIELDS.map(field => [field, this.value(field)]));
    if (!data.name) return ui.notifications.warn("El detective necesita un nombre antes de entrar en la ciudad.");
    const actor = await Actor.create({
      name: data.name,
      type: "detective",
      img: "icons/svg/mystery-man.svg",
      system: {
        roleTag: data.roleTag,
        look: data.look,
        belief: data.belief,
        temperament: data.temperament,
        age: data.age,
        motivation: data.motivation,
        background1: data.background1,
        background2: data.background2,
        representativeObjects: { slot1: { name: data.object1, used: false }, slot2: { name: data.object2, used: false } },
        stability: { person: { name: data.person, tension: 0 }, place: { name: data.place, tension: 0 } },
        baladaRumor: data.rumor
      }
    });
    actor?.sheet?.render(true);
    this.close();
    ui.notifications.info(`${data.name} ya camina por la ciudad.`);
  }
}

export class TruequeNoirCityGenerator extends TruequeNoirWizard {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trueque-noir-city-generator",
      classes: ["trueque-noir", "tn-app", "tn-wizard-app"],
      title: "Construir la ciudad",
      template: "systems/trueque-noir/templates/apps/city-generator.hbs",
      width: 820,
      height: 740,
      resizable: true
    });
  }

  getData() {
    return { zones: ZONES, commonLocations: COMMON_LOCATIONS };
  }

  activateListeners(html) {
    super.activateListeners(html);
    this._loadExistingCity();
    this._root.querySelector("[data-action='randomize-city']")?.addEventListener("click", () => this._randomize());
    this._root.querySelector("[data-action='create-city']")?.addEventListener("click", () => this._create());
  }

  /** Editar la ciudad existente no debe obligar a reescribirla desde cero. */
  _loadExistingCity() {
    try {
      const city = JSON.parse(game.settings.get(TN.SYSTEM_ID, "cityData") || "{}");
      this.fill(Object.fromEntries(["cityName", "context", "wanted", "unwanted"].map(field => [field, city[field] || ""])));
      for (const zone of city.zones || []) {
        const prefix = String(zone.zone || "").toLowerCase();
        if (!prefix) continue;
        this.fill(Object.fromEntries(["name", "traits", "controller", "extra"].map(field => [
          `${prefix}${field[0].toUpperCase()}${field.slice(1)}`,
          zone[field] || ""
        ])));
      }
    } catch (error) {
      console.warn("trueque-noir | Datos de ciudad no válidos", error);
    }
  }

  _readZones() {
    return ZONES.map(zone => {
      const id = zone.toLowerCase();
      return {
        zone,
        name: this.value(`${id}Name`),
        traits: this.value(`${id}Traits`),
        controller: this.value(`${id}Controller`),
        extra: this.value(`${id}Extra`)
      };
    });
  }

  onStep(step) {
    if (step !== 4) return;
    const summary = this._root.querySelector("[data-summary]");
    const name = this.value("cityName");
    if (summary) {
      summary.innerHTML = `
        <h3 class="tn-summary__name">${escape(name) || "Ciudad sin nombre"}</h3>
        <p class="tn-summary__role">${escape(this.value("context"))}</p>
        <div class="tn-zones tn-zones--summary">
          ${this._readZones().map(zone => `
            <article class="tn-zone">
              <span class="tn-zone__compass">${zone.zone}</span>
              <strong class="tn-zone__name">${escape(zone.name) || "—"}</strong>
              <small class="tn-zone__traits">${escape(zone.traits)}</small>
              <small class="tn-zone__controller">Controla: ${escape(zone.controller) || "—"}</small>
              <em class="tn-zone__extra">${escape(zone.extra)}</em>
            </article>`).join("")}
        </div>
        <div class="tn-city__limits">
          <p><strong>Queremos ver.</strong> ${escape(this.value("wanted")) || "—"}</p>
          <p><strong>No queremos ver.</strong> ${escape(this.value("unwanted")) || "—"}</p>
        </div>`;
    }
    const create = this._root.querySelector("[data-action='create-city']");
    const warning = this._root.querySelector("[data-summary-warning]");
    if (create) create.disabled = !name;
    if (warning) warning.hidden = Boolean(name);
  }

  _randomize() {
    this.fill({
      cityName: `${pick(CITY_PREFIX)} ${pick(CITY_SUFFIX)}`,
      context: pick(CITY_CONTEXTS)
    });
    for (const zone of ZONES) {
      const id = zone.toLowerCase();
      this.fill({
        [`${id}Name`]: `${zone} · ${pick(["Muelles", "Altos", "Distrito", "Barrio", "Dársenas", "Jardines"])}`,
        [`${id}Traits`]: sample(ZONE_TRAITS, 2).join(", "),
        [`${id}Controller`]: pick(CONTROLLERS),
        [`${id}Extra`]: pick(EXTRA_LOCATIONS)
      });
    }
  }

  async _create() {
    const cityName = this.value("cityName");
    if (!cityName) return ui.notifications.warn("La ciudad necesita un nombre antes de guardarse.");
    const zones = this._readZones();
    const context = this.value("context");
    const wanted = this.value("wanted");
    const unwanted = this.value("unwanted");

    const zoneHtml = zones.map(zone => `<h2>${escape(zone.zone)}: ${escape(zone.name)}</h2><p><strong>Rasgos:</strong> ${escape(zone.traits)}</p><p><strong>Control:</strong> ${escape(zone.controller)}</p><p><strong>Localización propia:</strong> ${escape(zone.extra)}</p>`).join("");
    const existing = game.journal.find(entry => entry.getFlag(TN.SYSTEM_ID, "generatedCity"));
    const pages = [
      { name: "Contexto y límites", type: "text", text: { content: `<h1>${escape(cityName)}</h1><p>${escape(context)}</p><h2>Queremos ver</h2><p>${escape(wanted)}</p><h2>No queremos ver</h2><p>${escape(unwanted)}</p>` } },
      { name: "Cuatro zonas", type: "text", text: { content: zoneHtml } },
      { name: "Localizaciones comunes", type: "text", text: { content: `<p>${COMMON_LOCATIONS.join(" · ")}</p>` } }
    ];

    // Editar la ciudad actualiza su diario en lugar de acumular copias.
    if (existing) await existing.delete();
    await JournalEntry.create({ name: `Ciudad · ${cityName}`, pages, flags: { [TN.SYSTEM_ID]: { generatedCity: true } } });

    await game.settings.set(TN.SYSTEM_ID, "cityName", cityName);
    await game.settings.set(TN.SYSTEM_ID, "cityData", JSON.stringify({ cityName, context, wanted, unwanted, zones }));
    ui.notifications.info(`${cityName} ya está en el Panel de La Ciudad.`);
    this.close();
    game.truequeNoir.openCaseTracker();
  }
}

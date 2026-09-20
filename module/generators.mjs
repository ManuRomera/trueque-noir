import { TN } from "./config.mjs";
import { LegacyApplication } from "./compat.mjs";
import { THEME_LIST, getTheme, themeTables, DEFAULT_THEME } from "./themes.mjs";
import { applySceneTheme } from "./scene-setup.mjs";

/** Las cuatro zonas del manual son puntos cardinales; la ambientación solo las viste. */
const ZONES = ["Norte", "Sur", "Este", "Oeste"];

const pick = list => list[Math.floor(Math.random() * list.length)];
const sample = (list, count) => [...list].sort(() => Math.random() - 0.5).slice(0, count);
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

function activeTheme() {
  return game.settings?.get(TN.SYSTEM_ID, "cityTheme") ?? DEFAULT_THEME;
}

function themeOptions(selected) {
  return THEME_LIST.map(theme => `<option value="${theme.id}" ${theme.id === selected ? "selected" : ""}>${escape(theme.label)}</option>`).join("");
}

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

  /** Ambientación elegida en el propio asistente, o la de la ciudad si no hay selector. */
  get theme() {
    return themeTables(this.value("theme") || activeTheme());
  }
}

const DETECTIVE_FIELDS = ["name", "roleTag", "look", "belief", "temperament", "age", "motivation", "background1", "background2", "object1", "object2", "person", "place", "rumor"];

function randomDetective(theme) {
  const backgrounds = sample(TN.BACKGROUNDS, 2);
  const objects = sample(theme.objects, 2);
  return {
    name: `${pick(theme.names)} ${pick(theme.surnames)}`,
    roleTag: pick(theme.roles),
    look: pick(theme.looks),
    belief: pick(theme.beliefs),
    temperament: pick(theme.temperaments),
    age: String(27 + Math.floor(Math.random() * 33)),
    motivation: pick(theme.motivations),
    background1: backgrounds[0],
    background2: backgrounds[1],
    object1: objects[0],
    object2: objects[1],
    person: pick(theme.people),
    place: pick(theme.places),
    rumor: pick(theme.rumors)
  };
}

export class TruequeNoirCharacterGenerator extends TruequeNoirWizard {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trueque-noir-character-generator",
      classes: ["trueque-noir", "tn-app", "tn-wizard-app"],
      title: "Crear detective",
      template: "systems/trueque-noir/templates/apps/character-generator.hbs",
      width: 720,
      height: 720,
      resizable: true
    });
  }

  getData() {
    const current = activeTheme();
    return {
      backgrounds: TN.BACKGROUNDS,
      themeOptions: themeOptions(current),
      themeLabel: getTheme(current).label
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    this._root.querySelector("[data-action='randomize']")?.addEventListener("click", () => this.fill(randomDetective(this.theme)));
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
      img: TN.PORTRAIT,
      prototypeToken: { texture: { src: TN.TOKEN }, name: data.name, actorLink: true },
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
      width: 860,
      height: 760,
      resizable: true
    });
  }

  getData() {
    const current = activeTheme();
    return {
      zones: ZONES,
      themeOptions: themeOptions(current),
      commonLocations: getTheme(current).locations
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    this._loadExistingCity();
    this._root.querySelector("[data-action='randomize-city']")?.addEventListener("click", () => this._randomize());
    this._root.querySelector("[data-action='create-city']")?.addEventListener("click", () => this._create());
    this._root.querySelector("[name='theme']")?.addEventListener("change", () => this._paintLocations());
    this._paintLocations();
  }

  /** Las catorce localizaciones comunes, dichas con las palabras de la ambientación. */
  _paintLocations() {
    const chips = this._root.querySelector("[data-locations]");
    if (!chips) return;
    chips.innerHTML = this.theme.locations.map(name => `<span class="tn-chip">${escape(name)}</span>`).join("");
  }

  /** Editar la ciudad existente no debe obligar a reescribirla desde cero. */
  _loadExistingCity() {
    try {
      const city = JSON.parse(game.settings.get(TN.SYSTEM_ID, "cityData") || "{}");
      if (city.theme) this.fill({ theme: city.theme });
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
        <p class="tn-summary__role">${escape(getTheme(this.value("theme")).label)} · ${escape(this.value("context"))}</p>
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
    const theme = this.theme;
    this.fill({
      cityName: `${pick(theme.city.prefix)} ${pick(theme.city.suffix)}`,
      context: pick(theme.contexts),
      wanted: pick(theme.wanted),
      unwanted: pick(theme.unwanted)
    });
    const zoneNames = sample(theme.zones, ZONES.length);
    const controllers = sample(theme.controllers, ZONES.length);
    const extras = sample(theme.extras, ZONES.length);
    ZONES.forEach((zone, index) => {
      const id = zone.toLowerCase();
      this.fill({
        [`${id}Name`]: `${zone} · ${zoneNames[index]}`,
        [`${id}Traits`]: sample(theme.traits, 2).join(", "),
        [`${id}Controller`]: controllers[index],
        [`${id}Extra`]: extras[index]
      });
    });
  }

  async _create() {
    const cityName = this.value("cityName");
    if (!cityName) return ui.notifications.warn("La ciudad necesita un nombre antes de guardarse.");
    const themeId = this.value("theme") || activeTheme();
    const theme = getTheme(themeId);
    const zones = this._readZones();
    const context = this.value("context");
    const wanted = this.value("wanted");
    const unwanted = this.value("unwanted");

    const zoneHtml = zones.map(zone => `<h2>${escape(zone.zone)}: ${escape(zone.name)}</h2><p><strong>Rasgos:</strong> ${escape(zone.traits)}</p><p><strong>Control:</strong> ${escape(zone.controller)}</p><p><strong>Localización propia:</strong> ${escape(zone.extra)}</p>`).join("");
    const existing = game.journal.find(entry => entry.getFlag(TN.SYSTEM_ID, "generatedCity"));
    const pages = [
      { name: "Contexto y límites", type: "text", text: { content: `<h1>${escape(cityName)}</h1><p><em>${escape(theme.label)}</em></p><p>${escape(context)}</p><h2>Queremos ver</h2><p>${escape(wanted)}</p><h2>No queremos ver</h2><p>${escape(unwanted)}</p>` } },
      { name: "Cuatro zonas", type: "text", text: { content: zoneHtml } },
      { name: "Localizaciones comunes", type: "text", text: { content: `<p>${theme.locations.map(escape).join(" · ")}</p>` } }
    ];

    // Editar la ciudad actualiza su diario en lugar de acumular copias.
    if (existing) await existing.delete();
    await JournalEntry.create({ name: `Ciudad · ${cityName}`, pages, flags: { [TN.SYSTEM_ID]: { generatedCity: true } } });

    await game.settings.set(TN.SYSTEM_ID, "cityName", cityName);
    await game.settings.set(TN.SYSTEM_ID, "cityData", JSON.stringify({ cityName, theme: themeId, context, wanted, unwanted, zones }));

    if (this._root.querySelector("[name='applyScene']")?.checked) await applySceneTheme(themeId);
    else await game.settings.set(TN.SYSTEM_ID, "cityTheme", themeId);

    ui.notifications.info(`${cityName} ya está en el Panel de La Ciudad.`);
    this.close();
    game.truequeNoir.openCaseTracker();
  }
}

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
const EXTRA_LOCATIONS = ["casino clandestino", "gimnasio de boxeo", "estación de radio", "club de jazz", "matadero", "archivo municipal", "cine abandonado", "mercado nocturno", "astillero", "laboratorio privado", "hotel de lujo", "lavandería abierta de madrugada"];
const ZONE_TRAITS = ["próspera", "industrial", "decadente", "inundada", "vigilada", "bohemia", "calcinada", "aislada", "corrupta", "superpoblada", "silenciosa", "violenta"];
const CONTROLLERS = ["un sindicato de estibadores", "una familia de empresarios", "una banda de moteros", "un predicador y sus fieles", "la policía corrupta", "una red de contrabando", "un cacique inmobiliario", "un club de veteranos"];

const pick = list => list[Math.floor(Math.random() * list.length)];
const sample = (list, count) => [...list].sort(() => Math.random() - .5).slice(0, count);
const value = (html, name) => String(html.find(`[name='${name}']`).val() || "").trim();

function randomDetective() {
  const backgrounds = sample(TN.BACKGROUNDS, 2);
  const objects = sample(OBJECTS, 2);
  return {
    name: `${pick(NAMES)} ${pick(SURNAMES)}`,
    roleTag: pick(["Inspectora", "Sabueso", "Forense", "Agente de homicidios", "Policía de barrio", "Detective veterano"]),
    look: pick(LOOKS), belief: pick(BELIEFS), temperament: pick(TEMPERAMENTS), age: String(27 + Math.floor(Math.random() * 33)),
    motivation: pick(MOTIVATIONS), background1: backgrounds[0], background2: backgrounds[1],
    object1: objects[0], object2: objects[1], person: pick(PEOPLE), place: pick(PLACES),
    rumor: pick(["dejó morir a un compañero", "aceptó dinero de una banda", "falsificó una prueba para salvar a alguien", "conoce la identidad de un asesino nunca detenido", "incendió el lugar donde creció"])
  };
}

export class TruequeNoirCharacterGenerator extends LegacyApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, { id: "trueque-noir-character-generator", classes: ["trueque-noir", "tn-generator"], title: "Crear detective", template: "systems/trueque-noir/templates/apps/character-generator.hbs", width: 760, height: 690, resizable: true });
  }
  getData() { return { backgrounds: TN.BACKGROUNDS }; }
  activateListeners(html) {
    super.activateListeners(html);
    const show = step => { html.find("[data-step]").attr("hidden", true); html.find(`[data-step='${step}']`).removeAttr("hidden"); html.find("[data-step-dot]").removeClass("is-active"); html.find(`[data-step-dot='${step}']`).addClass("is-active"); };
    html.find("[data-next]").on("click", event => show(Number(event.currentTarget.dataset.next)));
    html.find("[data-prev]").on("click", event => show(Number(event.currentTarget.dataset.prev)));
    html.find("[data-action='randomize']").on("click", () => this._fill(html, randomDetective()));
    html.find("[data-action='create']").on("click", () => this._create(html));
  }
  _fill(html, d) { for (const [k,v] of Object.entries(d)) html.find(`[name='${k}']`).val(v); }
  async _create(html) {
    const d = Object.fromEntries(["name","roleTag","look","belief","temperament","age","motivation","background1","background2","object1","object2","person","place","rumor"].map(k => [k,value(html,k)]));
    if (!d.name) return ui.notifications.warn("El detective necesita un nombre.");
    const actor = await Actor.create({ name: d.name, type: "detective", img: "icons/svg/mystery-man.svg", system: { roleTag:d.roleTag, look:d.look, belief:d.belief, temperament:d.temperament, age:d.age, motivation:d.motivation, background1:d.background1, background2:d.background2, representativeObjects:{slot1:{name:d.object1,used:false},slot2:{name:d.object2,used:false}}, stability:{person:{name:d.person,tension:0},place:{name:d.place,tension:0}}, baladaRumor:d.rumor }});
    actor.sheet.render(true); this.close(); ui.notifications.info(`${d.name} está listo para entrar en la ciudad.`);
  }
}

export class TruequeNoirCityGenerator extends LegacyApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, { id: "trueque-noir-city-generator", classes: ["trueque-noir", "tn-generator"], title: "Construir la ciudad", template: "systems/trueque-noir/templates/apps/city-generator.hbs", width: 900, height: 740, resizable: true });
  }
  getData() { return { zones: ZONES, commonLocations: COMMON_LOCATIONS }; }
  activateListeners(html) {
    super.activateListeners(html);
    const show = step => { html.find("[data-step]").attr("hidden", true); html.find(`[data-step='${step}']`).removeAttr("hidden"); html.find("[data-step-dot]").removeClass("is-active"); html.find(`[data-step-dot='${step}']`).addClass("is-active"); };
    html.find("[data-next]").on("click", e => show(Number(e.currentTarget.dataset.next)));
    html.find("[data-prev]").on("click", e => show(Number(e.currentTarget.dataset.prev)));
    html.find("[data-action='randomize-city']").on("click", () => this._randomize(html));
    html.find("[data-action='create-city']").on("click", () => this._create(html));
  }
  _randomize(html) {
    html.find("[name='cityName']").val(`${pick(["Cape","Grey","Saint","New","Port","Black"])} ${pick(["Hook","Haven","Mercy","Vega","Cross","Bay"])}`);
    html.find("[name='context']").val(pick(["Años 20, ley seca y lluvia incesante", "Años 90, ciudad portuaria aislada", "Distopía industrial bajo vigilancia", "Metrópolis costera contemporánea en decadencia", "Ciudad victoriana cubierta de niebla"]));
    for (const zone of ZONES) { const id=zone.toLowerCase(); html.find(`[name='${id}Name']`).val(`${zone} · ${pick(["Muelles","Altos","Distrito","Barrio","Dársenas","Jardines"])}`); html.find(`[name='${id}Traits']`).val(sample(ZONE_TRAITS,2).join(", ")); html.find(`[name='${id}Controller']`).val(pick(CONTROLLERS)); html.find(`[name='${id}Extra']`).val(pick(EXTRA_LOCATIONS)); }
  }
  async _create(html) {
    const cityName=value(html,"cityName"); if (!cityName) return ui.notifications.warn("La ciudad necesita un nombre.");
    const zones=ZONES.map(zone=>{const id=zone.toLowerCase(); return {zone,name:value(html,`${id}Name`),traits:value(html,`${id}Traits`),controller:value(html,`${id}Controller`),extra:value(html,`${id}Extra`)};});
    const context=value(html,"context"), wanted=value(html,"wanted"), unwanted=value(html,"unwanted");
    const zoneHtml=zones.map(z=>`<h2>${z.zone}: ${z.name}</h2><p><strong>Rasgos:</strong> ${z.traits}</p><p><strong>Control:</strong> ${z.controller}</p><p><strong>Localización propia:</strong> ${z.extra}</p>`).join("");
    await JournalEntry.create({name:`Ciudad · ${cityName}`, pages:[{name:"Contexto y límites",type:"text",text:{content:`<h1>${cityName}</h1><p>${context}</p><h2>Queremos ver</h2><p>${wanted}</p><h2>No queremos ver</h2><p>${unwanted}</p>`}},{name:"Cuatro zonas",type:"text",text:{content:zoneHtml}},{name:"Localizaciones comunes",type:"text",text:{content:`<p>${COMMON_LOCATIONS.join(" · ")}</p>`}}], flags:{[TN.SYSTEM_ID]:{generatedCity:true}}});
    await game.settings.set(TN.SYSTEM_ID,"cityName",cityName); await game.settings.set(TN.SYSTEM_ID,"cityData",JSON.stringify({cityName,context,wanted,unwanted,zones}));
    ui.notifications.info(`${cityName} se ha guardado como diario.`); this.close();
  }
}

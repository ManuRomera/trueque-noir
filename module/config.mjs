/**
 * Constantes, ajustes y consultas compartidas de Trueque Noir.
 * En este juego el director de juego es «La Ciudad»: nunca «DM» ni «GM» en textos visibles.
 */
import { ApplicationV2, ventanas } from "./compat.mjs";
import { olvidarTodo } from "./memoria.mjs";
import * as R from "./reglas.mjs";

export const ID = "trueque-noir";
export const RUTA = `systems/${ID}`;

export const TN = {
  SYSTEM_ID: ID,
  SOCKET: `system.${ID}`,
  ASSETS: `${RUTA}/assets`,
  LOGO: `${RUTA}/assets/logo.webp`,
  PORTRAIT: `${RUTA}/assets/portrait.webp`,
  TOKEN: `${RUTA}/assets/token.webp`,
  CIGARETTE: `${RUTA}/assets/cigarette.png`,
  SCENE_FLAG: "Trueque Noir · Portada",
  BACKGROUNDS: [
    "Intimidación", "Encontrar pruebas", "Negociación", "Bajos fondos", "Uso de armas", "Buscar información",
    "Detectar mentiras", "Medicina forense", "Forzar cerraduras", "Pelea a puñetazos", "Pasar inadvertido", "Enérgico"
  ],
  PERSONAL_STATES: [
    { id: "magullado", label: "Magullado" },
    { id: "asustado", label: "Asustado" },
    { id: "desesperado", label: "Desesperado" },
    { id: "herido", label: "Herido" },
    { id: "moribundo", label: "Moribundo" },
    { id: "quebrado", label: "Quebrado" }
  ],
  CITY_STATES: [
    { id: "perseguido", label: "Perseguido" },
    { id: "corrupto", label: "Corrupto" },
    { id: "extorsionado", label: "Extorsionado" },
    { id: "suspendido", label: "Suspendido" },
    { id: "observado", label: "Observado" },
    { id: "acabado", label: "Acabado" }
  ],
  PHASES: R.FRANJAS,
  PILLARS: { person: "Persona", place: "Lugar" },
  RESULT_LABEL: { clean: "Éxito limpio", mixed: "Trueque", hard: "Resultado duro" }
};

/** Estados que sacan al detective de la partida al terminar el caso (p. 26). */
export const ESTADOS_FINALES = ["quebrado", "acabado"];

/** Claves del estado compartido del caso. Los jugadores no escriben ajustes de mundo: piden el cambio por socket. */
const ESTADO = {
  caseName: ["Caso abierto", String],
  caseDay: [1, Number],
  casePhaseIndex: [0, Number],
  timeLimit: [4, Number],
  crimeDie: [1, Number],
  groupCluesTotal: [0, Number],
  groupCluesSpent: [0, Number],
  rumorBonusAvailable: [false, Boolean],
  rumorBonusText: ["", String],
  rumorBy: ["", String],
  tableDisplayVisible: [false, Boolean],
  cityName: ["La ciudad", String],
  cityData: ["{}", String],
  welcomeSeen: [false, Boolean],
  caseArchiveImported: [false, Boolean],
  cityTheme: ["noir", String],
  floatingScenes: ["[]", String],
  chronicleCase: [1, Number],
  caseResult: ["", String]
};

/** Abrir el ajuste desde el menú borra la memoria de ventanas sin abrir nada. */
class RestablecerVentanas extends ApplicationV2 {
  async render() {
    olvidarTodo();
    ui.notifications.info("Posiciones, tamaños y pestañas de las ventanas olvidadas en este navegador.");
    return this;
  }
}

export function registrarAjustes() {
  for (const [clave, [valor, tipo]] of Object.entries(ESTADO)) {
    game.settings.register(ID, clave, { scope: "world", config: false, type: tipo, default: valor });
  }

  game.settings.register(ID, "portraitNoir", {
    name: "Retratos en blanco y negro",
    hint: "Aplica el tratamiento de fotografía noir a los retratos de las fichas. Desactívalo para verlos en color.",
    scope: "client", config: true, type: Boolean, default: true,
    onChange: aplicarPreferenciaRetratos
  });
  game.settings.register(ID, "installMacros", {
    name: "Instalar macros en la barra rápida",
    hint: "Crea y coloca las macros de La Ciudad en tu barra. Desactivado por defecto: todo está también en el menú Trueque Noir de los controles de escena.",
    scope: "world", config: true, type: Boolean, default: false
  });
  game.settings.registerMenu(ID, "ventanas", {
    name: "Memoria de ventanas",
    label: "Olvidar posiciones",
    hint: "Las ventanas del sistema recuerdan posición, tamaño, pestaña y secciones plegadas en este navegador.",
    icon: "fa-solid fa-window-restore",
    type: RestablecerVentanas,
    restricted: false
  });
}

export function aplicarPreferenciaRetratos() {
  document.body.classList.toggle("tn-portraits-color", !game.settings.get(ID, "portraitNoir"));
}

const ajuste = clave => game.settings.get(ID, clave);

/** Todo lo que las ventanas necesitan saber del caso en curso, ya calculado. */
export function estadoCaso() {
  const dado = R.limitarDado(ajuste("crimeDie"));
  const total = Number(ajuste("groupCluesTotal"));
  const gastadas = Number(ajuste("groupCluesSpent"));
  const disponibles = Math.max(total - gastadas, 0);
  const franja = Number(ajuste("casePhaseIndex"));
  const dia = Number(ajuste("caseDay"));
  const limite = Number(ajuste("timeLimit"));
  return {
    nombre: ajuste("caseName"),
    dia, limite, franja,
    franjaNombre: R.FRANJAS[franja] ?? R.FRANJAS[0],
    esNoche: franja === 2,
    finTiempo: dia > limite,
    dado,
    explotado: R.dadoExplotado(dado),
    puedeSubir: dado <= R.DADO_MAXIMO,
    puedeBajar: dado > 1,
    pistas: {
      total, gastadas, disponibles,
      progreso: Math.min(disponibles, R.PISTAS_POR_PASO),
      puedeGastar: disponibles >= R.PISTAS_POR_PASO && dado > 1,
      puedeAcusar: total >= R.PISTAS_ACUSACION
    },
    rumor: { activo: Boolean(ajuste("rumorBonusAvailable")), texto: ajuste("rumorBonusText"), por: ajuste("rumorBy") },
    mesaVisible: Boolean(ajuste("tableDisplayVisible")),
    cronica: Number(ajuste("chronicleCase")),
    resultado: ajuste("caseResult")
  };
}

export const DADO_TEXTO = [
  "La policía se hace fuerte: la honradez impera.",
  "Algunos polis corruptos: el día a día de la ciudad.",
  "El crimen ya no teme a la policía.",
  "La ciudad está condenada: están todos comprados."
];

const ICONO_FRANJA = ["fa-solid fa-sun", "fa-solid fa-cloud-sun", "fa-solid fa-moon"];

/** La rejilla de días y franjas del caso, con cada casilla marcada como pasada, actual o futura. */
export function diasDelCaso(caso) {
  return Array.from({ length: caso.limite }, (_, i) => {
    const n = i + 1;
    return {
      n,
      franjas: R.FRANJAS.map((nombre, f) => {
        const ahora = n === caso.dia && f === caso.franja;
        const pasada = n < caso.dia || (n === caso.dia && f < caso.franja);
        return { i: f, nombre, icono: ICONO_FRANJA[f], estado: caso.finTiempo || pasada ? "es-pasada" : ahora ? "es-actual" : "es-futura" };
      })
    };
  });
}

export function leerCiudad() {
  const vacia = { cityName: ajuste("cityName") || "La ciudad", context: "", wanted: "", unwanted: "", zones: [], hasZones: false, hasContent: false };
  try {
    const data = JSON.parse(ajuste("cityData") || "{}");
    const zones = Array.isArray(data.zones) ? data.zones : [];
    return {
      cityName: data.cityName || vacia.cityName,
      context: data.context || "", wanted: data.wanted || "", unwanted: data.unwanted || "",
      zones, hasZones: zones.length > 0, hasContent: Boolean(data.context || zones.length)
    };
  } catch (error) {
    console.warn("trueque-noir | Datos de ciudad ilegibles", error);
    return vacia;
  }
}

export function leerEscenasFlotantes() {
  try {
    const lista = JSON.parse(ajuste("floatingScenes") || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

/**
 * Los detectives de la crónica: todos los del mundo, también los que lleva La Ciudad.
 * Cuentan para el reparto de cigarrillos (18 en el grupo) y para el reconocimiento al cerrar un caso.
 */
export const getDetectives = () => game.actors?.filter(actor => actor.type === "detective") ?? [];

export const getRecognitionAvailable = actor =>
  Number(actor.system.recognition?.total ?? 0) - Number(actor.system.recognition?.spent ?? 0);

export const getActorBackgrounds = actor =>
  [actor.system.background1, actor.system.background2, actor.system.background3].filter(Boolean);

/** Estados activos de un detective, listos para pintarse como sellos en la cabecera. */
export function getActiveStates(actor) {
  const estados = [];
  const { personalStates: p, cityStates: c } = actor.system;
  for (const s of TN.PERSONAL_STATES) if (p?.[s.id]) estados.push({ id: s.id, label: s.label, kind: "personal", final: ESTADOS_FINALES.includes(s.id) });
  if (p?.customActive && p.custom) estados.push({ id: "custom", label: p.custom, kind: "personal" });
  for (const s of TN.CITY_STATES) if (c?.[s.id]) estados.push({ id: s.id, label: s.label, kind: "city", final: ESTADOS_FINALES.includes(s.id) });
  if (c?.customActive && c.custom) estados.push({ id: "custom", label: c.custom, kind: "city" });
  return estados;
}

/**
 * Vuelve a pintar las ventanas del sistema que dependen del estado compartido.
 * Cada ajuste dispara su propio aviso: se agrupan para pintar una sola vez por cambio.
 */
export const refrescar = foundry.utils.debounce(() => {
  for (const app of ventanas()) if (app.constructor.REACTIVA && app.rendered) app.render();
}, 40);

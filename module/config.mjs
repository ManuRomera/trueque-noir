/**
 * Constantes, ajustes y consultas compartidas de Trueque Noir.
 * En este juego el director de juego es «La Ciudad»: nunca «DM» ni «GM» en textos visibles.
 */
export const TN = {
  SYSTEM_ID: "trueque-noir",
  SOCKET: "system.trueque-noir",
  COVER: "systems/trueque-noir/assets/cover.png",
  SCENE_FLAG: "Trueque Noir · Portada",
  BACKGROUNDS: [
    "Intimidación",
    "Encontrar pruebas",
    "Negociación",
    "Bajos fondos",
    "Uso de armas",
    "Buscar información",
    "Detectar mentiras",
    "Medicina forense",
    "Forzar cerraduras",
    "Pelea a puñetazos",
    "Pasar inadvertido",
    "Enérgico"
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
  PHASES: ["mañana", "tarde", "noche"],
  TRUEQUE_CITY: [
    "El crimen se propaga: el dado del crimen aumenta en 1.",
    "Indeseables: aparece un grupo hostil, una alarma o una amenaza visible.",
    "Señalado: un contacto o PNJ queda expuesto, marcado o muere.",
    "Descuido: el tiempo se acorta y el culpable se aleja."
  ],
  TRUEQUE_PRICE: [
    "En problemas: un detective adquiere un estado personal.",
    "La ciudad recuerda: un detective adquiere un estado con la ciudad.",
    "Sacrificio: media cajetilla menos, más tiempo aquí o -1 reconocimiento.",
    "Tu cara me suena: +1 tensión a un pilar de estabilidad."
  ]
};

/** Pistas necesarias para bajar un punto el dado del crimen. */
export const CLUES_PER_CRIME_STEP = 3;
/** Pistas mínimas que el manual exige antes de una acusación. */
export const CLUES_FOR_ACCUSATION = 6;

export function registerSystemSettings() {
  const register = (key, type, defaultValue, extra = {}) => {
    game.settings.register(TN.SYSTEM_ID, key, {
      scope: "world",
      config: false,
      type,
      default: defaultValue,
      ...extra
    });
  };

  // Estado vivo del caso. Nunca aparece en la configuración de Foundry: se edita desde el Panel.
  register("caseName", String, "Caso abierto", { name: "Nombre del caso" });
  register("caseDay", Number, 1, { name: "Día del caso" });
  register("casePhaseIndex", Number, 0, { name: "Índice de franja" });
  register("timeLimit", Number, 4, { name: "Límite de días" });
  register("crimeDie", Number, 1, { name: "Dado del crimen" });
  register("groupCluesTotal", Number, 0, { name: "Pistas descubiertas" });
  register("groupCluesSpent", Number, 0, { name: "Pistas gastadas" });
  register("rumorBonusAvailable", Boolean, false, { name: "Rumor pendiente" });
  register("rumorBonusText", String, "", { name: "Texto del rumor" });
  register("tableDisplayVisible", Boolean, false, { name: "Mesa del caso visible" });
  register("cityName", String, "La ciudad", { name: "Nombre de la ciudad" });
  register("cityData", String, "{}", { name: "Datos de la ciudad" });
  register("welcomeSeen", Boolean, false, { name: "Bienvenida mostrada" });
  register("caseArchiveImported", Boolean, false, { name: "Archivo de casos importado" });

  // Preferencias visibles en Configuración → Ajustes del sistema.
  game.settings.register(TN.SYSTEM_ID, "portraitNoir", {
    name: "Retratos en blanco y negro",
    hint: "Aplica el tratamiento de fotografía noir a los retratos de las fichas. Desactívalo para verlos en color.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      document.body.classList.toggle("tn-portraits-color", !game.settings.get(TN.SYSTEM_ID, "portraitNoir"));
    }
  });

  game.settings.register(TN.SYSTEM_ID, "installMacros", {
    name: "Instalar macros en la barra rápida",
    hint: "Crea y coloca las macros de La Ciudad en tu barra. Desactivado por defecto: todo está también en el menú Trueque Noir de los controles de escena.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
}

export function getRecognitionAvailable(actor) {
  const total = Number(actor.system.recognition?.total ?? 0);
  const spent = Number(actor.system.recognition?.spent ?? 0);
  return Math.max(total - spent, 0);
}

export function classifyResult(total) {
  if (total <= 4) return "hard";
  if (total <= 8) return "mixed";
  return "clean";
}

export const RESULT_LABEL = {
  clean: "Éxito limpio",
  mixed: "Trueque",
  hard: "Resultado duro"
};

export function phaseLabel(index) {
  return TN.PHASES[Number(index) ?? 0] ?? TN.PHASES[0];
}

export function clampCrimeDie(value) {
  return Math.max(1, Math.min(Number(value || 1), 5));
}

export function getCrimeDie() {
  return Number(game.settings.get(TN.SYSTEM_ID, "crimeDie") ?? 1);
}

/** El dado del crimen «explota» al superar 4: el caso debería cerrarse. */
export function isCrimeExploded(value = getCrimeDie()) {
  return Number(value) > 4;
}

export function getGroupClueState() {
  const total = Number(game.settings.get(TN.SYSTEM_ID, "groupCluesTotal") ?? 0);
  const spent = Number(game.settings.get(TN.SYSTEM_ID, "groupCluesSpent") ?? 0);
  const available = Math.max(total - spent, 0);
  return {
    total,
    spent,
    available,
    canReduceCrime: available >= CLUES_PER_CRIME_STEP && getCrimeDie() > 1
  };
}

export function canUseFavorForType(scope, type) {
  const normalized = String(scope ?? "").trim().toLowerCase();
  if (!normalized || normalized === "libre") return true;
  if (type === "risk") return ["riesgo", "risk", "cualquiera"].includes(normalized);
  if (type === "pursue") return ["crimen", "investigación", "investigacion", "información", "informacion", "pursue", "clue"].includes(normalized);
  return true;
}

export function getActorBackgrounds(actor) {
  return [actor.system.background1, actor.system.background2, actor.system.background3].filter(Boolean);
}

export function getDetectives() {
  return game.actors?.filter(actor => actor.type === "detective") ?? [];
}

/** Estados activos de un detective, listos para pintarse como sellos en la cabecera. */
export function getActiveStates(actor) {
  const states = [];
  for (const state of TN.PERSONAL_STATES) {
    if (actor.system.personalStates?.[state.id]) states.push({ label: state.label, kind: "personal" });
  }
  if (actor.system.personalStates?.customActive && actor.system.personalStates?.custom) {
    states.push({ label: actor.system.personalStates.custom, kind: "personal" });
  }
  for (const state of TN.CITY_STATES) {
    if (actor.system.cityStates?.[state.id]) states.push({ label: state.label, kind: "city" });
  }
  if (actor.system.cityStates?.customActive && actor.system.cityStates?.custom) {
    states.push({ label: actor.system.cityStates.custom, kind: "city" });
  }
  return states;
}

/** Vuelve a pintar las ventanas compartidas del sistema sin robar el foco de edición. */
export async function refreshCrimeBoard() {
  for (const app of Object.values(ui.windows ?? {})) {
    if (["trueque-noir-case-tracker", "trueque-noir-case-board"].includes(app?.options?.id)) app.render(false);
  }
  for (const sheet of Object.values(ui.windows ?? {})) {
    if (sheet?.actor?.type === "detective") sheet.render(false);
  }
}

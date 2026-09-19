export const TN = {
  SYSTEM_ID: "trueque-noir",
  SOCKET: "system.trueque-noir",
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

export function registerSystemSettings() {
  const worldNumber = (key, name, defaultValue) => {
    game.settings.register(TN.SYSTEM_ID, key, {
      name,
      scope: "world",
      config: false,
      type: Number,
      default: defaultValue
    });
  };

  const worldString = (key, name, defaultValue) => {
    game.settings.register(TN.SYSTEM_ID, key, {
      name,
      scope: "world",
      config: false,
      type: String,
      default: defaultValue
    });
  };

  const worldBoolean = (key, name, defaultValue) => {
    game.settings.register(TN.SYSTEM_ID, key, {
      name,
      scope: "world",
      config: false,
      type: Boolean,
      default: defaultValue
    });
  };

  worldString("caseName", "Nombre del caso", "Caso abierto");
  worldNumber("caseDay", "Día del caso", 1);
  worldNumber("casePhaseIndex", "Índice de franja", 0);
  worldNumber("timeLimit", "Límite de días", 4);
  worldNumber("crimeDie", "Dado del crimen", 1);
  worldNumber("groupCluesTotal", "Pistas totales del grupo", 0);
  worldNumber("groupCluesSpent", "Pistas gastadas por reducción", 0);
  worldBoolean("rumorBonusAvailable", "Rumor pendiente", false);
  worldString("rumorBonusText", "Texto del rumor pendiente", "");
  worldBoolean("tableDisplayVisible", "Mesa del caso visible", false);
  worldString("cityName", "Nombre de la ciudad", "La ciudad");
  worldString("cityData", "Datos de la ciudad", "{}");
}

export function getRecognitionAvailable(actor) {
  const total = Number(actor.system.recognition?.total ?? 0);
  const spent = Number(actor.system.recognition?.spent ?? 0);
  return total - spent;
}

export function classifyResult(total) {
  if (total <= 4) return "hard";
  if (total <= 8) return "mixed";
  return "clean";
}

export function phaseLabel(index) {
  return TN.PHASES[Number(index) ?? 0] ?? TN.PHASES[0];
}

export function clampCrimeDie(value) {
  return Math.max(1, Math.min(Number(value || 1), 5));
}

export function getCrimeDie() {
  return Number(game.settings.get(TN.SYSTEM_ID, "crimeDie") ?? 1);
}

export function getGroupClueState() {
  const total = Number(game.settings.get(TN.SYSTEM_ID, "groupCluesTotal") ?? 0);
  const spent = Number(game.settings.get(TN.SYSTEM_ID, "groupCluesSpent") ?? 0);
  return {
    total,
    spent,
    available: Math.max(total - spent, 0)
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
  const backgrounds = [
    actor.system.background1,
    actor.system.background2,
    actor.system.background3
  ].filter(Boolean);
  return backgrounds;
}

export async function refreshCrimeBoard() {
  for (const app of Object.values(ui.windows)) {
    if (app?.options?.id === "trueque-noir-case-tracker" || app?.options?.id === "trueque-noir-case-board") {
      app.render(false);
    }
  }
}

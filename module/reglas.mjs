/**
 * Reglas puras de Balada triste de la ciudad. Nada aquí toca Foundry: recibe datos y
 * devuelve datos, de modo que `npm test` puede comprobarlas sin arrancar el servidor.
 * Entre paréntesis, la página del manual donde se fijan.
 */

/** Pistas sin gastar que bajan 1 el dado del crimen (p. 48). */
export const PISTAS_POR_PASO = 3;
/** Pistas mínimas del grupo para poder acusar (p. 64). */
export const PISTAS_ACUSACION = 6;
/** Valor del dado del crimen a partir del cual «explota» (p. 48): un 4 que sube. */
export const DADO_MAXIMO = 4;
export const FRANJAS = ["mañana", "tarde", "noche"];
/** Cigarrillos de todo el grupo, repartidos a partes iguales (p. 31). */
export const CIGARRILLOS_GRUPO = 18;
export const TRAGOS_POR_CASO = 2;
export const FAVORES_MAXIMOS = 2;
export const TENSION_MAXIMA = 3;

/** 1d10; 2d10 quedándose con el mejor si ayuda un trasfondo; con el peor si hay penalizador; ambos se anulan (p. 33, 66). */
export function formulaTirada({ trasfondo = false, penalizador = false } = {}) {
  if (penalizador && trasfondo) return "1d10";
  if (penalizador) return "2d10kl";
  if (trasfondo) return "2d10kh";
  return "1d10";
}

/** 4- resultado duro, 5-8 trueque, 9+ éxito limpio (p. 34). */
export function clasificar(total) {
  if (total <= 4) return "hard";
  if (total <= 8) return "mixed";
  return "clean";
}

/** Un dado que sube más allá de 4 explota; nunca baja de 1 (p. 48). */
export const limitarDado = valor => Math.max(1, Math.min(Math.trunc(Number(valor) || 1), DADO_MAXIMO + 1));
export const dadoExplotado = valor => Number(valor) > DADO_MAXIMO;

/**
 * Cada 3 pistas sin gastar bajan el dado 1, de inmediato, salvo que ya esté en 1:
 * entonces se conservan para cuando vuelva a subir (p. 58).
 */
export function gastarPistas({ dado, disponibles }) {
  let actual = limitarDado(dado);
  let restantes = Math.max(0, Math.trunc(disponibles) || 0);
  let pasos = 0;
  while (restantes >= PISTAS_POR_PASO && actual > 1) {
    restantes -= PISTAS_POR_PASO;
    actual -= 1;
    pasos += 1;
  }
  return { dado: actual, pasos, gastadas: pasos * PISTAS_POR_PASO, restantes };
}

/** 2 detectives, 9 cada uno; 3, 6 cada uno; siempre 18 en el grupo (p. 31). Con uno solo, la cajetilla entera. */
export const cigarrillosPorDetective = n => (n <= 1 ? 9 : Math.max(1, Math.floor(CIGARRILLOS_GRUPO / n)));

/** «Pierde la mitad de sus cigarrillos» (p. 46): se redondea hacia arriba, para que con 1 también cueste. */
export const perdidaMitad = cigarrillos => Math.ceil(Math.max(0, cigarrillos) / 2);

/** Mover el reloj del caso. `finTiempo` salta cuando se rebasa la noche del último día (p. 60). */
export function moverFranja({ franja, dia, limite }, delta = 1) {
  let i = Number(franja) + delta;
  let d = Number(dia);
  while (i >= FRANJAS.length) { i -= FRANJAS.length; d += 1; }
  while (i < 0) { i += FRANJAS.length; d = Math.max(1, d - 1); }
  return { franja: i, dia: d, finTiempo: d > limite };
}

/** Escena flotante que provoca marcar una casilla de tensión (p. 28). */
const ESCENAS = {
  person: [
    "Unos criminales visitan a esa persona para dejarle un mensaje poco agradable.",
    "La cosa se pone seria: esa persona recibe una paliza de gravedad o la raptan.",
    "El detective se ha pasado: su ser querido muere como pago a su entrometimiento."
  ],
  place: [
    "Unos criminales visitan el lugar para armar alboroto: un cristal roto, una pintada.",
    "La violencia va a más: un siniestro o un desperfecto grave, aunque el lugar sigue en pie.",
    "El refugio del detective queda mancillado o reducido a cenizas."
  ]
};
export const escenaFlotante = (pilar, tension) => ESCENAS[pilar]?.[Math.min(Math.max(tension, 1), TENSION_MAXIMA) - 1] ?? "";

/** El alcance de un favor se normaliza a tres valores; el texto libre antiguo se interpreta (p. 56). */
export function normalizarAlcance(texto) {
  const t = String(texto ?? "").trim().toLowerCase();
  if (["libre", "riesgo", "crimen"].includes(t)) return t;
  const crimen = /(crimen|investig|inform|pista|clue|pursue)/.test(t);
  const riesgo = /(riesgo|risk)/.test(t);
  if (crimen && !riesgo) return "crimen";
  if (riesgo && !crimen) return "riesgo";
  return "libre";
}

/** ¿Sirve este favor para esta clase de tirada? Libre sirve para las dos. */
export function favorValido(alcance, tipo) {
  const a = normalizarAlcance(alcance);
  return a === "libre" || (tipo === "risk" && a === "riesgo") || (tipo === "pursue" && a === "crimen");
}

/**
 * Reconocimiento que el grupo recibe al cerrar el caso (p. 53):
 * 0 si el dado explota o nadie es detenido; 1 con quién y qué; 2 con las tres respuestas.
 */
export function recompensaCaso({ quien = false, que = false, porque = false, explotado = false } = {}) {
  if (explotado || !quien || !que) return 0;
  return porque ? 2 : 1;
}

/** Coste en reconocimiento de cada ventaja entre casos (p. 54-55). */
export const COSTE_INTERLUDIO = {
  cigarettes2: 1, personal: 1, city: 1, personTension: 1, placeTension: 1,
  fullPack: 2, favor: 2, background: 3
};

/** Lee del texto de un caso el dado inicial y la duración (p. 81). */
export function leerCaso(texto) {
  const dado = /Dado del crimen:\s*(?:Comienza en\s*)?(\d)/i.exec(texto)?.[1];
  const dias = /Duraci[oó]n del caso:\s*(?:Este caso durar[aá]\s*)?(\d)/i.exec(texto)?.[1];
  return { dado: dado ? Number(dado) : null, dias: dias ? Number(dias) : null };
}

/** Trasfondos que aparecen más de una vez entre los huecos de la ficha. */
export function trasfondosRepetidos(lista) {
  const vistos = new Set();
  return lista.filter(t => t && (vistos.has(t) || !vistos.add(t)));
}

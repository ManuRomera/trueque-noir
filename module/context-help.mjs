/**
 * Ayuda contextual de escritorio.
 *
 * Aparece como una ventana flotante junto al cursor, tras una pausa corta del ratón.
 * El clic derecho —y el icono «?»— la fijan hasta que se pulsa fuera.
 */
const HOVER_DELAY = 800;
const MARGIN = 10;
const EDGE = 8;

const HELP = {
  "tn-strip__item--cigarettes": "Cigarrillos disponibles. Pagan una calada de sangre fría, un contacto, un rumor o una visita nocturna.",
  "tn-strip__item--crime": "Dado del crimen. Se resta a cada tirada de Perseguir el Crimen y baja cuando el grupo acumula pistas.",
  "tn-crime": "Dado del crimen del caso. Sube con los resultados duros y baja gastando pistas.",
  "tn-act--risk": "Tirada de Riesgo: actúas bajo presión y La Ciudad decide qué te cuesta.",
  "tn-act--pursue": "Perseguir el Crimen: siempre consigues la pista; lo que está en juego es el precio.",
  "tn-stamps": "Estados activos del detective. Se curan con tragos tranquilos e interludios."
};

const TARGETS = "[data-tn-help], .tn-help, .tn-act, .tn-strip__item, .tn-crime, .tn-stamps, .tn-block__title, label, button, input, select, textarea";

let timer = null;
let popup = null;
let source = null;
let pinned = false;
const pointer = { x: 0, y: 0 };

function dismiss() {
  if (timer) clearTimeout(timer);
  timer = null;
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  popup?.remove();
  popup = null;
  source = null;
  pinned = false;
}

function onDocumentPointerDown(event) {
  if (pinned && popup?.contains(event.target)) return;
  dismiss();
}

function helpFor(element) {
  const marked = element.closest("[data-tn-help]");
  if (marked?.dataset.tnHelp) return marked.dataset.tnHelp;
  for (const [className, text] of Object.entries(HELP)) {
    if (element.closest(`.${className}`)) return text;
  }
  const label = element.closest("label")?.innerText?.trim()
    || element.getAttribute("aria-label")
    || element.getAttribute("title")
    || element.innerText?.trim();
  if (element.matches("button")) return label ? `${label}. Pulsa para aplicarlo.` : "";
  if (element.matches("input, select, textarea")) return label ? `${label}. Se guarda al cambiar o al salir del campo.` : "";
  return label || "";
}

/**
 * Coloca la ventana junto al cursor, a su derecha y por debajo.
 * Si no cabe, salta al otro lado antes que salirse de la pantalla.
 */
function place() {
  const width = popup.offsetWidth;
  const height = popup.offsetHeight;
  const maxLeft = window.innerWidth - width - EDGE;
  const maxTop = window.innerHeight - height - EDGE;

  let left = pointer.x + MARGIN + 6;
  if (left > maxLeft) left = pointer.x - width - MARGIN;
  let top = pointer.y + MARGIN + 8;
  if (top > maxTop) top = pointer.y - height - MARGIN;

  popup.style.left = `${Math.round(Math.max(EDGE, Math.min(left, maxLeft)))}px`;
  popup.style.top = `${Math.round(Math.max(EDGE, Math.min(top, maxTop)))}px`;
}

function show(element, locked = false, at = null) {
  const message = helpFor(element);
  dismiss();
  if (!message) return;
  if (at) {
    pointer.x = at.x;
    pointer.y = at.y;
  }

  popup = document.createElement("aside");
  popup.className = `tn-help-popover${locked ? " is-pinned" : ""}`;
  popup.setAttribute("role", "tooltip");
  popup.textContent = message;
  document.body.appendChild(popup);
  source = element;
  pinned = locked;
  place();

  // Cualquier clic fuera cierra la ayuda, también el que cierra la propia ventana.
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
}

export function bindContextHelp(html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.dataset.tnHelpBound) return;
  root.dataset.tnHelpBound = "true";

  root.addEventListener("pointermove", event => {
    if (pinned) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const element = event.target.closest?.(TARGETS);

    // Moverse dentro del mismo elemento no reinicia nada: si no, el ratón nunca
    // está lo bastante quieto como para que la ayuda llegue a aparecer.
    if (element === source && popup) return;
    if (element && timer && element === source) return;

    if (!element || !root.contains(element)) {
      if (popup || timer) dismiss();
      return;
    }

    const wasVisible = Boolean(popup);
    dismiss();
    source = element;
    // Con una ayuda ya abierta, pasar a otro control la cambia al instante.
    if (wasVisible) return show(element);
    timer = setTimeout(() => show(element), HOVER_DELAY);
  });

  root.addEventListener("pointerleave", () => { if (!pinned) dismiss(); });
  root.addEventListener("scroll", () => { if (!pinned) dismiss(); }, true);

  root.addEventListener("contextmenu", event => {
    const element = event.target.closest(TARGETS);
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    show(element, true, { x: event.clientX, y: event.clientY });
  });

  root.addEventListener("click", event => {
    const help = event.target.closest(".tn-help");
    if (!help) return;
    event.preventDefault();
    event.stopPropagation();
    show(help, true, { x: event.clientX, y: event.clientY });
  });
}

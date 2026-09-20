const HELP = {
  "tn-vital-cigarettes": "Cigarrillos disponibles. Se gastan para activar ayudas y modificadores.",
  "tn-vital-crime": "Dado del crimen actual. Cada tres pistas guardadas puede reducirse en uno.",
  "tn-overexpose-bar": "Sobreexposición: repite la última tirada a cambio de aumentar la tensión de un pilar.",
  "tn-document-tabs": "Secciones del documento. Solo se muestra el bloque que estás usando para evitar desplazamiento innecesario.",
  "tn-case-tracker": "Panel de la Ciudad: reúne el estado del caso, la ciudad y las herramientas de dirección."
};

let timer = null;
let popup = null;
let pinned = false;

function dismiss() {
  if (timer) clearTimeout(timer);
  timer = null;
  document.removeEventListener("pointerdown", outsideClick);
  if (popup) popup.remove();
  popup = null;
  pinned = false;
}

function helpFor(element) {
  const marked = element.closest("[data-tn-help]");
  if (marked?.dataset.tnHelp) return marked.dataset.tnHelp;
  for (const [className, text] of Object.entries(HELP)) if (element.closest(`.${className}`)) return text;
  const label = element.closest("label")?.innerText?.trim() || element.getAttribute("aria-label") || element.getAttribute("title") || element.innerText?.trim();
  if (element.matches("button")) return label ? `Acción: ${label}. Pulsa para aplicarla.` : "Acción disponible.";
  if (element.matches("input, select, textarea")) return label ? `${label}. Puedes editar este dato; se guarda al cambiar o cerrar la ficha.` : "Campo editable; se guarda al cambiar o cerrar la ficha.";
  const title = element.querySelector?.(".tn-section-title")?.textContent?.trim();
  return title ? `${title}. Mantén esta tarjeta organizada para consultar la información sin salir de la ficha.` : "Información de Trueque Noir.";
}

function show(element, event, locked = false) {
  dismiss();
  const message = helpFor(element);
  popup = document.createElement("aside");
  popup.className = "tn-help-popover";
  popup.textContent = message;
  popup.style.left = `${Math.min((event?.clientX ?? 20) + 14, window.innerWidth - 340)}px`;
  popup.style.top = `${Math.min((event?.clientY ?? 20) + 14, window.innerHeight - 140)}px`;
  document.body.appendChild(popup);
  pinned = locked;
  if (locked) setTimeout(() => document.addEventListener("pointerdown", outsideClick), 0);
}

function outsideClick(event) {
  if (popup && pinned && !popup.contains(event.target)) dismiss();
}

export function bindContextHelp(html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.dataset.tnHelpBound) return;
  root.dataset.tnHelpBound = "true";
  const targets = "[data-tn-help], .tn-panel-card, .tn-vital, .tn-tabs .item, .tn-document-tabs button, .tn-state-card, .tn-gear-card, .tn-balada-card, .tn-compact-box, .tn-section-title, label, button, input, select, textarea";
  root.querySelectorAll(targets).forEach(element => {
    element.addEventListener("mouseenter", event => { timer = setTimeout(() => show(element, event), 2000); });
    element.addEventListener("mouseleave", () => { if (!pinned) dismiss(); });
    element.addEventListener("contextmenu", event => { event.preventDefault(); show(element, event, true); });
  });
}

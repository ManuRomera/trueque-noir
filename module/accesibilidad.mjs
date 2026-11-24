/**
 * Accesibilidad. Ajustes de cliente (cada persona los suyos, en su navegador) y un panel con un
 * icono en la cabecera de todas las ventanas del sistema, junto al de cerrar:
 * tamaño del texto y de las ventanas, alto contraste, fuente de alta legibilidad, reducir movimiento,
 * ayuda inmediata y retratos en color. Solo cambian una variable y clases del <body>.
 */
import { ID } from "./config.mjs";
import { ApplicationV2 } from "./compat.mjs";
import { ConMemoria } from "./memoria.mjs";

const CLAVES = ["a11yEscala", "escalaVentanas", "a11yContraste", "a11yLegible", "a11yMovimiento", "a11yAyuda", "portraitNoir"];
const CAJAS = [
  ["a11yContraste", "Alto contraste", "Texto blanco y bordes marcados, sin grises tenues."],
  ["a11yLegible", "Fuente de alta legibilidad", "Letra ancha y de formas claras en lugar de la condensada."],
  ["a11yMovimiento", "Reducir movimiento", "Sin transiciones ni animaciones en las ventanas del sistema."],
  ["a11yAyuda", "Ayuda inmediata", "Los textos de ayuda aparecen al instante al pasar el ratón."],
  ["portraitNoir", "Retratos en blanco y negro", "El tratamiento de fotografía noir; desmárcalo para ver los retratos en color."]
];

export function aplicarAccesibilidad() {
  const g = k => game.settings.get(ID, k);
  document.documentElement.style.setProperty("--tn-escala", String(g("a11yEscala") / 100));
  document.body.classList.toggle("tn-contraste", g("a11yContraste"));
  document.body.classList.toggle("tn-legible", g("a11yLegible"));
  document.body.classList.toggle("tn-sin-movimiento", g("a11yMovimiento"));
  const tip = game.tooltip?.constructor;
  if (tip) tip.TOOLTIP_ACTIVATION_MS = g("a11yAyuda") ? 60 : 500;
}

/** Registrar en `init`. */
export function registrarAccesibilidad() {
  const reg = (clave, datos) => game.settings.register(ID, clave, { scope: "client", config: true, onChange: () => { aplicarAccesibilidad(); repintar(); }, ...datos });
  reg("a11yEscala", { name: "Accesibilidad · Tamaño del texto (%)", hint: "Agranda o reduce el texto de las fichas, el Panel, la Mesa, los diálogos y las tarjetas del chat. Ajuste de este navegador.", type: Number, default: 100, range: { min: 85, max: 160, step: 5 } });
  reg("a11yContraste", { name: "Accesibilidad · Alto contraste", hint: CAJAS[0][2], type: Boolean, default: false });
  reg("a11yLegible", { name: "Accesibilidad · Fuente de alta legibilidad", hint: CAJAS[1][2], type: Boolean, default: false });
  reg("a11yMovimiento", { name: "Accesibilidad · Reducir movimiento", hint: CAJAS[2][2], type: Boolean, default: false });
  reg("a11yAyuda", { name: "Accesibilidad · Ayuda inmediata", hint: CAJAS[3][2], type: Boolean, default: false });
  Hooks.once("ready", aplicarAccesibilidad);
  Hooks.on("renderApplicationV2", app => anadirBotonAccesibilidad(app));
}

function repintar() {
  for (const app of foundry.applications.instances.values()) if (app instanceof PanelAccesibilidad) app.render();
}

export class PanelAccesibilidad extends ConMemoria(ApplicationV2) {
  static MEMORIA = "accesibilidad";
  static CAMPOS_MEMORIA = ["left", "top"];

  static DEFAULT_OPTIONS = {
    id: "trueque-noir-a11y", classes: ["trueque-noir", "tn-dialog", "tn-a11y"], position: { width: 420, height: "auto" },
    window: { resizable: true, title: "Accesibilidad", icon: "fa-solid fa-universal-access" }
  };

  static abrir() {
    return (foundry.applications.instances.get("trueque-noir-a11y") ?? new PanelAccesibilidad()).render({ force: true });
  }

  async _renderHTML() {
    const g = k => game.settings.get(ID, k);
    const filas = CAJAS.map(([k, t, ayuda]) => `<label class="tn-a11y-fila"><input type="checkbox" name="${k}" ${g(k) ? "checked" : ""}><span>${t}<small>${ayuda}</small></span></label>`).join("");
    return `<div class="tn-a11y-cuerpo">
      <label class="tn-a11y-rango"><span>Tamaño del texto <b>${g("a11yEscala")}%</b></span>
        <input type="range" name="a11yEscala" min="85" max="160" step="5" value="${g("a11yEscala")}" aria-label="Tamaño del texto"></label>
      <label class="tn-a11y-rango"><span>Tamaño de las ventanas <b>${g("escalaVentanas") ? `${g("escalaVentanas")}%` : "Automático"}</b></span>
        <input type="range" name="escalaVentanas" min="0" max="150" step="5" value="${g("escalaVentanas")}" aria-label="Tamaño de las ventanas (0 = automático)"></label>
      ${filas}
      <p class="tn-a11y-nota">Son ajustes de este navegador; también están en Configuración → Ajustes del sistema.</p>
      <div class="tn-a11y-acciones"><button type="button" class="tn-btn" data-restablecer><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Restablecer</button></div>
    </div>`;
  }

  _replaceHTML(html, contenido) {
    contenido.innerHTML = html;
    contenido.querySelectorAll("input").forEach(el => el.addEventListener("change", () => {
      game.settings.set(ID, el.name, el.type === "checkbox" ? el.checked : Number(el.value));
    }));
    contenido.querySelectorAll("input[type=range]").forEach(r => r.addEventListener("input", ev => {
      const v = Number(ev.target.value);
      ev.target.closest("label").querySelector("b").textContent = ev.target.name === "escalaVentanas" && !v ? "Automático" : `${v}%`;
    }));
    contenido.querySelector("[data-restablecer]")?.addEventListener("click", async () => {
      for (const k of CLAVES) await game.settings.set(ID, k, game.settings.settings.get(`${ID}.${k}`).default);
    });
  }
}

/** El icono va en la cabecera, justo antes del de cerrar. Idempotente. */
export function anadirBotonAccesibilidad(app) {
  const raiz = app.element;
  if (app instanceof PanelAccesibilidad || !raiz?.classList?.contains(ID)) return;
  const cab = raiz.querySelector(".window-header");
  if (!cab || cab.querySelector(".tn-a11y-boton")) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "header-control icon fa-solid fa-universal-access tn-a11y-boton";
  b.dataset.tooltip = "Accesibilidad";
  b.setAttribute("aria-label", "Opciones de accesibilidad");
  b.addEventListener("click", ev => { ev.stopPropagation(); PanelAccesibilidad.abrir(); });
  const cerrar = cab.querySelector('[data-action="close"]');
  if (cerrar) cerrar.before(b); else cab.append(b);
}

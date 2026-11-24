/**
 * Retratos: encuadre y lupa.
 *
 * Encuadre: cada actor guarda qué zona de su imagen se ve y con cuánto zoom
 * (`flags.trueque-noir.retrato = {x, y, z}`: centro del recorte como fracción 0-1 de la imagen y zoom 1-6).
 * El recorte es cuadrado y se aplica con `object-view-box`, así que vale para cualquier <img> sin envoltorios:
 * la ficha, el Panel y el directorio de Actores. Basta con marcar la imagen con `data-retrato="<id del actor>"`.
 *
 * Lupa: al dejar el cursor sobre una imagen con `data-lupa` se enseña grande, entera, junto a ella.
 * Se oculta al salir, al pulsar, al desplazar o con Escape. Cada persona la activa o no en Ajustes.
 */
import { ID } from "./config.mjs";
import { ApplicationV2 } from "./compat.mjs";
import { ConMemoria } from "./memoria.mjs";

const acota = (v, min, max) => Math.min(max, Math.max(min, v));
export const ZOOM_MAX = 6;

export const retratoDe = actor => actor?.getFlag(ID, "retrato") ?? null;

/** `inset()` en píxeles naturales del cuadrado que se ve. */
export function recorte({ x, y, z }, ancho, alto) {
  const lado = Math.min(ancho, alto) / Math.max(1, z);
  const izq = acota(x * ancho - lado / 2, 0, ancho - lado);
  const sup = acota(y * alto - lado / 2, 0, alto - lado);
  return `inset(${sup}px ${ancho - izq - lado}px ${alto - sup - lado}px ${izq}px)`;
}

/** Aplica (o quita, si no hay datos) el encuadre a una imagen. */
export function aplicar(img, datos) {
  if (!img) return;
  if (!datos) { img.style.objectViewBox = ""; return; }
  const poner = () => {
    if (!img.naturalWidth) return;
    img.style.objectFit = "cover";
    img.style.objectViewBox = recorte(datos, img.naturalWidth, img.naturalHeight);
  };
  if (img.complete && img.naturalWidth) poner(); else img.addEventListener("load", poner, { once: true });
}

const mismaImagen = (img, ruta) => {
  try { return decodeURIComponent(new URL(img.src, location.href).pathname).endsWith(`/${ruta.replace(/^\//, "")}`); }
  catch { return false; }
};

/** Aplica el encuadre en un fragmento de la interfaz: nuestras ventanas y el directorio de Actores. */
export function pintarRetratos(raiz = document) {
  const el = raiz instanceof HTMLElement ? raiz : raiz?.[0];
  if (!el) return;
  for (const img of el.querySelectorAll("img[data-retrato]")) aplicar(img, retratoDe(game.actors.get(img.dataset.retrato)));
  for (const li of el.querySelectorAll("li.directory-item[data-entry-id]")) {
    const a = game.actors.get(li.dataset.entryId);
    const img = li.querySelector("img.thumbnail");
    if (a && img && mismaImagen(img, a.img)) aplicar(img, retratoDe(a));
  }
}

export function registrarRetratos() {
  Hooks.on("renderActorDirectory", (app, html) => pintarRetratos(html));
  Hooks.on("renderApplicationV2", app => { if (app.element?.classList.contains(ID)) pintarRetratos(app.element); });
  registrarLupa();
}

export class EditorRetrato extends ConMemoria(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "trueque-noir-retrato", classes: ["trueque-noir", "tn-dialog", "tn-ret-editor"], position: { width: 640, height: "auto" },
    window: { resizable: true, icon: "fa-solid fa-crop-simple", title: "Encuadre del retrato" }
  };

  static MEMORIA = "retrato";
  static CAMPOS_MEMORIA = ["left", "top"];
  static abrir(actor) {
    foundry.applications.instances.get("trueque-noir-retrato")?.close();
    return new EditorRetrato(actor).render({ force: true });
  }

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.src = actor.img;
    this.r = { x: 0.5, y: 0.5, z: 1, ...(retratoDe(actor) ?? {}) };
  }

  get title() { return `Encuadre · ${this.actor.name}`; }

  async _renderHTML() {
    const src = foundry.utils.escapeHTML(this.src);
    return `<div class="tn-ret">
      <div class="tn-ret-cuerpo">
        <div class="tn-ret-escenario" tabindex="0" role="application" aria-label="Zona visible del retrato. Flechas para mover, más y menos para el zoom.">
          <img class="base" src="${src}" alt="" draggable="false"><div class="marco"></div>
        </div>
        <div class="tn-ret-lado">
          <div class="vistas"><img class="tn-retrato v-ficha" src="${src}" alt=""><img class="tn-retrato v-chica" src="${src}" alt=""></div>
          <label class="tn-a11y-rango"><span>Zoom <b class="zoom-valor"></b></span><input type="range" name="zoom" min="1" max="${ZOOM_MAX}" step="0.05" aria-label="Zoom"></label>
          <p class="tn-a11y-nota">Arrastra el recuadro o pulsa donde quieras centrarlo; la rueda del ratón cambia el zoom. Se ve igual en la ficha, el Panel y el directorio.</p>
        </div>
      </div>
      <footer class="tn-ret-pie">
        <span><button type="button" class="tn-btn" data-cambiar><i class="fa-solid fa-image" aria-hidden="true"></i> Cambiar imagen</button>
        <button type="button" class="tn-btn" data-restablecer><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Restablecer</button></span>
        <button type="button" class="tn-btn tn-btn--primary" data-guardar><i class="fa-solid fa-check" aria-hidden="true"></i> Guardar</button>
      </footer>
    </div>`;
  }

  _replaceHTML(html, contenido) {
    contenido.innerHTML = html;
    this.el = contenido;
    this.escenario = contenido.querySelector(".tn-ret-escenario");
    this.base = contenido.querySelector("img.base");
    const arrancar = () => this.#dibujar();
    if (this.base.complete && this.base.naturalWidth) arrancar(); else this.base.addEventListener("load", arrancar, { once: true });
    new ResizeObserver(arrancar).observe(this.escenario);

    const mover = ev => {
      const caja = this.base.getBoundingClientRect();
      this.r.x = acota((ev.clientX - caja.left) / caja.width, 0, 1);
      this.r.y = acota((ev.clientY - caja.top) / caja.height, 0, 1);
      this.#dibujar();
    };
    this.escenario.addEventListener("pointerdown", ev => {
      try { this.escenario.setPointerCapture(ev.pointerId); } catch { /* puntero ya liberado */ }
      mover(ev);
      const soltar = () => { this.escenario.removeEventListener("pointermove", mover); this.escenario.removeEventListener("pointerup", soltar); };
      this.escenario.addEventListener("pointermove", mover);
      this.escenario.addEventListener("pointerup", soltar);
    });
    this.escenario.addEventListener("wheel", ev => { ev.preventDefault(); this.#zoom(this.r.z + (ev.deltaY < 0 ? 0.2 : -0.2)); }, { passive: false });
    this.escenario.addEventListener("keydown", ev => {
      const paso = ev.shiftKey ? 0.05 : 0.01;
      const k = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[ev.key];
      if (k) { ev.preventDefault(); this.r.x = acota(this.r.x + k[0], 0, 1); this.r.y = acota(this.r.y + k[1], 0, 1); this.#dibujar(); }
      if (ev.key === "+" || ev.key === "=") this.#zoom(this.r.z + 0.2);
      if (ev.key === "-") this.#zoom(this.r.z - 0.2);
    });
    contenido.querySelector("input[name=zoom]").addEventListener("input", ev => this.#zoom(Number(ev.target.value)));
    contenido.querySelector("[data-restablecer]").addEventListener("click", () => { this.r = { x: 0.5, y: 0.5, z: 1 }; this.#dibujar(); });
    contenido.querySelector("[data-cambiar]").addEventListener("click", () => this.#cambiarImagen());
    contenido.querySelector("[data-guardar]").addEventListener("click", () => this.#guardar());
  }

  #zoom(z) { this.r.z = acota(Math.round(z * 100) / 100, 1, ZOOM_MAX); this.#dibujar(); }

  /** Marco sobre la imagen del escenario y las vistas previas. */
  #dibujar() {
    const b = this.base;
    if (!b?.naturalWidth) return;
    const caja = this.escenario.getBoundingClientRect();
    if (!caja.width || !caja.height) return; // sin layout aún: el ResizeObserver lo retoma
    // getBoundingClientRect incluye la escala de la ventana; los estilos van en píxeles sin escalar.
    const esc = caja.width / this.escenario.offsetWidth || 1;
    const cw = caja.width / esc, ch = caja.height / esc;
    const k = Math.min(cw / b.naturalWidth, ch / b.naturalHeight);
    const w = b.naturalWidth * k, h = b.naturalHeight * k;
    Object.assign(b.style, { width: `${w}px`, height: `${h}px`, left: `${(cw - w) / 2}px`, top: `${(ch - h) / 2}px` });
    const lado = Math.min(w, h) / this.r.z;
    // El recuadro nunca se sale de la imagen: el centro se acota con él.
    this.r.x = acota(this.r.x, lado / 2 / w, 1 - lado / 2 / w);
    this.r.y = acota(this.r.y, lado / 2 / h, 1 - lado / 2 / h);
    const marco = this.escenario.querySelector(".marco");
    Object.assign(marco.style, { width: `${lado}px`, height: `${lado}px`, left: `${(cw - w) / 2 + this.r.x * w - lado / 2}px`, top: `${(ch - h) / 2 + this.r.y * h - lado / 2}px` });
    this.el.querySelector(".zoom-valor").textContent = `${this.r.z.toFixed(2)}×`;
    this.el.querySelector("input[name=zoom]").value = this.r.z;
    for (const v of this.el.querySelectorAll(".vistas img")) aplicar(v, this.r);
  }

  async #cambiarImagen() {
    const FP = foundry.applications.apps.FilePicker.implementation;
    new FP({ type: "image", current: this.src, callback: ruta => { this.src = ruta; this.r = { x: 0.5, y: 0.5, z: 1 }; this.render(); } }).render({ force: true });
  }

  async #guardar() {
    const centrado = this.r.z === 1 && this.r.x === 0.5 && this.r.y === 0.5;
    const cambios = centrado
      ? { [`flags.${ID}.-=retrato`]: null }
      : { [`flags.${ID}.retrato`]: { x: Math.round(this.r.x * 1000) / 1000, y: Math.round(this.r.y * 1000) / 1000, z: this.r.z } };
    if (this.src !== this.actor.img) cambios.img = this.src;
    await this.actor.update(cambios);
    ui.actors?.render();
    this.close();
  }
}

/** Lupa sobre las imágenes marcadas con `data-lupa` (vacío = la propia imagen; o la ruta de otra). */
function registrarLupa() {
  game.settings.register(ID, "lupa", {
    name: "Ampliar las imágenes al pasar el ratón",
    hint: "Al dejar el cursor sobre un retrato o una ilustración se muestra en grande. Ajuste de este navegador.",
    scope: "client", config: true, type: Boolean, default: true
  });

  let caja = null, actual = null, espera = 0;
  const ocultar = () => { clearTimeout(espera); actual = null; caja?.remove(); caja = null; };

  const mostrar = img => {
    const origen = img.dataset.lupa || img.currentSrc || img.src;
    const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0.75;
    const alto = Math.min(window.innerHeight * 0.86, ratio < 1 ? 760 : 520);
    const ancho = Math.min(alto * ratio, window.innerWidth * 0.46);
    const rect = img.getBoundingClientRect();
    const aLaDerecha = rect.left + rect.width / 2 < window.innerWidth / 2;
    const izquierda = aLaDerecha ? Math.min(rect.right + 18, window.innerWidth - ancho - 12) : Math.max(rect.left - ancho - 18, 12);
    const arriba = Math.min(Math.max(rect.top + rect.height / 2 - alto / 2, 10), window.innerHeight - alto - 10);
    caja = document.createElement("div");
    caja.className = "tn-lupa";
    caja.setAttribute("aria-hidden", "true");
    Object.assign(caja.style, { left: `${izquierda}px`, top: `${arriba}px`, width: `${ancho}px`, height: `${alto}px` });
    const grande = new Image();
    grande.src = origen;
    grande.alt = "";
    if (img.classList.contains("tn-retrato") || img.classList.contains("tn-mini-retrato")) grande.className = "tn-retrato";
    caja.append(grande);
    document.body.append(caja);
  };

  document.addEventListener("pointerover", ev => {
    if (ev.pointerType === "touch" || !game.settings.get(ID, "lupa")) return;
    const img = ev.target instanceof Element ? ev.target.closest("img[data-lupa]") : null;
    if (!img || img === actual) return;
    ocultar();
    actual = img;
    espera = setTimeout(() => { if (actual === img && img.isConnected) mostrar(img); }, 260);
  });
  document.addEventListener("pointerout", ev => {
    if (actual && ev.target instanceof Element && ev.target.closest("img[data-lupa]") === actual && !actual.contains(ev.relatedTarget)) ocultar();
  });
  for (const tipo of ["pointerdown", "wheel", "keydown", "blur"]) window.addEventListener(tipo, ocultar, { passive: true, capture: true });
}

/**
 * Base de todas las ventanas del sistema: V2 + Handlebars + memoria de ventana.
 * Las ventanas únicas se abren con `Clase.abrir()`: si ya existe, se trae al frente.
 */
import { ApplicationV2, HandlebarsApplicationMixin, ventana } from "../compat.mjs";
import { ConMemoria } from "../memoria.mjs";

export class AppTN extends ConMemoria(HandlebarsApplicationMixin(ApplicationV2)) {
  static DEFAULT_OPTIONS = {
    classes: ["trueque-noir"],
    window: { resizable: true }
  };

  /** Las ventanas que dependen del estado del caso se repintan solas cuando cambia. */
  static REACTIVA = false;

  static abrir(...args) {
    const abierta = ventana(this.DEFAULT_OPTIONS.id);
    return (abierta ?? new this(...args)).render({ force: true });
  }
}

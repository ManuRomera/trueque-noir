/** Hoja del PNJ: una ficha breve con zona, localización, favor y notas. */
import { ActorSheetV2, HandlebarsApplicationMixin } from "../compat.mjs";
import { ConMemoria } from "../memoria.mjs";
import { RUTA } from "../config.mjs";
import { zonas } from "../apps/dialogos.mjs";

export class HojaPnj extends ConMemoria(HandlebarsApplicationMixin(ActorSheetV2)) {
  static DEFAULT_OPTIONS = {
    classes: ["trueque-noir", "tn-ficha", "tn-pnj"],
    position: { width: 560, height: 440 },
    window: { icon: "fa-solid fa-user", resizable: true },
    form: { submitOnChange: true }
  };

  static PARTS = { hoja: { template: `${RUTA}/templates/actors/npc-sheet.hbs`, scrollable: [".tn-cuerpo"] } };

  get title() {
    return this.document.name;
  }

  async _prepareContext(options) {
    const base = await super._prepareContext(options);
    return Object.assign(base, { actor: this.document, system: this.document.system, editable: this.isEditable, zonas: zonas() });
  }
}

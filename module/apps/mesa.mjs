/**
 * Mesa del caso: el HUD compartido. El dado del crimen en grande, el reloj, las pistas y el
 * rumor pendiente. Nada que editar: La Ciudad la muestra u oculta para todo el grupo.
 */
import { RUTA, DADO_TEXTO, diasDelCaso, estadoCaso } from "../config.mjs";
import * as R from "../reglas.mjs";
import { AppTN } from "./base.mjs";

export class MesaCaso extends AppTN {
  static MEMORIA = "mesa-caso";
  static REACTIVA = true;

  static DEFAULT_OPTIONS = {
    id: "trueque-noir-case-board",
    classes: ["tn-app", "tn-case-board"],
    position: { width: 760, height: "auto" },
    window: { title: "Mesa del caso", icon: "fa-solid fa-table-columns", resizable: true, minimizable: true }
  };

  static CAMPOS_MEMORIA = ["left", "top", "width"];
  static PARTS = { mesa: { template: `${RUTA}/templates/apps/case-board.hbs` } };

  async _prepareContext() {
    const caso = estadoCaso();
    return {
      caso,
      dias: diasDelCaso(caso),
      dadoTexto: DADO_TEXTO[caso.dado - 1] ?? "",
      pistaProgreso: Array.from({ length: R.PISTAS_POR_PASO }, (_, i) => ({ llena: i < caso.pistas.progreso }))
    };
  }
}

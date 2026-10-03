/** Selector visual de ambientación: cambia el fondo de la escena de portada y las tablas aleatorias. */
import { RUTA } from "../config.mjs";
import { THEME_LIST } from "../themes.mjs";
import { applySceneTheme, getSceneTheme } from "../scene-setup.mjs";
import { AppTN } from "./base.mjs";

export class Ambientacion extends AppTN {
  static MEMORIA = "ambientacion";
  static DEFAULT_OPTIONS = {
    id: "trueque-noir-theme-picker",
    classes: ["tn-app", "tn-theme-picker"],
    position: { width: 880, height: 640 },
    window: { title: "Ambientación", icon: "fa-solid fa-image", resizable: true },
    actions: {
      async elegir(event, boton) {
        await applySceneTheme(boton.dataset.theme);
        this.render();
      }
    }
  };

  static PARTS = { cuerpo: { template: `${RUTA}/templates/apps/theme-picker.hbs`, scrollable: [".tn-themes__grid"] } };

  static abrir() {
    if (!game.user.isGM) return ui.notifications.warn("Solo La Ciudad puede cambiar la ambientación.");
    return super.abrir();
  }

  async _prepareContext() {
    const activa = getSceneTheme();
    return { themes: THEME_LIST.map(theme => ({ ...theme, active: theme.id === activa })) };
  }
}

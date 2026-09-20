import { LegacyApplication } from "./compat.mjs";
import { THEME_LIST } from "./themes.mjs";
import { applySceneTheme, getSceneTheme } from "./scene-setup.mjs";

/** Selector visual de ambientación: cambia el fondo de la escena de portada. */
export class TruequeNoirThemePicker extends LegacyApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trueque-noir-theme-picker",
      template: "systems/trueque-noir/templates/apps/theme-picker.hbs",
      classes: ["trueque-noir", "tn-app", "tn-theme-picker"],
      title: "Ambientación",
      width: 860,
      height: 640,
      resizable: true
    });
  }

  getData() {
    const active = getSceneTheme();
    return {
      themes: THEME_LIST.map(theme => ({ ...theme, active: theme.id === active }))
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = html[0] ?? html;
    for (const card of root.querySelectorAll("[data-theme]")) {
      card.addEventListener("click", async () => {
        await applySceneTheme(card.dataset.theme);
        this.render(false);
      });
    }
  }
}

export function openThemePicker() {
  if (!game.user?.isGM) return ui.notifications.warn("Solo La Ciudad puede cambiar la ambientación.");
  const existing = Object.values(ui.windows ?? {}).find(app => app?.options?.id === "trueque-noir-theme-picker");
  if (existing) return existing.render(true);
  return new TruequeNoirThemePicker().render(true);
}

/** Primera pantalla del sistema: tres decisiones y ninguna búsqueda a ciegas. */
import { ID, RUTA, TN, leerCiudad, getDetectives } from "../config.mjs";
import { countArchive } from "../case-archive.mjs";
import { getTheme } from "../themes.mjs";
import { getSceneTheme } from "../scene-setup.mjs";
import { AppTN } from "./base.mjs";

export class Bienvenida extends AppTN {
  static MEMORIA = "bienvenida";
  static CAMPOS_MEMORIA = ["left", "top"];

  static DEFAULT_OPTIONS = {
    id: "trueque-noir-welcome",
    classes: ["tn-app", "tn-welcome-app"],
    position: { width: 700, height: "auto" },
    window: { title: "Trueque Noir", icon: "fa-solid fa-user-secret", resizable: false },
    actions: {
      ciudad() { game.truequeNoir.abrirCreadorCiudad(); this.close(); },
      detective() { game.truequeNoir.abrirCreadorDetective(); this.close(); },
      caso() { game.truequeNoir.abrirPanel(); this.close(); },
      casos() { game.truequeNoir.importarCasos(); }
    }
  };

  static PARTS = { cuerpo: { template: `${RUTA}/templates/apps/welcome.hbs` } };

  async _prepareContext() {
    return {
      cover: getTheme(getSceneTheme()).scene.src,
      logo: TN.LOGO,
      isGM: game.user.isGM,
      cityReady: leerCiudad().hasContent,
      cityName: game.settings.get(ID, "cityName"),
      detectiveCount: getDetectives().length,
      archiveCount: await countArchive(),
      archiveImported: Boolean(game.settings.get(ID, "caseArchiveImported")),
      hideOnStart: Boolean(game.settings.get(ID, "welcomeSeen"))
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector("[name=hideOnStart]")?.addEventListener("change", async event => {
      if (game.user.isGM) await game.settings.set(ID, "welcomeSeen", event.currentTarget.checked);
    });
  }

  /** Cerrarla por primera vez la da por vista: no vuelve a abrirse sola. */
  async close(options) {
    if (game.user.isGM && !game.settings.get(ID, "welcomeSeen")) await game.settings.set(ID, "welcomeSeen", true);
    return super.close(options);
  }
}

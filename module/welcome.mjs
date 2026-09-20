import { TN, getDetectives } from "./config.mjs";
import { LegacyApplication } from "./compat.mjs";
import { countArchive } from "./case-archive.mjs";
import { getTheme } from "./themes.mjs";
import { getSceneTheme } from "./scene-setup.mjs";

function hasCity() {
  try {
    const data = JSON.parse(game.settings.get(TN.SYSTEM_ID, "cityData") || "{}");
    return Boolean(data.context || (Array.isArray(data.zones) && data.zones.length));
  } catch (_error) {
    return false;
  }
}

/** Primera pantalla del sistema: tres decisiones y ninguna búsqueda a ciegas. */
export class TruequeNoirWelcome extends LegacyApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trueque-noir-welcome",
      template: "systems/trueque-noir/templates/apps/welcome.hbs",
      classes: ["trueque-noir", "tn-app", "tn-welcome-app"],
      width: 720,
      height: 640,
      resizable: false,
      title: "Trueque Noir"
    });
  }

  async getData() {
    return {
      cover: getTheme(getSceneTheme()).scene.src,
      logo: TN.LOGO,
      isGM: game.user?.isGM,
      cityReady: hasCity(),
      cityName: game.settings.get(TN.SYSTEM_ID, "cityName"),
      detectiveCount: getDetectives().length,
      caseName: game.settings.get(TN.SYSTEM_ID, "caseName"),
      archiveCount: await countArchive(),
      archiveImported: Boolean(game.settings.get(TN.SYSTEM_ID, "caseArchiveImported")),
      hideOnStart: Boolean(game.settings.get(TN.SYSTEM_ID, "welcomeSeen"))
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = html[0] ?? html;
    const go = (action, handler) => root.querySelector(`[data-action='${action}']`)?.addEventListener("click", handler);

    go("build-city", () => { game.truequeNoir.openCityGenerator(); this.close(); });
    go("create-detective", () => { game.truequeNoir.openCharacterGenerator(); this.close(); });
    go("start-case", () => { game.truequeNoir.openCaseTracker(); this.close(); });
    go("browse-cases", () => game.truequeNoir.importCaseArchive());

    root.querySelector("[name='hideOnStart']")?.addEventListener("change", async event => {
      if (game.user?.isGM) await game.settings.set(TN.SYSTEM_ID, "welcomeSeen", event.currentTarget.checked);
    });
  }

  async close(options = {}) {
    if (game.user?.isGM && !game.settings.get(TN.SYSTEM_ID, "welcomeSeen")) {
      await game.settings.set(TN.SYSTEM_ID, "welcomeSeen", true);
    }
    return super.close(options);
  }
}

export function openWelcome() {
  const existing = Object.values(ui.windows ?? {}).find(app => app?.options?.id === "trueque-noir-welcome");
  if (existing) return existing.render(true);
  return new TruequeNoirWelcome().render(true);
}

/** La bienvenida solo se abre sola la primera vez que La Ciudad entra en el mundo. */
export async function maybeOpenWelcome() {
  if (!game.user?.isGM) return;
  if (game.settings.get(TN.SYSTEM_ID, "welcomeSeen")) return;
  openWelcome();
}

import { TN } from "./config.mjs";
import { getTheme, DEFAULT_THEME } from "./themes.mjs";

/**
 * Escena de portada del sistema.
 *
 * Debe abrirse siempre encuadrada: sin cuadrícula, sin niebla, sin visión de token
 * y con la imagen ocupando toda la pantalla útil. El rótulo del juego va en un tile
 * encima del fondo, colocado para que parezca parte de la ilustración.
 */
export const COVER_SCENE_NAME = TN.SCENE_FLAG;

/** Proporciones del rótulo: 2109 × 746 px. */
const LOGO_RATIO = 746 / 2109;
const LOGO_WIDTH = 0.58;
const LOGO_TOP = 0.05;

export function getSceneTheme() {
  return game.settings?.get(TN.SYSTEM_ID, "cityTheme") ?? DEFAULT_THEME;
}

function coverSceneSource(themeId = getSceneTheme()) {
  const { scene } = getTheme(themeId);
  return {
    name: COVER_SCENE_NAME,
    width: scene.width,
    height: scene.height,
    padding: 0,
    backgroundColor: "#000000",
    background: { src: scene.src },
    // Cuadrícula desactivada (tipo 0 = sin cuadrícula) y además invisible.
    grid: { type: 0, size: 100, alpha: 0, distance: 1, units: "" },
    tokenVision: false,
    fog: { exploration: false },
    environment: { darknessLevel: 0, globalLight: { enabled: true } },
    initial: { x: Math.round(scene.width / 2), y: Math.round(scene.height / 2), scale: null },
    navigation: true,
    flags: { [TN.SYSTEM_ID]: { starterScene: COVER_SCENE_NAME, theme: themeId } }
  };
}

function logoTileSource(scene) {
  const width = Math.round(scene.width * LOGO_WIDTH);
  const height = Math.round(width * LOGO_RATIO);
  return {
    texture: { src: TN.LOGO },
    width,
    height,
    x: Math.round((scene.width - width) / 2),
    y: Math.round(scene.height * LOGO_TOP),
    elevation: 0,
    sort: 10,
    locked: true,
    flags: { [TN.SYSTEM_ID]: { coverLogo: true } }
  };
}

function needsUpdate(scene, source) {
  return scene.width !== source.width
    || scene.height !== source.height
    || scene.padding !== 0
    || scene.background?.src !== source.background.src
    || Number(scene.grid?.type) !== 0
    || scene.tokenVision !== false
    || scene.fog?.exploration !== false
    || scene.environment?.globalLight?.enabled !== true;
}

/** Coloca o recoloca el rótulo para que encaje con el tamaño actual de la escena. */
async function ensureLogoTile(scene) {
  const wanted = logoTileSource(scene);
  const existing = scene.tiles.find(tile => tile.getFlag(TN.SYSTEM_ID, "coverLogo"));
  if (!existing) return scene.createEmbeddedDocuments("Tile", [wanted]);
  const changed = ["width", "height", "x", "y"].some(key => existing[key] !== wanted[key])
    || existing.texture?.src !== TN.LOGO;
  if (changed) await existing.update(wanted);
  return existing;
}

/** Crea la escena de portada, o corrige la existente si alguien alteró sus ajustes clave. */
export async function ensureCoverScene() {
  if (!game.user?.isGM) return null;

  // La escena de construcción de ciudad se retiró en 1.3.0.
  for (const obsolete of game.scenes.filter(scene => scene.getFlag(TN.SYSTEM_ID, "starterScene") === "Trueque Noir · Construcción de la ciudad")) {
    await obsolete.delete();
  }

  const source = coverSceneSource();
  let scene = game.scenes.find(entry => entry.getFlag(TN.SYSTEM_ID, "starterScene") === COVER_SCENE_NAME);
  if (!scene) scene = await Scene.create(source);
  else if (needsUpdate(scene, source)) {
    // Solo se corrigen los ajustes que la portada necesita; el nombre que le haya
    // puesto el usuario y el resto de su configuración se respetan.
    const { name, navigation, ...fixes } = source;
    await scene.update(fixes);
  }
  if (scene) await ensureLogoTile(scene);
  return scene;
}

/** Cambia la ambientación: fondo, proporciones de la escena y rótulo. */
export async function applySceneTheme(themeId) {
  if (!game.user?.isGM) return ui.notifications.warn("Solo La Ciudad puede cambiar la ambientación.");
  const theme = getTheme(themeId);
  await game.settings.set(TN.SYSTEM_ID, "cityTheme", theme.id);

  const scene = game.scenes.find(entry => entry.getFlag(TN.SYSTEM_ID, "starterScene") === COVER_SCENE_NAME);
  if (!scene) {
    await ensureCoverScene();
    ui.notifications.info(`Ambientación «${theme.label}» aplicada.`);
    return;
  }

  const { name, navigation, ...fixes } = coverSceneSource(theme.id);
  await scene.update(fixes);
  await ensureLogoTile(scene);
  if (canvas?.scene?.id === scene.id) canvas.pan(coverView(scene));
  ui.notifications.info(`Ambientación «${theme.label}» aplicada a la escena de portada.`);
}

export function isCoverScene(scene) {
  return scene?.getFlag?.(TN.SYSTEM_ID, "starterScene") === COVER_SCENE_NAME;
}

/**
 * Encuadre que hace que la portada cubra toda la zona de escena disponible.
 * `canvas.pan` ya limita el zoom a los márgenes que permite la escena.
 */
function coverView(scene) {
  const [screenWidth, screenHeight] = canvas.screenDimensions?.[0] ? canvas.screenDimensions : [window.innerWidth, window.innerHeight];
  return {
    x: scene.width / 2,
    y: scene.height / 2,
    scale: Math.max(screenWidth / scene.width, screenHeight / scene.height)
  };
}

/**
 * Solo la portada de Trueque Noir se reencuadra automáticamente.
 * Cualquier otra escena conserva el zoom y la posición que el usuario decida.
 */
export function bindCoverSceneCamera() {
  Hooks.on("canvasReady", () => {
    const scene = canvas?.scene;
    if (!isCoverScene(scene)) return;
    canvas.pan(coverView(scene));
  });

  // Al redimensionar la ventana con la portada activa, se vuelve a encuadrar.
  window.addEventListener("resize", foundry.utils.debounce(() => {
    const scene = canvas?.scene;
    if (!canvas?.ready || !isCoverScene(scene)) return;
    canvas.pan(coverView(scene));
  }, 250));
}

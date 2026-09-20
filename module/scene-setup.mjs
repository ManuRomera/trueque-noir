import { TN } from "./config.mjs";

/**
 * Escena de portada del sistema.
 * Debe abrirse siempre encuadrada: sin cuadrícula, sin niebla, sin visión de token
 * y con la imagen ocupando toda la pantalla útil.
 */
export const COVER_SCENE = {
  name: TN.SCENE_FLAG,
  src: TN.COVER,
  width: 1920,
  height: 1024
};

function coverSceneSource() {
  const { name, src, width, height } = COVER_SCENE;
  return {
    name,
    width,
    height,
    padding: 0,
    backgroundColor: "#000000",
    background: { src },
    // Cuadrícula desactivada (tipo 0 = sin cuadrícula) y además invisible.
    grid: { type: 0, size: 100, alpha: 0, distance: 1, units: "" },
    tokenVision: false,
    fog: { exploration: false },
    environment: { darknessLevel: 0, globalLight: { enabled: true } },
    initial: { x: Math.round(width / 2), y: Math.round(height / 2), scale: null },
    navigation: true,
    flags: { [TN.SYSTEM_ID]: { starterScene: name } }
  };
}

function needsUpdate(scene) {
  const grid = scene.grid ?? {};
  return scene.width !== COVER_SCENE.width
    || scene.height !== COVER_SCENE.height
    || scene.padding !== 0
    || scene.background?.src !== COVER_SCENE.src
    || Number(grid.type) !== 0
    || scene.tokenVision !== false
    || scene.fog?.exploration !== false
    || scene.environment?.globalLight?.enabled !== true;
}

/** Crea la escena de portada, o corrige la existente si alguien alteró sus ajustes clave. */
export async function ensureCoverScene() {
  if (!game.user?.isGM) return null;

  // La escena de construcción de ciudad se retiró en 1.3.0.
  for (const obsolete of game.scenes.filter(scene => scene.getFlag(TN.SYSTEM_ID, "starterScene") === "Trueque Noir · Construcción de la ciudad")) {
    await obsolete.delete();
  }

  const existing = game.scenes.find(scene => scene.getFlag(TN.SYSTEM_ID, "starterScene") === COVER_SCENE.name);
  if (!existing) return Scene.create(coverSceneSource());
  if (needsUpdate(existing)) {
    // Solo se corrigen los ajustes que la portada necesita; el nombre que le haya puesto
    // el usuario y el resto de su configuración se respetan.
    const { name, navigation, ...fixes } = coverSceneSource();
    await existing.update(fixes);
  }
  return existing;
}

export function isCoverScene(scene) {
  return scene?.getFlag?.(TN.SYSTEM_ID, "starterScene") === COVER_SCENE.name;
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

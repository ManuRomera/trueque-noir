const PREFIX = "trueque-noir.window.";

/**
 * Solo persisten las ventanas con identidad propia: fichas y aplicaciones del sistema.
 * Los diálogos efímeros comparten clase y no deben heredar el tamaño de otros.
 */
function keyFor(app) {
  if (app?.options?.popOut === false) return null;
  if (app?.actor?.uuid) return `${PREFIX}${app.actor.uuid}`;
  const id = app?.options?.id;
  if (typeof id === "string" && id.startsWith("trueque-noir")) return `${PREFIX}${id}`;
  return null;
}

export function restoreWindowState(app) {
  const key = keyFor(app);
  if (!key || app._tnWindowRestored) return;
  app._tnWindowRestored = true;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (!saved) return;
    const position = {};
    for (const field of ["left", "top", "width", "height"]) {
      if (Number.isFinite(saved[field])) position[field] = saved[field];
    }
    if (Object.keys(position).length) app.setPosition(position);
  } catch (error) {
    console.warn("trueque-noir | No se pudo restaurar la ventana", error);
  }
}

export function persistWindowState(app) {
  const key = keyFor(app);
  if (!key) return;
  const position = app.position || {};
  const saved = {};
  for (const field of ["left", "top", "width", "height"]) {
    if (Number.isFinite(position[field])) saved[field] = position[field];
  }
  if (Object.keys(saved).length) {
    try {
      localStorage.setItem(key, JSON.stringify(saved));
    } catch (error) {
      console.warn("trueque-noir | No se pudo guardar la posición de la ventana", error);
    }
  }
}

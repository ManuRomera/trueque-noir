const PREFIX = "trueque-noir.window.";

function keyFor(app) {
  const id = app?.options?.id || app?.id || app?.constructor?.name;
  return id ? `${PREFIX}${id}` : null;
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
  const p = app.position || {};
  const saved = {};
  for (const field of ["left", "top", "width", "height"]) {
    if (Number.isFinite(p[field])) saved[field] = p[field];
  }
  if (Object.keys(saved).length) localStorage.setItem(key, JSON.stringify(saved));
}

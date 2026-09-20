/** Puente de compatibilidad entre Foundry VTT 13 y 14. Toda la API heredada vive aquí. */
export const LegacyActorSheet = foundry.appv1?.sheets?.ActorSheet ?? globalThis.ActorSheet;
export const LegacyApplication = foundry.appv1?.api?.Application ?? globalThis.Application;
export const LegacyDialog = foundry.appv1?.api?.Dialog ?? globalThis.Dialog;
export const ActorsCollection = foundry.documents?.collections?.Actors ?? globalThis.Actors;

export function openWindows() {
  return Object.values(ui.windows ?? {});
}

export function findWindow(id) {
  return openWindows().find(app => app?.options?.id === id);
}

/**
 * Evita que un render automático borre lo que el usuario está escribiendo.
 * Devuelve true cuando hay que aplazar el render hasta que el campo pierda el foco.
 */
export function shouldDeferRender(app) {
  const root = app?.element?.[0] ?? app?.element;
  const active = document.activeElement;
  if (!root || !active || !root.contains?.(active)) return false;
  return active.matches?.("input:not([type='button']), textarea, select");
}

/** Reengancha un render aplazado al perder el foco del campo que lo bloqueaba. */
export function deferRender(app) {
  if (app._tnPendingRender) return;
  app._tnPendingRender = true;
  const active = document.activeElement;
  const release = () => {
    active?.removeEventListener("blur", release);
    if (!app._tnPendingRender) return;
    app._tnPendingRender = false;
    if (app.rendered) app.render(false);
  };
  active?.addEventListener("blur", release, { once: true });
}

/**
 * Registra el grupo de controles de escena.
 * Foundry 13 y 14 usan un registro de objetos y llaman a `onChange(event, active)`;
 * `onClick` quedó obsoleto en la 13 y dispararía la acción dos veces.
 */
export function registerSceneControl(controls, control) {
  if (controls[control.name]) return;
  controls[control.name] = {
    name: control.name,
    title: control.title,
    icon: control.icon,
    order: Object.keys(controls).length,
    activeTool: control.activeTool,
    tools: Object.fromEntries(control.tools.map((tool, order) => [
      tool.name,
      {
        ...tool,
        order,
        // Foundry avisa también al desactivar la herramienta: solo actuamos al activarla.
        onChange: tool.onChange ? (event, active) => { if (active !== false) tool.onChange(event, active); } : undefined
      }
    ]))
  };
}

/**
 * Se dispara con cada mensaje de chat renderizado.
 * Foundry 13 renombró el hook a `renderChatMessageHTML` y entrega un HTMLElement;
 * mantenemos el nombre antiguo solo como red de seguridad para builds anteriores.
 */
export function onRenderChatMessage(handler) {
  const wrap = (message, html) => handler(message, html instanceof HTMLElement ? html : html?.[0]);
  const hookName = (game.release?.generation ?? 13) >= 13 ? "renderChatMessageHTML" : "renderChatMessage";
  Hooks.on(hookName, wrap);
}

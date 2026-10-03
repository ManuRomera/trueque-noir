/**
 * Enrutamiento de compatibilidad Foundry VTT 13 ↔ 14.
 * Todo acceso a una API que haya cambiado de nombre o de sitio pasa por aquí;
 * el resto del sistema no pregunta nunca por la versión.
 *
 * | Necesidad            | v13                                 | v14                               |
 * |----------------------|-------------------------------------|-----------------------------------|
 * | Hojas y diálogos     | foundry.applications (V2)           | igual; V1 retirada                |
 * | Visibilidad del chat | core.rollMode + applyRollMode       | core.messageMode + applyMode      |
 * | Hook de chat         | renderChatMessageHTML (HTMLElement) | igual                             |
 * | Controles de escena  | registro de objetos, onChange       | igual                             |
 */
const f = globalThis.foundry;

export const ApplicationV2 = f.applications.api.ApplicationV2;
export const HandlebarsApplicationMixin = f.applications.api.HandlebarsApplicationMixin;
export const DialogV2 = f.applications.api.DialogV2;
export const ActorSheetV2 = f.applications.sheets.ActorSheetV2;
export const DocumentSheetConfig = f.applications.apps.DocumentSheetConfig;
export const renderTemplate = f.applications.handlebars.renderTemplate;
export const loadTemplates = f.applications.handlebars.loadTemplates;

if (![ApplicationV2, HandlebarsApplicationMixin, DialogV2, ActorSheetV2, DocumentSheetConfig].every(c => typeof c === "function")) {
  throw new Error("Trueque Noir necesita las APIs V2 de Foundry 13 o posterior.");
}

/** Generación leída en el momento: `game.release` no existe mientras se evalúa el módulo. */
export function generacion() {
  return Number(game.release?.generation) || Number(String(game.version).split(".")[0]) || 13;
}

/** Ventana del sistema ya abierta, por su id. */
export const ventana = id => f.applications.instances.get(id);

/** Todas las ventanas abiertas (para repintarlas cuando cambia el estado del caso). */
export const ventanas = () => [...f.applications.instances.values()];

const MODOS_V13 = { public: "publicroll", gm: "gmroll", blind: "blindroll", self: "selfroll" };
const MODOS_V14 = Object.fromEntries(Object.entries(MODOS_V13).map(([v14, v13]) => [v13, v14]));

/** Modo de visibilidad que el usuario tiene elegido en el chat, en el vocabulario de su versión. */
export function modoActual() {
  const clave = game.settings.settings.has("core.messageMode") ? "messageMode" : "rollMode";
  return game.settings.get("core", clave);
}

/** Aplica un modo de visibilidad a los datos de un mensaje, traduciendo el nombre si hace falta. */
export function aplicarModo(datos, modo = modoActual()) {
  if (typeof ChatMessage.applyMode === "function") return ChatMessage.applyMode(datos, MODOS_V14[modo] ?? modo);
  return ChatMessage.applyRollMode(datos, MODOS_V13[modo] ?? modo);
}

/** Chat: ambos entregan HTMLElement; se acepta un envoltorio jQuery por si un módulo lo reinyecta. */
export function alRenderizarMensaje(fn) {
  Hooks.on("renderChatMessageHTML", (mensaje, html) => {
    const el = html instanceof HTMLElement ? html : html?.[0];
    if (el) fn(mensaje, el);
  });
}

/**
 * Registra el grupo de controles de escena. v13 y v14 usan un registro de objetos y
 * `onChange(event, active)`; `onClick` está obsoleto y dispararía la acción dos veces.
 */
export function registrarGrupoControles(controles, grupo) {
  if (controles[grupo.name]) return;
  controles[grupo.name] = {
    name: grupo.name,
    title: grupo.title,
    icon: grupo.icon,
    order: Object.keys(controles).length,
    activeTool: grupo.activeTool,
    tools: Object.fromEntries(grupo.tools.map((tool, order) => [
      tool.name,
      {
        ...tool,
        order,
        // Foundry avisa también al desactivar la herramienta: solo actuamos al activarla.
        onChange: tool.onChange ? (event, activo) => { if (activo !== false) tool.onChange(event, activo); } : undefined
      }
    ]))
  };
}

export const diagnostico = () => ({
  sistema: game.system.version,
  foundry: game.version,
  generacion: generacion(),
  modoMensaje: typeof ChatMessage.applyMode === "function" ? "applyMode" : "applyRollMode"
});

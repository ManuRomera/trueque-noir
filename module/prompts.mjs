import { LegacyDialog } from "./compat.mjs";

/**
 * Confirmación con las palabras exactas de la acción, no un «Sí / No» genérico.
 * Se reserva para lo destructivo o irreversible: el resto de la interfaz previene el error
 * desactivando controles en lugar de preguntar.
 */
export function confirmAction({
  title,
  message,
  detail = "",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false
} = {}) {
  return new Promise(resolve => {
    let answered = false;
    const settle = value => {
      if (answered) return;
      answered = true;
      resolve(value);
    };

    new LegacyDialog({
      title,
      content: `<div class="tn-confirm"><p>${message}</p>${detail ? `<p class="tn-dialog__detail">${detail}</p>` : ""}</div>`,
      buttons: {
        cancel: { label: cancelLabel, callback: () => settle(false) },
        confirm: { label: confirmLabel, callback: () => settle(true) }
      },
      default: "cancel",
      close: () => settle(false)
    }, {
      classes: ["trueque-noir", "tn-dialog", ...(danger ? ["tn-dialog--danger"] : [])],
      width: 460
    }).render(true);
  });
}

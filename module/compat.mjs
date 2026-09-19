/** Compatibility bridge shared by Foundry VTT 13 and 14. */
export const LegacyActorSheet = foundry.appv1?.sheets?.ActorSheet ?? globalThis.ActorSheet;
export const LegacyApplication = foundry.appv1?.api?.Application ?? globalThis.Application;
export const LegacyDialog = foundry.appv1?.api?.Dialog ?? globalThis.Dialog;

export function openWindows() {
  return Object.values(ui.windows ?? {});
}

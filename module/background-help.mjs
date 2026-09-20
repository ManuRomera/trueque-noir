// Resúmenes del manual: Trasfondos (p. 25) y Reconocimiento (p. 57).
export const BACKGROUND_HELP = {
  'Intimidación': 'Presionar o amenazar para conseguir colaboración o información.',
  'Encontrar pruebas': 'Advertir indicios y detalles que no encajan en la escena de un crimen.',
  'Negociación': 'Llegar a acuerdos y ofrecer algo a cambio de información o colaboración.',
  'Bajos fondos': 'Orientarse entre callejones, bares y ambientes criminales gracias a su experiencia.',
  'Uso de armas': 'Manejar armas cuando la situación exige recurrir a ellas.',
  'Buscar información': 'Investigar documentos y datos para localizar información útil.',
  'Detectar mentiras': 'Reconocer engaños y valorar si alguien dice la verdad.',
  'Medicina forense': 'Examinar cadáveres y evidencias con conocimientos médicos.',
  'Forzar cerraduras': 'Abrir cerraduras sin disponer de la llave.',
  'Pelea a puñetazos': 'Resolver enfrentamientos cuerpo a cuerpo mediante los puños.',
  'Pasar inadvertido': 'Mezclarse con la gente y observar sin llamar la atención.',
  'Enérgico': 'Correr y responder con energía ante esfuerzos físicos o persecuciones.'
};
export const BACKGROUND_RULE = 'Si ayuda en la acción, añade 1d10 a Riesgo o Perseguir el crimen. Solo puede ayudar un trasfondo por tirada.';
export const EXTRA_RULE = 'El extra es un tercer trasfondo: se adquiere entre casos gastando 3 puntos de reconocimiento; elegirlo aquí no descuenta puntos automáticamente.';
export function backgroundHelp(name, extra = false) {
  return [BACKGROUND_HELP[name] || 'Elige una especialidad del detective.', BACKGROUND_RULE, extra ? EXTRA_RULE : ''].filter(Boolean).join(' ');
}
export function bindBackgroundHelp(html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  root.querySelectorAll('select[name*="background"]').forEach(select => {
    const extra = select.name.endsWith('background3');
    const description = document.createElement('p');
    description.className = 'tn-background-description';
    description.setAttribute('aria-live', 'polite');
    select.after(description);
    const update = () => {
      select.dataset.tnHelp = backgroundHelp(select.value, extra);
      description.textContent = select.value ? `${BACKGROUND_HELP[select.value] || select.value} ${extra ? EXTRA_RULE : ''}` : '';
      description.hidden = !select.value;
    };
    select.addEventListener('change', update);
    update();
  });
}

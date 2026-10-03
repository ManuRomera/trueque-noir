/**
 * Tablas de juego de Balada triste de la ciudad, resumidas con palabras propias.
 * El orden de cada lista es el del dado del manual: el índice + 1 es el resultado.
 */

/** «La ciudad se revuelve»: consecuencias que repercuten en el entorno (p. 45). */
export const TRUEQUE_CIUDAD = [
  { id: "propaga", titulo: "El crimen se propaga", texto: "El entorno se pone en contra del grupo. El dado del crimen sube 1." },
  { id: "indeseables", titulo: "Indeseables", texto: "Los detectives llaman la atención de un grupo de enemigos que da la voz de alarma." },
  { id: "senalado", titulo: "Señalado", texto: "Un contacto o un PNJ queda expuesto: muere o queda marcado a ojos de la ciudad." },
  { id: "descuido", titulo: "Descuido", texto: "Dejan un rastro visible. El tiempo del caso se acorta y el culpable se aleja." }
];

/** «Pagar el precio»: consecuencias que sufre el propio grupo (p. 45-46). */
export const TRUEQUE_PRECIO = [
  { id: "problemas", titulo: "En problemas", texto: "El detective o un compañero adquiere un estado personal." },
  { id: "recuerda", titulo: "La ciudad recuerda", texto: "El detective adquiere un estado con la ciudad." },
  { id: "sacrificio", titulo: "Sacrificio", texto: "Pierde la mitad de sus cigarrillos, pasa una franja más allí o pierde 1 punto de reconocimiento." },
  { id: "cara", titulo: "Tu cara me suena", texto: "Alguien conoce a su persona o su lugar de paz y le deja un recado: +1 de tensión en ese pilar." }
];

/** Las tres opciones del Sacrificio (p. 46). */
export const SACRIFICIOS = [
  { id: "cigarrillos", texto: "Pierde la mitad de sus cigarrillos" },
  { id: "tiempo", texto: "Pasa una franja más en la localización" },
  { id: "reconocimiento", texto: "Pierde 1 punto de reconocimiento" }
];

/** Qué pasa cuando el dado del crimen explota, 1d4 (p. 138). */
export const EXPLOSION = [
  "El culpable escapa.",
  "Se produce una carnicería.",
  "Se toman rehenes de valor sentimental para algún detective.",
  "El culpable asciende en el estrato social de la ciudad y los detectives ya no pueden llegar a él."
];

/** Encuentros aleatorios para visitar una localización (p. 77). */
export const ENCUENTROS = [
  "Extorsión en un negocio local", "Tráfico de drogas", "Vandalismo en las calles", "Intimidación a los transeúntes",
  "Atraco a mano armada", "Persecución en coche", "Disturbios graves", "Reyerta entre dos criminales",
  "Confrontación entre bandas", "Atentado", "Intento de secuestro", "Disputas vecinales",
  "Cobro de deudas por la fuerza", "Robo con rehenes", "Violencia desenfrenada"
];

/** Interludios entre casos: cinco tablas de 1d4. `{otro}` es el compañero con quien se comparte el suceso (p. 85-87). */
export const INTERLUDIOS = [
  [
    "Cuenta la bronca que tuviste con {otro} contra un poli corrupto y que te apartó un mes del servicio.",
    "Cuenta el problema que tuviste con quien manda en una zona de la ciudad y cómo saliste airoso, por ahora, con el apoyo de {otro}.",
    "Cuenta en qué líos te metiste para que uno de tus pilares no sufriera daños y cómo te ayudó {otro}.",
    "Cuenta la monumental discusión que tuviste borracho con un transeúnte y cómo te ayudó {otro}."
  ],
  [
    "Cuenta cuál ha sido el caso más denigrante para ti y por qué {otro} decidió pasar del tema.",
    "Cuenta qué favor contrajiste con {otro} y cómo se lo devolviste.",
    "Explica cómo acabó aquella discusión en un bar de mala muerte. ¿Qué le contaste a {otro}?",
    "Cuenta por qué tienes cada vez más dudas de seguir en la comisaría y cómo {otro} ha conseguido retenerte."
  ],
  [
    "Explica por qué estás en el punto de mira del comisario y por qué {otro} te mira con desconfianza.",
    "Cuenta cuando {otro} y tú tomasteis la justicia por vuestra cuenta con un pobre diablo y os equivocasteis.",
    "Cuenta qué hicisteis {otro} y tú aquella noche y cómo decidisteis ocultar la ropa manchada de sangre.",
    "Cuenta por qué {otro} y tú detuvisteis y condenasteis a una persona sabiendo que era inocente."
  ],
  [
    "Cuenta por qué {otro} y tú falsificasteis unos documentos aun sabiendo que eran para un negocio ilegal.",
    "Relata cuando {otro} y tú destruisteis las pruebas de un caso menor para que no dieran con el incriminado.",
    "Cuenta cuando, de «poli malo», te excediste en un interrogatorio y mandaste al sospechoso al hospital. ¿{otro} intentó evitarlo?",
    "Cuenta cuando engañaste a {otro} porque en realidad ibas a hacer un trapicheo."
  ],
  [
    "Explica el incidente público que viviste y cómo {otro} evitó que se enterase la comisaría.",
    "Cuenta cuando perdiste todo tu dinero apostando y por qué {otro} ya no te mira con los mismos ojos.",
    "Narra cuando hiciste desaparecer a un testigo importante. ¿Por qué se lo contaste a {otro}? ¿Te ayudó o te dio la espalda?",
    "¿A qué maleante diste una paliza de muerte y cómo {otro} se llevó, sin querer, uno de tus golpes?"
  ]
];

/** Preguntas del epílogo de cada caso y del final de la crónica (p. 84-88). */
export const EPILOGO = [
  "¿Cómo os marcó este caso? (cada detective, por separado)",
  "¿Cómo marcó este caso a la ciudad? ¿Qué cambió en las bandas, las localizaciones o los contactos? Anotadlo en las tarjetas del mapa."
];
export const FINAL_CRONICA = [
  "¿Cómo os marcó ese último gran caso? (cada detective, por separado)",
  "¿Cómo marcó ese último gran caso a la ciudad?",
  "¿Cómo acabó sus días cada detective en la ciudad? ¿Logró marcharse, dejó la policía, ascendió o murió? (los puntos totales de reconocimiento son un gancho)"
];

/** Generador aleatorio de casos (p. 137-139): cada lista es un dado. */
export const GENERADOR = {
  quien: ["Un don nadie", "Un enajenado", "Un líder de una zona", "Un extremista", "Un millonario", "Un doctor", "Un abogado", "Un devoto", "Un alcalde", "Un policía"],
  que: ["Homicidio", "Tráfico de órganos", "Atentado", "Robo", "Asalto", "Extorsión", "Tráfico de drogas", "Secuestro", "Abuso", "Vandalismo"],
  porque: [
    "Obtener más poder dentro de la ciudad", "Vengarse de alguien", "Ser aceptado por un grupo que le permita crecer", "Mandar un mensaje a alguien",
    "Instaurar un nuevo orden según sus ideales", "Amasar una fortuna", "Desesperación ante la injusticia",
    "Devoción o amor extremo por una persona o un símbolo", "Ascender a un puesto superior", "Restaurar un honor perdido"
  ],
  llegada: [
    "Una noticia en el periódico", "Un soplo de un informador", "La petición de alguien desesperado", "Una señal en las calles",
    "Una denuncia anónima", "Un suceso macabro", "Un incidente público", "Un informe traspapelado y olvidado",
    "Un intento de soborno para que lo olviden", "Un antiguo policía expulsado del cuerpo"
  ],
  secreto: [
    "Apetencias gastronómicas poco comunes", "Colecciona miembros disecados de personas", "Hace apología de la esclavitud", "Es líder en la sombra de una secta",
    "Estafa a gente con mucho dinero", "Ha creado un partido totalitarista", "Cree ser un dios en la tierra", "Tiene un «Hyde» que no controla",
    "De noche da rienda suelta a sus perversiones", "Rapta vagabundos para hacer experimentos"
  ],
  giro: [
    "El criminal estaba delante de las narices de los detectives desde el principio",
    "El criminal tiene una relación estrecha con la alcaldía o con alguien poderoso",
    "El criminal es muy cercano a un pilar de estabilidad de los detectives",
    "El comisario tiene relación con los hechos, incluso ha participado",
    "Detenerlo supone un movimiento severo entre las fuerzas de poder: una cae y otra la sustituye",
    "Detenerlo implica la suspensión de alguno de los detectives",
    "Todo forma parte de una conspiración mayor que implica a gente más poderosa",
    "Una persona afectada por los hechos tiene un trato con el criminal",
    "Una de las cuatro bandas pagó al responsable: él es solo un títere",
    "Todas las pruebas están siendo amañadas para implicar a los detectives"
  ],
  dias: [3, 4, 5, 6]
};

export const alAzar = lista => lista[Math.floor(Math.random() * lista.length)];

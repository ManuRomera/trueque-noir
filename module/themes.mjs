/**
 * Ambientaciones de Trueque Noir.
 *
 * El noir no es una época: es una manera de mirar la ciudad. Cada ambientación trae
 * su fondo de escena y sus propias tablas para la creación aleatoria, de modo que la
 * ciudad y los detectives que salen del azar pertenezcan al mismo mundo.
 *
 * `scene.width` es siempre 1920; el alto conserva la proporción nativa de cada imagen
 * para que la portada nunca se deforme al estirarse sobre el lienzo.
 *
 * Las reglas no cambian: `locations` son siempre las catorce localizaciones comunes
 * del manual, en su mismo orden, dichas con las palabras de cada ambientación.
 */

const SCENES = "systems/trueque-noir/assets/scenes";

/** Lo humano no cambia de siglo: creencias, carácter y motivos se comparten. */
const COMMON = {
  beliefs: [
    "la bondad existe, pero siempre llega tarde",
    "nadie mira ya por esta ciudad",
    "toda persona tiene un precio",
    "la verdad importa aunque destruya a quien la encuentra",
    "la decadencia es una elección, no un accidente",
    "nadie nace culpable",
    "el que manda siempre acaba comprando el silencio",
    "quedan personas decentes, solo que están cansadas"
  ],
  temperaments: [
    "metódico y distante",
    "irónico y protector",
    "impulsivo pero leal",
    "paciente hasta que deja de serlo",
    "obstinado y compasivo",
    "silencioso y feroz",
    "amable con todos y de nadie",
    "incapaz de dejar una pregunta a medias"
  ],
  motivations: [
    "limpiar estas calles",
    "cumplir una promesa hecha a un muerto",
    "vengarse de quien arruinó a su familia",
    "salir algún día de aquí",
    "demostrar que un caso antiguo se cerró en falso",
    "pagar una deuda que no contrajo",
    "encontrar a alguien que desapareció sin dejar rastro",
    "merecer el perdón de quien todavía le espera"
  ],
  rumors: [
    "dejó morir a un compañero",
    "aceptó dinero de la gente equivocada",
    "falsificó una prueba para salvar a alguien",
    "conoce la identidad de un asesino nunca detenido",
    "incendió el lugar donde creció",
    "declaró en falso y aún duerme con ello",
    "cobra de los dos bandos desde hace años",
    "enterró un informe a cambio de un ascenso"
  ]
};

export const THEMES = {
  noir: {
    id: "noir",
    label: "Noir clásico",
    blurb: "Lluvia, gabardinas y una ciudad que no piensa devolverte nada.",
    scene: { src: `${SCENES}/noir.webp`, width: 1920, height: 1024 },
    contexts: [
      "Ciudad portuaria sin nombre, lluvia constante y una policía que mira a otro lado",
      "Metrópolis de posguerra donde todo el mundo debe un favor a alguien"
    ],
    city: { prefix: ["Cape", "Grey", "Saint", "New", "Port", "Black"], suffix: ["Hook", "Haven", "Mercy", "Vega", "Cross", "Bay"] },
    zones: ["Muelles", "Altos", "Distrito", "Barrio Viejo", "Dársenas", "Jardines"],
    traits: ["próspera", "industrial", "decadente", "inundada", "vigilada", "bohemia", "corrupta", "silenciosa"],
    controllers: ["un sindicato de estibadores", "una familia de empresarios", "una banda de moteros", "un predicador y sus fieles", "la policía comprada", "una red de contrabando", "un cacique inmobiliario", "un club de veteranos"],
    locations: ["Bloques de viviendas", "Comisaría", "Cementerio", "Suburbio", "Morgue", "Afueras", "Periódico local", "Pub", "Iglesia local", "Biblioteca", "Tienda de antigüedades", "Hostal", "Psiquiátrico", "Pequeño hospital"],
    extras: ["casino clandestino", "gimnasio de boxeo", "estación de radio", "club de jazz", "matadero", "archivo municipal", "cine abandonado", "mercado nocturno", "astillero", "lavandería abierta de madrugada"],
    wanted: ["Corrupción policial, jazz y lluvia", "Favores que se cobran tarde y mal"],
    unwanted: ["Magia, monstruos y coincidencias milagrosas", "Violencia contra criaturas y menores"],
    names: ["Ada", "Alma", "Bruno", "Cora", "Dante", "Elena", "Héctor", "Inés", "Mara", "Vera"],
    surnames: ["Black", "Vega", "Salvat", "Cross", "Montalbán", "Rivas", "Doyle", "Marlow"],
    roles: ["Inspectora de homicidios", "Sabueso de agencia", "Forense de guardia", "Policía de barrio", "Detective veterano", "Reportera de sucesos"],
    looks: ["gabardina gastada y mirada insomne", "traje impecable que nunca encaja con el barrio", "cicatriz en la ceja y manos de boxeador", "ropa práctica, pelo corto y ojos que no olvidan", "sombrero viejo, barba de dos días y una leve cojera", "aspecto frágil, voz firme y dedos manchados de tinta"],
    objects: ["un mechero grabado", "una placa antigua", "una cámara plegable", "un revólver heredado", "una libreta impermeable", "un reloj detenido", "una petaca de plata", "una fotografía rota", "una ganzúa artesanal", "un rosario ennegrecido"],
    people: ["su hermana", "un antiguo compañero", "la dueña del pub", "su padre enfermo", "una periodista local", "un confidente de los muelles"],
    places: ["la azotea de la comisaría", "una mesa del fondo del pub", "el archivo de la biblioteca", "el banco del cementerio", "el viejo muelle", "una capilla abandonada"]
  },

  los20: {
    id: "los20",
    label: "Los años veinte",
    blurb: "Ley seca, charlestón y sótanos donde el alcohol vale más que la vida.",
    scene: { src: `${SCENES}/los20.webp`, width: 1920, height: 1280 },
    contexts: [
      "Años veinte, ley seca y una ciudad que baila mientras se desangra",
      "Años veinte, fiebre bursátil y sindicatos rompiendo huelgas a golpes"
    ],
    city: { prefix: ["Fort", "Old", "Saint", "New", "Port", "Lake"], suffix: ["Harbor", "Chapel", "Liberty", "Sheridan", "Bay", "Crossing"] },
    zones: ["Muelles", "Colina", "Distrito de los teatros", "Barrio de los inmigrantes", "Estación", "Avenidas"],
    traits: ["boyante", "fabril", "insalubre", "en obras", "patrullada", "escandalosa", "sobornada", "cerrada a los de fuera"],
    controllers: ["una familia de contrabandistas", "un sindicato de tranviarios", "una logia de notables", "un pastor con mucho público", "el jefe de policía y su cuñado", "una banda de irlandeses", "un magnate de la prensa", "un club de veteranos de la Gran Guerra"],
    locations: ["Bloques de vecindad", "Jefatura de policía", "Cementerio", "Arrabal", "Depósito de cadáveres", "Afueras", "Redacción del diario", "Bar clandestino", "Parroquia", "Biblioteca municipal", "Casa de empeños", "Pensión", "Sanatorio mental", "Dispensario"],
    extras: ["destilería oculta bajo una funeraria", "sala de baile", "cuadrilátero de apuestas", "taller de automóviles robados", "estudio fotográfico", "gran almacén", "puerto de carbón", "casa de apuestas hípicas", "salón de billares", "hotel de paso"],
    wanted: ["Contrabando, jazz y política sucia", "Ascensos rápidos y caídas más rápidas"],
    unwanted: ["Nada sobrenatural", "Glorificar la violencia contra huelguistas"],
    names: ["Agnes", "Óscar", "Rosalía", "Vito", "Dolores", "Emmet", "Ruth", "Anselmo", "Clara", "Ignacio"],
    surnames: ["Fitzgerald", "Bellucci", "O'Shea", "Vance", "Moreau", "Kowalski", "Aranda", "Lombardi"],
    roles: ["Inspector de la brigada seca", "Detective de agencia privada", "Fotógrafa de sucesos", "Agente de aduanas", "Abogado de oficio", "Médico forense municipal"],
    looks: ["abrigo largo y sombrero de fieltro bajado", "traje a rayas y zapatos demasiado nuevos", "vestido sencillo y mirada que lo tasa todo", "nudillos marcados y voz de fumador", "gafas redondas y libreta siempre abierta", "elegancia de segunda mano y perfume barato"],
    objects: ["una petaca con el nombre de otro", "una pitillera de nácar", "un carné de prensa caducado", "una navaja de afeitar", "una llave sin puerta conocida", "un disco de pizarra rayado", "un fajo de billetes marcados", "un reloj de bolsillo parado a las tres", "una entrada de teatro sin usar", "un frasco de láudano"],
    people: ["su hermana pequeña", "la cantante del club", "un viejo cura", "su madre enferma", "un abogado con deudas", "el barman que todo lo oye"],
    places: ["el reservado del club", "la azotea del hotel", "la sala de máquinas del ferry", "un banco del parque al amanecer", "la sacristía vacía", "el andén de la última línea"]
  },

  actual: {
    id: "actual",
    label: "Actualidad",
    blurb: "Cámaras en cada esquina, alquileres imposibles y expedientes que se archivan solos.",
    scene: { src: `${SCENES}/actual.webp`, width: 1920, height: 1024 },
    contexts: [
      "Ciudad costera contemporánea en decadencia, turismo y ladrillo",
      "Capital de provincia con más cámaras que vecinos y una corrupción cansada"
    ],
    city: { prefix: ["Puerto", "Alto", "San", "Nueva", "Villa", "Monte"], suffix: ["Cendra", "Mercé", "Bravo", "Arriaga", "Olalla", "Sabina"] },
    zones: ["Puerto", "Casco antiguo", "Polígono", "Ensanche", "Barriada", "Paseo marítimo"],
    traits: ["gentrificada", "industrial", "abandonada", "turística", "videovigilada", "reivindicativa", "especulada", "envejecida"],
    controllers: ["una promotora inmobiliaria", "un clan familiar del menudeo", "una empresa de seguridad privada", "una asociación vecinal combativa", "un concejal con mucha obra", "una red de blanqueo hostelero", "un grupo mediático local", "una cofradía de pescadores"],
    locations: ["Bloques de pisos", "Comisaría", "Cementerio", "Polígono", "Instituto anatómico forense", "Extrarradio", "Redacción digital", "Bar de barrio", "Parroquia", "Biblioteca pública", "Tienda de segunda mano", "Hostal barato", "Unidad de psiquiatría", "Centro de salud"],
    extras: ["local de apuestas", "gimnasio de artes marciales", "estudio de pódcast", "sala de conciertos cerrada", "depuradora", "archivo municipal", "centro comercial a medio construir", "mercado de abastos", "astillero parado", "locutorio abierto toda la noche"],
    wanted: ["Corrupción urbanística y periodismo incómodo", "Barrio, familia y silencios heredados"],
    unwanted: ["Nada sobrenatural ni tecnología imposible", "Detalles morbosos sobre víctimas"],
    names: ["Nerea", "Iván", "Paula", "Said", "Marta", "Dani", "Yolanda", "Óscar", "Lucía", "Bilal"],
    surnames: ["Cambra", "Nieto", "Ferreiro", "Ndiaye", "Bastida", "Quintana", "Salas", "Ibarra"],
    roles: ["Inspectora de la judicial", "Investigadora privada", "Periodista de local", "Agente de la científica", "Educador social", "Médica forense"],
    looks: ["cazadora vieja y ojeras de turno doble", "ropa de marca comprada en oferta", "coleta tirante y zapatillas gastadas", "corpulencia de gimnasio de barrio", "gafas y sudadera con capucha", "traje de juzgado y manos inquietas"],
    objects: ["un móvil con la pantalla rota", "una grabadora de periodista", "un llavero con una llave de más", "una tarjeta de memoria sin etiquetar", "una acreditación caducada", "unas esposas sin reglamentar", "un paquete de tabaco de liar", "una foto impresa en una gasolinera", "un cargador siempre a medias", "un cuaderno con el nombre borrado"],
    people: ["su hija adolescente", "una excompañera de academia", "el dueño del bar de abajo", "su madre en la residencia", "una abogada de oficio", "un confidente del polígono"],
    places: ["el parking de la comisaría", "la barra del bar de siempre", "el mirador sobre el puerto", "las gradas del campo del barrio", "la biblioteca a última hora", "el coche, aparcado en cualquier parte"]
  },

  futuro: {
    id: "futuro",
    label: "Futuro tecnológico",
    blurb: "Todo queda registrado y, aun así, nadie sabe qué pasó.",
    scene: { src: `${SCENES}/futuro.webp`, width: 1920, height: 1024 },
    contexts: [
      "Metrópolis vertical administrada por contratos y algoritmos de reputación",
      "Ciudad estado donde la identidad es un servicio que se puede suspender"
    ],
    city: { prefix: ["Neo", "Meridian", "Axis", "Vantor", "Solen", "Kyra"], suffix: ["Prime", "Nodo", "Delta", "Arcadia", "Cero", "Umbral"] },
    zones: ["Nivel alto", "Sector industrial", "Subnivel", "Anillo corporativo", "Zona franca", "Periferia"],
    traits: ["automatizada", "sobrepoblada", "descatalogada", "sin cobertura", "auditada", "clandestina", "privatizada", "en cuarentena"],
    controllers: ["un consorcio de logística", "un sindicato de operarios de mantenimiento", "una cooperativa de datos", "una congregación de la red", "la agencia de cumplimiento", "un cártel de energía", "una gestora de reputación", "una milicia subcontratada"],
    locations: ["Colmenas residenciales", "Puesto de cumplimiento", "Columbario", "Sector descatalogado", "Sala de autopsias", "Anillo exterior", "Canal de noticias", "Bar de recarga", "Templo de red", "Archivo de datos", "Chatarrería de reliquias", "Cápsulas de sueño", "Clínica de conducta", "Puesto médico"],
    extras: ["granja de servidores refrigerada", "arena de combate remoto", "estudio de emisión", "invernadero vertical", "planta de reciclado orgánico", "registro civil", "sala de realidad compartida", "mercado gris de componentes", "puerto de carga orbital", "lavandería automatizada"],
    wanted: ["Vigilancia, contratos abusivos y humanidad a pesar de todo", "Crímenes que solo existen en los registros"],
    unwanted: ["Magia y viajes en el tiempo", "Tecnología que resuelva el caso sola"],
    names: ["Kaia", "Idris", "Nara", "Teo", "Sol", "Wen", "Ámbar", "Rei", "Luca", "Zeta"],
    surnames: ["Varela-9", "Okonkwo", "Strand", "Mihara", "Bassi", "Corvo", "Lindqvist", "Adeyemi"],
    roles: ["Inspectora de cumplimiento", "Auditora forense de datos", "Investigador sin licencia", "Perito de incidentes", "Mediadora laboral", "Médica de turno"],
    looks: ["abrigo térmico con parches de empresa", "implante ocular mal calibrado", "uniforme de otra corporación, sin retirar", "manos quemadas por refrigerante", "pelo rapado y tatuaje de identificación", "elegancia corporativa y mirada vacía"],
    objects: ["una llave física, ya ilegal", "un terminal con la batería hinchada", "una credencial de un empleo perdido", "una unidad de memoria sin catalogar", "un inhibidor casero", "una fotografía impresa en papel", "una taza con el logo de una empresa disuelta", "un escáner médico de contrabando", "un anillo con datos dentro", "una placa retirada del servicio"],
    people: ["su hermano en un contrato lejano", "una compañera que fue despedida", "el mecánico del subnivel", "su madre, en cápsula médica", "una periodista bloqueada", "un contacto anónimo que nunca falla"],
    places: ["la pasarela sobre el sector industrial", "el bar de recarga del turno de noche", "un archivo físico olvidado", "la terraza del anillo corporativo", "una cápsula alquilada por horas", "el invernadero vertical al amanecer"]
  },

  runner: {
    id: "runner",
    label: "Replicantes",
    blurb: "Neón sobre agua sucia y preguntas que es mejor no hacerle a nadie.",
    scene: { src: `${SCENES}/runner.webp`, width: 1920, height: 1280 },
    contexts: [
      "Megalópolis en lluvia ácida donde las corporaciones fabrican personas",
      "Ciudad de anuncios de cien metros y gente que no puede probar quién es"
    ],
    city: { prefix: ["Neo", "Nueva", "Bajo", "Gran", "Puerto", "Alta"], suffix: ["Ángeles", "Kowloon", "Tyrell", "Shinjuku", "Amanecer", "Escoria"] },
    zones: ["Sector comercial", "Bajos inundados", "Distrito corporativo", "Mercado nocturno", "Zona industrial", "Arrabal elevado"],
    traits: ["saturada de anuncios", "inundada", "irradiada", "sin registros", "patrullada por drones", "multilingüe", "comprada entera", "en toque de queda"],
    controllers: ["una corporación biotecnológica", "un sindicato de replicantes libres", "una tríada de importadores", "una secta de la memoria", "la unidad de retiro", "un cártel de agua potable", "un magnate del entretenimiento", "una red de falsificadores de identidad"],
    locations: ["Torres colmena", "Distrito policial", "Osario", "Suburbio inundado", "Morgue automatizada", "Afueras irradiadas", "Holopantalla informativa", "Bar de fideos", "Santuario luminoso", "Archivo de memorias", "Tienda de recuerdos", "Hotel cápsula", "Clínica de implantes", "Dispensario callejero"],
    extras: ["taller de ojos artificiales", "azotea con palomas mecánicas", "emisora pirata", "club de baile lento", "planta de proteína sintética", "registro de licencias", "cine de bucles antiguos", "mercado de piezas húmedas", "muelle de carga aérea", "lavandería de vapor"],
    wanted: ["Identidad, memoria y lluvia sin fin", "Corporaciones intocables y gente que aguanta"],
    unwanted: ["Explicaciones místicas", "Que la tecnología resuelva los dilemas morales"],
    names: ["Rei", "Gaff", "Nour", "Deckard", "Lian", "Roy", "Ada", "Tarek", "Mei", "Isko"],
    surnames: ["Tyrell", "Vásquez", "Chen", "Sarkis", "Okada", "Bautista", "Novak", "Diallo"],
    roles: ["Agente de retiro", "Analista de memorias", "Detective sin jurisdicción", "Técnica forense de implantes", "Traficante de identidades", "Médico de callejón"],
    looks: ["gabardina empapada y cuello siempre alzado", "ojos que reflejan más luz de la normal", "cicatriz quirúrgica bajo la mandíbula", "ropa térmica remendada mil veces", "elegancia corporativa fuera de lugar", "aspecto de no haber dormido en semanas"],
    objects: ["una fotografía que quizá no sea suya", "un origami de papel de plata", "una pistola con el número borrado", "una unidad de memoria ajena", "un paraguas con mango luminoso", "un analizador de retinas de segunda mano", "una placa de una unidad disuelta", "un frasco de colirio siempre vacío", "una llave de un piso que ya no existe", "un reloj que marca otra zona horaria"],
    people: ["alguien a quien juró proteger", "una compañera retirada del servicio", "la dueña del puesto de fideos", "un hermano del que duda", "una periodista censurada", "un informador que nunca da la cara"],
    places: ["la azotea bajo la lluvia", "el puesto de fideos de la esquina", "un archivo analógico olvidado", "el mirador sobre el mar sucio", "una habitación de hotel cápsula", "el santuario iluminado de madrugada"]
  },

  fallout: {
    id: "fallout",
    label: "Después del fin",
    blurb: "Queda ciudad suficiente para que alguien quiera matar por ella.",
    scene: { src: `${SCENES}/fallout.webp`, width: 1920, height: 1024 },
    contexts: [
      "Décadas después del colapso: agua racionada y una ley que se escribe cada mañana",
      "Asentamiento levantado sobre las ruinas, con más armas que médicos"
    ],
    city: { prefix: ["Nuevo", "Cruce", "Fuerte", "Bajo", "Última", "Alto"], suffix: ["Refugio", "Óxido", "Esperanza", "Cráter", "Vado", "Consuelo"] },
    zones: ["Cráter", "Talleres", "Barracones", "Vado", "Torre de agua", "Yermo cercano"],
    traits: ["irradiada", "fortificada", "sedienta", "hambrienta", "patrullada", "supersticiosa", "comerciante", "aislada"],
    controllers: ["un consejo de supervivientes", "una milicia mercenaria", "un clan de chatarreros", "un predicador de la ceniza", "quien controla el pozo", "una caravana comercial", "un cirujano con demasiado poder", "los descendientes del refugio"],
    locations: ["Refugio comunal", "Puesto de la milicia", "Fosa común", "Chabolas", "Sala de despiece", "Yermo", "Emisora de radio", "Cantina", "Capilla de chatarra", "Depósito de libros", "Trapichero", "Barracón", "Casa de los que gritan", "Enfermería"],
    extras: ["pozo defendido", "arena de peleas", "torre de repetición", "invernadero sellado", "matadero de mutados", "registro de censo", "cine con un solo rollo", "mercado de trueque", "cementerio de coches", "destilería de alcohol quemado"],
    wanted: ["Escasez, comunidad y decisiones imposibles", "Ley improvisada y memoria del mundo viejo"],
    unwanted: ["Superpoderes y milagros", "Crueldad gratuita con los débiles"],
    names: ["Cala", "Duna", "Ezra", "Mora", "Silo", "Bruna", "Ciro", "Rea", "Tosco", "Nieve"],
    surnames: ["Ceniza", "Vargas", "Hierro", "Kade", "Serrano", "Tuerto", "Ilundáin", "Rojo"],
    roles: ["Alguacil del asentamiento", "Rastreadora de caravanas", "Médico del yermo", "Chatarrera experta", "Explorador de ruinas", "Juez improvisado"],
    looks: ["abrigo de mantas cosidas y máscara al cuello", "quemaduras viejas en medio rostro", "brazo remendado con piezas de chatarra", "delgadez de raciones cortas y ojos duros", "ropa prebélica conservada con orgullo", "gafas de soldador siempre en la frente"],
    objects: ["un contador Geiger que solo funciona a veces", "una foto anterior al fin del mundo", "una cantimplora con muescas", "una llave inglesa como bastón de mando", "un frasco de antibióticos guardado para lo peor", "un libro infantil casi deshecho", "una radio que solo capta estática", "una placa de un cuerpo que ya no existe", "un mechero de trinchera", "una brújula sin norte fiable"],
    people: ["una niña a la que recogió", "un compañero de caravana", "la cantinera del asentamiento", "su hermano en el yermo", "la médica del refugio", "un explorador que siempre vuelve"],
    places: ["la torre de agua al atardecer", "la cantina cuando se vacía", "la biblioteca improvisada", "el borde del cráter", "el invernadero sellado", "la cabina de la radio"]
  },

  farwest: {
    id: "farwest",
    label: "Lejano Oeste",
    blurb: "Polvo, deudas y una estrella de hojalata que no impresiona a nadie.",
    scene: { src: `${SCENES}/farwest.webp`, width: 1920, height: 1280 },
    contexts: [
      "Pueblo fronterizo que creció demasiado rápido alrededor de una mina",
      "Final de la línea del ferrocarril, con más forasteros que vecinos"
    ],
    city: { prefix: ["Fort", "Dry", "Silver", "Dead", "Red", "Last"], suffix: ["Creek", "Gulch", "Springs", "Hollow", "Junction", "Rock"] },
    zones: ["Calle mayor", "Corrales", "Barrio de la mina", "Orilla del río", "Estación", "Afueras"],
    traits: ["próspera por la mina", "endeudada", "sedienta", "sin ley", "vigilada por pistoleros", "devota", "de paso", "encerrada en sí misma"],
    controllers: ["el dueño de la mina", "una compañía ferroviaria", "una banda de cuatreros", "un predicador itinerante", "el sheriff y sus primos", "un prestamista del banco", "un cacique ganadero", "los veteranos de la guerra"],
    locations: ["Casa de huéspedes", "Oficina del sheriff", "Boot Hill", "Barrio de barracas", "Funeraria", "Llanura", "Imprenta del periódico", "Saloon", "Iglesia de madera", "Escuela", "Almacén general", "Fonda", "Asilo", "Consulta del médico"],
    extras: ["casa de juego", "corral de doma", "oficina del telégrafo", "salón de baile", "matadero", "registro de propiedades", "teatro ambulante", "mercado de ganado", "embarcadero del río", "herrería"],
    wanted: ["Deudas, tierra y justicia comprada", "Forasteros con pasado y pueblos con memoria"],
    unwanted: ["Elementos sobrenaturales", "Caricaturas de los pueblos originarios"],
    names: ["Abigail", "Elías", "Ruth", "Amos", "Consuelo", "Jed", "Winona", "Silas", "Carmela", "Cole"],
    surnames: ["Hartley", "Quintero", "Boone", "Ríos", "McCabe", "Delgado", "Ashby", "Herrera"],
    roles: ["Ayudante del sheriff", "Cazarrecompensas", "Enterrador con buen ojo", "Maestra del pueblo", "Médico de frontera", "Agente de la compañía"],
    looks: ["abrigo lleno de polvo y espuelas gastadas", "sombrero de ala ancha y mirada de sol", "manos de herrero y voz tranquila", "vestido remendado y escopeta al hombro", "elegancia de ciudad que aquí molesta", "cojera vieja y bastón que no es bastón"],
    objects: ["un revólver con muescas en la culata", "una estrella de hojalata torcida", "un reloj de bolsillo con un retrato dentro", "una biblia con nombres apuntados", "una baraja marcada", "una herradura de la suerte", "una carta nunca enviada", "una cantimplora abollada", "una escritura de tierras discutida", "un mechón de pelo atado con hilo"],
    people: ["su hija en el este", "un antiguo socio", "la dueña del saloon", "su padre, enterrado en Boot Hill", "la maestra del pueblo", "un vaquero que le debe la vida"],
    places: ["el porche de la oficina del sheriff", "el fondo del saloon", "el cerro sobre el pueblo", "la tumba de un amigo", "el vado del río", "la iglesia vacía entre semana"]
  },

  medievo: {
    id: "medievo",
    label: "Medievo",
    blurb: "Callejones de barro, gremios que lo deciden todo y un obispo que perdona por dinero.",
    scene: { src: `${SCENES}/medievo.webp`, width: 1920, height: 1081 },
    contexts: [
      "Ciudad amurallada en año de malas cosechas, con la peste rondando el arrabal",
      "Villa de mercado donde los gremios mandan más que el señor"
    ],
    city: { prefix: ["Villa", "Puente", "Monte", "San", "Torre", "Val"], suffix: ["Negro", "Sombra", "Clara", "Cuervo", "Ferrán", "Bruma"] },
    zones: ["Intramuros", "Arrabal", "Barrio de los gremios", "Judería", "Puerto fluvial", "Extramuros"],
    traits: ["amurallada", "apestada", "próspera por el mercado", "hambrienta", "patrullada por la guardia", "devota", "endeudada", "cerrada a los forasteros"],
    controllers: ["el gremio de tejedores", "una familia de prestamistas", "una banda de rufianes del arrabal", "el obispo y su cabildo", "la guardia del señor", "una cofradía de mercaderes", "un noble arruinado", "los cofrades de un santo"],
    locations: ["Casas del arrabal", "Cuartel de la guardia", "Camposanto", "Arrabal", "Osario", "Extramuros", "Plaza del pregonero", "Taberna", "Iglesia", "Scriptorium", "Casa del prestamista", "Posada", "Casa de locos", "Hospital de pobres"],
    extras: ["casa de baños", "palenque de justas", "torre del campanario", "burdel tolerado", "matadero municipal", "archivo del concejo", "corral de comedias", "mercado franco", "embarcadero", "tintorería"],
    wanted: ["Gremios, herejías y justicia comprada", "Barro, incienso y secretos de familia"],
    unwanted: ["Magia y criaturas fantásticas", "Tortura descrita con detalle"],
    names: ["Urraca", "Beltrán", "Sancha", "Gil", "Mencía", "Rodrigo", "Jimena", "Arnau", "Teresa", "Munio"],
    surnames: ["de la Torre", "Ferrer", "Mendoza", "Escudero", "de Ayala", "Bonhome", "Calderón", "Roig"],
    roles: ["Alguacil del concejo", "Pesquisidor del obispo", "Escribano curioso", "Maestra de gremio", "Físico de la villa", "Recaudador de portazgos"],
    looks: ["sayo remendado y manos manchadas de tinta", "cota vieja bajo la ropa de calle", "cicatriz de cuchillo en la mejilla", "hábito raído y mirada que juzga", "lujo de mercader recién enriquecido", "delgadez de ayuno y voz firme"],
    objects: ["un sello de lacre gastado", "un puñal de misericordia", "un rosario de cuentas negras", "un salvoconducto falsificado", "una llave de la muralla", "un pergamino con nombres tachados", "una bolsa de monedas recortadas", "un retal con un bordado reconocible", "un cuchillo de escribano", "una reliquia dudosa"],
    people: ["su hermana en el convento", "un antiguo compañero de armas", "la tabernera de la plaza", "su padre, maestro del gremio", "un fraile que escucha", "un mendigo que todo lo ve"],
    places: ["el adarve de la muralla", "el rincón de la taberna", "el scriptorium al anochecer", "el camposanto", "el embarcadero del río", "una capilla lateral"]
  },

  spqr: {
    id: "spqr",
    label: "Roma imperial",
    blurb: "Ínsulas que se derrumban, clientelas que se compran y vigiles que llegan tarde.",
    scene: { src: `${SCENES}/spqr.webp`, width: 1920, height: 1024 },
    contexts: [
      "Roma bajo un emperador nervioso: delaciones, herencias y fuego en la Suburra",
      "Ciudad portuaria del imperio donde el grano vale más que la sangre"
    ],
    city: { prefix: ["Colonia", "Portus", "Nova", "Castra", "Aquae", "Vicus"], suffix: ["Aurelia", "Severa", "Nigra", "Fortuna", "Clodia", "Umbra"] },
    zones: ["Suburra", "Foro", "Puerto", "Colinas", "Barrio de los talleres", "Extramuros"],
    traits: ["hacinada", "incendiada a menudo", "opulenta", "insalubre", "patrullada por vigiles", "supersticiosa", "endeudada", "tomada por clientelas"],
    controllers: ["un colegio de comerciantes", "una familia senatorial", "una banda de la Suburra", "un culto oriental", "el prefecto de los vigiles", "un liberto enriquecido", "una compañía de publicanos", "los veteranos de una legión"],
    locations: ["Ínsulas", "Cuartel de los vigiles", "Necrópolis", "Suburra", "Casa del libitinario", "Afueras", "Foro y sus rumores", "Taberna", "Templo del barrio", "Biblioteca", "Tienda de rarezas", "Hospedería", "Casa de los que ven visiones", "Valetudinarium"],
    extras: ["termas de barrio", "ludus de gladiadores", "puesto del pregonero", "lupanar", "macellum", "tabulario", "teatro", "horrea del grano", "muelle fluvial", "fullonica"],
    wanted: ["Herencias, delaciones y clientelas", "Fuego, grano y política de callejón"],
    unwanted: ["Dioses que intervienen de verdad", "Esclavitud presentada como algo neutro"],
    names: ["Livia", "Quinto", "Julia", "Marco", "Vibia", "Cayo", "Fulvia", "Tito", "Claudia", "Lucio"],
    surnames: ["Valerio", "Cornelia", "Rufo", "Domicia", "Sabino", "Metela", "Craso", "Albina"],
    roles: ["Tribuno de los vigiles", "Delator profesional", "Escriba del tabulario", "Médica de gladiadores", "Liberta administradora", "Cuestor incómodo"],
    looks: ["toga siempre algo sucia", "cicatrices de campaña mal curadas", "elegancia de liberto recién rico", "manos de escribiente y ojos cansados", "porte militar fuera de servicio", "delgadez y mirada que no parpadea"],
    objects: ["un anillo de sello", "un estilo de hueso y sus tablillas", "una daga militar", "una bolsa de sestercios marcados", "un salvoconducto imperial", "un amuleto contra el mal de ojo", "una carta sellada y nunca abierta", "una lucerna con un nombre grabado", "una llave de un horreum", "un mechón guardado en tela"],
    people: ["su hermana casada lejos", "un veterano de su legión", "la tabernera de la esquina", "su patrón, que le liberó", "una matrona que le protege", "un esclavo que sabe demasiado"],
    places: ["las gradas vacías del teatro", "el rincón de la taberna", "la biblioteca al mediodía", "la necrópolis de la vía", "el muelle fluvial", "el templo pequeño del barrio"]
  },

  steampunk: {
    id: "steampunk",
    label: "Steampunk",
    blurb: "Vapor, hollín y máquinas que valen más que quienes las manejan.",
    scene: { src: `${SCENES}/steampunk.webp`, width: 1920, height: 1024 },
    contexts: [
      "Capital industrial ahogada en hollín, con huelgas y patentes robadas",
      "Ciudad de canales y dirigibles donde el carbón decide quién respira"
    ],
    city: { prefix: ["Puerto", "Alto", "Nueva", "Gran", "Baja", "Santa"], suffix: ["Caldera", "Herrín", "Bruma", "Engranaje", "Fúlgida", "Hollín"] },
    zones: ["Fábricas", "Ciudad alta", "Canales", "Barrio obrero", "Estación de dirigibles", "Afueras"],
    traits: ["ahogada en humo", "próspera por las patentes", "insalubre", "en huelga", "patrullada", "inventiva", "endeudada", "hundida en niebla"],
    controllers: ["un consorcio de fundiciones", "un sindicato de maquinistas", "una banda de los canales", "una sociedad de inventores", "la policía metropolitana", "una casa de patentes", "un magnate del carbón", "una logia de ingenieros"],
    locations: ["Bloques de obreros", "Cuartel de la policía metropolitana", "Cementerio", "Barrio de las calderas", "Depósito", "Afueras fabriles", "Rotativa del diario", "Taberna de vapor", "Capilla", "Sala de archivos", "Anticuario de mecanismos", "Hospedería", "Manicomio", "Dispensario"],
    extras: ["taller de autómatas", "arena de boxeo mecánico", "torre de telégrafo", "salón de máquinas musicales", "matadero a vapor", "oficina de patentes", "teatro de sombras", "mercado de chatarra fina", "amarre de dirigibles", "lavadero industrial"],
    wanted: ["Patentes robadas, huelgas y hollín", "Progreso que cuesta vidas"],
    unwanted: ["Magia", "Máquinas que lo resuelven todo"],
    names: ["Edwina", "Ambrosio", "Hetty", "Casimiro", "Perpetua", "Baltasar", "Ivy", "Anselmo", "Marisa", "Fulgencio"],
    surnames: ["Cogsworth", "Iriarte", "Blackwood", "Ferré", "Halloway", "Zubiri", "Grimm", "Arceo"],
    roles: ["Inspector metropolitano", "Ingeniera de seguridad", "Detective de patentes", "Médica de fábrica", "Maquinista jubilado", "Periodista de sucesos"],
    looks: ["levita manchada de grasa", "monóculo de aumento y dedos quemados", "prótesis de latón mal disimulada", "ropa de taller bajo un abrigo elegante", "hollín permanente en el cuello", "porte impecable y tos de fundición"],
    objects: ["un reloj de bolsillo desmontado mil veces", "una llave inglesa con iniciales", "un cuaderno de esquemas", "unas gafas de soldador", "un silbato de vapor", "una placa de la policía metropolitana", "un frasco de aceite fino", "un daguerrotipo velado", "una pieza de una máquina que ya no existe", "un billete de dirigible sin usar"],
    people: ["su hija aprendiz", "un compañero mutilado en la fundición", "la dueña de la taberna de vapor", "su maestro de taller", "una periodista obstinada", "un maquinista que le cubre"],
    places: ["la pasarela sobre las calderas", "el rincón de la taberna de vapor", "la sala de archivos", "el cementerio junto a la fundición", "el amarre de dirigibles al alba", "el taller vacío de noche"]
  },

  edo: {
    id: "edo",
    label: "Edo",
    blurb: "Faroles de papel, deudas de honor y una ciudad de madera que arde cada década.",
    scene: { src: `${SCENES}/edo.webp`, width: 1920, height: 1081 },
    contexts: [
      "Edo en tiempo de paz forzada: samuráis sin guerra y comerciantes con demasiado dinero",
      "Ciudad de canales y barrios de placer, con incendios y rumores en cada esquina"
    ],
    city: { prefix: ["Higashi", "Shimo", "Kita", "Naka", "Minami", "Ura"] , suffix: ["bashi", "machi", "gawa", "zaka", "jima", "mura"] },
    zones: ["Barrio de los mercaderes", "Distrito de placer", "Barrio bajo", "Recinto del templo", "Canales", "Afueras"],
    traits: ["próspera", "combustible", "vigilada", "hacinada", "elegante", "supersticiosa", "endeudada", "cerrada por castas"],
    controllers: ["una casa de comerciantes de arroz", "un gremio de bomberos", "una banda de yakuza incipiente", "el abad de un templo", "los dōshin del magistrado", "una casa de té influyente", "un señor sin feudo", "una cofradía de artesanos"],
    locations: ["Nagaya", "Puesto de los dōshin", "Cementerio del templo", "Barrio bajo", "Sala de los muertos", "Afueras", "Casa de los kawaraban", "Izakaya", "Santuario", "Archivo del clan", "Tienda de curiosidades", "Ryokan", "Casa de reclusión", "Consulta del médico"],
    extras: ["casa de baños", "dōjō de esgrima", "puesto de noticias impresas", "casa de té", "mercado de pescado", "oficina del magistrado", "teatro kabuki", "mercado nocturno", "embarcadero de los canales", "taller de tintes"],
    wanted: ["Honor, deudas y rumores que matan", "Incendios, clases sociales y lealtades imposibles"],
    unwanted: ["Yōkai y magia", "Exotismo de postal"],
    names: ["Hana", "Ryū", "Sae", "Takumi", "Kiyo", "Jirō", "Ume", "Shin", "Aya", "Gorō"],
    surnames: ["Kurosawa", "Ishida", "Mori", "Hayashi", "Sakai", "Tachibana", "Onodera", "Kamio"],
    roles: ["Dōshin del magistrado", "Yoriki investigador", "Rōnin sin señor", "Médica del barrio", "Escribiente de kawaraban", "Jefa de bomberos"],
    looks: ["kimono gastado y jitte al cinto", "moño deshecho y ojeras de guardia", "cicatriz que cruza la ceja", "elegancia de barrio de placer", "manos encallecidas de remero", "porte de guerrero sin guerra"],
    objects: ["un jitte de hierro", "un netsuke con una grulla", "una carta doblada mil veces", "un abanico con un nombre escrito", "una pipa larga de metal", "un amuleto del santuario", "una hoja de kawaraban antigua", "una llave de un almacén", "un peine de laca roto", "una bolsa de monedas ensartadas"],
    people: ["su hermana en la casa de té", "un compañero del cuerpo de bomberos", "la dueña de la izakaya", "su maestro de esgrima", "un monje que le escucha", "un vendedor ambulante bien informado"],
    places: ["el puente sobre el canal", "el rincón de la izakaya", "el archivo del templo", "el cementerio entre cedros", "el embarcadero al amanecer", "el patio del dōjō vacío"]
  }
};

/** Lista ordenada para los selectores; el noir clásico siempre primero. */
export const THEME_LIST = Object.values(THEMES);
export const DEFAULT_THEME = "noir";

export function getTheme(id) {
  return THEMES[id] ?? THEMES[DEFAULT_THEME];
}

/**
 * Tablas completas de una ambientación: lo propio del mundo más lo que comparten
 * todos, que es lo humano.
 */
export function themeTables(id) {
  const theme = getTheme(id);
  return {
    ...theme,
    beliefs: COMMON.beliefs,
    temperaments: COMMON.temperaments,
    motivations: [...COMMON.motivations, ...(theme.motivations ?? [])],
    rumors: [...COMMON.rumors, ...(theme.rumors ?? [])]
  };
}

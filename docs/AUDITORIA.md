# Auditoría de Trueque Noir · 2.1.0 → 3.0.0

Contraste del sistema con el manual *Balada triste de la ciudad* (R. R. · El Refugio de Ryhope,
2021) y revisión completa del código. Entre paréntesis, la página del manual.

## 1. Resumen

- El motor de reglas de la 2.1.0 era **correcto en lo central** (fórmulas de dados, bandas de
  resultado, +2 exclusivo, objeto representativo, sobreexposición, dado del crimen y pistas).
- Fallaba en **el trueque**, que es el corazón del juego: se proponía como texto y todo lo demás
  (estados, cigarrillos, tensión, tiempo) se aplicaba a mano.
- Había **seis fallos de reglas** y **siete de código** (sección 2), más una interfaz construida
  sobre ApplicationV1/`Dialog`, obsoleta desde Foundry 13 y con retirada prevista.
- En la 3.0.0 se corrigen todos, se automatiza lo automatizable (sección 4) y se rehace la
  interfaz para que la ficha quepa entera en 940 × 660 sin desplazarse.

## 2. Fallos encontrados

### Reglas

| # | Fallo | Manual | Estado |
|---|---|---|---|
| R1 | Un favor gastado se «recuperaba» al reiniciar el caso. Un favor se consume al cobrarse y los no cobrados permanecen entre casos. | p. 31, 56 | Corregido |
| R2 | El alcance del favor era texto libre. Escrito como «Riesgo / Crimen / Libre» (el marcador de posición) o «zona sur», el favor no valía para ninguna tirada. | p. 56 | Selector libre / riesgo / crimen + zona |
| R3 | El reconocimiento no podía bajar de 0, pero «Sacrificio» lo deja en −1 si no hay puntos. | p. 46 | Admite −1 |
| R4 | Quien cuenta un rumor podía aprovecharlo él mismo. | p. 50 | Bloqueado (ficha y diálogo) |
| R5 | La cajetilla nacía siempre de 9, aunque con tres detectives son 6 (18 en el grupo). | p. 31 | Reparto automático al crear + aviso en el Panel |
| R6 | Se podían elegir dos veces el mismo trasfondo (el mundo de pruebas lo tenía). | p. 25 | Imposible en ficha y asistente |

### Código

| # | Fallo | Estado |
|---|---|---|
| C1 | Con un favor en la tirada se cobraban primero la calada o la visita nocturna y después se comprobaba si el favor valía: si no valía, los cigarrillos ya estaban perdidos. | Corregido: con favor no se paga nada más |
| C2 | Socket: el cliente elegía qué GM aplicaba la operación y la carga no se validaba; cualquier cliente podía fijar el dado del crimen o reiniciar el caso. | Lista blanca de operaciones de jugador, rangos validados, solo el GM activo aplica |
| C3 | Interfaz en ApplicationV1/`Dialog`, `ui.windows` y `renderApplication` (retirados en Foundry 16). El manifiesto decía «verificado en 14» sin que fuese cierto. | Todo en ApplicationV2; verificado 13.351; puente v13↔v14 en `compat.mjs` |
| C4 | `migrateLegacyActorSystemData` reescribía las fichas enteras al abrir el mundo (`diff:false`), redundante con los DataModels. | Sustituido por `migrateData` |
| C5 | Ayuda flotante propia sobre *todo* (`label, button, input…`): ruido constante y textos genéricos tipo «Nombre. Se guarda al salir del campo». | Tooltips nativos solo donde la regla no es evidente |
| C6 | La ciudad construida se guardaba en un diario sin permiso de lectura para los jugadores, aunque «la construye toda la mesa». | Legible por todos |
| C7 | `template.json` junto a DataModels, `lang/es.json` sin uso, manifiesto sin `readme/changelog/bugs`, paquete con herramientas y capturas dentro. | Limpiado; el zip solo lleva lo necesario |

## 3. Contraste con el manual

✔ ya estaba bien · ✚ añadido o corregido · ○ pendiente / simplificado

| Regla (página) | Estado |
|---|---|
| 1d10 base; 2d10 con trasfondo (mejor); 2d10 con penalizador (peor); se anulan (33, 66) | ✔ |
| 4- / 5-8 / 9+ (34) | ✔ |
| +2 por cigarrillo **o** reconocimiento, nunca los dos (33) | ✔ |
| Resta del dado del crimen salvo objeto; objeto una vez por caso (37) | ✔ |
| Pista siempre en Perseguir el Crimen; con un 4-, el dado sube (38) | ✔ |
| Favor = éxito automático, y en Perseguir da la pista (56) | ✔ |
| Sobreexposición: una vez por tirada, tensión máx. 3, pilar roto no sostiene (27) | ✔ |
| Escena flotante por cada casilla de tensión, narrada de noche (28, 62) | ✚ |
| Cajetilla: 9 con 2 detectives, 6 con 3, 18 en el grupo (31) | ✚ |
| Noche: penalizador y 1 cigarrillo sin bonificación (62) | ✔ → ✚ se marca solo cuando es de noche |
| Trago tranquilo: 2 por caso, 2 cigarrillos **o** un estado, hipótesis errónea +1 al dado (65) | ✔ |
| Descanso nocturno: +1 cigarrillo (63) | ✔ |
| Cada 3 pistas bajan el dado; en 1 se conservan (48, 58) | ✔ |
| Dado >4 explota; desenlace 1d4 (48, 138) | ✔ → ✚ tabla de desenlaces |
| Acusación: mínimo 6 pistas y tres preguntas (64) | ✔ → ✚ con reconocimiento al cerrar |
| Reconocimiento al cerrar: 0 / 1 / 2 (53) | ✚ |
| Trueque: una consecuencia de cada columna, la elige el detective, o 2d4 (42-46) | ✚ |
| Consecuencias: crimen +1, indeseables, señalado, descuido; problemas, ciudad recuerda, sacrificio, tu cara me suena (45-46) | ✚ aplicadas de verdad |
| 9+: reconocimiento, favor o mejora del entorno, **uno solo**; favor y entorno solo en riesgo (34-38) | ✚ |
| Favores: máximo 2, vinculables a una zona (31, 56) | ✔ → ✚ zona y consumo |
| Contactos (49) | ✔ → ✚ lista estructurada |
| Rumor: +2 para los compañeros, nunca para quien lo cuenta (50) | ✔ → ✚ el narrador queda excluido · ○ no se limita «una vez por detective» (se consume al usarse una vez) |
| Estados quebrado / acabado sacan al detective al cerrar el caso (26) | ✚ |
| Interludios: cinco tablas de 1d4 con un compañero (85-87) | ✚ |
| Epílogo y final de crónica (84, 88) | ✚ |
| Crónica de 4 casos (84) | ✚ contador |
| Generador aleatorio de casos y encuentros (77, 137-139) | ✚ |
| Construcción de la ciudad: 4 zonas, 14 localizaciones comunes, 4 propias (71-72) | ✔ |
| «Caso abierto»: las pistas las inventan los jugadores (140) | ○ no implementado |
| Enfrentamiento entre detectives: empate = consecuencia a ambos (66) | ○ sin ayuda en pantalla |
| Encrucijadas / imponerse un estado voluntariamente (67) | ○ se hace a mano con la ficha |
| Descanso: una vez por noche y detective (63) | ○ no se limita |

## 4. Automatismos

| Automatismo | 2.1.0 | 3.0.0 |
|---|---|---|
| Fórmula de dados según trasfondo / penalizador | ✔ | ✔ |
| Gasto de cigarrillos, reconocimiento y favores en la tirada | ✔ | ✔ |
| Pistas del grupo y bajada del dado cada 3 | ✔ | ✔ |
| Aviso de explosión del dado | ✔ | ✔ + desenlace 1d4 |
| Sobreexposición desde la propia tarjeta | ✔ | ✔ |
| Visita nocturna marcada según la franja | ✗ | ✔ |
| **Resolver el trueque** (elegir, 2d4 y aplicar el efecto) | ✗ (texto) | ✔ |
| Estado personal / con la ciudad al «pagar el precio» | ✗ | ✔ |
| Mitad de cigarrillos, −1 reconocimiento, +1 tensión, franjas perdidas | ✗ | ✔ |
| Premios tras un 9+ (reconocimiento, favor, entorno) | ✗ | ✔ |
| Escenas flotantes por tensión y recordatorio nocturno | ✗ | ✔ |
| Aviso al agotarse el tiempo | ✗ | ✔ |
| Cierre del caso con reconocimiento automático y aviso de quién se va | ✗ (solo un mensaje) | ✔ |
| Interludios, epílogo, siguiente caso y final de crónica | ✗ | ✔ |
| Preparar un caso del archivo (dado inicial y días) con un clic | ✗ | ✔ |
| Reparto de cajetilla según el número de detectives | ✗ | ✔ |
| Ceder cigarrillos entre detectives | ✗ | ✔ |
| Reinicio del caso: objetos y tragos recuperados, favores cobrados consumidos | parcial (restauraba favores) | ✔ |
| Generador de casos y encuentros al azar | ✗ | ✔ |
| Memoria de ventanas, modo compacto | ✗ | ✔ |

**Lo que sigue siendo manual a propósito:** decidir si un cigarrillo es narrativamente coherente,
cuándo hay penalizador por la situación, qué escena narra cada consecuencia y si una hipótesis
del trago es correcta. Son decisiones de La Ciudad (p. 33, 59, 65): automatizarlas quitaría el juego.

## 5. Decisiones tuyas pendientes

1. **El archivo de casos** (`data/adventures.json`): reproduce el texto íntegro de los 20 casos de
   Pepe Pedraz, Jorge Serrano y Mirella Machancoses (≈113 000 caracteres) en un repositorio con
   licencia MIT. `CONTENIDO.md` ya lo marca como «decisión pendiente del autor». En tus otros
   sistemas el contenido del libro **no va al repo** (se entrega como JSON privado para importar).
   El Panel solo lee de ahí el dado inicial y los días; si lo retiras, basta con una tabla de 20
   líneas (`número, título, dado, días`) y el archivo completo se queda en tu disco.
2. **Foundry 14**: el puente existe pero no se ha probado en una build 14; el manifiesto declara
   «verificado 13.351».
3. **Rumor «una vez por detective»**: se consume al usarse una vez (cualquier compañero, no el
   narrador). Cambiarlo exige guardar quién lo ha usado; no lo he hecho por ser raro en mesa.
4. **Título e id**: sigue siendo `trueque-noir` / «Trueque Noir» (renombrar un paquete publicado
   obliga a un paquete nuevo; el precedente es `mr-standee-portrait`).

## 6. Cómo se ha probado

- `npm test`: 14 pruebas de las reglas puras, incluida la lectura de dado y duración de los 20 casos.
- `npm run check`: sintaxis, plantillas, rutas, acciones sin manejador, ajustes sin registrar,
  versión y etiqueta.
- En Foundry 13.351 con un mundo copiado del QA anterior: migración automática de dos fichas
  antiguas, GM y jugadora a la vez (tiradas, pistas por socket, sobreexposición, escena flotante),
  trueque, trago, interludio, cierre de caso, asistentes de ciudad y detective, modo compacto.

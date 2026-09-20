# Historial de cambios

## 2.0.0

Rediseño integral de la interfaz y reorganización del código. Ninguna regla cambia.

### Ficha del detective

- Tres secciones sin subpestañas: **Personaje**, **Investigación** y **Expediente**.
- Cabecera con jerarquía real: **Riesgo** y **Perseguir el Crimen** dominan; las herramientas de
  La Ciudad pasan a segundo plano.
- Estados activos como sellos de archivo, reconocibles de un vistazo.
- Expediente con cronología, sospechosos, hipótesis, escenas importantes y notas generales.
- Reconocimiento muestra lo disponible; cajetilla, total y gastado quedan en un único
  «Ajuste manual» plegado.
- Distribución en rejilla de doce columnas: Perfil, Pilares y Recursos comparten fila;
  Objetos y favores ocupa una banda de cuatro; Estados y Balada triste comparten la última.
  Los bloques de una fila igualan su altura, así que no quedan huecos muertos.
- Estados en sellos que se ajustan al texto: los doce caben en dos líneas, o en una en
  ventanas anchas. La ficha pasa de unos 1.400 px de alto a menos de 1.000.
- Las columnas responden al ancho de la ventana de la ficha, no al del navegador.

### Tiradas

- Diálogos rehechos: preguntan cómo afrontas la escena en lugar de cómo configurar la tirada.
- Cigarrillo y reconocimiento son excluyentes por construcción, no por aviso posterior.
- Un favor anuncia **éxito automático** y desactiva lo que ya no tendría efecto.
- El rumor solo aparece si existe; los objetos representativos, solo al perseguir el crimen y
  solo los que quedan sin gastar.
- Resumen previo a tirar: fórmula, modificadores y dado del crimen.

### Ayuda contextual

- Corregido que la ayuda no llegara a aparecer nunca: el temporizador se reiniciaba con
  cada movimiento del ratón, así que solo salía si el puntero quedaba inmóvil.
- Ahora es una ventana flotante anclada al elemento que se inspecciona, que se voltea
  cuando no cabe debajo y no roba el puntero al control que explica.

### Sobreexposición

- Retirada la barra permanente de la ficha.
- Ahora aparece dentro de la tarjeta del resultado, junto a «Aceptar resultado», y desaparece en
  cuanto la tirada deja de ser la última.

### Chat

- Tarjetas rediseñadas. Éxito limpio, trueque y resultado duro se distinguen por icono,
  tipografía, borde y lenguaje, no solo por color.

### Mesa del caso y Panel de La Ciudad

- La Mesa muestra únicamente caso, día, franja, dado del crimen, pistas y rumor.
- El dado del crimen se controla con **− valor +** y una acción contextual «usar 3 pistas»;
  la corrección directa queda plegada.
- El Panel destaca caso, crimen, pistas y acciones de franja; ciudad, detectives, trueque,
  acusación y administración se pliegan.
- Autoguardado: desaparece el botón «Guardar» y ningún render borra lo que se está escribiendo.
- Reiniciar caso pide confirmación explícita y vive separado del resto.

### Primera ejecución y accesos

- Pantalla de bienvenida con las tres decisiones iniciales, reabrible desde el menú del sistema.
- Un único menú **Trueque Noir** en los controles de escena reúne todos los accesos.
- Las macros ya no se instalan solas: hay una preferencia para pedirlas.
- Corregido el registro de controles de escena en Foundry 13 y 14, que duplicaba la acción y
  emitía avisos de compatibilidad.

### Escena de portada

- 1920 × 1024, sin cuadrícula, sin niebla de guerra, sin visión de token y con luz global.
- Se encuadra sola al activarla y al redimensionar la ventana. Ninguna otra escena se toca.

### Dirección artística y código

- Arquitectura CSS por componentes: `tn-core`, `tn-sheet`, `tn-apps` y `tn-chat`. Retirados
  cinco archivos de estilos muertos y el duplicado de la raíz.
- Fondo resuelto con gradientes y grano; la portada se reserva para la bienvenida y la escena.
- Tipografía mayor y legible: interfaz 13–14 px, etiquetas 12,5 px, nombre 28 px.
- `trueque-noir.mjs` queda como punto de entrada; hojas, diálogos, chat, escena, onboarding,
  archivo de casos y controles viven en módulos propios.
- Assets reducidos de 12 MB a 3 MB retirando recursos no utilizados.
- Nueva comprobación `node tools/check.mjs` y terminología unificada: nunca «DM», siempre
  **La Ciudad**.
- El archivo de veinte casos deja de importarse solo: ahora se pide expresamente. Ver
  [CONTENIDO.md](CONTENIDO.md).

## 1.3.0

- Retirada la escena de construcción de ciudad; toda la información creada se muestra ahora en el Panel de la Ciudad.
- Escena de portada corregida: sin cuadrícula, niebla ni visión de token y con las proporciones nativas de la imagen.
- Estados activos visibles permanentemente junto al expediente de la cabecera.
- Ayuda contextual común: aparece tras dos segundos sobre cualquier control y se fija con clic derecho hasta pulsar fuera.
- Galería de GitHub centrada en la portada y la ficha, sin la escena de ciudad.

## 1.2.0

- Documento del detective repartido en tres subpestañas para eliminar el desplazamiento vertical innecesario.
- Cigarro regenerado con transparencia real y presentación sin marco, fondo ni sombra rectangular.
- Asistente guiado de construcción de ciudad según los tres bloques del manual.
- Asistente guiado de creación de detective y generación aleatoria completa con miles de combinaciones.
- Persistencia local de tamaño y posición para las ventanas de Trueque Noir.
- Dos escenas iniciales: portada ambiental y tablero de construcción de la ciudad con cuatro zonas.
- Archivo completo de veinte casos, importado como diarios privados para La Ciudad.
- Galería de portada, interfaz y recursos restaurada en GitHub.

## 1.1.0

- Reconstrucción completa de las fichas sobre una única hoja de estilos, eliminando las reglas heredadas que provocaban solapamientos.
- Nueva cabecera en dos niveles: identidad y acciones primero; estado del caso y recursos después.
- Reorganización del documento en paneles con anchos mínimos reales para impedir que campos y etiquetas se pisen.
- Pestañas de investigación y notas simplificadas, con lectura más clara y áreas de escritura útiles.
- Panel de la Ciudad, Mesa del caso, diálogos y tarjetas de chat alineados con el mismo sistema visual.
- Adaptación progresiva para ventanas medianas y estrechas, manteniendo controles táctiles y foco de teclado visibles.
- Revisión visual funcional en Foundry VTT 13 Build 351.

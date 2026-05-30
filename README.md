# Trueque Noir para Foundry VTT

Versión revisada de la base del sistema, centrada en separar las herramientas del DM de la hoja del detective y cubrir mejor la lógica del manual.

## Cambios principales de esta revisión

- La hoja del detective ya **no incluye el panel del DM**.
- Se añade una **Mesa del caso** compartida, pensada para que todo el grupo vea:
  - caso actual
  - día y franja
  - dado del crimen
  - pistas del grupo
  - rumor pendiente
- Se añade un **Panel de la Ciudad** para el DM con:
  - control de día, franja y límite
  - control del dado del crimen
  - gestión de pistas guardadas
  - trueque aleatorio
  - acusación
  - utilidades de “un trago tranquilo” y descanso nocturno
- La hoja del detective tiene ahora una estética más de **documento / dossier noir**, más cercana al manual.
- Los cigarrillos pueden editarse manualmente y tienen botones rápidos de **paquete 9** y **paquete 6**.

## Reglas automatizadas o asistidas

- tirada de riesgo
- tirada de perseguir el crimen
- penalizador nocturno
- gasto obligatorio de cigarrillo para visitas nocturnas
- gasto opcional de cigarrillo (+2)
- gasto opcional de reconocimiento (+2)
- consumo de rumor pendiente (+2)
- uso de favores como éxito automático
- uso único por caso de objetos representativos
- suma de pistas del grupo
- reducción automática del dado del crimen cuando se alcanzan 3 pistas disponibles y el dado está por encima de 1
- almacenamiento de pistas cuando el dado ya está en 1
- subida del dado del crimen en un 4- al perseguir el crimen
- reset de recursos por caso

## Acceso rápido dentro de Foundry

En la cabecera del **Directorio de Actores** aparecen:

- **Panel de la Ciudad** (solo GM)
- **Mesa del caso** (todos)

## Instalación manual

1. Copia esta carpeta dentro de `Data/systems/trueque-noir`
2. Crea un mundo nuevo usando el sistema **Trueque Noir**
3. Crea actores de tipo `detective` o `npc`
4. Abre el Directorio de Actores para usar los botones del sistema

## Notas

- La dirección artística está inspirada en el tono del manual, pero sin incrustar ilustraciones ni tipografías extraídas del PDF.
- Esta versión sigue siendo una base avanzada y no incluye compendios de casos ni constructor visual del mapa de la ciudad.


## Novedades v0.3.0
- Macros automáticas para Herramientas de la Ciudad, Mostrar/Ocultar mesa y Mesa del caso.
- Arreglo de guardado directo para cigarrillos.
- Revisión visual en escala de grises, más cercana al manual.

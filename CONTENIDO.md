# Qué distribuye exactamente este repositorio

Este documento separa el **código del sistema** del **contenido editorial** que viaja con él, y
recoge las dudas de derechos que debe resolver el autor. No es una opinión legal: es un inventario.

## 1. Código y arte propios

| Ruta | Qué es |
| --- | --- |
| `trueque-noir.mjs`, `module/*.mjs` | Código del sistema. Original. |
| `styles/*.css`, `templates/**` | Interfaz. Original. |
| `assets/scenes/*.webp` | Once ilustraciones de portada, una por ambientación. Creadas para el sistema. |
| `assets/logo.webp` | Rótulo del juego, con transparencia. Creado para el sistema. |
| `assets/portrait.webp`, `assets/token.webp` | Retrato y token de ejemplo. Creados para el sistema. |
| `assets/cigarette.png` | Cigarrillo con transparencia real usado en la ficha. |
| `lang/es.json`, `system.json`, `template.json` | Manifiestos y textos de interfaz. |

## 2. Contenido editorial incluido

`data/adventures.json` contiene **veinte casos completos**, con su texto íntegro
(≈113.000 caracteres) y firmados por **Pepe Pedraz**, **Jorge Serrano** y **Mirella Machancoses**.
Son transcripciones del archivo de casos del manual, no resúmenes ni reglas.

Estado actual en el sistema:

- El archivo **sigue en el repositorio**: no se ha eliminado nada sin decirlo.
- Su importación **ya no es automática**. Antes se creaban los veinte diarios al abrir el mundo por
  primera vez. Ahora La Ciudad tiene que pedirlo expresamente desde la bienvenida, el Panel o el
  menú Trueque Noir, y se muestra una confirmación que explica de qué se trata.
- Todo el código que lo toca vive aislado en `module/case-archive.mjs`.

### Contradicción detectada en la documentación anterior

El README afirmaba a la vez estas dos cosas:

> «No incluye el texto, las ilustraciones ni los casos del libro.»

> «Veinte casos del archivo del manual preparados como diarios privados para La Ciudad.»

Las dos no pueden ser ciertas. El README nuevo describe lo que el paquete hace de verdad y remite
a este documento.

### Decisión pendiente del autor

Ninguna de estas opciones se ha tomado automáticamente:

1. **Mantener el archivo** si existe permiso expreso de la editorial y de las tres personas
   autoras, y dejarlo documentado aquí.
2. **Sustituirlo** por ganchos o semillas propias que no reproduzcan el texto del manual.
3. **Retirarlo** del paquete y publicarlo aparte, o no publicarlo.

Para retirarlo bastan dos pasos: borrar `data/adventures.json` y `module/case-archive.mjs`, y
quitar las llamadas a `importCaseArchive` de `trueque-noir.mjs`, `module/ui-hooks.mjs`,
`module/welcome.mjs` y `templates/apps/case-tracker.hbs`.

## 3. Recursos retirados del paquete

Se eliminaron por no estar referenciados en ninguna parte del sistema. Siguen en el historial de
git si hacen falta:

| Archivo | Motivo |
| --- | --- |
| `assets/map-texture.png` | Reproducción atenuada de la hoja de personaje del manual. Sin usar. |
| `assets/documento-logo.png` | Rótulo «Documento del detective» del manual. Sin usar. |
| `assets/trueque-logo.png` | Recorte de un logotipo con artefactos. Sin usar. |
| `assets/noir-bg.png` | 2,4 MB de textura sustituida por gradientes y grano en CSS. |
| `assets/cigarette-v1.png`, `assets/trueque-noir-cover-v1.png`, `assets/cover.png` | Versiones antiguas, sustituidas por las ilustraciones de ambientación. |
| `assets/showcase-v1.png` | Captura de una interfaz que ya no existe. |
| `assets/city-builder-scene.svg` | Escena retirada en la 1.3.0. |

Los tres primeros son, además, material derivado del manual: conviene no redistribuirlos aunque
vuelvan a usarse.

## 4. Naturaleza del proyecto

Trueque Noir es una implementación **no oficial** de las reglas de *Balada triste de la ciudad*
para Foundry VTT. Para jugar hace falta una copia legítima del manual. *Balada triste de la
ciudad* y sus contenidos pertenecen a sus titulares.

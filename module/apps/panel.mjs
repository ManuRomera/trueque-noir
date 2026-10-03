/**
 * Panel de La Ciudad: la mesa de quien dirige. Arriba, lo que se toca cada franja
 * (reloj, dado del crimen, pistas, escenas flotantes). Debajo, cinco pestañas:
 * Detectives (tabla viva), Azar y trueque, Cierre del caso, Casos y Ciudad.
 */
import { ID, RUTA, TN, ESTADOS_FINALES, DADO_TEXTO, diasDelCaso, estadoCaso, leerCiudad, leerEscenasFlotantes, getDetectives, getActiveStates, getRecognitionAvailable } from "../config.mjs";
import * as R from "../reglas.mjs";
import { EXPLOSION, ENCUENTROS, GENERADOR, INTERLUDIOS, EPILOGO, FINAL_CRONICA } from "../tablas.mjs";
import { postCityNote } from "../chat.mjs";
import { requestCaseOp } from "../case-state.mjs";
import { listarArchivo, importCaseArchive } from "../case-archive.mjs";
import { DialogoTrueque } from "../trueque.mjs";
import { confirmar, tragoTranquilo, interludio, nuevoCaso } from "./dialogos.mjs";
import { AppTN } from "./base.mjs";

const esc = valor => foundry.utils.escapeHTML(String(valor ?? ""));
const CIERRE_VACIO = { quien: "", que: "", porque: "", okQuien: false, okQue: false, okPorque: false };

const barajar = lista => lista.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

export class PanelCiudad extends AppTN {
  static MEMORIA = "panel-ciudad";
  static REACTIVA = true;
  static SCROLL_MEMORIA = [".tn-pn-cuerpo"];

  static DEFAULT_OPTIONS = {
    id: "trueque-noir-panel",
    tag: "form",
    classes: ["tn-app", "tn-case-tracker"],
    position: { width: 940, height: 640 },
    window: { title: "Panel de La Ciudad", icon: "fa-solid fa-city", resizable: true },
    form: { handler: PanelCiudad.#guardar, submitOnChange: true, closeOnSubmit: false },
    actions: {
      mesa: () => game.truequeNoir.alternarMesa(),
      nuevoCaso: PanelCiudad.#nuevoCaso,
      fase: PanelCiudad.#fase,
      irA: PanelCiudad.#irA,
      dado: PanelCiudad.#dado,
      gastarPistas: PanelCiudad.#gastarPistas,
      escenaNarrada: PanelCiudad.#escenaNarrada,
      abrirDetective: (event, boton) => game.actors.get(boton.dataset.id)?.sheet.render(true),
      trago: (event, boton) => tragoTranquilo(game.actors.get(boton.dataset.id)),
      descanso: PanelCiudad.#descanso,
      premio: PanelCiudad.#premio,
      interludio: (event, boton) => interludio(game.actors.get(boton.dataset.id)),
      truequeDe: (event, boton) => DialogoTrueque.resolver({ actorId: boton.dataset.id }),
      repartir: PanelCiudad.#repartir,
      crearDetective: () => game.truequeNoir.abrirCreadorDetective(),
      explosion: PanelCiudad.#explosion,
      encuentro: PanelCiudad.#encuentro,
      semilla: PanelCiudad.#semilla,
      acusar: PanelCiudad.#acusar,
      cerrar: PanelCiudad.#cerrar,
      interludios: PanelCiudad.#interludios,
      siguienteCaso: PanelCiudad.#siguienteCaso,
      usarCaso: PanelCiudad.#usarCaso,
      importar: () => importCaseArchive(),
      editarCiudad: () => game.truequeNoir.abrirCreadorCiudad(),
      ambientacion: () => game.truequeNoir.abrirAmbientacion(),
      vaciarCiudad: PanelCiudad.#vaciarCiudad,
      bienvenida: () => game.truequeNoir.abrirBienvenida(),
      reiniciar: PanelCiudad.#reiniciar
    }
  };

  static PARTS = { panel: { template: `${RUTA}/templates/apps/panel.hbs`, scrollable: [".tn-pn-cuerpo"] } };

  static TABS = [
    { id: "detectives", label: "Detectives", icon: "fa-solid fa-user-secret" },
    { id: "azar", label: "Azar y trueque", icon: "fa-solid fa-dice" },
    { id: "cierre", label: "Cierre del caso", icon: "fa-solid fa-gavel" },
    { id: "casos", label: "Casos", icon: "fa-solid fa-folder-open" },
    { id: "ciudad", label: "Ciudad", icon: "fa-solid fa-map-location-dot" }
  ];

  /** Las respuestas de la acusación sobreviven a los repintados que provocan los demás. */
  cierre = { ...CIERRE_VACIO };

  static abrir() {
    if (!game.user.isGM) return ui.notifications.warn("El Panel de La Ciudad solo lo abre quien dirige la partida.");
    return super.abrir();
  }

  async _prepareContext() {
    const caso = estadoCaso();
    const detectives = getDetectives();
    const esperado = R.cigarrillosPorDetective(detectives.length);
    const tab = this.tabGroups.panel ?? "detectives";
    const recompensa = R.recompensaCaso({ quien: this.cierre.okQuien, que: this.cierre.okQue, porque: this.cierre.okPorque, explotado: caso.explotado });

    return {
      caso, tab,
      tabs: this.constructor.TABS.map(t => ({ ...t, activa: t.id === tab })),
      cierre: this.cierre,
      dias: diasDelCaso(caso),
      dadoTexto: DADO_TEXTO[caso.dado - 1] ?? "",
      dadoTras: Math.max(1, caso.dado - 1),
      faltanAcusar: Math.max(0, R.PISTAS_ACUSACION - caso.pistas.total),
      minAcusar: R.PISTAS_ACUSACION,
      pistaProgreso: Array.from({ length: R.PISTAS_POR_PASO }, (_, i) => ({ llena: i < caso.pistas.progreso })),
      escenas: leerEscenasFlotantes().map(e => ({ ...e, etiquetaPilar: TN.PILLARS[e.pillar] })),
      detectives: detectives.map(actor => {
        const estados = getActiveStates(actor);
        const rec = getRecognitionAvailable(actor);
        return {
          id: actor.id, name: actor.name, img: actor.img,
          cigs: { value: actor.cigarettes, max: actor.system.cigarettes.max, casillas: Array.from({ length: actor.system.cigarettes.max }, (_, i) => ({ llena: i < actor.cigarettes })) },
          rec, recNegativo: rec < 0,
          tensionPersona: actor.system.stability.person.tension, tensionLugar: actor.system.stability.place.tension,
          tragos: R.TRAGOS_POR_CASO - actor.system.caseStats.quietDrinksUsed,
          estados, final: estados.some(e => ESTADOS_FINALES.includes(e.id))
        };
      }),
      reparto: { esperado, desajustado: detectives.length > 1 && detectives.some(a => Number(a.system.cigarettes.max) !== esperado) },
      recompensa,
      recompensaTexto: caso.explotado ? "El dado del crimen ha explotado: ningún punto."
        : recompensa === 2 ? "Quién, qué y por qué: el caso se cierra por completo."
        : recompensa === 1 ? "Detención acertada, pero sin conocer toda la historia."
        : "Sin una detención acertada no hay reconocimiento.",
      archivo: await listarArchivo(),
      importado: Boolean(game.settings.get(ID, "caseArchiveImported")),
      ciudad: leerCiudad()
    };
  }

  /** Guarda los campos del caso al cambiar y recuerda las respuestas de la acusación. */
  static async #guardar(event, form, formData) {
    const d = formData.object;
    if ("caseName" in d) await game.settings.set(ID, "caseName", String(d.caseName).trim() || "Caso abierto");
    if ("timeLimit" in d) await game.settings.set(ID, "timeLimit", Math.max(1, Math.min(Math.trunc(Number(d.timeLimit)) || 4, 9)));
    let cambioCierre = false;
    for (const clave of Object.keys(CIERRE_VACIO)) {
      if (`cierre.${clave}` in d) { this.cierre[clave] = d[`cierre.${clave}`]; cambioCierre = true; }
    }
    // Las casillas «Acierta» no cambian ningún ajuste: solo el resultado que se previsualiza.
    if (cambioCierre) this.render();
  }

  // ----------------------------------------------------------- Tiempo y medidores

  static #fase(event, boton) { return requestCaseOp("shiftPhase", { delta: Number(boton.dataset.delta) }); }
  static #irA(event, boton) { return requestCaseOp("setClock", { dia: Number(boton.dataset.dia), franja: Number(boton.dataset.franja) }); }
  static #dado(event, boton) { return requestCaseOp("changeCrimeDie", { amount: Number(boton.dataset.delta) }); }
  static #escenaNarrada(event, boton) { return requestCaseOp("resolveFloating", { id: boton.dataset.id }); }

  static async #gastarPistas() {
    if (await requestCaseOp("spendClues")) {
      await postCityNote({ title: "Pistas gastadas", body: `<p>El grupo gasta ${R.PISTAS_POR_PASO} pistas guardadas: el dado del crimen baja a <strong>${estadoCaso().dado}</strong>.</p>` });
    }
  }

  // --------------------------------------------------------------- Detectives

  static async #descanso(event, boton) {
    const actor = game.actors.get(boton.dataset.id);
    await actor.takeNightRest();
    await postCityNote({ title: "Descanso", body: `<p><strong>${esc(actor.name)}</strong> pasa la noche con quien lo sostiene y recupera 1 cigarrillo.</p>` });
  }

  static async #premio(event, boton) {
    const actor = game.actors.get(boton.dataset.id);
    await actor.addRecognition(1);
    await postCityNote({ title: "Reconocimiento", body: `<p><strong>${esc(actor.name)}</strong> gana 1 punto de reconocimiento por ayudar sin esperar nada a cambio.</p>` });
  }

  static async #repartir() {
    const detectives = getDetectives();
    const cada = R.cigarrillosPorDetective(detectives.length);
    const ok = await confirmar({
      title: "Repartir la cajetilla",
      message: `Con ${detectives.length} detectives, cada uno lleva <strong>${cada}</strong> cigarrillos (18 en el grupo).`,
      detail: "Se ajusta el máximo de cada cajetilla y se rellenan.", confirmLabel: "Repartir"
    });
    if (!ok) return;
    for (const actor of detectives) await actor.setCigaretteMax(cada);
  }

  // ------------------------------------------------------------ Azar y trueque

  static async #explosion() {
    const roll = await new Roll("1d4").evaluate();
    await roll.toMessage({ speaker: { alias: "La Ciudad" }, flavor: `El dado del crimen ha explotado. <strong>${esc(EXPLOSION[roll.total - 1])}</strong>` });
  }

  static async #encuentro() {
    const roll = await new Roll(`1d${ENCUENTROS.length}`).evaluate();
    await roll.toMessage({ speaker: { alias: "La Ciudad" }, flavor: `Encuentro al azar: <strong>${esc(ENCUENTROS[roll.total - 1])}</strong>. Quien ayude a un pobre diablo puede ganar reconocimiento.` });
  }

  static async #semilla() {
    const roll = await new Roll("6d10 + 2d4").evaluate();
    const d10 = roll.dice[0].results.map(r => r.result);
    const d4 = roll.dice[1].results.map(r => r.result);
    const fila = (titulo, texto) => `<li><strong>${titulo}</strong> ${esc(texto)}</li>`;
    await roll.toMessage({
      speaker: { alias: "La Ciudad" },
      flavor: `<div class="tn-chat-card tn-note"><div class="tn-note__title">Semilla de caso</div><div class="tn-note__body"><ul>${[
        fila("¿Quién?", GENERADOR.quien[d10[0] - 1]), fila("¿Qué?", GENERADOR.que[d10[1] - 1]), fila("¿Por qué?", GENERADOR.porque[d10[2] - 1]),
        fila("Llega por", GENERADOR.llegada[d10[3] - 1]), fila("Secreto del culpable", GENERADOR.secreto[d10[4] - 1]), fila("Giro", GENERADOR.giro[d10[5] - 1]),
        fila("Duración", `${GENERADOR.dias[d4[0] - 1]} días`), fila("Si el dado explota", EXPLOSION[d4[1] - 1])
      ].join("")}</ul></div></div>`
    });
  }

  // ------------------------------------------------------------ Cierre del caso

  static async #acusar() {
    const caso = estadoCaso();
    const c = this.cierre;
    await postCityNote({
      title: "Acusación", tone: caso.pistas.puedeAcusar ? "" : "warning",
      body: `${caso.pistas.puedeAcusar ? "" : `<p class="tn-note__warning">Acusación precipitada: solo ${caso.pistas.total} de ${R.PISTAS_ACUSACION} pistas.</p>`}
        <p><strong>¿Quién?</strong> ${esc(c.quien) || "—"}</p><p><strong>¿Qué?</strong> ${esc(c.que) || "—"}</p><p><strong>¿Por qué?</strong> ${esc(c.porque) || "—"}</p>`
    });
  }

  static async #cerrar() {
    const caso = estadoCaso();
    const c = this.cierre;
    const puntos = R.recompensaCaso({ quien: c.okQuien, que: c.okQue, porque: c.okPorque, explotado: caso.explotado });
    const detectives = getDetectives();
    const salen = detectives.filter(a => getActiveStates(a).some(e => e.final));
    const ok = await confirmar({
      title: "Cerrar el caso",
      message: `«${esc(caso.nombre)}» termina. Cada detective recibe <strong>${puntos}</strong> ${puntos === 1 ? "punto" : "puntos"} de reconocimiento.`,
      detail: salen.length ? `${salen.map(a => esc(a.name)).join(", ")} ${salen.length === 1 ? "abandona" : "abandonan"} la ciudad al terminar el caso.` : "",
      confirmLabel: "Cerrar el caso"
    });
    if (!ok) return;
    if (puntos) for (const actor of detectives) await actor.addRecognition(puntos);
    const resultado = caso.explotado ? "El dado del crimen explotó"
      : caso.finTiempo ? "Se agotó el tiempo"
      : puntos === 2 ? "Resuelto del todo" : puntos === 1 ? "Culpable detenido, historia a medias" : "Sin detención acertada";
    await requestCaseOp("setResult", { text: `${resultado} · ${puntos} ${puntos === 1 ? "punto" : "puntos"}` });
    await postCityNote({
      title: `Caso cerrado · ${caso.nombre}`,
      body: `<p><strong>${resultado}.</strong> ${puntos ? `Cada detective gana ${puntos} ${puntos === 1 ? "punto" : "puntos"} de reconocimiento.` : "Nadie gana reconocimiento."}</p>
        ${salen.length ? `<p>${salen.map(a => `<strong>${esc(a.name)}</strong>`).join(", ")} ${salen.length === 1 ? "queda" : "quedan"} quebrado o acabado: ${salen.length === 1 ? "abandona" : "abandonan"} la ciudad como vagabundo, criminal de poca monta o camello.</p>` : ""}
        <p class="tn-note__foot">Epílogo</p><ol>${EPILOGO.map(p => `<li>${esc(p)}</li>`).join("")}</ol>`
    });
  }

  /** Cada detective recibe una tabla de interludio distinta, tira 1d4 y comparte el suceso con un compañero (p. 85). */
  static async #interludios() {
    const detectives = getDetectives();
    if (detectives.length < 2) return ui.notifications.warn("Los interludios se comparten con un compañero: hacen falta al menos dos detectives.");
    const tablas = barajar(INTERLUDIOS.map((_, i) => i));
    const roll = await new Roll(`${detectives.length}d4`).evaluate();
    const caras = roll.dice[0].results.map(r => r.result);
    const filas = detectives.map((actor, i) => {
      const otro = barajar(detectives.filter(d => d !== actor))[0];
      const tabla = tablas[i % tablas.length];
      const texto = INTERLUDIOS[tabla][caras[i] - 1].replace("{otro}", `<strong>${esc(otro.name)}</strong>`);
      return `<li><strong>${esc(actor.name)}</strong> (tabla ${tabla + 1}, ${caras[i]}): ${texto}</li>`;
    });
    await roll.toMessage({
      speaker: { alias: "La Ciudad" },
      flavor: `<div class="tn-chat-card tn-note"><div class="tn-note__title">Interludios</div><div class="tn-note__body"><ul>${filas.join("")}</ul><p class="tn-note__foot">Sin efecto mecánico: generan trasfondo y ganchos entre casos.</p></div></div>`
    });
  }

  static async #siguienteCaso() {
    const siguiente = estadoCaso().cronica + 1;
    if (siguiente > 4) {
      await postCityNote({ title: "Final de la crónica", body: `<p>Han jugado los cuatro casos de una crónica completa. Cada detective decide su futuro:</p><ol>${FINAL_CRONICA.map(p => `<li>${esc(p)}</li>`).join("")}</ol>` });
    }
    await requestCaseOp("setChronicle", { value: siguiente > 4 ? 1 : siguiente });
    await PanelCiudad.#empezar(await nuevoCaso());
  }

  // ----------------------------------------------------------------- Casos

  /** Pone el caso en marcha: reloj y pistas a cero, objetos y tragos recuperados, favores cobrados consumidos. */
  static async #empezar(datos) {
    if (!datos) return;
    await requestCaseOp("startCase", datos);
    for (const actor of getDetectives()) await actor.resetCaseState();
    const instancia = foundry.applications.instances.get("trueque-noir-panel");
    if (instancia) instancia.cierre = { ...CIERRE_VACIO };
    await postCityNote({
      title: `Empieza el caso · ${datos.name}`,
      body: `<p>Dado del crimen inicial <strong>${datos.crimeDie}</strong>, ${datos.days} ${datos.days === 1 ? "día" : "días"} de investigación. Objetos representativos y tragos recuperados.</p>`
    });
  }

  static async #nuevoCaso() {
    await PanelCiudad.#empezar(await nuevoCaso());
  }

  static async #usarCaso(event, boton) {
    const caso = estadoCaso();
    const elegido = (await listarArchivo()).find(c => c.number === Number(boton.dataset.number));
    if (!elegido) return;
    if (caso.pistas.total || caso.dia > 1) {
      const ok = await confirmar({ title: "Empezar otro caso", message: `Se perderá el progreso de «${esc(caso.nombre)}».`, confirmLabel: "Empezar el nuevo" });
      if (!ok) return;
    }
    await PanelCiudad.#empezar({ name: elegido.title, crimeDie: elegido.dado ?? 2, days: elegido.dias ?? 4 });
  }

  // ----------------------------------------------------------------- Ciudad

  static async #vaciarCiudad() {
    const ok = await confirmar({
      title: "Vaciar la ciudad", message: "Se borrará la ciudad guardada en el panel: contexto, límites y las cuatro zonas.",
      detail: "Los diarios ya creados se conservan como archivo.", confirmLabel: "Vaciar la ciudad", danger: true
    });
    if (!ok) return;
    await game.settings.set(ID, "cityData", "{}");
    await game.settings.set(ID, "cityName", "La ciudad");
  }

  static async #reiniciar() {
    const ok = await confirmar({
      title: "Reiniciar el caso",
      message: "Reiniciar el caso elimina el progreso actual de tiempo, pistas, rumor y escenas, y recupera los objetos y los tragos.",
      detail: "Los favores cobrados se consumen; los demás se conservan. La ciudad, los estados y las fichas no se tocan.",
      confirmLabel: "Reiniciar el caso", danger: true
    });
    if (!ok) return;
    await PanelCiudad.#empezar({ name: "Caso abierto", crimeDie: 1, days: estadoCaso().limite });
    ui.notifications.info("Caso reiniciado. La ciudad y los detectives siguen en su sitio.");
  }
}

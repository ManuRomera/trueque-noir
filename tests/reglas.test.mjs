import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as R from "../module/reglas.mjs";
import { TRUEQUE_CIUDAD, TRUEQUE_PRECIO, INTERLUDIOS, GENERADOR, EXPLOSION } from "../module/tablas.mjs";

test("p. 33: 1d10; 2d10 con trasfondo (mejor); 2d10 con penalizador (peor); se anulan", () => {
  assert.equal(R.formulaTirada(), "1d10");
  assert.equal(R.formulaTirada({ trasfondo: true }), "2d10kh");
  assert.equal(R.formulaTirada({ penalizador: true }), "2d10kl");
  assert.equal(R.formulaTirada({ trasfondo: true, penalizador: true }), "1d10");
});

test("p. 34: 4- duro, 5-8 trueque, 9+ limpio", () => {
  assert.equal(R.clasificar(-3), "hard");
  assert.equal(R.clasificar(4), "hard");
  assert.equal(R.clasificar(5), "mixed");
  assert.equal(R.clasificar(8), "mixed");
  assert.equal(R.clasificar(9), "clean");
  assert.equal(R.clasificar(14), "clean");
});

test("p. 48: el dado topa en 5 (explotado) y nunca baja de 1", () => {
  assert.equal(R.limitarDado(0), 1);
  assert.equal(R.limitarDado(3), 3);
  assert.equal(R.limitarDado(9), 5);
  assert.ok(!R.dadoExplotado(4));
  assert.ok(R.dadoExplotado(5));
});

test("p. 58: cada 3 pistas bajan el dado 1; con el dado en 1 se conservan", () => {
  assert.deepEqual(R.gastarPistas({ dado: 2, disponibles: 3 }), { dado: 1, pasos: 1, gastadas: 3, restantes: 0 });
  assert.deepEqual(R.gastarPistas({ dado: 4, disponibles: 7 }), { dado: 2, pasos: 2, gastadas: 6, restantes: 1 });
  assert.deepEqual(R.gastarPistas({ dado: 1, disponibles: 3 }), { dado: 1, pasos: 0, gastadas: 0, restantes: 3 });
  assert.deepEqual(R.gastarPistas({ dado: 2, disponibles: 2 }), { dado: 2, pasos: 0, gastadas: 0, restantes: 2 });
});

test("p. 31: 18 cigarrillos en el grupo", () => {
  assert.equal(R.cigarrillosPorDetective(2), 9);
  assert.equal(R.cigarrillosPorDetective(3), 6);
  assert.equal(R.cigarrillosPorDetective(4), 4);
  assert.equal(R.cigarrillosPorDetective(1), 9);
});

test("p. 46: perder la mitad cuesta siempre algo", () => {
  assert.equal(R.perdidaMitad(9), 5);
  assert.equal(R.perdidaMitad(6), 3);
  assert.equal(R.perdidaMitad(1), 1);
  assert.equal(R.perdidaMitad(0), 0);
});

test("p. 60: el reloj pasa de noche a mañana y avisa al rebasar el límite", () => {
  assert.deepEqual(R.moverFranja({ franja: 0, dia: 1, limite: 4 }), { franja: 1, dia: 1, finTiempo: false });
  assert.deepEqual(R.moverFranja({ franja: 2, dia: 1, limite: 4 }), { franja: 0, dia: 2, finTiempo: false });
  assert.deepEqual(R.moverFranja({ franja: 2, dia: 4, limite: 4 }), { franja: 0, dia: 5, finTiempo: true });
  assert.deepEqual(R.moverFranja({ franja: 0, dia: 1, limite: 4 }, -1), { franja: 2, dia: 1, finTiempo: false });
  assert.deepEqual(R.moverFranja({ franja: 1, dia: 3, limite: 4 }, 2), { franja: 0, dia: 4, finTiempo: false });
});

test("p. 28: escena flotante según la casilla de tensión", () => {
  assert.match(R.escenaFlotante("person", 1), /mensaje/);
  assert.match(R.escenaFlotante("person", 3), /muere/);
  assert.match(R.escenaFlotante("place", 2), /siniestro/);
  assert.equal(R.escenaFlotante("nada", 1), "");
});

test("favores: el alcance libre sirve para todo y el texto antiguo se interpreta", () => {
  assert.equal(R.normalizarAlcance("Riesgo"), "riesgo");
  assert.equal(R.normalizarAlcance("Crimen"), "crimen");
  assert.equal(R.normalizarAlcance("información en la zona sur"), "crimen");
  assert.equal(R.normalizarAlcance("Riesgo / Crimen / Libre"), "libre", "el marcador de posición copiado entero es libre");
  assert.equal(R.normalizarAlcance(""), "libre");
  assert.ok(R.favorValido("libre", "risk") && R.favorValido("libre", "pursue"));
  assert.ok(R.favorValido("riesgo", "risk") && !R.favorValido("riesgo", "pursue"));
  assert.ok(R.favorValido("crimen", "pursue") && !R.favorValido("crimen", "risk"));
});

test("p. 53: reconocimiento al cerrar el caso", () => {
  assert.equal(R.recompensaCaso({ quien: true, que: true, porque: true }), 2);
  assert.equal(R.recompensaCaso({ quien: true, que: true, porque: false }), 1);
  assert.equal(R.recompensaCaso({ quien: true, que: false, porque: true }), 0);
  assert.equal(R.recompensaCaso({ quien: false, que: false, porque: false }), 0);
  assert.equal(R.recompensaCaso({ quien: true, que: true, porque: true, explotado: true }), 0);
});

test("p. 54: costes de los interludios", () => {
  assert.equal(R.COSTE_INTERLUDIO.cigarettes2, 1);
  assert.equal(R.COSTE_INTERLUDIO.fullPack, 2);
  assert.equal(R.COSTE_INTERLUDIO.favor, 2);
  assert.equal(R.COSTE_INTERLUDIO.background, 3);
});

test("p. 28/45/85: las tablas tienen las filas del manual", () => {
  assert.equal(TRUEQUE_CIUDAD.length, 4);
  assert.equal(TRUEQUE_PRECIO.length, 4);
  assert.equal(EXPLOSION.length, 4);
  assert.equal(INTERLUDIOS.length, 5);
  for (const tabla of INTERLUDIOS) {
    assert.equal(tabla.length, 4);
    for (const fila of tabla) assert.ok(fila.includes("{otro}"), fila);
  }
  for (const [clave, lista] of Object.entries(GENERADOR)) {
    assert.equal(lista.length, clave === "dias" ? 4 : 10, clave);
  }
});

test("el archivo de casos trae dado inicial y duración legibles", () => {
  const casos = JSON.parse(fs.readFileSync(new URL("../data/adventures.json", import.meta.url)));
  assert.equal(casos.length, 20);
  for (const caso of casos) {
    const { dado, dias } = R.leerCaso(caso.text.replace(/\s+/g, " "));
    assert.ok(dado >= 1 && dado <= 4, `caso ${caso.number}: dado ${dado}`);
    assert.ok(dias >= 1 && dias <= 6, `caso ${caso.number}: días ${dias}`);
  }
});

test("trasfondos repetidos", () => {
  assert.deepEqual(R.trasfondosRepetidos(["A", "B", "A"]), ["A"]);
  assert.deepEqual(R.trasfondosRepetidos(["", "", "A"]), []);
});

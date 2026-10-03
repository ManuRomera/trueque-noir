import { normalizarAlcance, TENSION_MAXIMA } from "./reglas.mjs";

const { StringField, NumberField, BooleanField, SchemaField, ArrayField } = foundry.data.fields;

const texto = () => new StringField({ required: true, initial: "", blank: true });
const bool = (initial = false) => new BooleanField({ required: true, initial });
const entero = (initial = 0, extra = {}) => new NumberField({ required: true, integer: true, initial, ...extra });
const alcance = () => new StringField({ required: true, initial: "libre", choices: ["libre", "riesgo", "crimen"] });
const pilar = () => new SchemaField({ name: texto(), tension: entero(0, { min: 0, max: TENSION_MAXIMA }) });
const favor = () => new SchemaField({ name: texto(), scope: alcance(), zone: texto(), used: bool() });
const objeto = () => new SchemaField({ name: texto(), used: bool() });

export class TruequeNoirDetectiveData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      look: texto(),
      belief: texto(),
      temperament: texto(),
      age: texto(),
      motivation: texto(),
      roleTag: texto(),
      background1: texto(),
      background2: texto(),
      background3: texto(),
      baladaTarget: texto(),
      baladaRumor: texto(),
      baladaBelieve: bool(),
      baladaTruth: texto(),
      cigarettes: new SchemaField({
        value: entero(9, { min: 0 }),
        max: entero(9, { min: 0 })
      }),
      // El total puede quedar en negativo: «perder 1 punto de reconocimiento» sin tener ninguno lo deja en -1 (p. 46).
      recognition: new SchemaField({
        total: entero(0),
        spent: entero(0, { min: 0 })
      }),
      clues: new SchemaField({
        count: entero(0, { min: 0 }),
        notes: texto()
      }),
      contacts: new SchemaField({
        list: new ArrayField(new SchemaField({
          name: texto(),
          zone: texto(),
          place: texto(),
          offer: new StringField({ required: true, initial: "pista", choices: ["pista", "ruta"] }),
          done: bool()
        })),
        notes: texto()
      }),
      favors: new SchemaField({ slot1: favor(), slot2: favor() }),
      representativeObjects: new SchemaField({ slot1: objeto(), slot2: objeto() }),
      stability: new SchemaField({ person: pilar(), place: pilar() }),
      caseStats: new SchemaField({
        quietDrinksUsed: entero(0, { min: 0, max: 2 })
      }),
      personalStates: new SchemaField({
        magullado: bool(),
        asustado: bool(),
        desesperado: bool(),
        herido: bool(),
        moribundo: bool(),
        quebrado: bool(),
        custom: texto(),
        customActive: bool()
      }),
      cityStates: new SchemaField({
        perseguido: bool(),
        corrupto: bool(),
        extorsionado: bool(),
        suspendido: bool(),
        observado: bool(),
        acabado: bool(),
        custom: texto(),
        customActive: bool()
      }),
      // Expediente: cuadernos de investigación del detective.
      dossier: new SchemaField({
        timeline: texto(),
        suspects: texto(),
        hypotheses: texto(),
        scenes: texto()
      }),
      notes: texto()
    };
  }

  /** Las fichas anteriores a la 3.0 guardaban el alcance de un favor como texto libre. */
  static migrateData(source) {
    for (const slot of ["slot1", "slot2"]) {
      const favorAntiguo = source.favors?.[slot];
      if (favorAntiguo && "scope" in favorAntiguo) favorAntiguo.scope = normalizarAlcance(favorAntiguo.scope);
    }
    return super.migrateData(source);
  }
}

export class TruequeNoirNpcData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      role: texto(),
      zone: texto(),
      location: texto(),
      notes: texto(),
      favorScope: new StringField({ required: true, initial: "", blank: true, choices: ["", "libre", "riesgo", "crimen"] })
    };
  }

  static migrateData(source) {
    if (source.favorScope) source.favorScope = normalizarAlcance(source.favorScope);
    return super.migrateData(source);
  }
}

const {
  StringField,
  NumberField,
  BooleanField,
  SchemaField
} = foundry.data.fields;

const textField = () => new StringField({ required: true, initial: "", blank: true });
const boolField = (initial = false) => new BooleanField({ required: true, initial });
const intField = (initial = 0, extra = {}) => new NumberField({ required: true, integer: true, initial, ...extra });

export class TruequeNoirDetectiveData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      look: textField(),
      belief: textField(),
      temperament: textField(),
      age: textField(),
      motivation: textField(),
      roleTag: textField(),
      background1: textField(),
      background2: textField(),
      background3: textField(),
      baladaTarget: textField(),
      baladaRumor: textField(),
      baladaBelieve: boolField(false),
      baladaTruth: textField(),
      cigarettes: new SchemaField({
        value: intField(9, { min: 0 }),
        max: intField(9, { min: 0 })
      }),
      recognition: new SchemaField({
        total: intField(0, { min: 0 }),
        spent: intField(0, { min: 0 })
      }),
      clues: new SchemaField({
        count: intField(0, { min: 0 }),
        notes: textField()
      }),
      contacts: new SchemaField({
        notes: textField()
      }),
      favors: new SchemaField({
        slot1: new SchemaField({ name: textField(), scope: textField(), used: boolField(false) }),
        slot2: new SchemaField({ name: textField(), scope: textField(), used: boolField(false) })
      }),
      representativeObjects: new SchemaField({
        slot1: new SchemaField({ name: textField(), used: boolField(false) }),
        slot2: new SchemaField({ name: textField(), used: boolField(false) })
      }),
      stability: new SchemaField({
        person: new SchemaField({
          name: textField(),
          tension: intField(0, { min: 0, max: 3 })
        }),
        place: new SchemaField({
          name: textField(),
          tension: intField(0, { min: 0, max: 3 })
        })
      }),
      caseStats: new SchemaField({
        quietDrinksUsed: intField(0, { min: 0, max: 2 })
      }),
      personalStates: new SchemaField({
        magullado: boolField(false),
        asustado: boolField(false),
        desesperado: boolField(false),
        herido: boolField(false),
        moribundo: boolField(false),
        custom: textField(),
        customActive: boolField(false),
        quebrado: boolField(false)
      }),
      cityStates: new SchemaField({
        perseguido: boolField(false),
        corrupto: boolField(false),
        extorsionado: boolField(false),
        suspendido: boolField(false),
        observado: boolField(false),
        custom: textField(),
        customActive: boolField(false),
        acabado: boolField(false)
      }),
      // Expediente: cuadernos de investigación del detective.
      dossier: new SchemaField({
        timeline: textField(),
        suspects: textField(),
        hypotheses: textField(),
        scenes: textField()
      }),
      notes: textField()
    };
  }
}

export class TruequeNoirNpcData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      role: textField(),
      zone: textField(),
      location: textField(),
      notes: textField(),
      favorScope: textField()
    };
  }
}

function getFieldInitial(field) {
  if (field instanceof SchemaField) {
    const data = {};
    for (const [key, inner] of Object.entries(field.fields)) data[key] = getFieldInitial(inner);
    return data;
  }
  if (field.options && Object.prototype.hasOwnProperty.call(field.options, 'initial')) {
    return foundry.utils.deepClone(field.options.initial);
  }
  return null;
}

export function getModelInitialData(ModelClass) {
  const schema = ModelClass.defineSchema();
  const data = {};
  for (const [key, field] of Object.entries(schema)) data[key] = getFieldInitial(field);
  return data;
}

export function getDetectiveDefaults() {
  return getModelInitialData(TruequeNoirDetectiveData);
}

export function getNpcDefaults() {
  return getModelInitialData(TruequeNoirNpcData);
}

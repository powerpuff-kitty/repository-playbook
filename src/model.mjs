import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const HOME = fileURLToPath(new URL('../', import.meta.url));
export const STATES = ['pass', 'fail', 'not-applicable', 'unknown', 'manual-review'];
export const CHECKS = ['file', 'community', 'workflow', 'readme-sections', 'local-links', 'badge-scope', 'manual', 'setting', 'workflow-security', 'dependency-coverage'];
export const readJson = async file => JSON.parse(await readFile(file, 'utf8'));

// Deliberately small, explicit JSON Schema subset. Unknown keywords fail closed.
// Schemas in this repository only use these keywords; this is not a general validator.
export function validateSchema(value, schema, at = '$') {
  const supported = new Set(['$schema', '$id', 'title', 'description', 'type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'pattern', 'minLength', 'minimum', 'minItems', 'uniqueItems']);
  for (const key of Object.keys(schema)) if (!supported.has(key)) throw new Error(`Unsupported schema keyword: ${key}`);
  const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  const expected = [].concat(schema.type ?? type);
  if (!expected.some(t => t === type || (t === 'integer' && Number.isInteger(value)))) throw new Error(`${at}: expected ${expected}`);
  if (schema.enum && !schema.enum.includes(value)) throw new Error(`${at}: invalid enum`);
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) throw new Error(`${at}: too short`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) throw new Error(`${at}: invalid pattern`);
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) throw new Error(`${at}: below minimum`);
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) throw new Error(`${at}: too few items`);
    if (schema.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) throw new Error(`${at}: duplicates`);
    if (schema.items) value.forEach((v, i) => validateSchema(v, schema.items, `${at}[${i}]`));
  } else if (type === 'object') {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) throw new Error(`${at}.${key}: required`);
    for (const [key, v] of Object.entries(value)) {
      if (schema.properties?.[key]) validateSchema(v, schema.properties[key], `${at}.${key}`);
      else if (schema.additionalProperties === false) throw new Error(`${at}.${key}: unexpected property`);
    }
  }
  return value;
}

export async function loadModel(root = HOME) {
  const rules = await readJson(path.join(root, 'rules/catalog.json'));
  const schema = await readJson(path.join(root, 'schemas/rules.schema.json'));
  validateSchema(rules, schema);
  const profileSchema = await readJson(path.join(root, 'schemas/profile.schema.json'));
  const files = (await readdir(path.join(root, 'profiles'))).filter(f => f.endsWith('.json')).sort();
  const profiles = await Promise.all(files.map(async f => validateSchema(await readJson(path.join(root, 'profiles', f)), profileSchema)));
  if (new Set(rules.map(r => r.id)).size !== rules.length) throw new Error('Duplicate rule id');
  if (new Set(profiles.map(p => p.id)).size !== profiles.length) throw new Error('Duplicate profile id');
  const known = new Set(profiles.map(p => p.id));
  for (const rule of rules) {
    if (!CHECKS.includes(rule.check)) throw new Error(`Unknown check: ${rule.check}`);
    for (const profile of rule.profiles) if (!known.has(profile)) throw new Error(`Unknown profile: ${profile}`);
    if (['file', 'community'].includes(rule.check) && !rule.paths?.length) throw new Error(`${rule.id}: paths required`);
    if (rule.check === 'setting' && !rule.fact) throw new Error(`${rule.id}: fact required`);
  }
  return { rules, profiles };
}

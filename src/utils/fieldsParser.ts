import type { SEField } from '../types';

/**
 * Parses a StreamElements FIELDS.json (or FIELDS.txt) file into a typed
 * array of SEField definitions. SE fields are an object where each key
 * is the field's identifier and each value is the field definition:
 *
 * {
 *   "backgroundColor": {
 *     "type": "colorpicker",
 *     "label": "Background Color",
 *     "value": "#ff0000",
 *     "group": "Appearance"
 *   },
 *   ...
 * }
 */
export function parseFields(fieldsJson: string): SEField[] {
  if (!fieldsJson.trim()) return [];
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(fieldsJson);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];

  const fields: SEField[] = [];
  for (const [key, raw] of Object.entries(parsed)) {
    // SE format: each value is an object with { type, label, value, ... }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const def = raw as Record<string, unknown>;
      // Check if it looks like a proper SE field definition
      if ('type' in def || 'value' in def || 'label' in def) {
        fields.push({
          key,
          type: typeof def.type === 'string' ? def.type : 'text',
          label: typeof def.label === 'string' ? def.label : key,
          value: def.value !== undefined ? def.value : '',
          group: typeof def.group === 'string' ? def.group : undefined,
          min: typeof def.min === 'number' ? def.min : undefined,
          max: typeof def.max === 'number' ? def.max : undefined,
          step: typeof def.step === 'number' ? def.step : undefined,
          options: (def.options as SEField['options']) || undefined,
          fileType: typeof def.fileType === 'string' ? def.fileType : undefined,
        });
        continue;
      }
    }
    // Fallback: flat key-value format (not SE standard, but many people use it)
    // Auto-detect type from the value
    const value = raw;
    let autoType = 'text';
    if (typeof value === 'boolean') autoType = 'checkbox';
    else if (typeof value === 'number') autoType = 'number';
    else if (typeof value === 'string') {
      if (value.match(/^#([0-9a-f]{3,8})$/i) || value.match(/^rgba?\(/i)) autoType = 'colorpicker';
      else if (value.match(/^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)/i)) autoType = 'image-input';
      else if (value.match(/^https?:\/\/.+\.(mp4|webm)/i)) autoType = 'video-input';
    }
    fields.push({
      key,
      type: autoType,
      label: key.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').trim(),
      value,
      group: undefined,
    });
  }
  return fields;
}

/**
 * Merges the effective field values: definition defaults + user overrides.
 * Returns a plain { key: value } map suitable for injection into SE mock.
 */
export function buildFieldValues(
  fields: SEField[],
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    values[field.key] = overrides[field.key] !== undefined ? overrides[field.key] : field.value;
  }
  // Also include any override keys that don't exist in field definitions
  for (const [k, v] of Object.entries(overrides)) {
    if (!(k in values)) values[k] = v;
  }
  return values;
}

/**
 * Groups fields by their `group` property, preserving insertion order.
 */
export function groupFields(fields: SEField[]): Array<{ group: string; fields: SEField[] }> {
  const map = new Map<string, SEField[]>();
  const order: string[] = [];
  for (const f of fields) {
    const g = f.group || 'General';
    if (!map.has(g)) {
      map.set(g, []);
      order.push(g);
    }
    map.get(g)!.push(f);
  }
  return order.map(g => ({ group: g, fields: map.get(g)! }));
}

/**
 * Normalize an SE field type to one of a few categories for rendering.
 */
export function normalizeFieldType(type: string): 'color' | 'number' | 'slider' | 'text' | 'textarea' | 'dropdown' | 'checkbox' | 'image' | 'video' | 'sound' | 'font' | 'button' | 'hidden' {
  const t = type.toLowerCase();
  if (t.includes('color')) return 'color';
  if (t === 'number' || t === 'integer') return 'number';
  if (t === 'slider') return 'slider';
  if (t === 'textarea') return 'textarea';
  if (t === 'dropdown' || t === 'select') return 'dropdown';
  if (t === 'checkbox' || t === 'boolean') return 'checkbox';
  if (t === 'image-input' || t === 'image') return 'image';
  if (t === 'video-input' || t === 'video') return 'video';
  if (t === 'sound-input' || t === 'sound' || t === 'audio') return 'sound';
  if (t === 'googlefont' || t === 'font') return 'font';
  if (t === 'button') return 'button';
  if (t === 'hidden') return 'hidden';
  return 'text';
}

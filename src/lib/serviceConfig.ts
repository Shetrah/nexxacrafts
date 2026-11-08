/**
 * Helpers for presenting order-line and quote `configuration` objects using the field labels and
 * order defined in the service catalogue (`src/lib/catalog.ts`).
 */
import { services, type ServiceDefinition, type ServiceField } from '@/lib/catalog';
import { formatMoney, formatNumber, humanize } from '@/lib/format';

/** One displayable configuration value, e.g. `{ key: 'width', label: 'Width', value: '2.4 m' }`. */
export interface ConfigurationEntry {
  key: string;
  label: string;
  value: string;
}

/** Catalogue definition for a service slug. */
export function getService(slug: string | null | undefined): ServiceDefinition | undefined {
  return slug ? services.find((service) => service.slug === slug) : undefined;
}

/** `true` for services priced instantly from configured rates (banner, sticker, mug). */
export function isInstantService(slug: string | null | undefined): boolean {
  return getService(slug)?.pricingMode === 'instant';
}

/**
 * Display name for a service slug. Quote requests may use `'other'` (the "Other / multiple
 * services" option of the quote form); unknown slugs are humanised.
 */
export function serviceLabel(slug: string | null | undefined): string {
  if (!slug) return '';
  if (slug === 'other') return 'Other / multiple services';
  return getService(slug)?.name ?? humanize(slug);
}

/* -------------------------------------------------------------------------------------------------
 * Internals
 * -----------------------------------------------------------------------------------------------*/

interface LabelInfo {
  /** Label without a recognised unit suffix, e.g. `'Width'` for `'Width (metres)'`. */
  base: string;
  /** Unit symbol appended to numeric values, e.g. `'m'`. */
  unit: string | null;
  /** The label ends in `(KES)`: numeric values are formatted as money. */
  isMoney: boolean;
}

const UNIT_SUFFIX = /\s*\(([^)]+)\)\s*$/;

/** Recognised unit suffixes → symbol. Unrecognised parentheticals are left in the label. */
const UNIT_SYMBOLS: Readonly<Record<string, string>> = {
  metres: 'm',
  metre: 'm',
  meters: 'm',
  meter: 'm',
  m: 'm',
  'm²': 'm²',
  sqm: 'm²',
  cm: 'cm',
  mm: 'mm',
  pieces: 'pcs',
  pcs: 'pcs',
  kg: 'kg',
  days: 'days',
};

function parseLabel(label: string): LabelInfo {
  const match = UNIT_SUFFIX.exec(label);
  if (!match) return { base: label, unit: null, isMoney: false };
  const suffix = match[1].trim();
  const base = label.slice(0, match.index).trim() || label;
  if (/^(kes|ksh)$/i.test(suffix)) return { base, unit: null, isMoney: true };
  const unit = UNIT_SYMBOLS[suffix.toLowerCase()];
  return unit ? { base, unit, isMoney: false } : { base: label, unit: null, isMoney: false };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** Finite number from a number or numeric string, otherwise `null`. */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatNumeric(value: number, info: LabelInfo): string {
  if (info.isMoney) return formatMoney(value);
  const text = formatNumber(value, { maxDecimals: 3 });
  return info.unit ? `${text} ${info.unit}` : text;
}

/** Formats a raw configuration value; returns `null` for empty values. */
function formatValue(value: unknown, info: LabelInfo, field?: ServiceField): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? formatNumeric(value, info) : null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return null;
    const numeric = field?.type === 'number' ? toNumber(text) : null;
    return numeric === null ? text : formatNumeric(numeric, info);
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatValue(item, { base: '', unit: null, isMoney: false }))
      .filter((part): part is string => Boolean(part));
    return parts.length ? parts.join(', ') : null;
  }
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return json && json !== '{}' ? json : null;
  }
  return String(value);
}

function describeEntry(key: string, value: unknown, field?: ServiceField): ConfigurationEntry | null {
  const info = parseLabel(field?.label ?? humanize(key));
  const formatted = formatValue(value, info, field);
  if (formatted === null) return null;
  const numeric = typeof value === 'number' || (field?.type === 'number' && toNumber(value) !== null);
  const unitApplied = numeric && (info.unit !== null || info.isMoney);
  return { key, label: unitApplied ? info.base : field?.label ?? humanize(key), value: formatted };
}

/* -------------------------------------------------------------------------------------------------
 * Public API
 * -----------------------------------------------------------------------------------------------*/

/**
 * Readable key/value rows for a configuration, in catalogue field order, followed by any extra keys
 * (humanised). Empty values are skipped; numbers get units inferred from labels such as
 * `'Width (metres)'` → `'2.4 m'` (label becomes `'Width'`) and `'(KES)'` → money; booleans become
 * Yes/No. Ideal input for `SpecList`.
 */
export function describeConfiguration(
  serviceSlug: string | null | undefined,
  configuration: unknown,
): ConfigurationEntry[] {
  const config = asRecord(configuration);
  const fields = getService(serviceSlug)?.fields ?? [];
  const entries: ConfigurationEntry[] = [];
  const seen = new Set<string>();

  for (const field of fields) {
    seen.add(field.name);
    if (!Object.prototype.hasOwnProperty.call(config, field.name)) continue;
    const entry = describeEntry(field.name, config[field.name], field);
    if (entry) entries.push(entry);
  }
  for (const [key, value] of Object.entries(config)) {
    if (seen.has(key)) continue;
    const entry = describeEntry(key, value);
    if (entry) entries.push(entry);
  }
  return entries;
}

/** Longest free value included in a summary. */
const SUMMARY_VALUE_MAX = 40;

/** Option values that say nothing about the job itself; left out of summaries. */
const NON_COMMITTAL = /^(not sure( yet)?|no preference|advise me|other \/ advise me|flexible)$/i;

/**
 * Short one-line summary of a configuration, e.g.
 * `'Premium frontlit banner · 2.4 × 1.2 m · Qty 3'`.
 *
 * Priority: the first chosen option (material, product, process…), then width × height, then
 * quantity, then other short option values in catalogue order. Long free text, budget fields and
 * non-committal answers ("Not sure", "Advise me", "Flexible") are left out.
 */
export function summarizeConfiguration(
  serviceSlug: string | null | undefined,
  configuration: unknown,
  maxParts = 3,
): string {
  const config = asRecord(configuration);
  const service = getService(serviceSlug);
  const fields = service?.fields ?? [];
  const fieldByName = new Map(fields.map((field) => [field.name, field] as const));
  const parts: string[] = [];
  const used = new Set<string>();

  const primary = fields.find(
    (field) => field.type === 'select' && typeof config[field.name] === 'string' && String(config[field.name]).trim(),
  );
  if (primary) {
    parts.push(String(config[primary.name]).trim());
    used.add(primary.name);
  }

  const width = toNumber(config.width);
  const height = toNumber(config.height);
  if (width !== null && height !== null) {
    const unit = parseLabel(fieldByName.get('width')?.label ?? '').unit;
    const size = `${formatNumber(width, { maxDecimals: 3 })} × ${formatNumber(height, { maxDecimals: 3 })}`;
    parts.push(unit ? `${size} ${unit}` : size);
    used.add('width');
    used.add('height');
  }

  const quantity = toNumber(config.quantity);
  if (quantity !== null) {
    parts.push(`Qty ${formatNumber(quantity)}`);
    used.add('quantity');
  }

  for (const entry of describeConfiguration(serviceSlug, config)) {
    if (parts.length >= maxParts) break;
    if (used.has(entry.key) || entry.value.length > SUMMARY_VALUE_MAX) continue;
    const field = fieldByName.get(entry.key);
    if (!field) {
      // Keys the catalogue does not know about (or an unknown service): include short values only.
      if (!service) parts.push(entry.value);
      continue;
    }
    if (field.type === 'select') {
      if (!NON_COMMITTAL.test(entry.value) && !parseLabel(field.label).isMoney) parts.push(entry.value);
    } else if (field.type === 'checkbox' && config[field.name] === true) parts.push(field.label);
    else if (field.type === 'number' && entry.label !== field.label) parts.push(entry.value);
  }

  return parts.slice(0, Math.max(0, maxParts)).join(' · ');
}

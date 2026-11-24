import { supabase } from './supabase';
import type { ServiceField } from './catalog';
export interface PricingRate { service_slug: string; unit_rate: number; setup_fee: number; unit_label: string; active: boolean; }
const KEY = 'nexxacrafts-pricing-rates-v1';
export function getLocalRates(): PricingRate[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as PricingRate[]; } catch { return []; }
}
export async function loadPricingRates(): Promise<PricingRate[]> {
  if (!supabase) return getLocalRates();
  const { data, error } = await supabase.from('pricing_rates').select('service_slug, unit_rate, setup_fee, unit_label, active');
  if (error) throw error;
  return (data || []) as PricingRate[];
}
export async function savePricingRate(rate: PricingRate) {
  if (!supabase) {
    const all = getLocalRates().filter(item => item.service_slug !== rate.service_slug);
    localStorage.setItem(KEY, JSON.stringify([...all, rate]));
    return;
  }
  const { error } = await supabase.from('pricing_rates').upsert(rate, { onConflict: 'service_slug' });
  if (error) throw error;
}
/** Convert dimensions entered in centimetres to square metres. */
export function squareMetresFromCentimetres(widthCm: number, heightCm: number): number {
  return (widthCm / 100) * (heightCm / 100);
}

function isSquareMetreLabel(label: string): boolean {
  return ['m²', 'm2', 'sqm', 'square metre', 'square meter', 'm² (cm input)', 'cm → m²'].includes(label.trim().toLowerCase());
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateEstimate(slug: string, config: Record<string, string | number | boolean>, rates: PricingRate[], fields: ServiceField[] = []): number | null {
  const rate = rates.find(item => item.service_slug === slug && item.active && item.unit_rate > 0);
  const qty = Number(config.quantity ?? 1);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  if (slug === 'photo-mounting') {
    const photoMountRate = rates.find(item => item.service_slug === slug && item.active);
    const size = String(config.mounting_size ?? '');
    const sizeField = fields.find(field => field.name === 'mounting_size');
    const selectedSizePrice = Number(sizeField?.optionPrices?.[size] ?? 0);
    const finish = String(config.mounting_finish ?? '');
    const finishPrice = Number(fields.find(field => field.name === 'mounting_finish')?.optionPrices?.[finish] ?? 0);
    // Photo mounting is priced by its selected size. Never add or fall back to
    // a generic base rate, which could silently misprice a size at checkout.
    if (!photoMountRate || !sizeField?.options?.includes(size) || !Number.isFinite(selectedSizePrice) || selectedSizePrice <= 0) return null;
    return roundCurrency((selectedSizePrice + Math.max(0, finishPrice)) * qty);
  }
  let optionAddOn = 0;
  // Select option prices are service-field add-ons; the database RPC independently
  // recalculates these from the saved service definition before accepting an order.
  for (const field of fields) {
    if (field.type !== 'select') continue;
    const selected = config[field.name];
    if (typeof selected !== 'string') continue;
    const price = Number(field.optionPrices?.[selected] ?? 0);
    if (Number.isFinite(price) && price > 0) optionAddOn += price;
  }
  if (!rate) return optionAddOn > 0 ? roundCurrency(optionAddOn * qty) : null;
  if (slug === 'banner-printing') {
    const width = Number(config.width);
    const height = Number(config.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    const dimensionsAreCentimetres = config.dimension_unit === 'cm' || /cm|centimet/i.test(String(config.width_unit ?? '')) || /cm|centimet/i.test(String(rate.unit_label));
    const area = dimensionsAreCentimetres && isSquareMetreLabel(rate.unit_label) ? squareMetresFromCentimetres(width, height) : width * height;
    return roundCurrency(area * qty * rate.unit_rate + rate.setup_fee + optionAddOn * qty);
  }
  if (slug === 'sticker-printing') {
    const width = Number(config.width);
    const height = Number(config.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    const legacyHundredSquareCmRate = /100\s*cm|centimet/i.test(rate.unit_label) && !isSquareMetreLabel(rate.unit_label);
    const area = legacyHundredSquareCmRate ? (width * height) / 100 : squareMetresFromCentimetres(width, height);
    return roundCurrency(area * qty * rate.unit_rate + rate.setup_fee + optionAddOn * qty);
  }
  return roundCurrency(qty * rate.unit_rate + rate.setup_fee + optionAddOn * qty);
}

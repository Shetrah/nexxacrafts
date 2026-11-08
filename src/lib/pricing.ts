import { supabase } from './supabase';
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
export function calculateEstimate(slug: string, config: Record<string, string | number | boolean>, rates: PricingRate[]): number | null {
  const rate = rates.find(item => item.service_slug === slug && item.active && item.unit_rate > 0);
  if (!rate) return null;
  const qty = Number(config.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  if (slug === 'banner-printing') {
    const width = Number(config.width);
    const height = Number(config.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    return Math.ceil(width * height * qty * rate.unit_rate + rate.setup_fee);
  }
  if (slug === 'sticker-printing') {
    const width = Number(config.width);
    const height = Number(config.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    return Math.ceil((width * height / 100) * qty * rate.unit_rate + rate.setup_fee);
  }
  return Math.ceil(qty * rate.unit_rate + rate.setup_fee);
}

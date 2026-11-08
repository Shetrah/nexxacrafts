/**
 * Company settings (`public.company_settings`): key/value business details and payment-display
 * instructions. Never store secrets here.
 */
import type { CompanySettingRow } from '@/types/db';
import { columnsOf, expectOk, expectRows, getClient } from './client';

type SettingValueRow = Pick<CompanySettingRow, 'setting_key' | 'setting_value'>;

const SETTING_VALUE_COLUMNS = columnsOf<SettingValueRow>()('setting_key, setting_value');

/**
 * Form defaults used by the staff portal before any settings are saved. Merge with the loaded
 * values: `{ ...COMPANY_SETTING_DEFAULTS, ...(await loadCompanySettings()) }`.
 */
export const COMPANY_SETTING_DEFAULTS: Readonly<Record<string, string>> = {
  business_name: 'nexxacrafts',
  tagline: 'Create. Design. Print. Build.',
  public_email: 'info@nexacraft.co.ke',
  phone: '+254 795 333 004',
  location: 'Siaya, Kenya',
  website: '',
  currency: 'KES',
  quote_validity_days: '14',
  mpesa_instructions: '',
  bank_instructions: '',
  payment_notes: 'Payment is requested after the final quotation is approved.',
};

/**
 * Saved settings as `key → string` (only keys that exist in the table). JSON values that are not
 * strings are converted with `String()`, exactly as the staff portal does.
 *
 * Access (RLS): super_admin and admin only — other users (and the public site) receive `{}`.
 */
export async function loadCompanySettings(): Promise<Record<string, string>> {
  const client = getClient();
  const response = await client.from('company_settings').select(SETTING_VALUE_COLUMNS);
  const values: Record<string, string> = {};
  for (const row of expectRows<SettingValueRow>(response)) {
    const value = row.setting_value;
    values[row.setting_key] = typeof value === 'string' ? value : String(value ?? '');
  }
  return values;
}

/** Public-safe settings exposed by the database allowlist RPC. */
export async function loadPublicCompanySettings(): Promise<Record<string, string>> {
  const client = getClient();
  const response = await client.rpc('get_public_company_settings');
  if (response.error) throw response.error;
  const values: Record<string, string> = {};
  for (const row of (response.data ?? []) as Array<{ setting_key: string; setting_value: unknown }>) {
    const value = row.setting_value;
    values[row.setting_key] = typeof value === 'string' ? value : String(value ?? '');
  }
  return values;
}

/**
 * Saves settings with the same upsert as the staff portal: one row per key
 * `{ setting_key, setting_value, updated_by }`, conflict target `setting_key`.
 *
 * Access (RLS): super_admin, admin.
 */
export async function saveCompanySettings(values: Record<string, string>, userId?: string): Promise<void> {
  const client = getClient();
  const rows = Object.entries(values).map(([setting_key, setting_value]) => ({
    setting_key,
    setting_value,
    updated_by: userId || null,
  }));
  if (rows.length === 0) return;
  const response = await client.from('company_settings').upsert(rows, { onConflict: 'setting_key' });
  expectOk(response);
}

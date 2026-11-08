/**
 * User profiles (`public.profiles`). Profiles are created by a database trigger when a user signs
 * up; there is no email column (emails live in `auth.users` and are not readable from the browser).
 */
import { ALL_ROLES } from '@/lib/roles';
import type { AppRole, ProfileRow } from '@/types/db';
import {
  cleanText,
  columnsOf,
  expectMaybeRow,
  expectRows,
  expectUpdatedRow,
  getClient,
  isEmptyPayload,
} from './client';

const PROFILE_COLUMNS = columnsOf<ProfileRow>()('id, full_name, phone, company, role, created_at, updated_at');

/**
 * Every staff profile (role other than `customer`), sorted by name.
 *
 * Access (RLS): profiles are readable by super_admin, admin, sales, finance and production_manager.
 * Every other role receives only their own profile.
 */
export async function listStaffProfiles(): Promise<ProfileRow[]> {
  const client = getClient();
  const response = await client
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .neq('role', 'customer')
    .order('full_name', { ascending: true, nullsFirst: false })
    .limit(1000);
  return expectRows<ProfileRow>(response);
}

export interface ListCustomerProfilesOptions {
  /** Maximum number of rows. Default 200. */
  limit?: number;
}

/**
 * Customer profiles, newest first.
 *
 * Access (RLS): super_admin, admin, sales, finance, production_manager.
 */
export async function listCustomerProfiles(options: ListCustomerProfilesOptions = {}): Promise<ProfileRow[]> {
  const client = getClient();
  const { limit = 200 } = options;
  const response = await client
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .limit(limit);
  return expectRows<ProfileRow>(response);
}

/**
 * A single profile, or `null` when missing or not visible.
 *
 * Access (RLS): your own profile; any profile for super_admin, admin, sales, finance,
 * production_manager.
 */
export async function getProfile(id: string): Promise<ProfileRow | null> {
  const client = getClient();
  const response = await client.from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle();
  return expectMaybeRow<ProfileRow>(response);
}

/** Contact details a user may change on their own profile. Blank values are stored as `null`. */
export interface MyProfilePatch {
  full_name?: string | null;
  phone?: string | null;
  company?: string | null;
}

/**
 * Updates the signed-in user's contact details (never the role) and returns the updated profile.
 * Call `refreshProfile()` from `useAuth()` afterwards so the session profile is current.
 *
 * Access (RLS): the profile owner (and super_admin).
 */
export async function updateMyProfile(userId: string, patch: MyProfilePatch): Promise<ProfileRow> {
  const client = getClient();
  const payload: Partial<Pick<ProfileRow, 'full_name' | 'phone' | 'company'>> = {};
  if (patch.full_name !== undefined) payload.full_name = cleanText(patch.full_name);
  if (patch.phone !== undefined) payload.phone = cleanText(patch.phone);
  if (patch.company !== undefined) payload.company = cleanText(patch.company);

  if (isEmptyPayload(payload)) {
    const current = await getProfile(userId);
    if (!current) throw new Error('Your profile could not be found.');
    return current;
  }
  const response = await client.from('profiles').update(payload).eq('id', userId).select(PROFILE_COLUMNS);
  return expectUpdatedRow<ProfileRow>(response);
}

/**
 * Changes a user's role and returns the updated profile. Show this only to super admins: the
 * database trigger rejects role changes by anyone else ("Only a super administrator can change
 * staff roles"), and RLS blocks editing other people's profiles.
 *
 * Access (RLS + trigger): super_admin only.
 */
export async function updateProfileRole(id: string, role: AppRole): Promise<ProfileRow> {
  const client = getClient();
  if (!ALL_ROLES.includes(role)) throw new Error('Choose a valid role.');
  const response = await client.from('profiles').update({ role }).eq('id', id).select(PROFILE_COLUMNS);
  return expectUpdatedRow<ProfileRow>(response);
}

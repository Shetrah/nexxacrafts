/**
 * Role vocabulary and an access map that mirrors the row-level security policies in
 * `supabase/migrations/20261107000100_nexxacrafts_platform.sql`.
 *
 * The database is the real gatekeeper: use {@link can} only to decide what to show, never as the
 * security boundary. Role names must never change from the UI.
 */
import type { AppRole } from '@/context/AuthContext';
import { humanize } from '@/lib/format';
import type { StaffRole } from '@/types/db';

/** Every role in display order (matches the role select in the staff portal; customer last). */
export const ALL_ROLES: readonly AppRole[] = [
  'super_admin',
  'admin',
  'sales',
  'finance',
  'designer',
  'print_operator',
  'laser_operator',
  'developer',
  'production_manager',
  'dispatch',
  'customer',
];

/** Staff roles in display order (all roles except `customer`). */
export const STAFF_ROLES: readonly StaffRole[] = [
  'super_admin',
  'admin',
  'sales',
  'finance',
  'designer',
  'print_operator',
  'laser_operator',
  'developer',
  'production_manager',
  'dispatch',
];

export const ROLE_LABELS: Readonly<Record<AppRole, string>> = {
  super_admin: 'Super admin',
  admin: 'Administrator',
  sales: 'Sales',
  finance: 'Finance',
  designer: 'Designer',
  print_operator: 'Print operator',
  laser_operator: 'Laser operator',
  developer: 'Developer',
  production_manager: 'Production manager',
  dispatch: 'Dispatch',
  customer: 'Customer',
};

export const ROLE_DESCRIPTIONS: Readonly<Record<AppRole, string>> = {
  super_admin:
    'Business owner. Full access to every workspace, and the only role that can change staff roles.',
  admin:
    'Runs the whole workspace: orders, quotations, pricing, production, inventory, finance, projects, ' +
    'staff and settings. Cannot change roles.',
  sales: 'Handles quotation requests, pricing rules and customer orders, and can view payments and invoices.',
  finance:
    'Records expenses, issues invoices, manages payment records and stock, and can view quotations and orders.',
  designer: 'Prepares artwork and proofs, works design production jobs and contributes to creative projects.',
  print_operator: 'Runs banner, large-format and sticker print jobs and records material usage.',
  laser_operator: 'Runs laser cutting and engraving jobs and records material usage.',
  developer: 'Delivers website and software projects, their tasks and software production jobs.',
  production_manager:
    'Plans and tracks work across every department, manages proofs, stock and projects, ' +
    'and moves orders through production.',
  dispatch: 'Prepares completed orders for collection, local delivery or courier, and updates dispatch status.',
  customer: 'Places orders, requests quotations, uploads files and reviews proofs for their own account.',
};

/** Human label for a role, e.g. `'print_operator'` → `'Print operator'`. */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return '';
  return Object.prototype.hasOwnProperty.call(ROLE_LABELS, role) ? ROLE_LABELS[role as AppRole] : humanize(role);
}

/** Type guard: `true` for every role except `customer` (and for no role at all). */
export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return typeof role === 'string' && (STAFF_ROLES as readonly string[]).includes(role);
}

/* -------------------------------------------------------------------------------------------------
 * Access map (mirrors RLS)
 * -----------------------------------------------------------------------------------------------*/

const ALL_STAFF = STAFF_ROLES;

/**
 * Roles granted each capability by the database policies. "Own" rows (a customer's own orders,
 * quotes, proofs, notifications, files) are always available to their owner and are not listed.
 */
export const PERMISSIONS = {
  /** profiles: read every profile (others see only their own). */
  'profiles.readAll': ['super_admin', 'admin', 'sales', 'finance', 'production_manager'],
  /** profiles: edit anyone's profile and change roles (others edit only their own contact details). */
  'profiles.manage': ['super_admin'],
  /** services: manage the catalogue rows (including inactive services). */
  'services.manage': ['super_admin', 'admin'],
  /** pricing_rates: read inactive rates and create/update rates. */
  'pricing.manage': ['super_admin', 'admin', 'sales'],
  /** quote_requests: read every request. */
  'quotes.readAll': ['super_admin', 'admin', 'sales', 'finance'],
  /** quote_requests: update status, amount, notes and assignment. */
  'quotes.update': ['super_admin', 'admin', 'sales'],
  /** orders + order_items: read every order. */
  'orders.readAll': ALL_STAFF,
  /** orders: update status, due date, assignment (and any other column). */
  'orders.update': ['super_admin', 'admin', 'sales', 'finance', 'production_manager', 'dispatch'],
  /** order_items: update lines (confirmed amount, production notes). */
  'orderItems.update': [
    'super_admin',
    'admin',
    'sales',
    'designer',
    'print_operator',
    'laser_operator',
    'developer',
    'production_manager',
  ],
  /** payments: read every payment record. */
  'payments.readAll': ['super_admin', 'admin', 'finance', 'sales'],
  /** payments: update payment records (no role may insert them from the browser). */
  'payments.update': ['super_admin', 'admin', 'finance'],
  /** production_jobs: read and update every job (customers cannot see jobs at all). */
  'production.manage': [
    'super_admin',
    'admin',
    'production_manager',
    'designer',
    'print_operator',
    'laser_operator',
    'developer',
    'dispatch',
  ],
  /** proof_reviews: read every proof, upload new versions and change proof status. */
  'proofs.manage': ['super_admin', 'admin', 'production_manager', 'designer'],
  /** inventory_items: read stock levels. */
  'inventory.read': ['super_admin', 'admin', 'finance', 'production_manager', 'print_operator', 'laser_operator'],
  /** inventory_items: create and edit stock items. */
  'inventory.manage': ['super_admin', 'admin', 'finance', 'production_manager'],
  /** inventory_movements: read and record movements. */
  'inventory.movements': ['super_admin', 'admin', 'finance', 'production_manager', 'print_operator', 'laser_operator'],
  /** expenses: read and record expenses. */
  'expenses.manage': ['super_admin', 'admin', 'finance'],
  /** invoices: read every invoice. */
  'invoices.readAll': ['super_admin', 'admin', 'finance', 'sales'],
  /** invoices: create and update invoices. */
  'invoices.manage': ['super_admin', 'admin', 'finance'],
  /** projects: read and manage every project. */
  'projects.manage': ['super_admin', 'admin', 'developer', 'designer', 'production_manager'],
  /** project_tasks: read and manage tasks (customers cannot see tasks). */
  'tasks.manage': ['super_admin', 'admin', 'developer', 'designer', 'production_manager'],
  /** company_settings: read and save settings. */
  'settings.manage': ['super_admin', 'admin'],
  /** audit_logs: read the audit trail. */
  'audit.read': ['super_admin', 'admin'],
  /** storage customer-files: read (sign URLs for) files in any user's folder. Finance is excluded. */
  'files.readAll': [
    'super_admin',
    'admin',
    'sales',
    'designer',
    'print_operator',
    'laser_operator',
    'developer',
    'production_manager',
    'dispatch',
  ],
  /** storage customer-files: update or delete files in any user's folder. */
  'files.manageAll': ['super_admin', 'admin'],
} as const satisfies Record<string, readonly AppRole[]>;

export type Permission = keyof typeof PERMISSIONS;

/**
 * `true` when the role is granted the capability by the database policies.
 *
 * @example can(profile?.role, 'quotes.update') && <Button>Save quotation</Button>
 */
export function can(role: AppRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const allowed: readonly AppRole[] = PERMISSIONS[permission];
  return allowed.includes(role);
}

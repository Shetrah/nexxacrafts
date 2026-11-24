import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardList,
  Code2,
  CreditCard,
  Factory,
  FileText,
  FolderKanban,
  Gauge,
  Headset,
  Images,
  LayoutDashboard,
  Palette,
  Printer,
  Receipt,
  ScanLine,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import type { AppRole } from '@/context/AuthContext';

/**
 * Staff-portal navigation and access configuration — the single source of truth for which staff
 * roles can open which module. Row Level Security in Supabase remains the real security boundary;
 * this list only decides what the interface offers.
 *
 * One administrator role has full workspace access; department roles remain scoped to their work:
 *   orders     admin, sales, production_manager, dispatch
 *   quotes     admin, sales, finance
 *   pricing    admin, sales
 *   production admin, production_manager, print_operator, laser_operator, designer, developer
 *   inventory  admin, production_manager, print_operator, laser_operator, finance
 *   finance    admin, finance            (now: finance desk, invoices, payments, expenses)
 *   projects   admin, developer, designer, production_manager
 *   staff      admin
 *   settings   admin
 * New modules use role lists that match what the RLS policies allow each role to read.
 */

export type StaffRole = Exclude<AppRole, 'customer'>;

export const STAFF_ROLE_LIST: StaffRole[] = [
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

export type AdminModuleId =
  | 'dashboard'
  | 'notifications'
  | 'sales'
  | 'operations'
  | 'design'
  | 'printing'
  | 'laser'
  | 'software'
  | 'dispatch'
  | 'finance'
  | 'orders'
  | 'quotes'
  | 'customers'
  | 'services'
  | 'portfolio'
  | 'pricing'
  | 'production'
  | 'inventory'
  | 'procurement'
  | 'projects'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'reports'
  | 'staff'
  | 'roles'
  | 'settings';

export type AdminNavGroup = 'Overview' | 'Workspaces' | 'Commerce' | 'Operations' | 'Finance' | 'Organisation';

export interface AdminNavItem {
  id: AdminModuleId;
  label: string;
  /** Absolute path, e.g. "/admin/orders". The dashboard is "/admin". */
  path: string;
  icon: LucideIcon;
  group: AdminNavGroup;
  roles: readonly StaffRole[];
  /** One-line description used in page headers, the command palette and the roles matrix. */
  description: string;
}

const ALL_STAFF: readonly StaffRole[] = STAFF_ROLE_LIST;

export const ADMIN_NAV: readonly AdminNavItem[] = [
  // Overview
  { id: 'dashboard', label: 'Dashboard', path: '/admin', icon: LayoutDashboard, group: 'Overview', roles: [ 'admin'], description: 'Company-wide performance, pipeline and activity.' },
  { id: 'notifications', label: 'Notifications', path: '/admin/notifications', icon: Bell, group: 'Overview', roles: ALL_STAFF, description: 'Your notifications and operational alerts.' },

  // Department workspaces (each staff role lands on its own workspace)
  { id: 'sales', label: 'Sales desk', path: '/admin/sales', icon: Headset, group: 'Workspaces', roles: [ 'admin', 'sales'], description: 'New enquiries, quotations to price and orders to review.' },
  { id: 'operations', label: 'Operations', path: '/admin/operations', icon: Gauge, group: 'Workspaces', roles: [ 'admin', 'production_manager'], description: 'Cross-department production visibility and bottlenecks.' },
  { id: 'design', label: 'Design studio', path: '/admin/design', icon: Palette, group: 'Workspaces', roles: [ 'admin', 'production_manager', 'designer'], description: 'Design jobs, briefs, artwork and customer proofs.' },
  { id: 'printing', label: 'Print floor', path: '/admin/printing', icon: Printer, group: 'Workspaces', roles: [ 'admin', 'production_manager', 'print_operator'], description: 'Banner, sticker, apparel and mug-branding jobs with materials and artwork.' },
  { id: 'laser', label: 'Laser workshop', path: '/admin/laser', icon: ScanLine, group: 'Workspaces', roles: [ 'admin', 'production_manager', 'laser_operator'], description: 'Laser cutting and engraving jobs with technical files and specs.' },
  { id: 'software', label: 'Software studio', path: '/admin/software', icon: Code2, group: 'Workspaces', roles: [ 'admin', 'production_manager', 'developer'], description: 'Software projects, briefs, tasks and progress.' },
  { id: 'dispatch', label: 'Dispatch', path: '/admin/dispatch', icon: Truck, group: 'Workspaces', roles: [ 'admin', 'production_manager', 'dispatch'], description: 'Orders ready to collect, deliver or courier.' },
  { id: 'finance', label: 'Finance desk', path: '/admin/finance', icon: Wallet, group: 'Workspaces', roles: [ 'admin', 'finance'], description: 'Outstanding balances, receipts, invoices and spending.' },

  // Commerce
  { id: 'orders', label: 'Orders', path: '/admin/orders', icon: ShoppingBag, group: 'Commerce', roles: [ 'admin', 'sales', 'production_manager', 'dispatch'], description: 'Review customer orders and move them through the workflow.' },
  { id: 'quotes', label: 'Quotations', path: '/admin/quotes', icon: FileText, group: 'Commerce', roles: [ 'admin', 'sales', 'finance'], description: 'Review, price and progress customer quote requests.' },
  { id: 'customers', label: 'Customers', path: '/admin/customers', icon: Users, group: 'Commerce', roles: [ 'admin', 'sales', 'finance'], description: 'Customer accounts with their orders and quotations.' },
  { id: 'services', label: 'Products & services', path: '/admin/services', icon: Store, group: 'Commerce', roles: [ 'admin', 'sales'], description: 'The service catalogue, availability and pricing status.' },
  { id: 'portfolio', label: 'Portfolio images', path: '/admin/portfolio', icon: Images, group: 'Commerce', roles: [ 'admin'], description: 'Project covers and website portfolio galleries.' },
  { id: 'pricing', label: 'Pricing rules', path: '/admin/pricing', icon: SlidersHorizontal, group: 'Commerce', roles: [ 'admin', 'sales'], description: 'Unit rates and setup fees used for instant estimates.' },

  // Operations
  { id: 'production', label: 'Production', path: '/admin/production', icon: Factory, group: 'Operations', roles: [ 'admin', 'production_manager', 'print_operator', 'laser_operator', 'designer', 'developer'], description: 'Every department job queue, status and assignment.' },
  { id: 'inventory', label: 'Inventory', path: '/admin/inventory', icon: Boxes, group: 'Operations', roles: [ 'admin', 'production_manager', 'print_operator', 'laser_operator', 'finance'], description: 'Materials, blanks and consumables with reorder levels.' },
  { id: 'procurement', label: 'Procurement', path: '/admin/procurement', icon: ClipboardList, group: 'Operations', roles: [ 'admin', 'finance', 'production_manager'], description: 'Supplier requests, purchase approvals, receipts and supplier payments.' },
  { id: 'projects', label: 'Projects & tasks', path: '/admin/projects', icon: FolderKanban, group: 'Operations', roles: [ 'admin', 'developer', 'designer', 'production_manager'], description: 'Client projects, milestones and team tasks.' },

  // Finance
  { id: 'invoices', label: 'Invoices', path: '/admin/invoices', icon: Receipt, group: 'Finance', roles: [ 'admin', 'finance'], description: 'Draft, issue and track customer invoices.' },
  { id: 'payments', label: 'Payments', path: '/admin/payments', icon: CreditCard, group: 'Finance', roles: [ 'admin', 'finance'], description: 'Payment records by order, method and status.' },
  { id: 'expenses', label: 'Expenses', path: '/admin/expenses', icon: ClipboardList, group: 'Finance', roles: [ 'admin', 'finance'], description: 'Record and review operating costs.' },
  { id: 'reports', label: 'Reports', path: '/admin/reports', icon: BarChart3, group: 'Finance', roles: [ 'admin', 'finance'], description: 'Sales, production and financial analytics.' },

  // Organisation
  { id: 'staff', label: 'Staff', path: '/admin/staff', icon: Users, group: 'Organisation', roles: [ 'admin'], description: 'Team members and their access roles.' },
  { id: 'roles', label: 'Roles & permissions', path: '/admin/roles', icon: ShieldCheck, group: 'Organisation', roles: [ 'admin'], description: 'What each role can see and do.' },
  { id: 'settings', label: 'Settings', path: '/admin/settings', icon: Settings, group: 'Organisation', roles: [ 'admin'], description: 'Company profile, quotation defaults and payment instructions.' },
];

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = ['Overview', 'Workspaces', 'Commerce', 'Operations', 'Finance', 'Organisation'];

export function isStaffRole(role: AppRole | null | undefined): role is StaffRole {
  return Boolean(role && role !== 'customer');
}

export function getNavItem(id: AdminModuleId): AdminNavItem {
  const item = ADMIN_NAV.find((entry) => entry.id === id);
  if (!item) throw new Error(`Unknown admin module: ${id}`);
  return item;
}

export function canAccessModule(role: AppRole | null | undefined, id: AdminModuleId): boolean {
  if (!isStaffRole(role)) return false;
  if (role === 'admin') return true;
  return getNavItem(id).roles.includes(role);
}

/** Navigation entries visible to a role, in display order. */
export function navForRole(role: AppRole | null | undefined): AdminNavItem[] {
  if (!isStaffRole(role)) return [];
  if (role === 'admin') return [...ADMIN_NAV];
  return ADMIN_NAV.filter((item) => item.roles.includes(role));
}

/** Where each role lands when opening /admin. Admins get the company dashboard. */
export const ROLE_HOME: Record<StaffRole, AdminModuleId> = {
  admin: 'dashboard',
  sales: 'sales',
  finance: 'finance',
  production_manager: 'operations',
  designer: 'design',
  print_operator: 'printing',
  laser_operator: 'laser',
  developer: 'software',
  dispatch: 'dispatch',
};

export function homePathForRole(role: StaffRole): string {
  return getNavItem(ROLE_HOME[role]).path;
}

/** Best matching navigation entry for a pathname (longest path prefix wins). */
export function navItemForPath(pathname: string): AdminNavItem | undefined {
  const clean = pathname.replace(/\/+$/, '') || '/admin';
  return [...ADMIN_NAV]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => (item.path === '/admin' ? clean === '/admin' : clean === item.path || clean.startsWith(`${item.path}/`)));
}

/**
 * Deep-link conventions between modules (query parameters opened by the owning module):
 *   /admin/orders?order=<orderId>        opens the order detail drawer
 *   /admin/quotes?quote=<quoteId>        opens the quotation drawer
 *   /admin/customers?customer=<profileId>
 *   /admin/production?job=<jobId>        opens the production job drawer
 *   /admin/projects?project=<projectId>
 *   /admin/invoices?invoice=<invoiceId>  (also ?order=<orderId>&new=1 starts a draft for that order)
 */
export const adminLinks = {
  order: (id: string) => `/admin/orders?order=${encodeURIComponent(id)}`,
  quote: (id: string) => `/admin/quotes?quote=${encodeURIComponent(id)}`,
  customer: (id: string) => `/admin/customers?customer=${encodeURIComponent(id)}`,
  job: (id: string) => `/admin/production?job=${encodeURIComponent(id)}`,
  project: (id: string) => `/admin/projects?project=${encodeURIComponent(id)}`,
  invoice: (id: string) => `/admin/invoices?invoice=${encodeURIComponent(id)}`,
  newInvoiceForOrder: (orderId: string) => `/admin/invoices?order=${encodeURIComponent(orderId)}&new=1`,
};

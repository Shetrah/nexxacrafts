/**
 * Row types for the nexxacrafts Supabase schema.
 *
 * Source of truth: `supabase/migrations/20260915215228_create_contact_inquiries.sql` and
 * `supabase/migrations/20261107000100_nexxacrafts_platform.sql`. Keep these in sync with the SQL —
 * column names, nullability and CHECK constraints are mirrored exactly.
 *
 * Conventions:
 * - `timestamptz` and `date` columns are ISO strings (`date` columns are `YYYY-MM-DD`).
 * - `numeric` columns are returned by PostgREST as JSON numbers.
 * - `jsonb` columns are typed as {@link Json} / {@link JsonObject}.
 */
import type { AppRole } from '@/context/AuthContext';
import type { PricingMode } from '@/lib/catalog';

export type { AppRole, PricingMode };

/* -------------------------------------------------------------------------------------------------
 * JSON helpers
 * -----------------------------------------------------------------------------------------------*/

/** Any value that can be stored in a `jsonb` column. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** A `jsonb` object value, e.g. an order line `configuration`. */
export type JsonObject = { [key: string]: Json | undefined };

/**
 * A text column with suggested values that the database does not constrain. Autocompletes the
 * known literals while still accepting any string read from the database.
 */
export type OpenString<Known extends string> = Known | (string & {});

/* -------------------------------------------------------------------------------------------------
 * Enumerations (CHECK constraints and enums)
 * -----------------------------------------------------------------------------------------------*/

/** Every authenticated staff role (all roles except `customer`). */
export type StaffRole = Exclude<AppRole, 'customer'>;

/** `orders.status` CHECK values. */
export type OrderStatus =
  | 'submitted'
  | 'awaiting_review'
  | 'awaiting_payment'
  | 'artwork_pending'
  | 'awaiting_approval'
  | 'in_production'
  | 'quality_check'
  | 'ready_for_dispatch'
  | 'dispatched'
  | 'completed'
  | 'cancelled';

/** `orders.payment_status` CHECK values (the order-level payment summary). */
export type PaymentStatus = 'unpaid' | 'pending' | 'partially_paid' | 'paid' | 'refunded' | 'failed';

/** `payments.status` CHECK values (an individual payment record). */
export type PaymentRecordStatus = 'pending' | 'initiated' | 'confirmed' | 'failed' | 'refunded' | 'reconciled';

/** `quote_requests.status` CHECK values. */
export type QuoteStatus =
  | 'submitted'
  | 'under_review'
  | 'need_information'
  | 'quoted'
  | 'accepted'
  | 'declined'
  | 'converted';

/** `production_jobs.department` CHECK values. */
export type Department = 'design' | 'printing' | 'mug_branding' | 'laser' | 'software' | 'dispatch';

/** `production_jobs.priority` CHECK values. */
export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Production job statuses used by the staff UI. `production_jobs.status` has no CHECK constraint
 * (default `'queued'`), so rows may contain other values — see {@link ProductionJobRow.status}.
 */
export type JobStatus =
  | 'queued'
  | 'assigned'
  | 'in_progress'
  | 'on_hold'
  | 'quality_check'
  | 'completed'
  | 'cancelled';

/** `proof_reviews.status` CHECK values. */
export type ProofStatus = 'awaiting_customer' | 'approved' | 'revision_requested';

/** `invoices.status` CHECK values. */
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'void';

/** `project_tasks.status` CHECK values. */
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';

/**
 * Suggested project statuses. `projects.status` is free text (default `'planning'`), so the
 * column itself is typed as `string`.
 */
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'review' | 'completed' | 'cancelled';

/** `orders.payment_method` and `payments.method` CHECK values. */
export type PaymentMethod = 'mpesa' | 'bank' | 'card';

/** `orders.delivery_method` CHECK values. */
export type DeliveryMethod = 'collection' | 'local_delivery' | 'courier';

/** `inventory_movements.movement_type` CHECK values. */
export type MovementType = 'receipt' | 'usage' | 'adjustment' | 'return' | 'waste';

/* -------------------------------------------------------------------------------------------------
 * Tables
 * -----------------------------------------------------------------------------------------------*/

/** `public.profiles` — one row per auth user. There is no email column (emails live in auth.users). */
export interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

/** `public.services` — the service catalogue mirrored in the database. */
export interface ServiceRow {
  slug: string;
  name: string;
  category: string;
  description: string;
  pricing_mode: PricingMode;
  /** jsonb, default `[]`. The UI uses the field definitions in `src/lib/catalog.ts`. */
  fields: Json;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** `public.pricing_rates` — one rate per instant-priced service. */
export interface PricingRateRow {
  service_slug: string;
  unit_rate: number;
  setup_fee: number;
  unit_label: string;
  active: boolean;
  updated_by: string | null;
  updated_at: string;
}

/** `public.quote_requests`. */
export interface QuoteRequestRow {
  id: string;
  reference: string;
  customer_id: string | null;
  customer_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  service_slug: string;
  description: string;
  configuration: JsonObject;
  status: QuoteStatus;
  quoted_amount: number | null;
  currency: string;
  assigned_to: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** `public.orders`. */
export interface OrderRow {
  id: string;
  reference: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  payment_method: PaymentMethod;
  delivery_method: DeliveryMethod;
  delivery_address: string | null;
  delivery_instructions: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  customer_notes: string | null;
  assigned_to: string | null;
  due_at: string | null;
  /** `null` when at least one line still needs a quotation. */
  subtotal: number | null;
  discount: number;
  tax: number;
  /** `null` when at least one line still needs a quotation. */
  total: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

/** `public.order_items` — one configured line per ordered service. */
export interface OrderItemRow {
  id: string;
  order_id: string;
  service_slug: string;
  service_name: string;
  configuration: JsonObject;
  quantity: number;
  estimated_amount: number | null;
  confirmed_amount: number | null;
  /** Storage paths in the `customer-files` bucket (or `DEMO FILE — name` references). */
  files: string[];
  production_notes: string | null;
  created_at: string;
}

/** `public.payments` — individual payment records for an order. */
export interface PaymentRow {
  id: string;
  order_id: string;
  method: PaymentMethod;
  /** `null` while the order still awaits a quotation. */
  amount: number | null;
  currency: string;
  status: PaymentRecordStatus;
  provider: string | null;
  provider_reference: string | null;
  transaction_reference: string | null;
  recorded_by: string | null;
  confirmed_at: string | null;
  created_at: string;
}

/** `public.production_jobs` — created automatically for every order line. */
export interface ProductionJobRow {
  id: string;
  order_item_id: string;
  department: Department;
  /** No CHECK constraint in the database: usually a {@link JobStatus}, but any string is possible. */
  status: OpenString<JobStatus>;
  assigned_to: string | null;
  priority: JobPriority;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** `public.proof_reviews` — versioned artwork proofs for an order line. */
export interface ProofReviewRow {
  id: string;
  order_item_id: string;
  version: number;
  file_path: string;
  status: ProofStatus;
  customer_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

/** `public.inventory_items`. */
export interface InventoryItemRow {
  id: string;
  sku: string | null;
  name: string;
  category: string | null;
  unit: string;
  quantity_on_hand: number;
  reorder_level: number;
  average_cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** `public.inventory_movements`. */
export interface InventoryMovementRow {
  id: string;
  inventory_item_id: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost: number | null;
  order_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

/** `public.expenses`. */
export interface ExpenseRow {
  id: string;
  /** `YYYY-MM-DD`. */
  expense_date: string;
  category: string;
  description: string;
  /** Always greater than zero (CHECK constraint). */
  amount: number;
  payment_account: string | null;
  reference: string | null;
  attachment_path: string | null;
  recorded_by: string | null;
  created_at: string;
}

/** `public.invoices`. */
export interface InvoiceRow {
  id: string;
  order_id: string | null;
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  status: InvoiceStatus;
  /** `YYYY-MM-DD`. */
  due_date: string | null;
  issued_at: string | null;
  created_by: string | null;
  created_at: string;
}

/** `public.projects`. */
export interface ProjectRow {
  id: string;
  order_id: string | null;
  customer_id: string | null;
  name: string;
  project_type: string;
  description: string | null;
  /** Free text (default `'planning'`); see {@link ProjectStatus} for the suggested values. */
  status: string;
  /** `YYYY-MM-DD`. */
  start_date: string | null;
  /** `YYYY-MM-DD`. */
  due_date: string | null;
  budget: number | null;
  created_at: string;
  updated_at: string;
}

/** `public.project_tasks`. */
export interface ProjectTaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

/** `public.company_settings` — key/value business settings. */
export interface CompanySettingRow {
  setting_key: string;
  /** jsonb, default `""`. Values written by the staff portal are JSON strings. */
  setting_value: Json;
  updated_by: string | null;
  updated_at: string;
}

/** `public.notifications`. */
export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** `public.audit_logs`. */
export interface AuditLogRow {
  /** `bigint` identity. */
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  /** jsonb, default `{}`. */
  details: Json;
  created_at: string;
}

/** `public.contact_inquiries` — public contact form submissions (insert-only from the browser). */
export interface ContactInquiryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  service: string;
  message: string;
  /** Has a default but no NOT NULL constraint. */
  created_at: string | null;
}

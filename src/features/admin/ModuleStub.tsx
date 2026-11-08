import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Check, HelpCircle, Loader2, Plus, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getNavItem, type AdminModuleId } from './navigation';
import { useAdmin } from './AdminContext';
import { supabase } from '@/lib/supabase';
import { formatDateTime, humanize } from '@/lib/format';
import { createExpense } from '@/lib/api/expenses';
import { createInventoryItem } from '@/lib/api/inventory';
import { createInvoice } from '@/lib/api/invoices';
import { createProject } from '@/lib/api/projects';
import { savePricingRate } from '@/lib/pricing';
import { saveCompanySettings } from '@/lib/api/settings';
import { submitQuote, updateOrderStatus, saveQuoteAmount, updateQuoteStatus } from '@/lib/platform';
import { updateJob } from '@/lib/api/production';
import { ORDER_STATUSES, QUOTE_STATUSES, JOB_STATUSES } from '@/lib/status';
import type { JobStatus } from '@/types/db';
import { services } from '@/lib/catalog';
import { COMPANY_SETTING_DEFAULTS } from '@/lib/api/settings';

type WorkspaceRecord = Record<string, unknown>;
const DATASETS: Partial<Record<AdminModuleId, { table: string; fields: string; dateField?: string }>> = {
  dashboard: { table: 'orders', fields: 'id,reference,customer_name,status,payment_status,created_at', dateField: 'created_at' },
  sales: { table: 'quote_requests', fields: 'id,reference,customer_name,service_slug,status,created_at', dateField: 'created_at' },
  operations: { table: 'production_jobs', fields: 'id,department,status,priority,due_at,created_at,started_at,completed_at', dateField: 'created_at' },
  software: { table: 'projects', fields: 'name,project_type,status,due_date,created_at', dateField: 'created_at' },
  dispatch: { table: 'orders', fields: 'reference,customer_name,delivery_method,status,created_at', dateField: 'created_at' },
  finance: { table: 'payments', fields: 'method,amount,currency,status,created_at', dateField: 'created_at' },
  orders: { table: 'orders', fields: 'id,reference,customer_name,status,payment_status,created_at', dateField: 'created_at' },
  quotes: { table: 'quote_requests', fields: 'id,reference,customer_name,service_slug,status,quoted_amount,currency,created_at', dateField: 'created_at' },
  customers: { table: 'profiles', fields: 'full_name,company,phone,role,created_at', dateField: 'created_at' },
  services: { table: 'services', fields: 'name,category,pricing_mode,is_active,updated_at', dateField: 'updated_at' },
  pricing: { table: 'pricing_rates', fields: 'service_slug,unit_rate,unit_label,setup_fee,active,updated_at', dateField: 'updated_at' },
  production: { table: 'production_jobs', fields: 'id,department,status,priority,due_at,created_at,started_at,completed_at', dateField: 'created_at' },
  inventory: { table: 'inventory_items', fields: 'sku,name,category,quantity_on_hand,unit,reorder_level', dateField: 'updated_at' },
  projects: { table: 'projects', fields: 'name,project_type,status,due_date,created_at', dateField: 'created_at' },
  invoices: { table: 'invoices', fields: 'invoice_number,customer_name,total,amount_paid,status,due_date', dateField: 'created_at' },
  payments: { table: 'payments', fields: 'method,amount,currency,status,created_at', dateField: 'created_at' },
  expenses: { table: 'expenses', fields: 'expense_date,category,description,amount,reference', dateField: 'expense_date' },
  reports: { table: 'orders', fields: 'reference,status,payment_status,total,created_at', dateField: 'created_at' },
  staff: { table: 'profiles', fields: 'full_name,company,phone,role,created_at', dateField: 'created_at' },
  roles: { table: 'profiles', fields: 'full_name,role,updated_at', dateField: 'updated_at' },
  settings: { table: 'company_settings', fields: 'setting_key,setting_value,updated_at', dateField: 'updated_at' },
  notifications: { table: 'notifications', fields: 'title,message,read_at,created_at', dateField: 'created_at' },
  design: { table: 'production_jobs', fields: 'id,status,priority,due_at,created_at,started_at,completed_at', dateField: 'created_at' },
  printing: { table: 'production_jobs', fields: 'id,status,priority,due_at,created_at,started_at,completed_at', dateField: 'created_at' },
  laser: { table: 'production_jobs', fields: 'id,status,priority,due_at,created_at,started_at,completed_at', dateField: 'created_at' },
};

type EntryField = { name: string; label: string; type?: 'text' | 'email' | 'number' | 'date' | 'textarea' | 'select'; required?: boolean; options?: string[]; min?: string; step?: string };
const ENTRY_FORMS: Partial<Record<AdminModuleId, { title: string; fields: EntryField[] }>> = {
  inventory: { title: 'Add stock item', fields: [
    { name: 'name', label: 'Item name', required: true }, { name: 'sku', label: 'SKU' }, { name: 'category', label: 'Category' }, { name: 'unit', label: 'Unit', required: true },
    { name: 'quantity_on_hand', label: 'Opening quantity', type: 'number', min: '0', step: '0.001' }, { name: 'reorder_level', label: 'Reorder level', type: 'number', min: '0', step: '0.001' }, { name: 'average_cost', label: 'Average unit cost (KES)', type: 'number', min: '0', step: '0.01' },
  ] },
  expenses: { title: 'Record an expense', fields: [
    { name: 'expense_date', label: 'Expense date', type: 'date' }, { name: 'category', label: 'Category', required: true, options: ['Production materials','Transport & delivery','Utilities','Rent','Salaries & wages','Repairs & maintenance','Marketing','Software & subscriptions','Office supplies','Other'] },
    { name: 'description', label: 'Description', required: true }, { name: 'amount', label: 'Amount (KES)', type: 'number', min: '0.01', step: '0.01', required: true }, { name: 'payment_account', label: 'Payment account' }, { name: 'reference', label: 'Reference' },
  ] },
  projects: { title: 'Create a project', fields: [
    { name: 'name', label: 'Project name', required: true }, { name: 'project_type', label: 'Project type', required: true, options: ['software','graphic_design','branding','fabrication','other'] }, { name: 'description', label: 'Project brief', type: 'textarea' },
    { name: 'due_date', label: 'Due date', type: 'date' }, { name: 'budget', label: 'Budget (KES)', type: 'number', min: '0', step: '0.01' },
  ] },
  invoices: { title: 'Create a draft invoice', fields: [
    { name: 'customer_name', label: 'Customer name', required: true }, { name: 'customer_email', label: 'Customer email', type: 'email' }, { name: 'subtotal', label: 'Subtotal (KES)', type: 'number', min: '0', step: '0.01', required: true },
    { name: 'tax', label: 'Tax (KES)', type: 'number', min: '0', step: '0.01', required: true }, { name: 'total', label: 'Total (KES)', type: 'number', min: '0', step: '0.01', required: true }, { name: 'due_date', label: 'Due date', type: 'date' },
  ] },
  pricing: { title: 'Save a pricing rate', fields: [
    { name: 'service_slug', label: 'Service', type: 'select', required: true, options: services.map((service) => service.slug) }, { name: 'unit_rate', label: 'Rate per unit (KES)', type: 'number', min: '0', step: '0.01', required: true },
    { name: 'setup_fee', label: 'Setup fee (KES)', type: 'number', min: '0', step: '0.01' }, { name: 'unit_label', label: 'Rate unit label', required: true }, { name: 'active', label: 'Active rate', type: 'select', options: ['true','false'] },
  ] },
  sales: { title: 'Create a quote request', fields: [
    { name: 'name', label: 'Customer name', required: true }, { name: 'email', label: 'Customer email', type: 'email', required: true }, { name: 'phone', label: 'Phone number' },
    { name: 'serviceSlug', label: 'Service', type: 'select', required: true, options: services.map((service) => service.slug) }, { name: 'description', label: 'Customer brief', type: 'textarea', required: true },
  ] },
  settings: { title: 'Update company settings', fields: Object.keys(COMPANY_SETTING_DEFAULTS).map((name) => ({ name, label: humanize(name) })) },
};

const WRITE_ROLES: Partial<Record<AdminModuleId, readonly string[]>> = {
  inventory: ['super_admin','admin','finance','production_manager'], expenses: ['super_admin','admin','finance'],
  projects: ['super_admin','admin','developer','designer','production_manager'], invoices: ['super_admin','admin','finance'],
  pricing: ['super_admin','admin','sales'], sales: ['super_admin','admin','sales'], settings: ['super_admin','admin'],
};
const WORKFLOW_NOTES: Partial<Record<AdminModuleId,string>> = {
  orders: 'Customer orders are created through checkout, which validates the customer session, line items and pricing. Update an order’s status from its record below.',
  payments: 'Payment records are created by the order flow and verified provider callbacks. Do not enter or mark receipts as paid manually from this screen.',
  production: 'Production jobs are created automatically for order lines. Update the job status below; new work starts from an order.',
  operations: 'Production jobs are created automatically for order lines. Update the job status below; new work starts from an order.',
  design: 'Design jobs are created automatically from customer orders. Update the job status below; new work starts from an order.',
  printing: 'Print jobs are created automatically from customer orders. Update the job status below; new work starts from an order.',
  laser: 'Laser jobs are created automatically from customer orders. Update the job status below; new work starts from an order.',
};

function displayValue(value: unknown, field: string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive';
  if (typeof value === 'number') return field === 'amount' || field === 'total' || field === 'amount_paid' || field === 'unit_rate' || field === 'setup_fee' ? `KES ${value.toLocaleString('en-KE')}` : value.toLocaleString('en-KE');
  if (field.endsWith('_at') || field.endsWith('_date')) return formatDateTime(String(value));
  return humanize(String(value));
}

function statusTone(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'border-success-200 bg-success-50 text-success-800' : 'border-danger-200 bg-danger-50 text-danger-800';
  const status = String(value ?? '').toLowerCase();
  if (['completed', 'paid', 'approved', 'active', 'confirmed', 'reconciled'].includes(status)) return 'border-success-200 bg-success-50 text-success-800';
  if (['cancelled', 'failed', 'refunded', 'void', 'inactive'].includes(status)) return 'border-danger-200 bg-danger-50 text-danger-800';
  if (['awaiting_review', 'awaiting_payment', 'pending', 'on_hold', 'need_information', 'partially_paid'].includes(status)) return 'border-warning-200 bg-warning-50 text-warning-800';
  return 'border-brand-100 bg-brand-50 text-brand-800';
}

/** Role-filtered workspace with validated entry forms and actions backed by the existing API. */
export default function ModuleStub({ module }: { module: AdminModuleId }) {
  const item = getNavItem(module);
  const { nav, user, role, refreshKey, refresh } = useAdmin();
  const related = nav.filter((entry) => entry.id !== module && entry.group === item.group).slice(0, 4);
  const dataset = DATASETS[module];
  const [records, setRecords] = useState<WorkspaceRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(dataset && supabase));
  const [error, setError] = useState('');
  const [entryOpen, setEntryOpen] = useState(false);
  const [entry, setEntry] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState('');
  const canCreate = Boolean(ENTRY_FORMS[module] && WRITE_ROLES[module]?.includes(role));
  const canUpdate = (module === 'orders' && ['super_admin','admin','sales','finance','production_manager','dispatch'].includes(role))
    || (module === 'quotes' && ['super_admin','admin','sales'].includes(role))
    || (['production','operations','design','printing','laser'].includes(module) && ['super_admin','admin','production_manager','designer','print_operator','laser_operator','developer','dispatch'].includes(role));

  useEffect(() => {
    let active = true;
    if (!dataset || !supabase) { setLoading(false); return () => { active = false; }; }
    const client = supabase;
    setLoading(true); setError('');
    const loadRecords = async () => {
      try {
        const { data, error: queryError } = await client.from(dataset.table).select(dataset.fields).order(dataset.dateField || 'created_at', { ascending: false }).limit(25);
        if (!active) return;
        if (queryError) setError(queryError.message);
        else setRecords((data ?? []) as unknown as WorkspaceRecord[]);
      } catch (queryError) {
        if (active) setError(queryError instanceof Error ? queryError.message : 'Could not load records.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadRecords();
    return () => { active = false; };
  }, [dataset, refreshKey]);

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setSaveError(''); setNotice('');
    try {
      switch (module) {
        case 'inventory': await createInventoryItem({ name: entry.name ?? '', sku: entry.sku, category: entry.category, unit: entry.unit, quantity_on_hand: entry.quantity_on_hand || 0, reorder_level: entry.reorder_level || 0, average_cost: entry.average_cost || 0 }); break;
        case 'expenses': await createExpense({ expense_date: entry.expense_date, category: entry.category ?? '', description: entry.description ?? '', amount: entry.amount ?? '', payment_account: entry.payment_account, reference: entry.reference }); break;
        case 'projects': await createProject({ name: entry.name ?? '', project_type: entry.project_type, description: entry.description, due_date: entry.due_date, budget: entry.budget }); break;
        case 'invoices': await createInvoice({ customer_name: entry.customer_name ?? '', customer_email: entry.customer_email, subtotal: Number(entry.subtotal), tax: Number(entry.tax), total: Number(entry.total), due_date: entry.due_date, created_by: user.id }); break;
        case 'pricing': await savePricingRate({ service_slug: entry.service_slug ?? '', unit_rate: Number(entry.unit_rate), setup_fee: Number(entry.setup_fee || 0), unit_label: entry.unit_label || 'unit', active: entry.active === 'true' }); break;
        case 'sales': await submitQuote({ name: entry.name ?? '', email: entry.email ?? '', phone: entry.phone || '', serviceSlug: entry.serviceSlug ?? '', description: entry.description ?? '', configuration: {} }); break;
        case 'settings': await saveCompanySettings(Object.fromEntries((ENTRY_FORMS.settings?.fields ?? []).map((field) => [field.name, entry[field.name] ?? ''])), user.id); break;
        default: return;
      }
      setEntry({}); setEntryOpen(false); setNotice(`${ENTRY_FORMS[module]?.title.replace(/^(Add|Create|Record|Save|Update) /, '') ?? 'Record'} saved successfully.`); refresh();
    } catch (submitError) {
      setSaveError(submitError instanceof Error ? submitError.message : 'The record could not be saved. Check your access and try again.');
    } finally { setSaving(false); }
  }

  async function saveRecordAction(record: WorkspaceRecord, value: string, amount?: string) {
    if (!supabase) return;
    try {
      if (module === 'orders') await updateOrderStatus(String(record.id), value);
      else if (module === 'quotes') {
        if (amount?.trim()) await saveQuoteAmount(String(record.id), Number(amount));
        else await updateQuoteStatus(String(record.id), value);
      } else if (['production','operations','design','printing','laser'].includes(module)) {
        await updateJob({ id: String(record.id), status: String(record.status), started_at: record.started_at as string | null, completed_at: record.completed_at as string | null }, { status: value as JobStatus });
      }
      setNotice('Record updated successfully.'); refresh();
    } catch (updateError) {
      setSaveError(updateError instanceof Error ? updateError.message : 'The update could not be saved. Check your access and try again.');
    }
  }

  const fields = dataset?.fields.split(',').filter((field) => field !== 'id' && field !== 'started_at' && field !== 'completed_at') ?? [];
  const entryForm = ENTRY_FORMS[module];
  return (
    <div className="space-y-6">
      <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-xl border border-line bg-white px-5 py-5 shadow-xs sm:px-6"><div className="absolute inset-y-0 left-0 w-1 bg-brand-600"/><div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.15em] text-brand-700"><span className="size-1.5 rounded-full bg-accent-600"/>{item.group}</div><h2 className="mt-1 text-2xl font-bold tracking-tight">{item.label}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{item.description}</p></div>{canCreate&&<button type="button" disabled={module==='settings'&&loading} onClick={()=>{const savedSettings=Object.fromEntries(records.map((record)=>[String(record.setting_key),String(record.setting_value??'')]));setEntry(module==='settings'?{...COMPANY_SETTING_DEFAULTS,...savedSettings}:{});setEntryOpen(!entryOpen);setSaveError('');setNotice('');}} className="btn-primary"><Plus size={16}/>{entryOpen?'Close form':ENTRY_FORMS[module]?.title}</button>}</div>
      {notice&&<p role="status" className="flex items-center gap-2 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-800"><Check size={16}/>{notice}</p>}
      {saveError&&<p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800">{saveError}</p>}
      {WORKFLOW_NOTES[module]&&<p className="rounded-lg border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm leading-6 text-brand-900">{WORKFLOW_NOTES[module]}</p>}
      {entryOpen&&entryForm&&<form onSubmit={submitEntry} className="rounded-xl border border-brand-100 bg-white p-5 shadow-xs sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><h3 className="font-semibold">{entryForm.title}</h3><p className="mt-1 text-xs text-slate-500">Fields marked required must be completed before saving.</p></div><button type="button" aria-label="Close entry form" onClick={()=>setEntryOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><X size={17}/></button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{entryForm.fields.map((field)=> <label key={field.name} className={`block ${field.type==='textarea'?'sm:col-span-2 lg:col-span-3':''}`}><span className="form-label">{field.label}{field.required?' *':''}</span>{field.type==='textarea'?<textarea className="form-control min-h-24" required={field.required} value={entry[field.name]??''} onChange={(event)=>setEntry((current)=>({...current,[field.name]:event.target.value}))}/>:field.type==='select'?<select className="form-control" required={field.required} value={entry[field.name]??field.options?.[0]??''} onChange={(event)=>setEntry((current)=>({...current,[field.name]:event.target.value}))}>{field.options?.map((option)=><option value={option} key={option}>{field.name==='serviceSlug'||field.name==='service_slug'?services.find((service)=>service.slug===option)?.name??humanize(option):humanize(option)}</option>)}</select>:<input className="form-control" type={field.type??'text'} required={field.required} min={field.min} step={field.step} value={entry[field.name]??''} onChange={(event)=>setEntry((current)=>({...current,[field.name]:event.target.value}))}/>}</label>)}</div><div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={()=>setEntryOpen(false)} className="btn-outline">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>} {saving?'Saving…':'Save entry'}</button></div></form>}
      {dataset && <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line border-t-2 border-t-brand-600 px-5 py-4"><div><h3 className="font-semibold">Recent records</h3><p className="mt-1 text-xs text-slate-500">Latest 25 records visible to your staff role.</p></div><div className="flex items-center gap-3">{!loading&&!error&&supabase&&<span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">{records.length} shown</span>}{loading && <Loader2 size={18} className="animate-spin text-brand-600" aria-label="Loading records"/>}</div></div>
        {!supabase ? <p className="p-5 text-sm text-slate-600">Connect this environment to Supabase to view live workspace data.</p> : error ? <p role="alert" className="m-5 rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-800">Records could not be loaded. Check your access and Supabase connection.</p> : loading ? <div className="p-8 text-center text-sm text-slate-500">Loading current records…</div> : records.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No records are available in this workspace yet.</div> : <div className="divide-y divide-line">{records.map((record,index)=><article key={String(record.id ?? record.reference ?? record.invoice_number ?? index)} className="grid gap-x-5 gap-y-3 px-5 py-4 transition-colors hover:bg-brand-50/30 sm:grid-cols-2 lg:grid-cols-3">{fields.map((field,fieldIndex)=><div key={field} className={fieldIndex===0?'sm:col-span-2 lg:col-span-1':''}><p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{humanize(field)}</p><p className="mt-0.5 break-words text-sm font-medium text-slate-800">{['status','payment_status','active','is_active','role'].includes(field) ? <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${field==='role'?'border-brand-100 bg-brand-50 text-brand-800':statusTone(record[field])}`}>{displayValue(record[field],field)}</span> : displayValue(record[field],field)}</p></div>)}{canUpdate&&typeof record.id==='string'&&<div className="sm:col-span-2 lg:col-span-3"><RecordAction module={module} record={record} onSave={saveRecordAction}/></div>}</article>)}</div>}
      </section>}
      <section className="rounded-xl border border-line bg-white p-5"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><HelpCircle size={18}/></div><div><h3 className="font-semibold">Related workspaces</h3><p className="text-sm text-slate-500">Continue with another area in {item.group.toLowerCase()}.</p></div></div><div className="mt-4 flex flex-wrap gap-2">{related.map((entry)=><Link key={entry.id} to={entry.path} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800">{entry.label}<ArrowRight size={15}/></Link>)}</div></section>
    </div>
  );
}

function RecordAction({ module, record, onSave }: { module: AdminModuleId; record: WorkspaceRecord; onSave: (record: WorkspaceRecord, value: string, amount?: string) => Promise<void> }) {
  const [value,setValue]=useState(String(record.status??''));
  const [amount,setAmount]=useState('');
  const [saving,setSaving]=useState(false);
  const options=module==='orders'?ORDER_STATUSES:module==='quotes'?QUOTE_STATUSES:JOB_STATUSES;
  async function handleSave() { setSaving(true); try { await onSave(record,value,amount); setAmount(''); } finally { setSaving(false); } }
  return <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3"><label className="min-w-44 flex-1"><span className="form-label">Update status</span><select className="form-control" value={value} onChange={(event)=>setValue(event.target.value)}>{options.map((option)=><option key={option} value={option}>{humanize(option)}</option>)}</select></label>{module==='quotes'&&<label className="w-full sm:w-48"><span className="form-label">Quote amount (KES)</span><input className="form-control" type="number" min="0" step="0.01" value={amount} onChange={(event)=>setAmount(event.target.value)} placeholder={record.quoted_amount==null?'Set amount':String(record.quoted_amount)}/></label>}<button type="button" onClick={()=>void handleSave()} disabled={saving} className="btn-outline"><Save size={15}/>{saving?'Saving…':'Save update'}</button></div>;
}

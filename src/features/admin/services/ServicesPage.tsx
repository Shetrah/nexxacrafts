import { useEffect, useState, type FormEvent } from 'react';
import { Check, Edit3, Loader2, Plus, Save, X } from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { useCatalog } from '@/context/CatalogContext';
import { createServiceRecord, listServiceRecords, updateServiceRecord } from '@/lib/api/services';
import type { ServiceRow } from '@/types/db';

type ServiceForm = { slug: string; name: string; category: string; description: string; pricing_mode: 'instant' | 'quote'; fields: string; sort_order: string; is_active: boolean };
const emptyForm = (): ServiceForm => ({ slug: '', name: '', category: '', description: '', pricing_mode: 'quote', fields: '[]', sort_order: '0', is_active: true });
const inputClass = 'form-control';

export default function ServicesPage() {
  const { role } = useAdmin();
  const catalog = useCatalog();
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = async () => { setLoading(true); try { setRows(await listServiceRecords()); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load services.'); } finally { setLoading(false); } };
  useEffect(() => { void reload(); }, []);
  const setField = <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const startEdit = (row: ServiceRow) => {
    setEditing(row.slug); setForm({ slug: row.slug, name: row.name, category: row.category, description: row.description, pricing_mode: row.pricing_mode, fields: JSON.stringify(row.fields ?? [], null, 2), sort_order: String(row.sort_order), is_active: row.is_active });
    setOpen(true); setError(''); setNotice('');
  };
  const startNew = () => { setEditing(null); setForm(emptyForm()); setOpen(true); setError(''); setNotice(''); };
  const close = () => { setOpen(false); setEditing(null); setForm(emptyForm()); setError(''); };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const parsedFields: unknown = JSON.parse(form.fields);
      if (!Array.isArray(parsedFields)) throw new Error('Service fields must be a JSON array.');
      const common = { name: form.name, category: form.category, description: form.description, pricing_mode: form.pricing_mode, fields: parsedFields as ServiceRow['fields'], is_active: form.is_active, sort_order: Number(form.sort_order) || 0 };
      if (editing) await updateServiceRecord(editing, common);
      else await createServiceRecord({ ...common, slug: form.slug });
      await reload(); window.dispatchEvent(new Event('nexxacraft:catalog-updated')); close(); setNotice(editing ? 'Service updated.' : 'Service added to the catalogue.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save service.'); } finally { setSaving(false); }
  };

  const toggleActive = async (row: ServiceRow) => {
    setError(''); setNotice('');
    try { await updateServiceRecord(row.slug, { is_active: !row.is_active }); await reload(); window.dispatchEvent(new Event('nexxacraft:catalog-updated')); setNotice(row.is_active ? 'Service archived.' : 'Service made available.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update service.'); }
  };

  if (role !== 'admin') return <section className="rounded-xl border border-line bg-white p-6 text-sm text-slate-600">Only an administrator can manage the service catalogue.</section>;

  return <section className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-xs sm:p-6">
      <div><p className="text-xs font-bold uppercase tracking-[.15em] text-brand-700">Catalogue</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Products &amp; services</h2><p className="mt-2 max-w-2xl text-sm text-slate-600">Add offerings, update customer details, choose quote or instant pricing, and control what appears on the website.</p></div>
      <button type="button" onClick={open ? close : startNew} className="btn-primary">{open ? <X size={16}/> : <Plus size={16}/>} {open ? 'Close form' : 'Add service'}</button>
    </header>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    {open && <form onSubmit={submit} className="grid gap-4 rounded-xl border border-line bg-white p-5 shadow-xs sm:grid-cols-2 sm:p-6">
      <h3 className="sm:col-span-2 text-lg font-bold">{editing ? `Edit ${form.name}` : 'Add a catalogue item'}</h3>
      {!editing && <label className="text-sm font-semibold">URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(e)=>setField('slug',e.target.value)} placeholder="custom-printing" className={`${inputClass} mt-1`} /><span className="mt-1 block text-xs font-normal text-slate-500">Lowercase letters, numbers and hyphens.</span></label>}
      <label className="text-sm font-semibold">Name<input required value={form.name} onChange={(e)=>setField('name',e.target.value)} className={`${inputClass} mt-1`} /></label>
      <label className="text-sm font-semibold">Category<input required value={form.category} onChange={(e)=>setField('category',e.target.value)} placeholder="Print, Branding, Digital…" className={`${inputClass} mt-1`} /></label>
      <label className="text-sm font-semibold">Pricing approach<select value={form.pricing_mode} onChange={(e)=>setField('pricing_mode',e.target.value as ServiceForm['pricing_mode'])} className={`${inputClass} mt-1`}><option value="quote">Quotation required</option><option value="instant">Instant price from pricing rules</option></select></label>
      <label className="text-sm font-semibold">Display order<input type="number" value={form.sort_order} onChange={(e)=>setField('sort_order',e.target.value)} className={`${inputClass} mt-1`} /></label>
      <label className="sm:col-span-2 text-sm font-semibold">Description<textarea required rows={3} value={form.description} onChange={(e)=>setField('description',e.target.value)} className={`${inputClass} mt-1`} /></label>
      <label className="sm:col-span-2 text-sm font-semibold">Order form fields (JSON)<textarea rows={8} value={form.fields} onChange={(e)=>setField('fields',e.target.value)} className={`${inputClass} mt-1 font-mono text-xs`} /><span className="mt-1 block text-xs font-normal text-slate-500">Example: [{`{"name":"quantity","label":"Quantity","type":"number","required":true}`}]</span></label>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.is_active} onChange={(e)=>setField('is_active',e.target.checked)} /> Available on the website</label>
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-outline" onClick={close}>Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} {editing ? 'Save changes' : 'Add service'}</button></div>
    </form>}
    <div className="grid gap-3">{loading ? <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-6 text-sm text-slate-500"><Loader2 className="animate-spin" size={16}/> Loading catalogue…</div> : rows.map((row) => <article key={row.slug} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-4 shadow-xs sm:p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{row.name}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{row.category}</span><span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{row.pricing_mode === 'instant' ? 'Instant pricing' : 'Quotation'}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.is_active ? 'Live' : 'Archived'}</span></div><p className="mt-1 text-sm text-slate-600">{row.description}</p><p className="mt-1 text-xs text-slate-400">{row.slug} · order {row.sort_order}{catalog.some((service)=>service.slug===row.slug) ? '' : ' · not currently in public catalogue'}</p></div><div className="flex gap-2"><button type="button" onClick={()=>startEdit(row)} className="btn-outline"><Edit3 size={15}/> Edit</button><button type="button" onClick={()=>void toggleActive(row)} className="btn-outline">{row.is_active ? 'Archive' : <><Check size={15}/> Activate</>}</button></div></article>)}</div>
  </section>;
}

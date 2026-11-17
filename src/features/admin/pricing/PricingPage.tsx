import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Edit3, Loader2, Plus, Save, X } from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { useCatalog } from '@/context/CatalogContext';
import { loadPricingRates, savePricingRate, type PricingRate } from '@/lib/pricing';

type RateRecord = PricingRate & { updated_at?: string };
type RateForm = { service_slug: string; unit_rate: string; setup_fee: string; unit_label: string; active: boolean };
const unitForService = (slug: string) => slug === 'banner-printing' || slug === 'sticker-printing' ? 'm²' : 'unit';
const emptyForm = (): RateForm => ({ service_slug: '', unit_rate: '', setup_fee: '0', unit_label: 'unit', active: true });
const money = (value: number) => `KES ${Number(value).toLocaleString('en-KE')}`;

export default function PricingPage() {
  const { role } = useAdmin();
  const services = useCatalog();
  const [rates, setRates] = useState<RateRecord[]>([]);
  const [form, setForm] = useState<RateForm>(emptyForm());
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const editable = role === 'admin' || role === 'sales';

  const reload = async () => { setLoading(true); try { setRates(await loadPricingRates()); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load pricing rules.'); } finally { setLoading(false); } };
  useEffect(() => { void reload(); }, []);
  const serviceNames = useMemo(() => new Map(services.map((service) => [service.slug, service.name])), [services]);
  const setField = <K extends keyof RateForm>(key: K, value: RateForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const startNew = () => { setForm(emptyForm()); setEditing(false); setOpen(true); setError(''); setNotice(''); };
  const startEdit = (rate: PricingRate) => { setForm({ service_slug: rate.service_slug, unit_rate: String(rate.unit_rate), setup_fee: String(rate.setup_fee), unit_label: ['banner-printing','sticker-printing'].includes(rate.service_slug) ? 'm²' : rate.unit_label, active: rate.active }); setEditing(true); setOpen(true); setError(''); setNotice(''); };
  const close = () => { setOpen(false); setEditing(false); setForm(emptyForm()); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      await savePricingRate({ service_slug: form.service_slug, unit_rate: Number(form.unit_rate), setup_fee: Number(form.setup_fee || 0), unit_label: form.unit_label.trim(), active: form.active });
      await reload(); close(); setNotice(editing ? 'Pricing rule updated.' : 'Pricing rule added.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the pricing rule.'); } finally { setSaving(false); }
  };

  return <section className="space-y-6">
    <header className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-xl border border-line bg-white px-5 py-5 shadow-xs sm:px-6"><div className="absolute inset-y-0 left-0 w-1 bg-brand-600"/><div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.15em] text-brand-700"><span className="size-1.5 rounded-full bg-accent-600"/>Commerce</div><h2 className="mt-1 text-2xl font-bold tracking-tight">Pricing rules</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Unit rates and setup fees used for instant estimates.</p></div>{editable&&<button type="button" onClick={open ? close : startNew} className="btn-primary">{open ? <X size={16}/> : <Plus size={16}/>} {open ? 'Close form' : 'Save a pricing rate'}</button>}</header>
    {error&&<p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800">{error}</p>}
    {notice&&<p role="status" className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-800">{notice}</p>}
    {open&&editable&&<form onSubmit={submit} className="grid gap-4 rounded-xl border border-line bg-white p-5 shadow-xs sm:grid-cols-2 sm:p-6">
      <h3 className="sm:col-span-2 text-lg font-bold">{editing ? `Edit ${serviceNames.get(form.service_slug) ?? form.service_slug} rate` : 'Add a pricing rule'}</h3>
      <label className="text-sm font-semibold">Service<select required disabled={editing} value={form.service_slug} onChange={(e)=>{setField('service_slug',e.target.value);if(!editing)setField('unit_label',unitForService(e.target.value));}} className="form-control mt-1"><option value="">Select a service</option>{services.map((service)=><option key={service.slug} value={service.slug}>{service.name}</option>)}</select>{editing&&<span className="mt-1 block text-xs font-normal text-slate-500">Service is fixed for this rate; edit its values below.</span>}</label>
      <label className="text-sm font-semibold">Rate per unit (KES)<input required type="number" min="0" step="0.01" value={form.unit_rate} onChange={(e)=>setField('unit_rate',e.target.value)} className="form-control mt-1" /></label>
      <label className="text-sm font-semibold">Setup fee (KES)<input type="number" min="0" step="0.01" value={form.setup_fee} onChange={(e)=>setField('setup_fee',e.target.value)} className="form-control mt-1" /></label>
      <label className="text-sm font-semibold">Rate unit label<select required value={form.unit_label} onChange={(e)=>setField('unit_label',e.target.value)} className="form-control mt-1">{['m²','100 cm²','piece','unit','hour'].map((unit)=><option key={unit} value={unit}>{unit}</option>)}{!['m²','100 cm²','piece','unit','hour'].includes(form.unit_label)&&<option value={form.unit_label}>{form.unit_label}</option>}</select><span className="mt-1 block text-xs font-normal text-slate-500">For banner and sticker dimensions in centimetres, use m². Conversion is automatic.</span></label>
      <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.active} onChange={(e)=>setField('active',e.target.checked)} /> Active — use this rule for customer estimates and orders</label>
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={close} className="btn-outline">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>} {saving?'Saving…':editing?'Update pricing rule':'Save pricing rule'}</button></div>
    </form>}
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line border-t-2 border-t-brand-600 px-5 py-4"><div><h3 className="font-semibold">Pricing rules</h3><p className="mt-1 text-xs text-slate-500">Active rules are used to calculate instant estimates.</p></div>{loading&&<Loader2 size={18} className="animate-spin text-brand-600" aria-label="Loading pricing rules"/>}</header>
      {!loading&&rates.length===0&&<p className="p-5 text-sm text-slate-600">No pricing rules have been saved yet.</p>}
      {!loading&&rates.length>0&&<div className="divide-y divide-line">{rates.map((rate)=><article key={rate.service_slug} className="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"><div><p className="text-xs uppercase tracking-wide text-slate-500">Service</p><p className="mt-1 font-semibold">{serviceNames.get(rate.service_slug) ?? rate.service_slug}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Rate</p><p className="mt-1 font-semibold">{money(rate.unit_rate)} <span className="font-normal text-slate-600">/ {rate.unit_label}</span></p><p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Setup fee</p><p className="mt-1">{money(rate.setup_fee)}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Status</p><span className={`mt-1 inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${rate.active ? 'border-success-200 bg-success-50 text-success-800' : 'border-danger-200 bg-danger-50 text-danger-800'}`}>{rate.active?'Active':'Inactive'}</span><p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Updated</p><p className="mt-1 text-sm">{rate.updated_at ? new Date(rate.updated_at).toLocaleString('en-KE') : '—'}</p></div>{editable&&<button type="button" onClick={()=>startEdit(rate)} className="btn-outline"><Edit3 size={15}/> Edit</button>}</article>)}</div>}
    </section>
  </section>;
}

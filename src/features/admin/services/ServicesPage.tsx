import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Edit3, ImagePlus, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { useCatalog } from '@/context/CatalogContext';
import { createServiceRecord, listServiceRecords, updateServiceRecord } from '@/lib/api/services';
import { uploadSiteImage } from '@/lib/adminMedia';
import { MagneticDropZone } from '@/components/MagneticDropZone';
import type { ServiceField } from '@/lib/catalog';
import type { ServiceRow } from '@/types/db';

type EditorField = ServiceField & { isNew?: boolean };
type ServiceForm = { slug: string; name: string; category: string; description: string; image_url: string; allow_file_uploads: boolean; pricing_mode: 'instant' | 'quote'; fields: EditorField[]; sort_order: string; is_active: boolean };
const emptyForm = (): ServiceForm => ({ slug: '', name: '', category: '', description: '', image_url: '', allow_file_uploads: false, pricing_mode: 'quote', fields: [], sort_order: '0', is_active: true });
const inputClass = 'form-control';
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const fieldTypes: ServiceField['type'][] = ['text', 'number', 'textarea', 'select', 'checkbox', 'file'];

function readFields(row: ServiceRow): EditorField[] {
  return Array.isArray(row.fields) ? row.fields as unknown as EditorField[] : [];
}

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
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) { setOpen(false); setEditing(null); setForm(emptyForm()); setError(''); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving]);

  const categories = useMemo(() => Array.from(new Set([...rows.map((row) => row.category), ...catalog.map((service) => service.category)].filter(Boolean))).sort((a,b)=>a.localeCompare(b)), [rows,catalog]);
  const setField = <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const patchOrderField = (index: number, patch: Partial<EditorField>) => setForm((current) => ({ ...current, fields: current.fields.map((field, i) => i === index ? { ...field, ...patch } : field) }));
  const startEdit = (row: ServiceRow) => {
    setEditing(row.slug); setForm({ slug: row.slug, name: row.name, category: row.category, description: row.description, image_url: row.image_url ?? catalog.find((service) => service.slug === row.slug)?.image ?? '', allow_file_uploads: row.allow_file_uploads ?? false, pricing_mode: row.pricing_mode, fields: readFields(row), sort_order: String(row.sort_order), is_active: row.is_active });
    setOpen(true); setError(''); setNotice('');
  };
  const startNew = () => { setEditing(null); setForm({ ...emptyForm(), category: categories[0] ?? '' }); setOpen(true); setError(''); setNotice(''); };
  const close = () => { setOpen(false); setEditing(null); setForm(emptyForm()); setError(''); };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const normalizedFields = form.fields.map(({ isNew: _isNew, ...field }, index) => ({ ...field, name: field.name || slugify(field.label) || `field_${index + 1}` })).filter((field) => field.label.trim());
      const names = normalizedFields.map((field) => field.name);
      if (new Set(names).size !== names.length) throw new Error('Each order form question needs a unique label.');
      const common = { name: form.name, category: form.category, description: form.description, image_url: form.image_url.trim() || null, allow_file_uploads: form.allow_file_uploads, pricing_mode: form.pricing_mode, fields: normalizedFields as ServiceRow['fields'], is_active: form.is_active, sort_order: Number(form.sort_order) || 0 };
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

  async function uploadServiceImage(file: File | undefined) {
    if (!file) return;
    setSaving(true); setError('');
    try { setField('image_url', await uploadSiteImage('services', (editing ?? form.slug) || 'new-service', file)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Image upload failed.'); }
    finally { setSaving(false); }
  }

  if (role !== 'admin') return <section className="rounded-xl border border-line bg-white p-6 text-sm text-slate-600">Only an administrator can manage the service catalogue.</section>;

  return <section className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-xs sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-brand-700">Catalogue</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Products &amp; services</h2><p className="mt-2 max-w-2xl text-sm text-slate-600">Add offerings, update customer details, choose quote or instant pricing, and control what appears on the website.</p></div><button type="button" onClick={open ? close : startNew} className="btn-primary">{open ? <X size={16}/> : <Plus size={16}/>} {open ? 'Close form' : 'Add service'}</button></header>
    {error && !open && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{loading ? <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-6 text-sm text-slate-500"><Loader2 className="animate-spin" size={16}/> Loading catalogue…</div> : rows.map((row) => {const image = row.image_url ?? catalog.find((service)=>service.slug===row.slug)?.image;return <article key={row.slug} className="admin-service-card"><div className="flex min-w-0 items-center gap-4">{image&&<img src={image} alt="" className="size-20 shrink-0 rounded-xl object-cover"/>}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{row.name}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{row.category}</span><span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{row.pricing_mode === 'instant' ? 'Instant pricing' : 'Quotation'}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.is_active ? 'Live' : 'Archived'}</span></div><p className="mt-1 text-sm text-slate-600">{row.description}</p><p className="mt-1 text-xs text-slate-400">{row.slug} · order {row.sort_order}{catalog.some((service)=>service.slug===row.slug) ? '' : ' · not currently in public catalogue'}</p></div></div><div className="flex gap-2"><button type="button" onClick={()=>startEdit(row)} className="btn-outline"><Edit3 size={15}/> Edit</button><button type="button" onClick={()=>void toggleActive(row)} className="btn-outline">{row.is_active ? 'Archive' : <><Check size={15}/> Activate</>}</button></div></article>})}</div>

    {open && <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget&&!saving)close();}}><div className="mx-auto my-2 max-w-3xl overflow-hidden rounded-2xl border border-white/50 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="service-editor-title"><form onSubmit={submit}>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-brand-700">Catalogue editor</p><h3 id="service-editor-title" className="mt-1 text-xl font-bold">{editing ? `Edit ${form.name}` : 'Add a service'}</h3><p className="mt-1 text-sm text-slate-500">Fill in the service details and customer order questions.</p></div><button type="button" onClick={close} className="icon-button" aria-label="Close editor"><X size={18}/></button></div>
      <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-7">
        {!editing && <label className="text-sm font-semibold">URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(e)=>setField('slug',e.target.value)} placeholder="custom-printing" className={`${inputClass} mt-1`} /><span className="mt-1 block text-xs font-normal text-slate-500">Lowercase letters, numbers and hyphens.</span></label>}
        <label className="text-sm font-semibold">Service name<input required value={form.name} onChange={(e)=>setField('name',e.target.value)} className={`${inputClass} mt-1`} /></label>
        <label className="text-sm font-semibold">Category<select required value={form.category} onChange={(e)=>setField('category',e.target.value)} className={`${inputClass} mt-1`}><option value="" disabled>Select a category</option>{categories.map((category)=><option key={category} value={category}>{category}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Choose from categories already used in the catalogue.</span></label>
        <label className="text-sm font-semibold">Pricing approach<select value={form.pricing_mode} onChange={(e)=>setField('pricing_mode',e.target.value as ServiceForm['pricing_mode'])} className={`${inputClass} mt-1`}><option value="quote">Quotation required</option><option value="instant">Instant price from pricing rules</option></select></label>
        <label className="text-sm font-semibold">Display order<input type="number" value={form.sort_order} onChange={(e)=>setField('sort_order',e.target.value)} className={`${inputClass} mt-1`} /></label>
        <label className="sm:col-span-2 text-sm font-semibold">Description<textarea required rows={3} value={form.description} onChange={(e)=>setField('description',e.target.value)} className={`${inputClass} mt-1`} /></label>
        <div className="sm:col-span-2 grid gap-4 sm:grid-cols-[1fr_1fr] sm:items-start"><label className="text-sm font-semibold">Service image URL<input type="url" value={form.image_url} onChange={(e)=>setField('image_url',e.target.value)} placeholder="https://…" className={`${inputClass} mt-1`} />{form.image_url&&<img src={form.image_url} alt="Service preview" className="mt-3 h-36 w-full rounded-xl border border-line object-cover" />}</label><div><p className="mb-1 text-sm font-semibold">Upload image</p><MagneticDropZone accept="image/*" maxSize={20*1024*1024} busy={saving} onFilesChange={(files)=>{void uploadServiceImage(files[0]);}} /></div></div>
        <label className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-line bg-slate-50 p-4 text-sm"><input className="mt-1" type="checkbox" checked={form.allow_file_uploads} onChange={(e)=>setField('allow_file_uploads',e.target.checked)}/><span><strong className="block">Show general artwork upload</strong><span className="mt-1 block text-xs font-normal text-slate-500">Adds a supporting-file upload area to this service's order form. Keep this off when customers should only upload files through specific questions below.</span></span></label>
        <div className="sm:col-span-2 rounded-xl border border-line bg-slate-50/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-bold">Customer order form</h4><p className="mt-1 text-xs text-slate-500">Add the questions customers answer when ordering this service.</p></div><button type="button" className="btn-outline" onClick={()=>setField('fields',[...form.fields,{name:'',label:'',type:'text',required:false,isNew:true}])}><Plus size={15}/> Add question</button></div>
          {form.fields.length===0?<p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No custom questions yet. Add a question to collect details from customers.</p>:<div className="mt-4 space-y-3">{form.fields.map((field,index)=><div key={`${field.name}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Question label<input required className={`${inputClass} mt-1`} value={field.label} placeholder="For example: Quantity" onChange={(e)=>{const label=e.target.value;patchOrderField(index,{label,...(field.isNew?{name:slugify(label)}:{})});}}/></label><label className="text-xs font-semibold text-slate-600">Answer type<select className={`${inputClass} mt-1`} value={field.type} onChange={(e)=>patchOrderField(index,{type:e.target.value as ServiceField['type']})}>{fieldTypes.map((type)=><option key={type} value={type}>{type==='textarea'?'Long answer':type==='select'?'Choose from options':type==='file'?'File upload':type==='checkbox'?'Yes / no':type==='number'?'Number':'Short answer'}</option>)}</select></label>
              {field.type==='select'&&<label className="text-xs font-semibold text-slate-600 sm:col-span-2">Options, separated by commas<input required className={`${inputClass} mt-1`} value={(field.options??[]).join(', ')} placeholder="Small, Medium, Large" onChange={(e)=>patchOrderField(index,{options:e.target.value.split(',').map((option)=>option.trim()).filter(Boolean)})}/></label>}
              {field.type==='file'&&<><label className="text-xs font-semibold text-slate-600">Accepted files<input className={`${inputClass} mt-1`} value={field.accept??'image/*,.pdf,.zip'} placeholder="image/*,.pdf,.zip" onChange={(e)=>patchOrderField(index,{accept:e.target.value})}/><span className="mt-1 block font-normal">Comma-separated extensions or file types.</span></label><label className="text-xs font-semibold text-slate-600">Maximum file size (MB)<input type="number" min="1" max="20" className={`${inputClass} mt-1`} value={field.maxSizeMb??20} onChange={(e)=>patchOrderField(index,{maxSizeMb:Math.min(20,Math.max(1,Number(e.target.value)||1))})}/></label><label className="flex items-center gap-2 text-sm font-medium sm:col-span-2"><input type="checkbox" checked={Boolean(field.multiple)} onChange={(e)=>patchOrderField(index,{multiple:e.target.checked})}/> Allow multiple files for this question</label></>}
              {field.type==='number'&&<><label className="text-xs font-semibold text-slate-600">Minimum value<input type="number" className={`${inputClass} mt-1`} value={field.min??''} onChange={(e)=>patchOrderField(index,{min:e.target.value===''?undefined:Number(e.target.value)})}/></label><label className="text-xs font-semibold text-slate-600">Step size<input type="number" min="0.001" step="any" className={`${inputClass} mt-1`} value={field.step??''} onChange={(e)=>patchOrderField(index,{step:e.target.value===''?undefined:Number(e.target.value)})}/></label></>}
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Helper text (optional)<input className={`${inputClass} mt-1`} value={field.help??''} onChange={(e)=>patchOrderField(index,{help:e.target.value||undefined})} placeholder="Add a hint to help customers answer"/></label>
              <div className="flex items-center justify-between sm:col-span-2"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={Boolean(field.required)} onChange={(e)=>patchOrderField(index,{required:e.target.checked})}/> Required question</label><button type="button" className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50" onClick={()=>setField('fields',form.fields.filter((_,i)=>i!==index))}><Trash2 size={14}/> Remove</button></div>
            </div></div>)}</div>}
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.is_active} onChange={(e)=>setField('is_active',e.target.checked)} /> Available on the website</label>
        {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-line bg-slate-50/80 px-5 py-4 sm:px-7"><button type="button" className="btn-outline" onClick={close}>Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} {editing ? 'Save changes' : 'Add service'}</button></div>
    </form></div></div>}
  </section>;
}

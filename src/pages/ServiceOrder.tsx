import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Upload, Info, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { calculateEstimate, loadPricingRates, PricingRate } from '../lib/pricing';
import { supabase } from '../lib/supabase';
import { MagneticDropZone } from '@/components/MagneticDropZone';
import type { ServiceField } from '@/lib/catalog';

const ServiceOrder: React.FC = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();
  const services = useCatalog();
  const service = services.find(item => item.slug === slug);
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [files, setFiles] = useState<string[]>([]);
  const [generalFiles, setGeneralFiles] = useState<string[]>([]);
  const [fieldFiles, setFieldFiles] = useState<Record<string, string[]>>({});
  const [uploading, setUploading] = useState(false);
  const [rates, setRates] = useState<PricingRate[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { loadPricingRates().then(setRates).catch(() => setRates([])); }, []);
  const estimate = useMemo(() => service ? calculateEstimate(service.slug, values, rates) : null, [service, values, rates]);
  if (!service) return <div className="container-shell py-24 text-center"><h1 className="text-2xl font-bold">Service not found</h1><Link to="/services" className="text-link mt-4">Browse services</Link></div>;

  const setValue = (name: string, value: string | number | boolean) => setValues(current => ({ ...current, [name]: value }));
  const handleFiles = async (selected: File[], field?: ServiceField) => {
    if (!selected.length) {
      if (field) {
        const old = fieldFiles[field.name] ?? [];
        setFiles(current => current.filter(path => !old.includes(path)));
        setFieldFiles(current => ({ ...current, [field.name]: [] }));
        setValue(field.name, '');
      } else {
        setFiles(current => current.filter(path => !generalFiles.includes(path)));
        setGeneralFiles([]);
      }
      return;
    }
    setError(''); setNotice(''); setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const maxSizeMb = Math.min(20, Math.max(1, field?.maxSizeMb ?? 20));
        if (file.size > maxSizeMb * 1024 * 1024) throw new Error(`${file.name} exceeds the ${maxSizeMb} MB per-file limit.`);
        if (supabase) {
          if (!user) throw new Error('Please sign in before uploading files. You can still configure the job without attachments.');
          const path = `${user.id}/drafts/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const { error: uploadError } = await supabase.storage.from('customer-files').upload(path, file, { upsert: false });
          if (uploadError) throw uploadError;
          uploaded.push(path);
        } else {
          uploaded.push(`DEMO FILE — ${file.name}`);
        }
      }
      if (field) {
        const old = fieldFiles[field.name] ?? [];
        const next = field.multiple ? [...old, ...uploaded] : uploaded;
        setFieldFiles(current => ({ ...current, [field.name]: next }));
        setFiles(current => [...current.filter(path => !old.includes(path)), ...next]);
        setValue(field.name, field.multiple ? JSON.stringify(next) : next[0] ?? '');
      } else {
        setGeneralFiles(current => [...current, ...uploaded]);
        setFiles(current => [...current, ...uploaded]);
      }
      if (!supabase) setNotice('Demo mode: file names are attached to this draft, but file contents are not uploaded. Connect Supabase Storage for live uploads.');
    } catch (err) { setError(err instanceof Error ? err.message : 'File upload failed.'); }
    finally { setUploading(false); }
  };

  const handleAdd = () => {
    const missing = service.fields.filter(field => field.required && (field.type === 'checkbox' ? values[field.name] !== true : values[field.name] === undefined || values[field.name] === '')).map(field => field.label);
    if (missing.length) { setError(`Please complete: ${missing.join(', ')}.`); return; }
    if (service.pricingMode === 'instant' && estimate === null) { setError('This service is configured for instant estimates, but an administrator has not yet entered an active rate. Submit a custom quote for now.'); return; }
    addItem({ id: crypto.randomUUID(), serviceSlug: service.slug, serviceName: service.name, configuration: values, quantity: Math.max(1, Number(values.quantity || 1)), estimate, files });
    navigate('/cart');
  };

  return <div className="container-shell py-12"><Link to="/services" className="back-link"><ArrowLeft size={16}/> All services</Link><div className="grid lg:grid-cols-[1fr_360px] gap-10 mt-7 items-start">
    <div><div className="eyebrow">CUSTOM ORDER CONFIGURATOR · {service.category.toUpperCase()}</div><h1 className="page-title mt-3">{service.name}</h1><p className="lead mt-3 max-w-2xl">{service.description}</p>
      <div className="form-panel mt-8"><div className="flex items-start justify-between gap-4 mb-7"><div><h2 className="text-xl font-bold">Configure your requirements</h2><p className="text-sm text-slate-500 mt-1">Fields marked with * are required.</p></div><span className="step-pill">STEP 1 OF 2</span></div>
        <div className="grid md:grid-cols-2 gap-5">{service.fields.map(field => <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}><label className="form-label" htmlFor={field.name}>{field.label}{field.required ? ' *' : ''}</label>{field.type === 'select' ? <select id={field.name} className="form-control" required={field.required} value={String(values[field.name] ?? '')} onChange={e => setValue(field.name, e.target.value)}><option value="">Select an option</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select> : field.type === 'textarea' ? <textarea id={field.name} className="form-control min-h-28" required={field.required} value={String(values[field.name] ?? '')} placeholder={field.help || 'Enter details'} onChange={e => setValue(field.name, e.target.value)}/> : field.type === 'checkbox' ? <input id={field.name} className="ml-2 size-4 accent-brand-600" type="checkbox" required={field.required} checked={Boolean(values[field.name])} onChange={e => setValue(field.name, e.target.checked)}/> : field.type === 'file' ? <MagneticDropZone className="mt-2" accept={field.accept ?? 'image/*,.pdf,.zip'} maxSize={Math.min(20,Math.max(1,field.maxSizeMb ?? 20))*1024*1024} multiple={Boolean(field.multiple)} busy={uploading} onFilesChange={selected=>void handleFiles(selected,field)}/> : <input id={field.name} className="form-control" type={field.type === 'number' ? 'number' : 'text'} min={field.min} step={field.step} required={field.required} value={String(values[field.name] ?? '')} placeholder={field.help || ''} onChange={e => setValue(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}/>} {field.help && field.type !== 'textarea' && <p className="form-help">{field.help}</p>}</div>)}</div>
        {service.allowFileUploads && <div className="mt-8 border-t border-slate-100 pt-7"><div className="flex items-center gap-2 font-bold"><Upload size={18} className="text-blue-600"/> Upload artwork or supporting files</div><p className="form-help mt-1">PDF, PNG, JPG, SVG, AI, DXF and other relevant formats. Maximum 20 MB per file. Technical file suitability is reviewed before production.</p><MagneticDropZone className="mt-4" multiple accept="image/*,.pdf,.zip,.ai,.dxf,.svg" maxSize={20*1024*1024} busy={uploading} onFilesChange={selected=>void handleFiles(selected)}/>{generalFiles.length>0&&<div className="mt-3 space-y-2">{generalFiles.map((file,index)=><div key={`${file}-${index}`} className="file-row"><span className="truncate">{file.split('/').pop()}</span><button type="button" onClick={()=>{setGeneralFiles(current=>current.filter((_,i)=>i!==index));setFiles(current=>current.filter(path=>path!==file));}} className="text-xs text-red-600">Remove</button></div>)}</div>}{notice&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">{notice}</p>}</div>}
        {error && <p className="mt-5 text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}
        <div className="mt-8 flex flex-col sm:flex-row gap-3"><button onClick={handleAdd} disabled={uploading} className="btn-primary btn-lg">Add configured job to cart <ArrowRight size={17}/></button><Link to="/quote" className="btn-outline btn-lg">Request a custom quote</Link></div>
      </div>
    </div>
    <aside className="space-y-5 lg:sticky lg:top-28"><div className="summary-panel"><div className="eyebrow">ORDER SUMMARY</div><h3 className="font-bold text-lg mt-2">{service.name}</h3><p className="text-sm text-slate-500 mt-2">{service.turnaround}</p><div className="border-t border-slate-100 mt-6 pt-5"><p className="text-xs text-slate-500">{estimate !== null ? 'Configured estimate' : 'Pricing status'}</p><p className="text-2xl font-extrabold mt-1">{estimate !== null ? `KES ${estimate.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : service.pricingMode === 'quote' ? 'Custom quote' : 'Rate not set'}</p><p className="text-xs text-slate-400 mt-2">{estimate !== null ? 'Indicative estimate based on current configured rates. Final price may change after file and specification review.' : 'Your team can configure approved rates in the admin portal. Until then, request a quote.'}</p></div><div className="mt-6 space-y-3 text-sm"><div className="flex gap-2"><ShieldCheck size={17} className="text-emerald-600 shrink-0"/><span>Specifications reviewed before production.</span></div><div className="flex gap-2"><Info size={17} className="text-blue-600 shrink-0"/><span>Production starts after quote, proof (where applicable) and payment approval.</span></div></div></div><div className="rounded-2xl border border-slate-200 p-5"><h3 className="font-bold">Need help with specifications?</h3><p className="text-sm text-slate-500 mt-2">Send us your brief and our team can help you choose the right materials and options.</p><Link to="/contact" className="text-link mt-4">Contact our team <ArrowRight size={15}/></Link></div></aside>
  </div></div>;
};
export default ServiceOrder;

import { useEffect, useState } from 'react';
import { Check, ExternalLink, Loader2, Save, Trash2 } from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { listPortfolioProjects, updatePortfolioProject, type PortfolioProjectPatch } from '@/lib/api/portfolio';
import { uploadSiteImage } from '@/lib/adminMedia';
import { extractPortfolioImages } from '@/lib/zipImages';
import type { PortfolioProjectRow } from '@/types/db';
import { MagneticDropZone } from '@/components/MagneticDropZone';
import { portfolioCategories } from '@/content/portfolio';
import { services as serviceCatalog } from '@/lib/catalog';

export default function PortfolioMediaPage() {
  const { role } = useAdmin();
  const [rows, setRows] = useState<PortfolioProjectRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PortfolioProjectRow>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function reload() {
    setLoading(true);
    try {
      const projects = await listPortfolioProjects(true);
      setRows(projects);
      setDrafts(Object.fromEntries(projects.map((row) => [row.slug, { ...row, services: [...(row.services ?? [])], gallery_images: [...(row.gallery_images ?? [])] }])));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load portfolio projects.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  function updateDraft(slug: string, patch: Partial<PortfolioProjectRow>) {
    setDrafts((current) => ({ ...current, [slug]: { ...current[slug], ...patch } }));
  }

  async function upload(slug: string, files: File[], gallery = false) {
    if (!files.length) return;
    setError(''); setNotice(''); setBusy(slug);
    try {
      const urls = await Promise.all(files.map((file) => uploadSiteImage('portfolio', slug, file)));
      updateDraft(slug, gallery ? { gallery_images: [...drafts[slug].gallery_images, ...urls] } : { image_url: urls[0] });
    } catch (err) { setError(err instanceof Error ? err.message : 'Image upload failed.'); }
    finally { setBusy(''); }
  }

  async function uploadGallery(slug: string, selected: File[]) {
    if (!selected.length) return;
    setError(''); setNotice(''); setBusy(slug);
    try {
      const images: File[] = [];
      for (const file of selected) {
        if (file.name.toLowerCase().endsWith('.zip')) images.push(...await extractPortfolioImages(file));
        else if (file.type.startsWith('image/')) images.push(file);
      }
      if (!images.length) throw new Error('Choose images or a ZIP archive that contains images.');
      const tooLarge = images.find((image) => image.size > 20 * 1024 * 1024);
      if (tooLarge) throw new Error(`${tooLarge.name} is larger than the 20 MB per-image upload limit.`);
      const urls: string[] = [];
      for (const image of images) urls.push(await uploadSiteImage('portfolio', slug, image));
      updateDraft(slug, { gallery_images: [...drafts[slug].gallery_images, ...urls] });
      setNotice(`Uploaded ${urls.length} gallery image${urls.length === 1 ? '' : 's'} for ${rows.find((row) => row.slug === slug)?.title ?? 'project'}. Select Save images to publish them.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not import gallery images.'); }
    finally { setBusy(''); }
  }

  async function save(slug: string) {
    setError(''); setNotice(''); setBusy(slug);
    try {
      const draft = drafts[slug];
      const patch: PortfolioProjectPatch = {
        title: draft.title.trim(), category: draft.category.trim(), client: draft.client?.trim() || null,
        summary: draft.summary.trim(), description: draft.description.trim(), services: draft.services,
        image_url: draft.image_url.trim(), gallery_images: draft.gallery_images,
        link_url: draft.link_url?.trim() || null, link_label: draft.link_label?.trim() || null,
        illustrative: draft.illustrative, featured: draft.featured, sort_order: Math.trunc(Number(draft.sort_order) || 0), is_active: draft.is_active,
      };
      await updatePortfolioProject(slug, patch);
      setNotice(`Project details and images saved for ${draft.title}.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save project changes.'); }
    finally { setBusy(''); }
  }

  if (role !== 'admin') return <section className="rounded-xl border border-line bg-white p-6 text-sm text-slate-600">Only an administrator can manage portfolio projects.</section>;
  const categories = portfolioCategories.filter((category) => category.id !== 'all');
  return <section className="space-y-5">
    <header className="rounded-xl border border-line bg-white p-5 shadow-xs sm:p-6"><p className="text-xs font-bold uppercase tracking-[.15em] text-brand-700">Website content</p><h2 className="mt-1 text-2xl font-bold">Portfolio projects</h2><p className="mt-2 text-sm text-slate-600">Edit project copy, categories, related services, links, and display settings. Update cover and gallery images; non-website projects open a detail page with their gallery.</p></header>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    {loading ? <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" size={20}/>Loading portfolio…</div> : rows.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-sm text-slate-500">No projects found. Apply the editable site media migration to initialize the portfolio.</p> : <div className="grid gap-5">{rows.map((project) => {
      const draft = drafts[project.slug] ?? project;
      const categoryOptions = [...categories.map((category) => category.id), ...(categories.some((category) => category.id === draft.category) ? [] : [draft.category])];
      return <article key={project.slug} className="overflow-hidden rounded-xl border border-line bg-white shadow-xs">
        <div className="grid gap-6 p-5 xl:grid-cols-[260px_1fr] xl:p-6">
          <div className="space-y-3"><img src={draft.image_url} alt={`${draft.title} cover`} className="aspect-[4/3] w-full rounded-xl bg-slate-100 object-cover"/><p className="text-xs font-semibold text-slate-500">Cover image</p><MagneticDropZone accept="image/*" maxSize={20*1024*1024} busy={busy===project.slug} onFilesChange={(files)=>{if(files.length)void upload(project.slug,files);}}/></div>
          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-brand-700">{draft.category}{draft.link_url ? ' · Website' : ' · Case study'}</p><h3 className="mt-1 text-lg font-bold">{draft.title}</h3><p className="mt-1 text-sm text-slate-500">{draft.client || 'NexxaCraft project'} · {draft.gallery_images.length} gallery image(s)</p></div><button type="button" disabled={busy===project.slug} onClick={()=>void save(project.slug)} className="btn-primary">{busy===project.slug?<Loader2 className="animate-spin" size={16}/>:<Save size={16}/>} Save project</button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold sm:col-span-2">Project title<input className="form-control mt-1" required maxLength={140} value={draft.title} onChange={(event)=>updateDraft(project.slug,{title:event.target.value})}/></label>
              <label className="text-sm font-semibold">Category<select className="form-control mt-1" value={draft.category} onChange={(event)=>updateDraft(project.slug,{category:event.target.value})}>{categoryOptions.map((category)=><option key={category} value={category}>{categories.find((item)=>item.id===category)?.label??category}</option>)}</select></label>
              <label className="text-sm font-semibold">Client<input className="form-control mt-1" maxLength={120} value={draft.client??''} onChange={(event)=>updateDraft(project.slug,{client:event.target.value})} placeholder="Optional client name"/></label>
              <label className="text-sm font-semibold sm:col-span-2">Short summary<textarea className="form-control mt-1 min-h-20" required maxLength={280} value={draft.summary} onChange={(event)=>updateDraft(project.slug,{summary:event.target.value})}/><span className="mt-1 block text-xs font-normal text-slate-500">Shown on the portfolio project card.</span></label>
              <label className="text-sm font-semibold sm:col-span-2">Project details<textarea className="form-control mt-1 min-h-32" required value={draft.description} onChange={(event)=>updateDraft(project.slug,{description:event.target.value})}/></label>
              <fieldset className="sm:col-span-2"><legend className="text-sm font-semibold">Related services</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{serviceCatalog.map((service)=>{const selected=draft.services.includes(service.slug);return <label key={service.slug} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${selected?'border-brand-500 bg-brand-50 text-brand-800':'border-line bg-white text-slate-600'}`}><input type="checkbox" className="sr-only" checked={selected} onChange={()=>updateDraft(project.slug,{services:selected?draft.services.filter((slug)=>slug!==service.slug):[...draft.services,service.slug]})}/><span className={`grid size-5 place-items-center rounded border ${selected?'border-brand-600 bg-brand-600 text-white':'border-slate-300'}`}>{selected&&<Check size={13}/>}</span>{service.name}</label>})}</div></fieldset>
              <label className="text-sm font-semibold">Project website URL<div className="relative mt-1"><ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input className="form-control pl-9" type="url" value={draft.link_url??''} onChange={(event)=>updateDraft(project.slug,{link_url:event.target.value})} placeholder="https://example.com"/></div></label>
              <label className="text-sm font-semibold">Website link label<input className="form-control mt-1" maxLength={100} value={draft.link_label??''} onChange={(event)=>updateDraft(project.slug,{link_label:event.target.value})} placeholder="example.com"/></label>
              <label className="text-sm font-semibold">Display order<input className="form-control mt-1" type="number" step="1" value={draft.sort_order} onChange={(event)=>updateDraft(project.slug,{sort_order:Number(event.target.value)||0})}/></label>
              <div className="flex flex-wrap items-end gap-x-5 gap-y-2 pb-2">{([{key:'is_active',label:'Visible on website'},{key:'featured',label:'Featured project'},{key:'illustrative',label:'Illustrative images'}] as const).map(({key,label})=><label key={key} className="inline-flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="size-4 accent-brand-600" checked={draft[key]} onChange={(event)=>updateDraft(project.slug,{[key]:event.target.checked})}/>{label}</label>)}</div>
            </div>
            <div className="border-t border-line pt-5"><p className="mb-2 text-sm font-semibold">Project gallery <span className="font-normal text-slate-500">({draft.gallery_images.length} images)</span></p><p className="mb-2 text-xs text-slate-500">Add individual images or a ZIP archive with JPG, PNG, WebP, GIF, or AVIF images. Maximum 100 MB per ZIP; 20 MB per image.</p><MagneticDropZone multiple accept="image/*,.zip" maxSize={100*1024*1024} busy={busy===project.slug} onFilesChange={(files)=>{if(files.length)void uploadGallery(project.slug,files);}}/><div className="mt-4 flex gap-3 overflow-x-auto pb-2">{draft.gallery_images.map((url,index)=><div key={`${url}-${index}`} className="relative shrink-0"><img src={url} alt={`${draft.title} gallery ${index+1}`} className="h-28 w-40 rounded-lg border border-line object-cover"/><button type="button" disabled={busy===project.slug} onClick={()=>updateDraft(project.slug,{gallery_images:draft.gallery_images.filter((_,i)=>i!==index)})} className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-white/95 text-red-600 shadow" aria-label="Remove gallery image"><Trash2 size={15}/></button></div>)}</div></div>
          </div>
        </div>
      </article>;
    })}</div>}
  </section>;
}

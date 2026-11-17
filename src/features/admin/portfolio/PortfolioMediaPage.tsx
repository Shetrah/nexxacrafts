import { useEffect, useState, type ChangeEvent } from 'react';
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { listPortfolioProjects, updatePortfolioProject } from '@/lib/api/portfolio';
import { uploadSiteImage } from '@/lib/adminMedia';
import type { PortfolioProjectRow } from '@/types/db';

export default function PortfolioMediaPage() {
  const { role } = useAdmin();
  const [rows, setRows] = useState<PortfolioProjectRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { image_url: string; gallery_images: string[] }>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function reload() {
    setLoading(true);
    try {
      const projects = await listPortfolioProjects(true);
      setRows(projects);
      setDrafts(Object.fromEntries(projects.map((row) => [row.slug, { image_url: row.image_url, gallery_images: row.gallery_images ?? [] }])));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load portfolio projects.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  async function upload(slug: string, event: ChangeEvent<HTMLInputElement>, gallery = false) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    setError(''); setNotice(''); setBusy(slug);
    try {
      const urls = await Promise.all(files.map((file) => uploadSiteImage('portfolio', slug, file)));
      setDrafts((current) => ({ ...current, [slug]: gallery
        ? { ...current[slug], gallery_images: [...current[slug].gallery_images, ...urls] }
        : { ...current[slug], image_url: urls[0] },
      }));
    } catch (err) { setError(err instanceof Error ? err.message : 'Image upload failed.'); }
    finally { setBusy(''); input.value = ''; }
  }

  async function save(slug: string) {
    setError(''); setNotice(''); setBusy(slug);
    try {
      await updatePortfolioProject(slug, drafts[slug]);
      setNotice(`Images saved for ${rows.find((row) => row.slug === slug)?.title ?? 'project'}.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save project images.'); }
    finally { setBusy(''); }
  }

  if (role !== 'admin') return <section className="rounded-xl border border-line bg-white p-6 text-sm text-slate-600">Only an administrator can manage portfolio images.</section>;
  return <section className="space-y-5">
    <header className="rounded-xl border border-line bg-white p-5 shadow-xs sm:p-6"><p className="text-xs font-bold uppercase tracking-[.15em] text-brand-700">Website content</p><h2 className="mt-1 text-2xl font-bold">Portfolio images</h2><p className="mt-2 text-sm text-slate-600">Update project cover images and add gallery images. Non-website projects open a detail page with their gallery.</p></header>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    {loading ? <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" size={20}/>Loading portfolio…</div> : rows.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-sm text-slate-500">No projects found. Apply the editable site media migration to initialize the portfolio.</p> : <div className="grid gap-4">{rows.map((project) => { const draft = drafts[project.slug] ?? { image_url: project.image_url, gallery_images: project.gallery_images ?? [] }; return <article key={project.slug} className="overflow-hidden rounded-xl border border-line bg-white shadow-xs"><div className="grid gap-5 p-5 lg:grid-cols-[240px_1fr]"><div><img src={draft.image_url} alt={`${project.title} cover`} className="aspect-[4/3] w-full rounded-xl bg-slate-100 object-cover"/><label className="btn-outline mt-3 w-full cursor-pointer justify-center"><ImagePlus size={16}/> Change cover<input type="file" accept="image/*" className="sr-only" onChange={(event)=>void upload(project.slug,event)}/></label></div><div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-brand-700">{project.category}{project.link_url ? ' · Website' : ' · Case study'}</p><h3 className="mt-1 text-lg font-bold">{project.title}</h3><p className="mt-1 text-sm text-slate-500">{project.client ?? 'NexxaCraft project'} · {draft.gallery_images.length} gallery image(s)</p></div><button type="button" disabled={busy===project.slug} onClick={()=>void save(project.slug)} className="btn-primary">{busy===project.slug?<Loader2 className="animate-spin" size={16}/>:<Save size={16}/>} Save images</button></div><div className="mt-5"><label className="btn-outline w-fit cursor-pointer"><ImagePlus size={16}/> Add gallery images<input type="file" accept="image/*" multiple className="sr-only" onChange={(event)=>void upload(project.slug,event,true)}/></label><div className="mt-4 flex gap-3 overflow-x-auto pb-2">{draft.gallery_images.map((url,index)=><div key={`${url}-${index}`} className="relative shrink-0"><img src={url} alt={`${project.title} gallery ${index+1}`} className="h-28 w-40 rounded-lg border border-line object-cover"/><button type="button" onClick={()=>setDrafts((current)=>({...current,[project.slug]:{...current[project.slug],gallery_images:current[project.slug].gallery_images.filter((_,i)=>i!==index)}}))} className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-white/95 text-red-600 shadow" aria-label="Remove gallery image"><Trash2 size={15}/></button></div>)}</div></div></div></div></article>; })}</div>}
  </section>;
}

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, Expand, ExternalLink, Images, Loader2, X } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getPortfolioProject } from '@/lib/api/portfolio';
import { portfolio } from '@/content/portfolio';
import { portfolioImageByKey } from '@/content/portfolioImages';
import type { PortfolioProjectRow } from '@/types/db';

function fromStatic(slug: string): PortfolioProjectRow | null {
  const item = portfolio.find((project) => project.id === slug);
  if (!item) return null;
  return {
    slug: item.id, title: item.title, category: item.category, client: item.client ?? null, summary: item.summary,
    description: item.description, services: item.services, image_url: portfolioImageByKey[item.imageKey], gallery_images: [],
    link_url: item.link?.href ?? null, link_label: item.link?.label ?? null, illustrative: Boolean(item.illustrative),
    featured: Boolean(item.featured), sort_order: 0, is_active: true, created_at: '', updated_at: '',
  };
}

function ProjectGallery({ project, images }: { project: PortfolioProjectRow; images: string[] }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const previous = () => setActive((index) => (index - 1 + images.length) % images.length);
  const next = () => setActive((index) => (index + 1) % images.length);
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(false);
      if (event.key === 'ArrowLeft') setActive((index) => (index - 1 + images.length) % images.length);
      if (event.key === 'ArrowRight') setActive((index) => (index + 1) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, images.length]);

  return <>
    <section className="project-gallery-shell mt-12 md:mt-16">
      <div className="project-gallery-heading"><div><p className="eyebrow"><Images size={14}/> PROJECT GALLERY</p><h2 className="mt-2 text-2xl font-bold text-slate-950">A closer look at the work</h2><p className="mt-1 text-sm text-slate-500">Explore the details, finishes and visual direction.</p></div><span className="project-gallery-count">{String(active + 1).padStart(2,'0')} <i/> {String(images.length).padStart(2,'0')}</span></div>
      <div className="project-gallery-stage">
        <img key={images[active]} src={images[active]} alt={`${project.title} gallery image ${active + 1}`} className="project-gallery-feature" onClick={()=>setLightbox(true)} />
        <div className="project-gallery-shade" />
        <div className="project-gallery-topline"><span>{project.category} · {project.client ?? 'NexxaCraft project'}</span><button type="button" onClick={()=>setLightbox(true)} aria-label="View image fullscreen"><Expand size={16}/></button></div>
        {images.length > 1 && <><button type="button" className="project-gallery-arrow project-gallery-prev" onClick={previous} aria-label="Previous image"><ChevronLeft size={23}/></button><button type="button" className="project-gallery-arrow project-gallery-next" onClick={next} aria-label="Next image"><ChevronRight size={23}/></button></>}
        <div className="project-gallery-caption"><span className="project-gallery-caption-label">{project.illustrative ? 'VISUAL REFERENCE' : 'PROJECT VIEW'}</span><p>{project.title}</p><small>{project.illustrative ? 'Illustrative image' : `Image ${active + 1} of ${images.length}`}</small></div>
      </div>
      {images.length > 1 && <div className="project-gallery-thumbnails" role="tablist" aria-label="Project gallery images">{images.map((url,index)=><button key={url} role="tab" aria-selected={active===index} aria-label={`Show gallery image ${index+1}`} onClick={()=>setActive(index)} className={`project-gallery-thumb ${active===index?'active':''}`}><img src={url} alt="" loading="lazy"/><span>{String(index+1).padStart(2,'0')}</span></button>)}</div>}
    </section>
    {lightbox && <div className="project-lightbox" role="dialog" aria-modal="true" aria-label={`${project.title} image gallery`} onClick={()=>setLightbox(false)}><button type="button" className="project-lightbox-close" onClick={()=>setLightbox(false)} aria-label="Close image viewer"><X size={22}/></button>{images.length>1&&<button type="button" className="project-lightbox-arrow left" onClick={(event)=>{event.stopPropagation();previous();}} aria-label="Previous image"><ChevronLeft size={28}/></button>}<figure className="project-lightbox-figure" onClick={(event)=>event.stopPropagation()}><img key={images[active]} src={images[active]} alt={`${project.title} gallery image ${active+1}`} /><figcaption>{project.title}<span>{active+1} / {images.length}</span></figcaption></figure>{images.length>1&&<button type="button" className="project-lightbox-arrow right" onClick={(event)=>{event.stopPropagation();next();}} aria-label="Next image"><ChevronRight size={28}/></button>}</div>}
  </>;
}

export default function PortfolioProject() {
  const { projectSlug = '' } = useParams();
  const [project, setProject] = useState<PortfolioProjectRow | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void getPortfolioProject(projectSlug).then((row) => { if (mounted) setProject(row ?? fromStatic(projectSlug)); })
      .catch(() => { if (mounted) setProject(fromStatic(projectSlug)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [projectSlug]);

  if (loading) return <div className="container-shell grid min-h-[50vh] place-items-center text-slate-500"><Loader2 className="animate-spin" size={24}/></div>;
  if (!project) return <div className="container-shell py-24 text-center"><h1 className="text-3xl font-extrabold">Project not found</h1><Link to="/portfolio" className="btn-primary mt-6">Back to portfolio</Link></div>;
  if (project.category === 'digital' && project.link_url) return <Navigate to="/portfolio" replace />;

  const images = [...new Set([project.image_url, ...(project.gallery_images ?? [])].filter(Boolean))];
  return <main className="container-shell py-10 md:py-16">
    <Link to="/portfolio" className="back-link"><ArrowLeft size={16}/> Back to selected work</Link>
    <section className="mt-7 grid gap-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[1.05fr_.95fr]">
      <img src={project.image_url} alt={project.illustrative ? `Illustrative image for ${project.title}` : project.title} className="h-full min-h-72 w-full bg-slate-100 object-cover lg:min-h-[440px]"/>
      <div className="p-7 sm:p-10"><p className="eyebrow">{project.category} project</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{project.title}</h1><p className="mt-3 text-sm font-semibold text-brand-700">{project.client ?? 'NexxaCraft project'}</p><p className="mt-6 text-lg leading-8 text-slate-600">{project.summary}</p><p className="mt-4 leading-7 text-slate-500">{project.description}</p>{project.illustrative&&<p className="mt-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Illustrative imagery — contact us for original project samples.</p>}<div className="mt-6 flex flex-wrap gap-2">{project.services.map((service)=><span key={service} className="service-tag">{service.replace(/-/g,' ')}</span>)}</div>{project.link_url&&<a href={project.link_url} target="_blank" rel="noreferrer" className="btn-primary mt-7">Visit project <ExternalLink size={15}/><ArrowUpRight size={15}/></a>}</div>
    </section>
    {images.length > 0 ? <ProjectGallery project={project} images={images}/> : <section className="mt-12 rounded-2xl border border-dashed p-8 text-sm text-slate-500">Project gallery images will be added soon.</section>}
  </main>;
}

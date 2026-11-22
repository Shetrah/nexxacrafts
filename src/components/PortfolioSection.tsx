import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ExternalLink, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { portfolio as fallbackPortfolio, portfolioCategories, type PortfolioItem } from '../content/portfolio';
import { portfolioImageByKey } from '../content/portfolioImages';
import { listPortfolioProjects } from '@/lib/api/portfolio';
import type { PortfolioProjectRow } from '@/types/db';
import ScrollReveal from './ScrollReveal';
import ClienteleStrip from './ClienteleStrip';

function fromRecord(row: PortfolioProjectRow): PortfolioItem {
  return {
    id: row.slug, title: row.title, category: row.category as PortfolioItem['category'], client: row.client ?? undefined,
    summary: row.summary, description: row.description, services: row.services ?? [], imageKey: row.slug,
    imageUrl: row.image_url, galleryImages: row.gallery_images ?? [],
    link: row.link_url ? { label: row.link_label || row.link_url, href: row.link_url } : undefined,
    illustrative: row.illustrative, featured: row.featured,
  };
}

function ProjectPictorial({ item }: { item: PortfolioItem }) {
  const isWebsite = item.category === 'digital' && item.link;
  const websiteUrl = (() => {
    if (!isWebsite) return '';
    try {
      const url = new URL(item.link!.href);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch { return ''; }
  })();
  const image = <img src={item.imageUrl || portfolioImageByKey[item.imageKey]} alt={item.illustrative ? `Illustrative image for ${item.title}` : `${item.title} project preview`} loading="lazy"/>;
  return <div className={`portfolio-project-image${isWebsite ? ' portfolio-project-image-website' : ''}`}>
    {isWebsite ? <>
      {websiteUrl ? <div className="portfolio-website-preview" aria-label={`${item.title} live homepage preview`}>
        <iframe src={websiteUrl} title={`${item.title} homepage`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" allow="fullscreen" />
        <a className="portfolio-visit-website" href={websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${item.title} website`}>Visit website <ExternalLink size={14}/></a>
      </div> : <div className="portfolio-website-preview portfolio-website-preview-empty"><span>Website preview unavailable</span></div>}
    </> : <>{image}<span className="portfolio-image-arrow" aria-hidden="true"><ArrowUpRight size={19}/></span></>}
    <span className="portfolio-category">{item.category}</span>{item.illustrative&&<span className="portfolio-image-note">Illustrative image</span>}
  </div>;
}

function ProjectCopy({ item }: { item: PortfolioItem }) {
  return <div className="p-6"><p className="text-xs font-bold uppercase tracking-[.12em] text-brand-700">{item.client ?? 'nexxacrafts project'}</p><h3 className="mt-2 text-xl font-bold tracking-tight">{item.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{item.summary}</p><p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500">{item.description}</p><div className="mt-5 flex flex-wrap gap-2">{item.services.map((service)=><span key={service} className="service-tag">{service.replace(/-/g, ' ')}</span>)}</div></div>;
}

export default function PortfolioSection() {
  const [active, setActive] = useState<(typeof portfolioCategories)[number]['id']>('all');
  const [projects, setProjects] = useState<PortfolioItem[]>(fallbackPortfolio);
  useEffect(() => {
    let mounted = true;
    void listPortfolioProjects().then((rows) => { if (mounted && rows.length) setProjects(rows.map(fromRecord)); })
      .catch((error: unknown) => console.warn('Portfolio database unavailable; showing built-in portfolio.', error));
    return () => { mounted = false; };
  }, []);
  const shown = useMemo(() => active === 'all' ? projects : projects.filter((item) => item.category === active), [active, projects]);

  return <>
    <section className="portfolio-page-hero"><div className="container-shell relative z-10 grid items-end gap-8 py-20 md:py-24 lg:grid-cols-[1fr_.55fr]"><div><div className="eyebrow eyebrow-light"><Layers3 size={14}/> SELECTED WORK</div><h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl">Thoughtful work.<br/><span className="text-brand-300">Made to meet its moment.</span></h1><p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">A selection of digital, identity and production projects across the nexxacrafts service range.</p></div><div className="rounded-2xl border border-white/15 bg-white/[.06] p-5 text-sm leading-6 text-slate-300">Explore the work by discipline. Some images are illustrative references; project descriptions identify the services and outcomes represented.</div></div></section>
    <section className="container-shell py-14 md:py-20"><div className="flex flex-col gap-6 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between"><div><div className="eyebrow">PROJECT INDEX</div><h2 className="mt-2 text-2xl font-bold tracking-tight">Selected projects</h2></div><div className="flex max-w-full gap-2 overflow-x-auto pb-1">{portfolioCategories.map((category)=><button key={category.id} onClick={()=>setActive(category.id)} className={`filter-pill ${active===category.id?'active':''}`} aria-pressed={active===category.id}>{category.label}</button>)}</div></div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{shown.map((item,index)=>{const website=item.category==='digital'&&Boolean(item.link);return <ScrollReveal key={item.id} delay={(index%3)*70}><article className="portfolio-project-card group h-full">{website?<><ProjectPictorial item={item}/><ProjectCopy item={item}/></>:<Link to={`/portfolio/${encodeURIComponent(item.id)}`} className="block h-full"><ProjectPictorial item={item}/><ProjectCopy item={item}/></Link>}</article></ScrollReveal>})}</div>
    </section>
    <ClienteleStrip />
  </>;
}

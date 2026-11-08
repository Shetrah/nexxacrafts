import { useMemo, useState } from 'react';
import { ArrowUpRight, ExternalLink, Layers3 } from 'lucide-react';
import { portfolio, portfolioCategories, type PortfolioItem } from '../content/portfolio';
import ScrollReveal from './ScrollReveal';
import ClienteleStrip from './ClienteleStrip';

const imageByKey: Record<string, string> = {
  'rebearth-solutions-website': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=85',
  'stetech-solar-website': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85',
  'corporate-branding-package': 'https://images.pexels.com/photos/6224/hands-product-cloth-brand.jpg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'promotional-banners': 'https://images.pexels.com/photos/7821954/pexels-photo-7821954.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'event-t-shirts': 'https://images.pexels.com/photos/5698854/pexels-photo-5698854.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'product-packaging': 'https://images.pexels.com/photos/5947026/pexels-photo-5947026.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'memorial-program': 'https://images.pexels.com/photos/7319294/pexels-photo-7319294.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'corporate-stationery': 'https://images.pexels.com/photos/6375/quote-chalk-think-words.jpg?auto=compress&cs=tinysrgb&w=1260&h=750',
};

function ProjectPictorial({ item }: { item: PortfolioItem }) {
  const image = <img src={imageByKey[item.imageKey]} alt={item.illustrative ? `Illustrative image for ${item.title}` : `${item.title} project preview`} loading="lazy"/>;
  const isWebsite = item.category === 'digital' && item.link;
  return <div className="portfolio-project-image">
    {isWebsite ? <a className="portfolio-homepage-link" href={item.link!.href} target="_blank" rel="noreferrer" aria-label={`Open ${item.title} homepage in a new tab`}>
      {image}<span className="portfolio-open-homepage">Open homepage <ExternalLink size={13}/></span><span className="portfolio-image-arrow" aria-hidden="true"><ArrowUpRight size={19}/></span>
    </a> : <>{image}<span className="portfolio-image-arrow" aria-hidden="true"><ArrowUpRight size={19}/></span></>}
    <span className="portfolio-category">{item.category}</span>{item.illustrative&&<span className="portfolio-image-note">Illustrative image</span>}
  </div>;
}

export default function PortfolioSection() {
  const [active, setActive] = useState<(typeof portfolioCategories)[number]['id']>('all');
  const shown = useMemo(() => active === 'all' ? portfolio : portfolio.filter((item) => item.category === active), [active]);

  return <>
    <section className="portfolio-page-hero"><div className="container-shell relative z-10 grid items-end gap-8 py-20 md:py-24 lg:grid-cols-[1fr_.55fr]"><div><div className="eyebrow eyebrow-light"><Layers3 size={14}/> SELECTED WORK</div><h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl">Thoughtful work.<br/><span className="text-brand-300">Made to meet its moment.</span></h1><p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">A selection of digital, identity and production projects across the NexxaCraft service range.</p></div><div className="rounded-2xl border border-white/15 bg-white/[.06] p-5 text-sm leading-6 text-slate-300">Explore the work by discipline. Some images are illustrative references; project descriptions identify the services and outcomes represented.</div></div></section>
    <section className="container-shell py-14 md:py-20"><div className="flex flex-col gap-6 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between"><div><div className="eyebrow">PROJECT INDEX</div><h2 className="mt-2 text-2xl font-bold tracking-tight">Selected projects</h2></div><div className="flex max-w-full gap-2 overflow-x-auto pb-1">{portfolioCategories.map((category)=><button key={category.id} onClick={()=>setActive(category.id)} className={`filter-pill ${active===category.id?'active':''}`} aria-pressed={active===category.id}>{category.label}</button>)}</div></div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{shown.map((item,index)=><ScrollReveal key={item.id} delay={(index%3)*70}><article className="portfolio-project-card group h-full"><ProjectPictorial item={item}/><div className="p-6"><p className="text-xs font-bold uppercase tracking-[.12em] text-brand-700">{item.client ?? 'NexxaCraft project'}</p><h3 className="mt-2 text-xl font-bold tracking-tight">{item.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{item.summary}</p><p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500">{item.description}</p><div className="mt-5 flex flex-wrap gap-2">{item.services.map((service)=><span key={service} className="service-tag">{service.replace(/-/g, ' ')}</span>)}</div></div></article></ScrollReveal>)}</div>
    </section>
    <ClienteleStrip />
  </>;
}

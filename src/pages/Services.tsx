import React from 'react';
import { Check, ChevronRight, Code2, Palette, PanelsTopLeft, ScanLine, Sticker, Coffee, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { services } from '../lib/catalog';
import ScrollReveal from '../components/ScrollReveal';

const icons = [Code2, Palette, PanelsTopLeft, Sticker, Coffee, ScanLine];
const Services: React.FC = () => <>
  <section className="service-page-hero">
    <div className="container-shell relative z-10 grid lg:grid-cols-[1fr_.7fr] items-end gap-10 py-20 md:py-28">
      <div><div className="eyebrow eyebrow-light"><Sparkles size={14}/> WHAT WE DO</div><h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl">One creative partner.<br/><span className="text-brand-300">Many ways forward.</span></h1><p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">From a first sketch to a finished product, bring your digital, design, print and fabrication work together with nexxacrafts.</p></div>
      <div className="rounded-2xl border border-white/15 bg-white/[.06] p-6 text-white backdrop-blur-sm"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand-300">A connected workflow</p><div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold sm:text-sm">{['Brief', 'Create', 'Deliver'].map((step,i)=><div key={step} className="rounded-xl bg-white/[.07] px-2 py-4"><span className="mb-2 block font-mono text-brand-300">0{i+1}</span>{step}</div>)}</div><p className="mt-4 text-sm leading-6 text-slate-300">Configure a standard job or send us your brief for a tailored quotation.</p></div>
    </div>
  </section>
  <section className="container-shell py-16 md:py-24">
    <div className="section-heading"><div><div className="eyebrow">OUR CAPABILITIES</div><h2 className="section-title mt-3">Ideas into things <span className="text-gradient">that work.</span></h2></div><p className="max-w-md text-sm leading-6 text-slate-500">Explore the services we provide for businesses, organisations and individuals. Each service page lets you share the details that matter.</p></div>
    <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{services.map((service,index)=>{const Icon=icons[index] ?? Sparkles;return <ScrollReveal key={service.slug} delay={(index%3)*70}><article className="service-feature-card group h-full"><Link to={`/order/${service.slug}`} className="flex h-full flex-col"><div className="service-feature-image"><img src={service.image} alt="" loading="lazy"/><span className="service-feature-icon"><Icon size={20}/></span><span className="image-chip">{service.category}</span></div><div className="flex flex-1 flex-col p-6"><p className="text-xs font-bold uppercase tracking-[.12em] text-brand-700">{service.tagline}</p><h3 className="mt-2 text-xl font-bold tracking-tight">{service.name}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{service.description}</p><div className="mt-5 space-y-2 text-xs text-slate-500"><p className="flex items-center gap-2"><Check size={14} className="text-brand-600"/>{service.pricingMode==='instant'?'Configured estimates available when rates are set':'Quotation shaped around your brief'}</p><p className="flex items-center gap-2"><Check size={14} className="text-brand-600"/>Artwork and reference files can be included</p></div><div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5 mt-6 text-sm font-bold"><span>Explore this service</span><span className="grid size-9 place-items-center rounded-full bg-brand-50 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white"><ChevronRight size={18}/></span></div></div></Link></article></ScrollReveal>})}</div>
  </section>
</>;
export default Services;

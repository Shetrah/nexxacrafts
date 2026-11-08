import React from 'react';
import { ArrowRight, ArrowUpRight, BadgeCheck, Box, Clock3, Upload, Layers, MessageSquare, Package, Briefcase, GraduationCap, PartyPopper, ShoppingBasket, MonitorSmartphone, Factory } from 'lucide-react';
import { Link } from 'react-router-dom';
import { services } from '../lib/catalog';
import ScrollReveal from '../components/ScrollReveal';
import TestimonialCarousel from '../components/TestimonialCarousel';
import { Logo } from '../components/brand/Logo';

const animatedLetters = (text: string, start: number, red = false) => Array.from(text).map((character, index) => <span key={`${start}-${index}`} aria-hidden="true" className={red ? 'home-hero-letter home-hero-letter-red' : 'home-hero-letter'} style={{ animationDelay: `${start + index * 22}ms` }}>{character === ' ' ? '\u00a0' : character}</span>);

function StudioReel() {
  return <div className="hero-studio-stack">
    <div className="hero-studio-wordmark"><Logo variant="wordmark" className="hero-studio-logo" title="NexxaCraft"/></div>
    <div className="hero-image-wrap hero-video-wrap">
    <video autoPlay muted loop playsInline preload="metadata" poster="/og-image.png" aria-label="NexxaCraft banner printing and studio production">
      <source src="/bannerprinting.mp4" type="video/mp4"/>
      Your browser does not support embedded video.
    </video>
    <div className="hero-video-shade" aria-hidden="true"/>
    <div className="hero-video-brand"><span className="hero-video-live"><span/>Studio reel</span></div>
    <div className="hero-video-caption"><span className="hero-video-kicker">nexxacrafts PRODUCTION</span><p>Design · Print · Build</p></div>
    </div>
  </div>;
}

const Home: React.FC = () => <>
  <section className="hero-shell">
    <div className="container-shell relative z-10 grid lg:grid-cols-[1.08fr_.92fr] gap-12 items-center py-20 lg:py-28">
      <div className="max-w-2xl">
        <div className="eyebrow"><span className="eyebrow-dot"/> YOUR CREATIVE & PRODUCTION PARTNER</div>
        <h1 className="hero-title mt-6" aria-label="From the first idea to the finished product."><span aria-hidden="true">{animatedLetters('From the first idea to the ', 80)}{animatedLetters('finished product.', 640, true)}</span></h1>
        <p className="text-lg text-slate-600 mt-6 leading-8 max-w-xl">nexxacrafts brings digital development, graphic design, professional printing, branding and precision fabrication together in one simple place.</p>
        <div className="mt-9 flex flex-col sm:flex-row gap-3"><Link to="/services" className="btn-primary btn-lg">Explore services <ArrowUpRight size={18}/></Link><Link to="/quote" className="btn-outline btn-lg">Request a custom quote</Link></div>
        <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-slate-500"><span className="flex items-center gap-2"><BadgeCheck size={17} className="text-blue-600"/> Tailored to your brief</span><span className="flex items-center gap-2"><Clock3 size={17} className="text-blue-600"/> Clear production updates</span><span className="flex items-center gap-2"><Upload size={17} className="text-blue-600"/> Upload your artwork</span></div>
      </div>
      <div className="hero-studio-column relative max-w-xl mx-auto w-full">
        <StudioReel />
        <div className="floating-card floating-card-top"><div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><Layers size={20}/></div><div><p className="font-bold text-sm">Large-format printing</p><p className="text-xs text-slate-500">Banner production</p></div></div>
        <div className="floating-card floating-card-bottom"><div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center"><Package size={20}/></div><div><p className="font-bold text-sm">Design to delivery</p><p className="text-xs text-slate-500">One connected team</p></div></div>
        <div className="absolute -z-10 -right-8 -top-8 w-40 h-40 bg-blue-100 rounded-full blur-3xl"/><div className="absolute -z-10 -left-8 -bottom-8 w-40 h-40 bg-indigo-100 rounded-full blur-3xl"/>
      </div>
    </div>
  </section>

  <section className="container-shell py-20">
    <div className="section-heading"><div><div className="eyebrow">WHAT WE DO</div><h2 className="section-title mt-3">Everything you need to <span className="text-gradient">move forward.</span></h2></div><Link to="/services" className="text-link hidden sm:inline-flex">View all services <ArrowRight size={17}/></Link></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-10">{services.map(service => <Link key={service.slug} to={`/order/${service.slug}`} className="service-card group"><div className="service-image"><img src={service.image} alt={service.name} loading="lazy" decoding="async"/><span className="image-chip">{service.category}</span></div><div className="p-6"><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-lg">{service.name}</h3><ArrowUpRight className="text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition" size={19}/></div><p className="text-sm text-slate-500 leading-6 mt-2">{service.tagline}</p><div className="mt-5 flex items-center justify-between"><span className="text-xs font-semibold text-brand-700">{service.pricingMode === 'instant' ? 'Configurable estimate' : 'Custom quotation'}</span><span className="text-xs text-slate-400">Start order →</span></div></div></Link>)}</div>
    <div className="sm:hidden mt-7"><Link to="/services" className="text-link">View all services <ArrowRight size={17}/></Link></div>
  </section>


  <section className="bg-slate-950 text-white py-20"><div className="container-shell"><div className="max-w-2xl"><div className="eyebrow eyebrow-light">A CLEARER WAY TO ORDER</div><h2 className="section-title mt-3">A straightforward journey, <span className="text-blue-300">from brief to delivery.</span></h2><p className="text-slate-400 mt-4 leading-7">Configure standard jobs online or send us a custom brief. Keep your files, quotes, approvals and order updates together.</p></div><div className="grid md:grid-cols-4 gap-5 mt-12">{[{n:'01',t:'Choose a service',d:'Select what you need and configure the details.' ,i:Box},{n:'02',t:'Share your files',d:'Upload artwork, reference files or a project brief.',i:Upload},{n:'03',t:'Review your quote',d:'See a configured estimate or receive a custom quote.',i:MessageSquare},{n:'04',t:'Track the work',d:'Follow approvals, production and delivery updates.',i:Package}].map(step => <ScrollReveal key={step.n}><div className="process-card h-full"><div className="flex items-center justify-between"><span className="text-sm text-blue-300 font-bold">{step.n}</span><step.i className="text-blue-300" size={21}/></div><h3 className="font-bold mt-7">{step.t}</h3><p className="text-sm text-slate-400 leading-6 mt-2">{step.d}</p></div></ScrollReveal>)}</div></div></section>

  <section className="markets-section"><div className="container-shell py-16 md:py-20"><ScrollReveal><div className="mx-auto max-w-2xl text-center"><div className="eyebrow">MARKETS WE SERVE</div><h2 className="section-title mt-3">Creative support for <span className="text-gradient">work across industries.</span></h2><p className="mt-4 leading-7 text-slate-600">Our connected services support teams that need to communicate clearly, promote an idea or make something tangible.</p></div></ScrollReveal><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[{title:'Businesses & enterprises',description:'Brand identities, websites, company profiles and day-to-day business materials.',icon:Briefcase},{title:'Schools & institutions',description:'Event materials, signage, branded merchandise and communication design.',icon:GraduationCap},{title:'Events & organisations',description:'Campaign graphics, backdrops, banners, programmes and merchandise.',icon:PartyPopper},{title:'Retail & product brands',description:'Labels, packaging, promotional print and product brand assets.',icon:ShoppingBasket},{title:'Digital teams & startups',description:'Websites, online stores, software tools and connected business systems.',icon:MonitorSmartphone},{title:'Industry & fabrication',description:'Large-format signs, cut lettering, engraved pieces and custom fabrication.',icon:Factory}].map((market,index)=><ScrollReveal key={market.title} delay={(index%3)*70}><article className="market-card h-full"><span className="market-icon"><market.icon size={22}/></span><h3 className="mt-5 text-lg font-bold">{market.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{market.description}</p></article></ScrollReveal>)}</div></div></section>

  <TestimonialCarousel />

</>;
export default Home;

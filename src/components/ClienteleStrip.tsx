import { ArrowUpRight } from 'lucide-react';
import { testimonials } from '../content/testimonials';
import ScrollReveal from './ScrollReveal';

export default function ClienteleStrip() {
  return <section className="container-shell pb-16 md:pb-20" aria-labelledby="clientele-title">
    <ScrollReveal><div className="clientele-panel"><div className="clientele-heading"><div><div className="eyebrow">SELECTED CLIENTELE</div><h2 id="clientele-title" className="mt-2 text-2xl font-bold tracking-tight">Trusted by teams doing meaningful work.</h2></div><p className="max-w-sm text-sm leading-6 text-slate-500">A few of the organisations we have partnered with across digital and brand work.</p></div><div className="client-logo-grid">{testimonials.map((client)=><a key={client.id} href={client.website?.href} target="_blank" rel="noreferrer" className="client-logo-tile" aria-label={`Visit ${client.company}`}><img src={client.logo} alt={`${client.company} logo`} loading="lazy"/><span>{client.company}</span><ArrowUpRight size={15} className="client-logo-arrow"/></a>)}</div></div></ScrollReveal>
  </section>;
}

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Quote } from 'lucide-react';
import { testimonials } from '../content/testimonials';

export default function TestimonialCarousel() {
  const [active, setActive] = useState(0);
  const current = testimonials[active];
  const move = (direction: number) => setActive((index) => (index + direction + testimonials.length) % testimonials.length);

  useEffect(() => {
    if (testimonials.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % testimonials.length), 7000);
    return () => window.clearInterval(timer);
  }, []);

  if (!current) return null;
  return <section className="testimonial-section" aria-label="Client reviews">
    <div className="container-shell grid gap-10 py-16 md:grid-cols-[.65fr_1fr] md:items-center md:py-20"><div><div className="eyebrow eyebrow-light">CLIENT WORDS</div><h2 className="mt-3 text-3xl font-extrabold leading-tight text-white md:text-4xl">Good work is a conversation.</h2><p className="mt-4 max-w-md leading-7 text-slate-300">Hear from clients we have partnered with on real digital and brand projects.</p></div>
      <div className="testimonial-card" aria-live="polite"><Quote size={30} className="text-accent-500"/><blockquote className="mt-5 text-lg font-medium leading-8 text-slate-900 sm:text-xl">“{current.quote}”</blockquote><div className="mt-7 flex flex-wrap items-center justify-between gap-5 border-t border-slate-200 pt-5"><div className="flex items-center gap-3"><img className="testimonial-logo" src={current.logo} alt=""/><div><p className="font-bold text-slate-900">{current.name}</p><p className="text-sm text-slate-500">{current.role}, {current.company}</p></div></div><div className="flex items-center gap-2"><button type="button" className="carousel-arrow" onClick={()=>move(-1)} aria-label="Previous client review"><ArrowLeft size={17}/></button><span className="px-1 text-xs font-semibold text-slate-500">{active+1} / {testimonials.length}</span><button type="button" className="carousel-arrow" onClick={()=>move(1)} aria-label="Next client review"><ArrowRight size={17}/></button></div></div></div>
    </div>
  </section>;
}

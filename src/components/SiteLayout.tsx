import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, PackageSearch, ShoppingBag, UserRound, X, Mail, Phone, MapPin } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCompanySettings } from '../context/CompanySettingsContext';
import { Logo } from './brand/Logo';
import { company } from '../content/company';
import { services } from '../lib/catalog';

const SiteLayout: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const settings = useCompanySettings();
  const location = useLocation();
  const links = [['Services', '/services'], ['Portfolio', '/portfolio'], ['About', '/about'], ['Contact', '/contact']];
  return <div className="min-h-screen flex flex-col bg-white text-slate-900">
    <div className="bg-slate-950 text-slate-200 text-xs py-2"><div className="container-shell flex justify-between gap-3"><span>{settings.tagline}</span><span className="hidden sm:block">{settings.phone} · {settings.public_email}</span></div></div>
    <header className="site-header">
      <div className="container-shell h-[76px] flex items-center justify-between gap-5">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img src="/Nexa%20Logo.png" alt="NexxaCraft — Create, Print, Build" className="h-14 w-auto max-w-[190px] object-contain" />
        </Link>
        <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-5 xl:gap-6">
          <NavLink to="/" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} end>Home</NavLink>
          {links.map(([label, to]) => <NavLink key={to} to={to} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>{label}</NavLink>)}
          <NavLink to="/track" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}><span className="inline-flex items-center gap-1.5"><PackageSearch size={15}/>Track order</span></NavLink>
        </nav>
        <div className="hidden lg:flex items-center gap-2">
          <Link to="/account" className="icon-button" aria-label="Account"><UserRound size={18}/></Link>
          <Link to="/cart" className="icon-button relative" aria-label="Cart"><ShoppingBag size={18}/>{count > 0 && <span className="cart-dot">{count}</span>}</Link>
          <Link to="/services" className="btn-primary">Start an order <ArrowUpRight size={16}/></Link>
        </div>
        <button className="lg:hidden icon-button" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} aria-controls="mobile-navigation">{open ? <X/> : <Menu/>}</button>
      </div>
      {open && <div id="mobile-navigation" className="lg:hidden border-t border-slate-100 bg-white px-5 py-4 space-y-1">{links.map(([label,to]) => <NavLink onClick={() => setOpen(false)} key={to} to={to} className="block rounded-lg px-3 py-2.5 font-semibold hover:bg-slate-50">{label}</NavLink>)}<NavLink onClick={() => setOpen(false)} to="/track" className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-semibold hover:bg-slate-50"><PackageSearch size={17}/>Track order</NavLink><div className="flex gap-2 border-t border-line pt-3 mt-2"><Link onClick={() => setOpen(false)} to="/account" className="btn-outline flex-1">My account</Link><Link onClick={() => setOpen(false)} to="/cart" className="btn-primary flex-1">Cart ({count})</Link></div><Link onClick={() => setOpen(false)} to="/services" className="btn-primary w-full">Start an order <ArrowUpRight size={16}/></Link></div>}
    </header>
    <main className="flex-1"><div key={location.pathname} className="site-route-transition"><Outlet/></div></main>
    <footer className="site-footer">
      <div className="footer-topline"/><div className="container-shell py-10 md:py-14"><div className="footer-cta"><div><span className="footer-eyebrow">HAVE A PROJECT IN MIND?</span><h2 className="mt-2 text-2xl font-extrabold text-slate-950 md:text-3xl">Let’s make your next idea real.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Tell us what you’re working on. We’ll help you find a clear route from brief to finished work.</p></div></div>
        <div className="footer-grid"><div className="footer-brand"><Link to="/" aria-label={`${settings.business_name} home`}><Logo tone="inverse" className="h-12 w-auto" title={settings.business_name}/></Link><p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">{settings.tagline}. Digital development, design, print, branding and custom fabrication for teams across Kenya.</p><p className="mt-3 text-xs font-semibold text-slate-500">{company.serviceArea}</p><div className="mt-5 flex gap-2">{company.socials.map((social)=><a key={social.label} href={social.href} target="_blank" rel="noreferrer" className="footer-social" aria-label={social.label}>{social.label === 'Facebook' ? 'f' : social.label === 'X (Twitter)' ? '𝕏' : '↗'}</a>)}</div></div>
          <div><h3 className="footer-heading">Explore</h3><div className="footer-link-list">{[['Home','/'],...links,['Track an order','/track']].map(([label,to])=><Link key={to} to={to}>{label}</Link>)}</div></div>
          <div><h3 className="footer-heading">Services</h3><div className="footer-link-list">{services.slice(0,5).map((service)=><Link key={service.slug} to={`/order/${service.slug}`}>{service.name}</Link>)}<Link className="footer-all-link" to="/services">All services <ArrowUpRight size={13}/></Link></div></div>
          <div><h3 className="footer-heading">Talk to us</h3><div className="footer-contact-list"><a href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}><span><Phone size={15}/></span>{settings.phone}</a><a href={`mailto:${settings.public_email}`}><span><Mail size={15}/></span>{settings.public_email}</a><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.location)}`} target="_blank" rel="noreferrer"><span><MapPin size={15}/></span>{settings.location}</a></div><Link to="/contact" className="footer-contact-cta">Contact the team <ArrowUpRight size={15}/></Link></div>
        </div>
      </div><div className="footer-bottom"><div className="container-shell flex flex-col justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row"><span>© {new Date().getFullYear()} {settings.business_name}. All rights reserved.</span><span className="flex flex-wrap gap-x-5 gap-y-1"><Link to="/account">Customer account</Link><Link to="/admin">Staff portal</Link><span>Made with care in Kenya</span></span></div></div>
    </footer>
  </div>;
};
export default SiteLayout;

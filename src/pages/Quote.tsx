import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { submitQuote } from '../lib/platform';
import { useAuth } from '../context/AuthContext';

const Quote: React.FC = () => {
  const services = useCatalog();
  const { user, profile, loading } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', serviceSlug: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ reference: string; mode: 'live' | 'demo'; notificationSent?: boolean } | null>(null);
  const isCustomer = Boolean(user && profile?.role === 'customer');
  useEffect(() => {
    if (!user) return;
    setForm(current => ({
      ...current,
      name: profile?.full_name || String(user.user_metadata?.full_name || current.name),
      email: user.email || current.email,
      phone: profile?.phone || String(user.user_metadata?.phone || current.phone),
      company: profile?.company || String(user.user_metadata?.company || current.company),
    }));
  }, [user, profile]);
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isCustomer) { setError('Sign in with your registered client account to request a quotation.'); return; }
    setBusy(true); setError('');
    try { const result = await submitQuote({ ...form, configuration: {} }); setSuccess({ reference: result.reference, mode: result.mode, notificationSent: result.notificationSent }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to submit your request.'); }
    finally { setBusy(false); }
  };
  return <div className="container-shell py-16"><div className="max-w-3xl"><div className="eyebrow">CUSTOM PROJECTS & SPECIAL REQUESTS</div><h1 className="page-title mt-3">Let's scope your <span className="text-gradient">next project.</span></h1><p className="lead mt-4">Tell us what you need. We will review the details, clarify specifications where necessary and prepare a quotation.</p></div>
    <div className="grid lg:grid-cols-[1fr_340px] gap-8 mt-10 items-start"><form onSubmit={handleSubmit} className="form-panel space-y-5">{success ? <div className="text-center py-12"><div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 grid place-items-center mx-auto"><CheckCircle2 size={28}/></div><h2 className="text-2xl font-extrabold mt-5">Quote request received</h2><p className="text-slate-500 mt-2">Your reference is <strong className="text-slate-900">{success.reference}</strong>.</p><p className="text-sm text-slate-500 mt-2">{success.mode === 'demo' ? 'This was saved in this browser demo. Connect Supabase for company-wide submission and staff access.' : success.notificationSent ? 'Our team has received your request and can review it in the quotations workspace.' : 'Your request is saved in our quotations workspace, but the email notification could not be sent. Our team can still review it there.'}</p><button type="button" onClick={() => { setSuccess(null); setForm({ name:'',email:'',phone:'',company:'',serviceSlug:'',description:'' }); }} className="btn-outline mt-7">Submit another request</button></div> : <>
      {!isCustomer ? <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6"><h2 className="text-xl font-bold">Client account required</h2><p className="mt-2 text-sm leading-6 text-slate-600">Sign in or create a NexxaCraft client account before requesting a quotation. Your quote, order, invoice and account statement will then stay connected.</p>{loading ? <p className="mt-4 text-sm text-slate-500">Checking your account…</p> : user ? <p className="mt-4 text-sm text-amber-800">This account is a staff account. Quotations must be requested from a client account.</p> : <div className="mt-5 flex flex-wrap gap-3"><Link to="/account?next=%2Fquote" className="btn-primary">Sign in to your account <ArrowRight size={16}/></Link><Link to="/account?mode=signup&next=%2Fquote" className="btn-outline">Create client account</Link></div>}</div> : <>
      <div><h2 className="text-xl font-bold">Your project details</h2><p className="text-sm text-slate-500 mt-1">Your quotation will be saved to the signed-in client account below.</p></div>
      <div className="grid sm:grid-cols-2 gap-5"><div><label className="form-label">Full name *</label><input className="form-control" required value={form.name} onChange={e => update('name',e.target.value)}/></div><div><label className="form-label">Account email *</label><input className="form-control" type="email" required value={form.email} readOnly aria-describedby="quote-account-email"/><p id="quote-account-email" className="mt-1 text-xs text-slate-500">Quotes are tied to this registered account email.</p></div><div><label className="form-label">Phone number *</label><input className="form-control" required value={form.phone} onChange={e => update('phone',e.target.value)} placeholder="+254…"/></div><div><label className="form-label">Company / organisation</label><input className="form-control" value={form.company} onChange={e => update('company',e.target.value)}/></div></div>
      <div><label className="form-label">Service required *</label><select className="form-control" required value={form.serviceSlug} onChange={e => update('serviceSlug',e.target.value)}><option value="">Choose a service</option>{services.map(service => <option value={service.slug} key={service.slug}>{service.name}</option>)}<option value="other">Other / multiple services</option></select></div>
      <div><label className="form-label">Project brief *</label><textarea className="form-control min-h-40" required value={form.description} onChange={e => update('description',e.target.value)} placeholder="Describe what you need, quantities, dimensions, materials, intended use, timelines and any special requirements."/></div>
      {error && <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}
      <button className="btn-primary btn-lg" disabled={busy}>{busy ? <><Loader2 size={17} className="animate-spin"/> Sending…</> : <>Submit quote request <ArrowRight size={17}/></>}</button>
      <p className="text-xs text-slate-400">Submitting this form does not confirm a price or production slot. We will review the request first.</p>
      </>}</>}</form>
    <aside className="summary-panel"><div className="eyebrow">WHAT HAPPENS NEXT</div><div className="mt-5 space-y-5">{[{n:'01',t:'Brief review',d:'The relevant team checks the requirements and files.'},{n:'02',t:'Clarification',d:'We contact you if dimensions, materials or scope need confirmation.'},{n:'03',t:'Quotation',d:'You receive pricing, lead time and terms for approval.'},{n:'04',t:'Order kickoff',d:'Work starts after the quote and required payment are approved.'}].map(item => <div className="flex gap-3" key={item.n}><span className="step-number">{item.n}</span><div><h3 className="font-bold">{item.t}</h3><p className="text-sm text-slate-500 mt-1 leading-6">{item.d}</p></div></div>)}</div><div className="border-t border-slate-100 mt-7 pt-5"><p className="text-sm font-semibold">Need to speak to us?</p><Link to="/contact" className="text-link mt-2">Contact details <ArrowRight size={15}/></Link></div></aside></div></div>;
};
export default Quote;

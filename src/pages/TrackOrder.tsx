import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, HelpCircle, Loader2, PackageCheck, Search, ShieldCheck, Truck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDateTime, humanize } from '../lib/format';

type TrackingResult = {
  reference: string;
  status: string;
  payment_status: string;
  delivery_method: string;
  created_at: string;
  updated_at: string;
  item_count: number;
  services: string[];
};

const stages = ['submitted', 'awaiting_review', 'awaiting_payment', 'artwork_pending', 'awaiting_approval', 'in_production', 'quality_check', 'ready_for_dispatch', 'dispatched', 'completed'];

export default function TrackOrder() {
  const { reference: routeReference } = useParams();
  const [reference, setReference] = useState(routeReference ?? '');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(''); setResult(null);
    if (!supabase) { setError('Order tracking is temporarily unavailable. Please contact our team for help.'); setBusy(false); return; }
    try {
      const { data, error: queryError } = await supabase.rpc('track_order', { p_reference: reference.trim().toUpperCase() });
      if (queryError) {
        setError(queryError.code === '42883' || queryError.message.includes('track_order')
          ? 'Order tracking has not been enabled yet. Please contact our team while this feature is being set up.'
          : 'We could not check this order right now. Please try again shortly.');
        return;
      }
      if (!data?.length) { setError('We could not find an order with that reference. Check it and try again.'); return; }
      setResult(data[0] as TrackingResult);
    } catch {
      setError('We could not connect to order tracking. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const cancelled = result?.status === 'cancelled';
  const stageIndex = result ? stages.indexOf(result.status) : -1;

  return <div className="container-shell py-12 sm:py-16">
    <div className="mx-auto max-w-4xl">
      <div className="max-w-2xl">
        <div className="eyebrow"><PackageCheck size={14}/> ORDER UPDATES</div>
        <h1 className="page-title mt-3">Track your order</h1>
        <p className="lead mt-4">Enter your NexxaCraft order reference to see its latest progress.</p>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <form onSubmit={submit} className="form-panel space-y-5" aria-label="Track an order">
          <div><label htmlFor="order-reference" className="form-label">Order reference</label><input id="order-reference" className="form-control uppercase" value={reference} onChange={e=>setReference(e.target.value)} placeholder="e.g. NCO-261107-6IUOK" required autoComplete="off" /></div>
          {error && <div role="alert" className="alert-error"><HelpCircle size={17}/><span>{error}</span></div>}
          <button className="btn-primary w-full" disabled={busy}>{busy?<><Loader2 size={17} className="animate-spin"/> Checking order…</>:<><Search size={17}/> Track order</>}</button>
          <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-600"/>Keep your order reference private. Only basic progress information is shown here.</p>
        </form>
        <section className="summary-panel min-h-64" aria-live="polite">
          {!result ? <div className="flex h-full min-h-56 flex-col items-center justify-center text-center"><div className="empty-icon"><Truck size={22}/></div><h2 className="mt-4 font-bold">Your order updates will appear here</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Enter the reference from your order confirmation to see its current status.</p><Link to="/services" className="text-link mt-4">Browse services <ArrowRight size={15}/></Link></div> : <div>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order reference</p><h2 className="mt-1 text-xl font-bold">{result.reference}</h2></div><span className="status-pill">{humanize(result.status)}</span></div>
            <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Payment</p><p className="mt-1 text-sm font-semibold">{humanize(result.payment_status)}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Delivery</p><p className="mt-1 text-sm font-semibold">{humanize(result.delivery_method)}</p></div></div>
            <div className="mt-6"><h3 className="text-sm font-bold">Production progress</h3>{cancelled ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">This order was cancelled. Contact our team if you need assistance.</p> : <div className="mt-3"><div className="flex gap-1" aria-label={`Order status: ${humanize(result.status)}`}>{stages.map((stage,index)=><span key={stage} title={humanize(stage)} className={`h-1.5 flex-1 rounded-full ${stageIndex >= index ? 'bg-brand-600' : 'bg-slate-200'}`} />)}</div><p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-700"><CheckCircle2 size={16} className="text-brand-600"/>{humanize(result.status)}</p></div>}</div>
            <div className="mt-6 border-t border-line pt-4 text-xs text-slate-500"><p>{result.item_count} {result.item_count === 1 ? 'item' : 'items'} · Submitted {formatDateTime(result.created_at)}</p><p className="mt-1">Last updated {formatDateTime(result.updated_at)}</p>{result.services?.length>0&&<p className="mt-2 text-slate-700">{result.services.join(' · ')}</p>}</div>
            <Link to="/contact" className="text-link mt-5">Need help? Contact our team <ArrowRight size={15}/></Link>
          </div>}
        </section>
      </div>
    </div>
  </div>;
}

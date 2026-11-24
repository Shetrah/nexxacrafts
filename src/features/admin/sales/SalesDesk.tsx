import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Banknote, CalendarDays, ClipboardList, FileText, RefreshCw, Search, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardHeader } from '@/components/ui';
import { listQuotes, type QuoteSummary } from '@/lib/api/quotes';
import { listOrders } from '@/lib/api/orders';
import { formatDateTime, formatMoney, humanize } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { OrderRow } from '@/types/db';
import { useAdmin } from '../AdminContext';

type SalesSummary = {
  orders: { count: number; active: number; completed: number; order_value: number; completed_value: number };
  collections: { received: number; outstanding: number };
  open_quotes: number;
  by_salesperson: Array<{ id: string | null; name: string; orders: number; order_value: number }>;
  by_customer: Array<{ name: string; email: string; orders: number; order_value: number }>;
  by_service: Array<{ name: string; quantity: number; order_value: number }>;
};
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const money = (value: number) => formatMoney(Number(value || 0), { currency: 'KES', decimals: 2 });

export default function SalesDesk() {
  const { refreshKey } = useAdmin();
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState(() => dateValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(() => dateValue(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (!supabase) throw new Error('Connect Supabase to view live sales figures.');
      const [quoteRows, orderRows, summaryResult] = await Promise.all([
        listQuotes({ limit: 300 }),
        listOrders({ limit: 300 }),
        supabase.rpc('admin_sales_summary', { p_from: from || null, p_to: to || null }),
      ]);
      if (summaryResult.error) throw summaryResult.error;
      setQuotes(quoteRows); setOrders(orderRows); setSummary(summaryResult.data as SalesSummary);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Sales data could not be loaded.'); }
    finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { void load(); }, [load, refreshKey]);

  const openQuotes = quotes.filter(q => ['submitted', 'under_review', 'need_information'].includes(q.status));
  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status));
  const latestQuotes = openQuotes.filter(q => `${q.reference} ${q.company || ''} ${q.customer_name} ${q.email} ${q.service_slug}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const latestOrders = activeOrders.filter(o => `${o.reference} ${o.customer_name} ${o.customer_email}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8);

  return <div className="space-y-6">
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
      <p className="text-xs font-bold tracking-[.16em] text-brand-700">WORKSPACE · SALES PERFORMANCE</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-bold">Sales desk</h2><p className="mt-2 max-w-2xl text-sm text-slate-600">Sales figures come from live orders, invoice balances and confirmed payment records. Quotes are shown separately from sales.</p></div><button className="btn-outline btn-sm" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh</button></div>
      <div className="mt-5 flex flex-wrap items-end gap-3"><label className="text-xs font-semibold text-slate-500">From<input className="form-control mt-1 block" type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)}/></label><label className="text-xs font-semibold text-slate-500">To<input className="form-control mt-1 block" type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)}/></label><label className="relative min-w-64 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="form-control pl-9" placeholder="Search client, email, or reference" value={query} onChange={e => setQuery(e.target.value)}/></label><span className="inline-flex items-center gap-2 pb-2 text-xs text-slate-500"><CalendarDays size={14}/> Africa/Nairobi reporting dates</span></div>
    </section>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Sales summary unavailable: {error}. Apply the latest Supabase migration and confirm your role.</p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[
        { label: 'Order value', value: summary ? money(summary.orders.order_value) : '—', note: `${summary?.orders.count ?? 0} non-cancelled orders`, icon: ClipboardList },
        { label: 'Completed work value', value: summary ? money(summary.orders.completed_value) : '—', note: `${summary?.orders.completed ?? 0} completed orders`, icon: TrendingUp },
        { label: 'Payments collected', value: summary ? money(summary.collections.received) : '—', note: 'Confirmed or reconciled in selected period', icon: Banknote },
        { label: 'Outstanding invoices', value: summary ? money(summary.collections.outstanding) : '—', note: 'Current issued invoice balances', icon: Banknote },
        { label: 'Open quotations', value: summary?.open_quotes ?? '—', note: 'Quotation requests are not counted as sales', icon: FileText },
        { label: 'Active orders', value: summary?.orders.active ?? '—', note: 'Current operational pipeline', icon: ClipboardList },
      ].map(({ label, value, note, icon: Icon }) => <article key={label} className="rounded-2xl border border-line bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{loading ? '—' : value}</p></div><Icon size={20} className="text-brand-700"/></div><p className="mt-3 text-xs text-slate-500">{note}</p></article>)}
    </section>
    <section className="grid gap-5 xl:grid-cols-3">
      {[
        { title: 'By salesperson', rows: summary?.by_salesperson ?? [], first: 'name', second: 'orders', value: 'order_value' },
        { title: 'Top customers', rows: summary?.by_customer ?? [], first: 'name', second: 'orders', value: 'order_value' },
        { title: 'By service', rows: summary?.by_service ?? [], first: 'name', second: 'quantity', value: 'order_value' },
      ].map(section => <Card key={section.title}><CardHeader title={section.title} description="Order value in selected period"/>{loading ? <p className="p-6 text-sm text-slate-500">Loading…</p> : !section.rows.length ? <p className="p-6 text-sm text-slate-500">No records in this period.</p> : <div className="divide-y divide-line">{section.rows.map((row, index) => <div key={`${section.title}-${index}`} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{String(row[section.first as keyof typeof row] ?? 'Unassigned')}</p><p className="truncate text-xs text-slate-500">{section.title === 'Top customers' ? String(row.email) : `${row[section.second as keyof typeof row]} ${section.title === 'By service' ? 'units' : 'orders'}`}</p></div><strong className="shrink-0 text-sm text-slate-900">{money(Number(row[section.value as keyof typeof row] || 0))}</strong></div>)}</div>}</Card>)}
    </section>
    <Card><CardHeader title="Quote requests to review" description="Open quotations requiring qualification, pricing, or client information." actions={<Link to="/admin/quotes" className="btn-primary btn-sm">Open approvals <ArrowRight size={15}/></Link>}/>{loading ? <p className="p-8 text-center text-sm text-slate-500">Loading pipeline…</p> : !latestQuotes.length ? <p className="p-8 text-center text-sm text-slate-500">No open quotations match the current search.</p> : <div className="divide-y divide-line">{latestQuotes.map(q => <Link key={q.id} to={`/admin/quotes?quote=${encodeURIComponent(q.id)}`} className="grid gap-2 p-4 transition hover:bg-brand-50/40 sm:grid-cols-[1fr_1.2fr_1fr_auto] sm:items-center"><div><strong className="text-sm text-slate-900">{q.reference}</strong><p className="text-xs text-slate-500">{formatDateTime(q.created_at)}</p></div><span className="text-sm text-slate-700">{q.company || q.customer_name}<small className="block text-xs text-slate-500">{q.email}</small></span><span className="text-sm text-slate-600">{humanize(q.service_slug)}</span><span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{humanize(q.status)}</span></Link>)}</div>}</Card>
    <Card><CardHeader title="Orders under active management" description="Client orders moving through review, production and delivery." actions={<Link to="/admin/orders" className="btn-outline btn-sm">All orders <ArrowRight size={15}/></Link>}/>{loading ? <p className="p-8 text-center text-sm text-slate-500">Loading orders…</p> : !latestOrders.length ? <p className="p-8 text-center text-sm text-slate-500">No active orders match the current search.</p> : <div className="divide-y divide-line">{latestOrders.map(o => <Link key={o.id} to={`/admin/orders?order=${encodeURIComponent(o.id)}`} className="grid gap-2 p-4 transition hover:bg-brand-50/40 sm:grid-cols-[1fr_1.2fr_1fr_auto] sm:items-center"><div><strong className="text-sm text-slate-900">{o.reference}</strong><p className="text-xs text-slate-500">{formatDateTime(o.created_at)}</p></div><span className="text-sm text-slate-700">{o.customer_name}<small className="block text-xs text-slate-500">{o.customer_email}</small></span><span className="text-sm text-slate-600">{humanize(o.payment_status)} · {humanize(o.status)}</span><ArrowRight size={16} className="text-slate-400"/></Link>)}</div>}</Card>
    <p className="rounded-xl border border-line bg-slate-50 p-4 text-xs text-slate-500"><Users size={14} className="mr-2 inline"/>Salesperson performance is attributed to the order’s assigned staff member. Unassigned orders appear as “Unassigned.” Profit is not reported here because production costs are not yet allocated to order items.</p>
  </div>;
}

import { useEffect, useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, ClipboardList, Clock3, FileText, Users, Palette, PackageCheck, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '../AdminContext';

type Order = { id: string; reference: string; customer_name: string; status: string; payment_status: string; created_at: string };

const statusTone = (status: string) => status === 'completed' || status === 'paid' ? 'bg-emerald-50 text-emerald-700' : status === 'cancelled' || status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700';

export default function CompanyDashboard() {
  const { profile, refreshKey } = useAdmin();
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState({ orders: 0, quotes: 0, customers: 0, review: 0, production: 0, artwork: 0 });
  const [finance, setFinance] = useState({ received: 0, outstanding: 0, paidInvoices: 0, unpaidInvoices: 0, recordedExpenses: 0, supplierPayables: 0, quotedValue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const client = supabase;
    if (!client) { setLoading(false); setError('Connect Supabase to load live workspace data.'); return; }
    const load = async () => {
      setLoading(true); setError('');
      const [recent, summaryResult, customerCount] = await Promise.all([
        client.from('orders').select('id,reference,customer_name,status,payment_status,created_at').order('created_at', { ascending: false }).limit(6),
        client.rpc('admin_finance_summary', { p_from: null, p_to: null }),
        client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
      ]);
      if (!active) return;
      if (recent.error) setError(recent.error.message); else setOrders((recent.data ?? []) as Order[]);
      if (summaryResult.error) setError(summaryResult.error.message);
      if (customerCount.error) setError(customerCount.error.message);
      if (!summaryResult.error) {
        const summary = summaryResult.data as { orders: { count: number; awaiting_review: number; in_production: number; artwork: number }; quotes: { open: number; quoted_value: number }; invoices: { outstanding: number; paid_count: number; unpaid_count: number }; payments: { received: number }; expenses: { recorded: number }; procurement: { supplier_payables: number }; inventory: { low_stock: number } };
        setCounts({ orders: summary.orders.count, quotes: summary.quotes.open, customers: customerCount.count ?? 0, review: summary.orders.awaiting_review, production: summary.orders.in_production, artwork: summary.orders.artwork });
        setFinance({ received: summary.payments.received, outstanding: summary.invoices.outstanding, paidInvoices: summary.invoices.paid_count, unpaidInvoices: summary.invoices.unpaid_count, recordedExpenses: summary.expenses.recorded, supplierPayables: summary.procurement.supplier_payables, quotedValue: summary.quotes.quoted_value });
      }
      setLoading(false);
    };
    void load().catch((loadError: unknown) => { if (active) { setError(loadError instanceof Error ? loadError.message : 'Workspace data could not be loaded.'); setLoading(false); } });
    return () => { active = false; };
  }, [refreshKey]);

  const cards = [
    { label: 'Total orders', value: counts.orders, icon: ClipboardList, to: '/admin/orders', note: 'All customer orders', tone: 'blue' },
    { label: 'Awaiting review', value: counts.review, icon: Clock3, to: '/admin/orders', note: 'Orders needing attention', tone: 'orange' },
    { label: 'In production', value: counts.production, icon: PackageCheck, to: '/admin/orders', note: 'Work moving through production', tone: 'green' },
    { label: 'Artwork queue', value: counts.artwork, icon: Palette, to: '/admin/orders', note: 'Awaiting artwork action', tone: 'red' },
    { label: 'Open quotations', value: counts.quotes, icon: FileText, to: '/admin/quotes', note: 'Requests in your pipeline', tone: 'violet' },
    { label: 'Customer accounts', value: counts.customers, icon: Users, to: '/admin/customers', note: 'Registered customers', tone: 'slate' },
  ];
  const firstName = profile.full_name?.trim().split(/\s+/)[0] || 'there';

  return <div className="space-y-7">
    <section className="admin-welcome relative isolate overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-brand-950/10 sm:p-9">
      <div className="admin-welcome-orb admin-welcome-orb-blue"/><div className="admin-welcome-orb admin-welcome-orb-red"/>
      <div className="relative max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-blue-100 backdrop-blur"><Activity size={14}/> LIVE WORKSPACE</div>
        <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Good to see you, {firstName}.</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100/80">Here’s a clear view of the work moving through NexxaCraft today.</p>
        <div className="mt-7 flex flex-wrap gap-3"><Link to="/admin/orders" className="admin-glass-action">View orders <ArrowRight size={16}/></Link><Link to="/admin/quotes" className="admin-glass-link">Review quotations <ArrowUpRight size={16}/></Link></div>
      </div>
      <div className="admin-welcome-mark" aria-hidden="true">N.</div>
    </section>

    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Workspace data could not be fully refreshed. Check your connection and permissions, then refresh the page.</p>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Workspace summary">
      {cards.map(({ label, value, icon: Icon, to, note, tone }) => <Link key={label} to={to} className={`admin-stat-glass group tone-${tone}`}>
        <div className="flex items-start justify-between"><span className="admin-stat-icon"><Icon size={19}/></span><ArrowUpRight size={17} className="text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600"/></div>
        <p className="mt-5 text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{loading ? '—' : value.toLocaleString()}</p><p className="mt-2 text-xs text-slate-500">{note}</p>
      </Link>)}
    </section>

    <section className="admin-panel-glass p-5 sm:p-6" aria-label="Finance overview"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-brand-700"><Wallet size={15}/> FINANCE</div><h3 className="mt-1 text-lg font-bold">Company financial status</h3><p className="mt-1 text-xs text-slate-500">Lifetime totals; received is confirmed or reconciled only.</p></div><Link to="/admin/finance" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">Open finance desk <ArrowRight size={15}/></Link></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><article className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Payments received</p><p className="mt-2 text-2xl font-black text-emerald-950">KES {finance.received.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}</p><p className="mt-1 text-xs text-emerald-800">Confirmed payment ledger</p></article><article className="rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Outstanding balance</p><p className="mt-2 text-2xl font-black text-amber-950">KES {finance.outstanding.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}</p><p className="mt-1 text-xs text-amber-800">Issued invoices only</p></article><article className="rounded-2xl border border-brand-100 bg-brand-50/80 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Paid invoices</p><p className="mt-2 text-2xl font-black text-slate-950">{finance.paidInvoices}</p><p className="mt-1 text-xs text-brand-800">Fully settled</p></article><article className="rounded-2xl border border-violet-200/70 bg-violet-50/80 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-violet-800">Unpaid invoices</p><p className="mt-2 text-2xl font-black text-slate-950">{finance.unpaidInvoices}</p><p className="mt-1 text-xs text-violet-800">Issued or partly paid</p></article><article className="rounded-2xl border border-rose-200/70 bg-rose-50/80 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-rose-800">Recorded expenses</p><p className="mt-2 text-2xl font-black text-slate-950">KES {finance.recordedExpenses.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}</p><p className="mt-1 text-xs text-rose-800">Approved / recorded costs</p></article><article className="rounded-2xl border border-orange-200/70 bg-orange-50/80 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-orange-800">Supplier payables</p><p className="mt-2 text-2xl font-black text-slate-950">KES {finance.supplierPayables.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}</p><p className="mt-1 text-xs text-orange-800">Received goods less payments</p></article><article className="rounded-2xl border border-blue-200/70 bg-blue-50/80 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Open quote value</p><p className="mt-2 text-2xl font-black text-slate-950">KES {finance.quotedValue.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}</p><p className="mt-1 text-xs text-blue-800">Issued quotations</p></article></div></section>

    <section className="admin-panel-glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-5 sm:px-6"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-brand-700"><Clock3 size={14}/> WORKFLOW</div><h3 className="mt-1 text-lg font-bold">Recent orders</h3></div><Link to="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">All orders <ArrowRight size={15}/></Link></div>
      {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading recent activity…</div> : orders.length === 0 ? <div className="p-10 text-center"><span className="mx-auto grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-700"><ClipboardList size={20}/></span><p className="mt-3 font-semibold text-slate-800">No orders to show yet</p><p className="mt-1 text-sm text-slate-500">New customer orders will appear here.</p></div> : <div className="divide-y divide-slate-100/80">{orders.map((order) => <Link to={`/admin/orders?order=${encodeURIComponent(order.id)}`} key={order.id} className="grid gap-2 px-5 py-4 transition-colors hover:bg-brand-50/40 sm:grid-cols-[1fr_1.3fr_auto_auto_auto] sm:items-center sm:px-6"><div><p className="font-semibold text-slate-900">{order.reference}</p><p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p></div><p className="truncate text-sm text-slate-600">{order.customer_name || 'Customer'}</p><span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusTone(order.status)}`}>{order.status.replace(/_/g, ' ')}</span><span className="text-xs capitalize text-slate-500">{order.payment_status?.replace(/_/g, ' ')}</span><ArrowRight size={16} className="hidden text-slate-400 sm:block" /></Link>)}</div>}
    </section>
  </div>;
}

import { useEffect, useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, ClipboardList, Clock3, FileText, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '../AdminContext';

type Order = { id: string; reference: string; customer_name: string; status: string; payment_status: string; created_at: string };

const statusTone = (status: string) => status === 'completed' || status === 'paid' ? 'bg-emerald-50 text-emerald-700' : status === 'cancelled' || status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700';

export default function CompanyDashboard() {
  const { profile, refreshKey } = useAdmin();
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState({ orders: 0, quotes: 0, customers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const client = supabase;
    if (!client) { setLoading(false); setError('Connect Supabase to load live workspace data.'); return; }
    const load = async () => {
      setLoading(true); setError('');
      const [recent, orderCount, quoteCount, customerCount] = await Promise.all([
        client.from('orders').select('id,reference,customer_name,status,payment_status,created_at').order('created_at', { ascending: false }).limit(6),
        client.from('orders').select('id', { count: 'exact', head: true }),
        client.from('quote_requests').select('id', { count: 'exact', head: true }),
        client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
      ]);
      if (!active) return;
      if (recent.error) setError(recent.error.message);
      else setOrders((recent.data ?? []) as Order[]);
      setCounts({ orders: orderCount.count ?? 0, quotes: quoteCount.count ?? 0, customers: customerCount.count ?? 0 });
      setLoading(false);
    };
    void load().catch((loadError: unknown) => { if (active) { setError(loadError instanceof Error ? loadError.message : 'Workspace data could not be loaded.'); setLoading(false); } });
    return () => { active = false; };
  }, [refreshKey]);

  const cards = [
    { label: 'Total orders', value: counts.orders, icon: ClipboardList, to: '/admin/orders', note: 'All customer orders' },
    { label: 'Open quotations', value: counts.quotes, icon: FileText, to: '/admin/quotes', note: 'Requests in your pipeline' },
    { label: 'Customer accounts', value: counts.customers, icon: Users, to: '/admin/customers', note: 'Registered customers' },
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

    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

    <section className="grid gap-4 md:grid-cols-3" aria-label="Workspace summary">
      {cards.map(({ label, value, icon: Icon, to, note }) => <Link key={label} to={to} className="admin-stat-glass group">
        <div className="flex items-start justify-between"><span className="admin-stat-icon"><Icon size={19}/></span><ArrowUpRight size={17} className="text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600"/></div>
        <p className="mt-5 text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{loading ? '—' : value.toLocaleString()}</p><p className="mt-2 text-xs text-slate-500">{note}</p>
      </Link>)}
    </section>

    <section className="admin-panel-glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-5 sm:px-6"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-brand-700"><Clock3 size={14}/> WORKFLOW</div><h3 className="mt-1 text-lg font-bold">Recent orders</h3></div><Link to="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">All orders <ArrowRight size={15}/></Link></div>
      {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading recent activity…</div> : orders.length === 0 ? <div className="p-10 text-center"><span className="mx-auto grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-700"><ClipboardList size={20}/></span><p className="mt-3 font-semibold text-slate-800">No orders to show yet</p><p className="mt-1 text-sm text-slate-500">New customer orders will appear here.</p></div> : <div className="divide-y divide-slate-100/80">{orders.map((order) => <article key={order.id} className="grid gap-2 px-5 py-4 transition-colors hover:bg-brand-50/40 sm:grid-cols-[1fr_1.3fr_auto_auto] sm:items-center sm:px-6"><div><p className="font-semibold text-slate-900">{order.reference}</p><p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p></div><p className="truncate text-sm text-slate-600">{order.customer_name || 'Customer'}</p><span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusTone(order.status)}`}>{order.status.replace(/_/g, ' ')}</span><span className="text-xs capitalize text-slate-500">{order.payment_status?.replace(/_/g, ' ')}</span></article>)}</div>}
    </section>
  </div>;
}

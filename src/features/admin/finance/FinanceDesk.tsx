import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, CalendarDays, AlertCircle, FileText, RefreshCw, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '../AdminContext';

type FinanceSummary = {
  period: { from: string | null; to: string | null };
  orders: { count: number; open: number; awaiting_review: number; in_production: number };
  invoices: { issued_total: number; outstanding: number; paid_count: number; unpaid_count: number };
  payments: { received: number; pending_count: number; by_method: Record<string, number> };
  expenses: { recorded: number; pending_approval: number };
  procurement: { pending_approval: number; received_value: number; supplier_payables: number };
  quotes: { open: number; quoted_value: number };
  inventory: { low_stock: number; valuation: number };
};

const money = (amount: number) => `KES ${Number(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function Metric({ label, value, caption, icon: Icon, tint = 'blue' }: { label: string; value: string | number; caption: string; icon: typeof Wallet; tint?: string }) {
  const tintClass: Record<string, string> = { blue: 'bg-blue-50 text-blue-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700', violet: 'bg-violet-50 text-violet-700', cyan: 'bg-cyan-50 text-cyan-700' };
  return <article className="rounded-2xl border border-line bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p></div><span className={`grid size-11 place-items-center rounded-xl ${tintClass[tint]}`}><Icon size={20}/></span></div>
    <p className="mt-3 text-xs text-slate-500">{caption}</p>
  </article>;
}

export default function FinanceDesk() {
  const { refreshKey } = useAdmin();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [from, setFrom] = useState(() => dateValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(() => dateValue(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return; }
    setLoading(true); setError('');
    const { data, error: rpcError } = await supabase.rpc('admin_finance_summary', { p_from: from || null, p_to: to || null });
    if (rpcError) setError(rpcError.message);
    else setSummary(data as FinanceSummary);
    setLoading(false);
  }, [from, to]);
  useEffect(() => { void load(); }, [load, refreshKey]);

  const cards = summary ? [
    { label: 'Payments received', value: money(summary.payments.received), caption: 'Confirmed or reconciled payments in selected period', icon: TrendingUp, tint: 'emerald' },
    { label: 'Outstanding invoices', value: money(summary.invoices.outstanding), caption: `${summary.invoices.unpaid_count} issued invoices with balance remaining`, icon: Wallet, tint: 'amber' },
    { label: 'Invoiced in period', value: money(summary.invoices.issued_total), caption: `${summary.invoices.paid_count} invoices fully paid in period`, icon: FileText, tint: 'blue' },
    { label: 'Recorded expenses', value: money(summary.expenses.recorded), caption: 'Approved, paid, or legacy recorded expenses', icon: TrendingDown, tint: 'rose' },
    { label: 'Supplier payables', value: money(summary.procurement.supplier_payables), caption: 'Received procurement value less confirmed supplier payments', icon: Banknote, tint: 'violet' },
    { label: 'Stock valuation', value: money(summary.inventory.valuation), caption: `${summary.inventory.low_stock} active items at or below reorder level`, icon: AlertCircle, tint: 'cyan' },
  ] : [];

  return <div className="space-y-6">
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm"><p className="text-xs font-bold tracking-[.16em] text-brand-700">FINANCE · LIVE LEDGER</p><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-slate-900">Finance desk</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Cash received, invoice balances, recorded costs, and procurement liabilities from operational records.</p></div><button onClick={() => void load()} className="btn-outline btn-sm" disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh figures</button></div></section>
    <section className="rounded-2xl border border-line bg-white p-4"><div className="flex flex-wrap items-end gap-3"><label className="text-xs font-semibold text-slate-500">From<input className="form-control mt-1 block" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)}/></label><label className="text-xs font-semibold text-slate-500">To<input className="form-control mt-1 block" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)}/></label><span className="ml-auto inline-flex items-center gap-2 pb-2 text-xs text-slate-500"><CalendarDays size={15}/> Operational dates follow the recorded transaction timestamps.</span></div></section>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load the finance summary: {error}. Apply the latest Supabase migration and confirm your finance/admin role.</div>}
    {loading && !summary ? <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-slate-500">Loading reconciled finance figures…</div> : summary && <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(({ label, value, caption, icon, tint }) => <Metric key={label} label={label} value={value} caption={caption} icon={icon} tint={tint}/>)}</section>
      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-line bg-white p-5"><h2 className="text-lg font-bold text-slate-900">Collections by payment method</h2><p className="mt-1 text-sm text-slate-500">Only provider-confirmed and reconciled rows are counted.</p><div className="mt-5 space-y-4">{Object.entries(summary.payments.by_method).length ? Object.entries(summary.payments.by_method).map(([method, amount]) => { const max = Math.max(...Object.values(summary.payments.by_method), 1); return <div key={method}><div className="mb-1 flex justify-between text-sm"><span className="capitalize text-slate-900">{method.replaceAll('_', ' ')}</span><strong className="text-slate-900">{money(amount)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(2, amount / max * 100)}%` }}/></div></div>; }) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No confirmed payments in this period.</p>}</div></article>
        <article className="rounded-2xl border border-line bg-white p-5"><h2 className="text-lg font-bold text-slate-900">Approvals and workflow</h2><p className="mt-1 text-sm text-slate-500">Pending work linked to active business records.</p><div className="mt-4 grid grid-cols-2 gap-3">{[
          ['Orders needing review', summary.orders.awaiting_review, '/admin/orders'], ['Open quotations', summary.quotes.open, '/admin/quotes'], ['Pending expense review', summary.expenses.pending_approval, '/admin/expenses'], ['Purchase approvals', summary.procurement.pending_approval, '/admin/procurement'], ['Payments awaiting confirmation', summary.payments.pending_count, '/admin/payments'], ['Orders in production', summary.orders.in_production, '/admin/orders'],
        ].map(([label, value, href]) => <Link key={String(label)} to={String(href)} className="rounded-xl border border-line bg-slate-50 p-4 transition hover:border-brand-300"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></Link>)}</div></article>
      </section>
      <p className="rounded-xl border border-line bg-slate-50 p-4 text-xs leading-5 text-slate-500">These are cash and ledger indicators, not net profit. A reliable profit figure requires captured production costs allocated to each order. Invoice outstanding excludes drafts and void invoices; pending payment prompts are not counted as receipts.</p>
    </>}
  </div>;
}

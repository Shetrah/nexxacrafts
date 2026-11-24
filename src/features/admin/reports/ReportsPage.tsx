import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Banknote, Download, FileText, RefreshCw, ShoppingBag, TrendingDown, Truck } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '../AdminContext';

type Order = { reference: string; customer_name: string; status: string; payment_status: string; total: number | null; currency: string; created_at: string };
type Invoice = { invoice_number: string; customer_name: string; total: number; amount_paid: number; status: string; currency: string; issued_at: string | null; created_at: string };
type Payment = { method: string; amount: number | null; currency: string; status: string; transaction_reference: string | null; confirmed_at: string | null; created_at: string };
type Expense = { expense_date: string; category: string; description: string; amount: number; workflow_status: string; reference: string | null };
type SupplierPayment = { amount: number; currency: string; method: string; reference: string | null; status: string; confirmed_at: string | null; created_at: string };
type Reports = { orders: Order[]; invoices: Invoice[]; payments: Payment[]; expenses: Expense[]; supplierPayments: SupplierPayment[] };
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const money = (value: number) => formatMoney(Number(value || 0), { currency: 'KES', decimals: 2 });
const asNairobiDate = (value: string) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
const inPeriod = (value: string | null | undefined, from: string, to: string) => Boolean(value && asNairobiDate(value) >= from && asNairobiDate(value) <= to);
const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const csv = [columns.map(csvCell).join(','), ...rows.map(row => columns.map(column => csvCell(row[column])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { refreshKey } = useAdmin();
  const [from, setFrom] = useState(() => dateValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(() => dateValue(new Date()));
  const [data, setData] = useState<Reports>({ orders: [], invoices: [], payments: [], expenses: [], supplierPayments: [] });
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!supabase) { setError('Connect Supabase to load reports.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [orders, invoices, payments, expenses, supplierPayments] = await Promise.all([
        supabase.from('orders').select('reference,customer_name,status,payment_status,total,currency,created_at').order('created_at', { ascending: false }).limit(5000),
        supabase.from('invoices').select('invoice_number,customer_name,total,amount_paid,status,currency,issued_at,created_at').order('created_at', { ascending: false }).limit(5000),
        supabase.from('payments').select('method,amount,currency,status,transaction_reference,confirmed_at,created_at').in('status', ['confirmed','reconciled']).order('created_at', { ascending: false }).limit(5000),
        supabase.from('expenses').select('expense_date,category,description,amount,workflow_status,reference').order('expense_date', { ascending: false }).limit(5000),
        supabase.from('supplier_payments').select('amount,currency,method,reference,status,confirmed_at,created_at').eq('status','confirmed').order('created_at', { ascending: false }).limit(5000),
      ]);
      for (const result of [orders,invoices,payments,expenses,supplierPayments]) if (result.error) throw result.error;
      setData({ orders: orders.data ?? [], invoices: invoices.data ?? [], payments: payments.data ?? [], expenses: expenses.data ?? [], supplierPayments: supplierPayments.data ?? [] });
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Reports could not be loaded.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load, refreshKey]);

  const filtered = useMemo(() => ({
    orders: data.orders.filter(row => inPeriod(row.created_at,from,to)),
    invoices: data.invoices.filter(row => inPeriod(row.issued_at || row.created_at,from,to)),
    payments: data.payments.filter(row => inPeriod(row.confirmed_at || row.created_at,from,to)),
    expenses: data.expenses.filter(row => row.expense_date >= from && row.expense_date <= to),
    supplierPayments: data.supplierPayments.filter(row => inPeriod(row.confirmed_at || row.created_at,from,to)),
  }), [data,from,to]);
  const totals = useMemo(() => ({
    orderValue: filtered.orders.filter(row => row.status !== 'cancelled').reduce((sum,row)=>sum+Number(row.total||0),0),
    received: filtered.payments.filter(row => row.currency==='KES').reduce((sum,row)=>sum+Number(row.amount||0),0),
    outstanding: data.invoices.filter(row => ['issued','partially_paid'].includes(row.status) && row.currency==='KES').reduce((sum,row)=>sum+Math.max(0,Number(row.total)-Number(row.amount_paid)),0),
    expenses: filtered.expenses.filter(row=>['approved','paid','recorded'].includes(row.workflow_status)).reduce((sum,row)=>sum+Number(row.amount||0),0),
    supplierPaid: filtered.supplierPayments.filter(row=>row.currency==='KES').reduce((sum,row)=>sum+Number(row.amount||0),0),
  }), [data.invoices,filtered]);
  const stamp = `${from}_to_${to}`;
  const reports = [
    { name:'Orders', count:filtered.orders.length, description:'Order value and lifecycle status.', onClick:()=>downloadCsv(`orders_${stamp}.csv`,filtered.orders as unknown as Array<Record<string,unknown>>), icon:ShoppingBag },
    { name:'Invoices', count:filtered.invoices.length, description:'Issued, paid and outstanding invoice balances.', onClick:()=>downloadCsv(`invoices_${stamp}.csv`,filtered.invoices as unknown as Array<Record<string,unknown>>), icon:FileText },
    { name:'Payments received', count:filtered.payments.length, description:'Only confirmed or reconciled ledger entries.', onClick:()=>downloadCsv(`payments_${stamp}.csv`,filtered.payments as unknown as Array<Record<string,unknown>>), icon:Banknote },
    { name:'Expenses', count:filtered.expenses.length, description:'Expenses with their approval state and references.', onClick:()=>downloadCsv(`expenses_${stamp}.csv`,filtered.expenses as unknown as Array<Record<string,unknown>>), icon:TrendingDown },
    { name:'Supplier payments', count:filtered.supplierPayments.length, description:'Confirmed payments to suppliers.', onClick:()=>downloadCsv(`supplier_payments_${stamp}.csv`,filtered.supplierPayments as unknown as Array<Record<string,unknown>>), icon:Truck },
  ];

  return <div className="space-y-6">
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm"><p className="text-xs font-bold tracking-[.16em] text-brand-700">FINANCE · BUSINESS REPORTS</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-slate-900">Reports</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Download operational records from the live database. Amounts received include confirmed or reconciled payments only.</p></div><button onClick={()=>void load()} className="btn-outline btn-sm" disabled={loading}><RefreshCw size={15} className={loading?'animate-spin':''}/> Refresh</button></div><div className="mt-5 flex flex-wrap items-end gap-3"><label className="text-xs font-semibold text-slate-500">From<input className="form-control mt-1 block" type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label><label className="text-xs font-semibold text-slate-500">To<input className="form-control mt-1 block" type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label><span className="pb-2 text-xs text-slate-500">Date boundaries use Africa/Nairobi.</span></div></section>
    {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load reports: {error}. Confirm the latest migration and finance role access.</p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[
      ['Order value',money(totals.orderValue),'Non-cancelled order totals',ShoppingBag],['Cash received',money(totals.received),'Confirmed payment ledger',Banknote],['Outstanding',money(totals.outstanding),'All currently issued invoices',Activity],['Approved expenses',money(totals.expenses),'Approved, paid or recorded costs',TrendingDown],['Supplier payments',money(totals.supplierPaid),'Confirmed supplier payments',Truck],
    ].map(([label,value,note,Icon])=><article key={String(label)} className="rounded-2xl border border-line bg-white p-5 shadow-sm"><Icon size={19} className="text-brand-700"/><p className="mt-3 text-sm text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold text-slate-900">{loading?'—':value}</p><p className="mt-2 text-xs text-slate-500">{note}</p></article>)}</section>
    <section className="grid gap-4 xl:grid-cols-2">{reports.map(report=><Card key={report.name}><CardHeader title={report.name} description={report.description} actions={<button type="button" className="btn-outline btn-sm" onClick={report.onClick} disabled={loading||report.count===0}><Download size={15}/> Export CSV</button>}/><div className="flex items-center justify-between gap-4 p-5"><div><p className="text-2xl font-bold text-slate-900">{loading?'—':report.count.toLocaleString()}</p><p className="text-xs text-slate-500">records for selected period</p></div><report.icon size={22} className="text-brand-700"/></div></Card>)}</section>
    <p className="rounded-xl border border-line bg-slate-50 p-4 text-xs leading-5 text-slate-500">This report does not calculate gross or net profit: production and direct order costs are not yet allocated to individual sales. Outstanding invoice balances are current balances, while the other report counts follow the selected dates.</p>
  </div>;
}

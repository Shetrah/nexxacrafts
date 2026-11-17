import { useEffect, useState } from 'react';
import { ArrowRight, Loader2, Mail, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../AdminContext';
import { createInvoice, listInvoices, updateInvoice } from '@/lib/api/invoices';
import { listOrders } from '@/lib/api/orders';
import { sendInvoiceEmail } from '@/lib/platform';
import { formatDateTime, humanize } from '@/lib/format';
import type { InvoiceRow, OrderRow } from '@/types/db';

type InvoiceForm = { order_id: string; customer_name: string; customer_email: string; subtotal: string; tax: string; total: string; due_date: string };
const blank = (): InvoiceForm => ({ order_id: '', customer_name: '', customer_email: '', subtotal: '', tax: '0', total: '', due_date: '' });
const money = (amount: number) => `KES ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InvoicesPage() {
  const { user } = useAdmin();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [form, setForm] = useState<InvoiceForm>(blank);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function reload() {
    setLoading(true);
    try { const [invoiceRows, orderRows] = await Promise.all([listInvoices(), listOrders({ limit: 200 })]); setInvoices(invoiceRows); setOrders(orderRows); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load invoices.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  function chooseOrder(orderId: string) {
    const order = orders.find((item) => item.id === orderId);
    if (!order) { setForm((current) => ({ ...current, order_id: '' })); return; }
    const amount = order.total ?? order.subtotal;
    setForm((current) => ({ ...current, order_id: order.id, customer_name: order.customer_name, customer_email: order.customer_email, subtotal: order.subtotal == null ? '' : String(order.subtotal), tax: String(order.tax ?? 0), total: amount == null ? '' : String(amount) }));
  }

  function startInvoiceForOrder(order: OrderRow) {
    setForm(blank());
    chooseOrder(order.id);
    setOpen(true);
    setError('');
    setNotice('');
  }

  async function create(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      if (!Number.isFinite(Number(form.subtotal)) || !Number.isFinite(Number(form.total)) || Number(form.subtotal) < 0 || Number(form.total) < 0) {
        throw new Error('Enter a valid subtotal and total before issuing the invoice.');
      }
      const invoice = await createInvoice({ order_id: form.order_id || null, customer_name: form.customer_name, customer_email: form.customer_email, subtotal: Number(form.subtotal), tax: Number(form.tax || 0), total: Number(form.total), due_date: form.due_date || null, created_by: user.id });
      const issued = await updateInvoice(invoice.id, { status: 'issued', issued_at: new Date().toISOString() });
      await sendInvoiceEmail(issued.id);
      setNotice(`Invoice ${issued.invoice_number} was issued and emailed to ${issued.customer_email}.`); setOpen(false); setForm(blank()); await reload();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create and send the invoice.'); }
    finally { setSaving(false); }
  }

  const invoicedOrderIds = new Set(invoices.map((invoice) => invoice.order_id).filter((id): id is string => Boolean(id)));
  const ordersAwaitingInvoice = orders.filter((order) => order.status !== 'cancelled' && !invoicedOrderIds.has(order.id));

  async function send(invoice: InvoiceRow) {
    setSendingId(invoice.id); setError(''); setNotice('');
    try { await sendInvoiceEmail(invoice.id); setNotice(`Invoice ${invoice.invoice_number} email accepted by Resend.`); await reload(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Invoice email could not be sent.'); }
    finally { setSendingId(''); }
  }

  return <section className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-xs sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-brand-700">Finance</p><h2 className="mt-1 text-2xl font-bold">Invoices</h2><p className="mt-2 text-sm text-slate-600">Create, issue, and email invoices to customers. Resend an issued invoice whenever needed.</p></div><button type="button" onClick={()=>{setOpen((value)=>!value);setError('');setNotice('');}} className="btn-primary">{open?<X size={16}/>:<Plus size={16}/>} {open?'Close':'Create invoice'}</button></header>
    {error&&<p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800">{error}</p>}{notice&&<p role="status" className="rounded-lg border border-success-200 bg-success-50 p-3 text-sm text-success-800">{notice}</p>}
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><div><h3 className="font-semibold">Website orders awaiting invoices</h3><p className="mt-1 text-xs text-slate-500">Orders placed on the website appear here until an invoice is linked to them.</p></div><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{loading ? 'Loading…' : `${ordersAwaitingInvoice.length} awaiting`}</span></div>{loading?<div className="p-6 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" size={20}/>Loading website orders…</div>:ordersAwaitingInvoice.length===0?<p className="p-8 text-center text-sm text-slate-500">No website orders are waiting for an invoice.</p>:<div className="divide-y divide-line">{ordersAwaitingInvoice.map((order)=>{const hasPrice=order.total!=null||order.subtotal!=null;return <article key={order.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center"><div><p className="font-bold">{order.reference}</p><p className="mt-1 text-sm text-slate-600">{order.customer_name} · {order.customer_email}</p><p className="mt-1 text-xs text-slate-400">Placed {order.created_at?formatDateTime(order.created_at):'—'} · {humanize(order.status)}</p></div><div><p className="font-semibold">{hasPrice?money(order.total??order.subtotal??0):'Quotation required'}</p><p className="mt-1 text-xs text-slate-500">{hasPrice?'Order amount is available':'Confirm the order price before issuing an invoice.'}</p></div><button type="button" onClick={()=>startInvoiceForOrder(order)} className="btn-primary">{hasPrice?'Create invoice':'Set price & invoice'} <ArrowRight size={15}/></button></article>})}</div>}</div>
    {open&&<form onSubmit={create} className="grid gap-4 rounded-xl border border-line bg-white p-5 shadow-xs sm:grid-cols-2 sm:p-6"><h3 className="sm:col-span-2 text-lg font-bold">Create and send an invoice</h3>
      <label className="text-sm font-semibold sm:col-span-2">Link to customer order<select className="form-control mt-1" value={form.order_id} onChange={(event)=>chooseOrder(event.target.value)}><option value="">Manual invoice (no order link)</option>{orders.filter((order)=>order.status!=='cancelled').map((order)=><option key={order.id} value={order.id}>{order.reference} · {order.customer_name} · {order.customer_email}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Selecting an order fills its customer details and current totals.</span></label>
      <label className="text-sm font-semibold">Customer name<input required className="form-control mt-1" value={form.customer_name} onChange={(event)=>setForm((current)=>({...current,customer_name:event.target.value}))}/></label><label className="text-sm font-semibold">Customer email<input required type="email" className="form-control mt-1" value={form.customer_email} onChange={(event)=>setForm((current)=>({...current,customer_email:event.target.value}))}/></label>
      <label className="text-sm font-semibold">Subtotal (KES)<input required type="number" min="0" step="0.01" className="form-control mt-1" value={form.subtotal} onChange={(event)=>setForm((current)=>({...current,subtotal:event.target.value}))}/></label><label className="text-sm font-semibold">Tax (KES)<input type="number" min="0" step="0.01" className="form-control mt-1" value={form.tax} onChange={(event)=>setForm((current)=>({...current,tax:event.target.value}))}/></label>
      <label className="text-sm font-semibold">Total (KES)<input required type="number" min="0" step="0.01" className="form-control mt-1" value={form.total} onChange={(event)=>setForm((current)=>({...current,total:event.target.value}))}/></label><label className="text-sm font-semibold">Due date<input type="date" className="form-control mt-1" value={form.due_date} onChange={(event)=>setForm((current)=>({...current,due_date:event.target.value}))}/></label>
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-outline" onClick={()=>setOpen(false)}>Cancel</button><button disabled={saving} className="btn-primary">{saving?<Loader2 className="animate-spin" size={16}/>:<Mail size={16}/>} {saving?'Creating and sending…':'Issue and email invoice'}</button></div>
    </form>}
    <div className="overflow-hidden rounded-xl border border-line bg-white"><div className="border-b border-line px-5 py-4"><h3 className="font-semibold">Recent invoices</h3><p className="mt-1 text-xs text-slate-500">Invoice emails are marked sent when Resend accepts them.</p></div>{loading?<div className="p-8 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" size={20}/>Loading invoices…</div>:invoices.length===0?<p className="p-8 text-center text-sm text-slate-500">No invoices created yet.</p>:<div className="divide-y divide-line">{invoices.map((invoice)=><article key={invoice.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_1fr_auto] sm:items-center"><div><p className="font-bold">{invoice.invoice_number}</p><p className="mt-1 text-sm text-slate-600">{invoice.customer_name} · {invoice.customer_email||'No email'}</p><p className="mt-1 text-xs text-slate-400">{invoice.created_at?formatDateTime(invoice.created_at):''}</p></div><div><p className="text-lg font-bold">{money(invoice.total)}</p><p className="mt-1 text-xs text-slate-500">{humanize(invoice.status)} · Due {invoice.due_date||'as agreed'}</p><p className="mt-1 text-xs text-slate-500">{invoice.sent_at?`Sent ${formatDateTime(invoice.sent_at)}`:'Not emailed'}</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={sendingId===invoice.id||invoice.status==='draft'||invoice.status==='void'} onClick={()=>void send(invoice)} className="btn-outline">{sendingId===invoice.id?<Loader2 className="animate-spin" size={15}/>:<Mail size={15}/>} {invoice.sent_at?'Resend':'Email invoice'}</button>{invoice.order_id&&<Link to={`/admin/orders?order=${encodeURIComponent(invoice.order_id)}`} className="btn-outline">Order <ArrowRight size={15}/></Link>}</div></article>)}</div>}</div>
  </section>;
}

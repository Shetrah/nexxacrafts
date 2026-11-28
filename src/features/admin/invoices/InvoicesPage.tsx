import { useEffect, useState } from 'react';
import { ArrowRight, Ban, Check, Loader2, Mail, Plus, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../AdminContext';
import { createInvoice, listInvoices, updateInvoice } from '@/lib/api/invoices';
import { listOrders } from '@/lib/api/orders';
import { sendInvoiceEmail } from '@/lib/platform';
import { formatDateTime, humanize } from '@/lib/format';
import type { InvoiceRow, OrderRow } from '@/types/db';
import { supabase } from '@/lib/supabase';

type InvoiceForm = { order_id: string; customer_name: string; customer_email: string; subtotal: string; tax: string; total: string; due_date: string };
type StandaloneInvoiceForm = { customer_name: string; customer_email: string; customer_phone: string; items: InvoiceLineItem[]; delivery_fee: string; tax: string; due_date: string; notes: string };
type InvoiceLineItem = { description: string; quantity: string; rate: string; amount: number };
const blank = (): InvoiceForm => ({ order_id: '', customer_name: '', customer_email: '', subtotal: '', tax: '0', total: '', due_date: '' });
const blankStandalone = (): StandaloneInvoiceForm => ({ customer_name: '', customer_email: '', customer_phone: '', items: [{ description: '', quantity: '1', rate: '', amount: 0 }], delivery_fee: '0', tax: '0', due_date: '', notes: '' });
const blankItem = (): InvoiceLineItem => ({ description: '', quantity: '1', rate: '', amount: 0 });
const money = (amount: number) => `KES ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InvoicesPage() {
  const { user, role } = useAdmin();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [form, setForm] = useState<InvoiceForm>(blank);
  const [standaloneForm, setStandaloneForm] = useState<StandaloneInvoiceForm>(blankStandalone);
  const [standaloneStep, setStandaloneStep] = useState<'edit' | 'preview'>('edit');
  const [open, setOpen] = useState(false);
  const [standaloneOpen, setStandaloneOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState('');
  const [actionId, setActionId] = useState('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'mpesa' | 'bank'>('mpesa');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  
  // Edit invoice state
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRow | null>(null);
  const [editForm, setEditForm] = useState({ subtotal: '', deliveryFee: '', tax: '', reason: '' });
  const [editSaving, setEditSaving] = useState(false);

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
      const delivery = await sendInvoiceEmail(issued.id);
      const sentChannels = [delivery.emailSent ? 'email' : '', delivery.whatsappSent ? 'WhatsApp' : ''].filter(Boolean);
      const deliveryIssues = [!delivery.emailSent ? `Email: ${delivery.emailError || 'not accepted by Resend'}` : '', !delivery.whatsappSent ? `WhatsApp: ${delivery.whatsappError || 'not accepted by provider'}` : ''].filter(Boolean);
      if (deliveryIssues.length) setError(`Invoice ${issued.invoice_number} was issued, but delivery was partial (${sentChannels.join(' and ') || 'no channel'} accepted). ${deliveryIssues.join(' · ')} Use Resend invoice below to retry.`);
      else setNotice(`Invoice ${issued.invoice_number} was issued and sent by email and WhatsApp.`);
      setOpen(false); setForm(blank()); await reload();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create and send the invoice.'); }
    finally { setSaving(false); }
  }

  const invoicedOrderIds = new Set(invoices.map((invoice) => invoice.order_id).filter((id): id is string => Boolean(id)));
  const ordersAwaitingInvoice = orders.filter((order) => order.status !== 'cancelled' && !invoicedOrderIds.has(order.id));

  async function send(invoice: InvoiceRow) {
    setSendingId(invoice.id); setError(''); setNotice('');
    try {
      const delivery = await sendInvoiceEmail(invoice.id);
      const sentChannels = [delivery.emailSent ? 'email' : '', delivery.whatsappSent ? 'WhatsApp' : ''].filter(Boolean);
      const deliveryIssues = [!delivery.emailSent ? `Email: ${delivery.emailError || 'not accepted by Resend'}` : '', !delivery.whatsappSent ? `WhatsApp: ${delivery.whatsappError || 'not accepted by provider'}` : ''].filter(Boolean);
      if (deliveryIssues.length) setError(`Invoice ${invoice.invoice_number} delivery was partial (${sentChannels.join(' and ') || 'no channel'} accepted). ${deliveryIssues.join(' · ')}`);
      else setNotice(`Invoice ${invoice.invoice_number} resent by email and WhatsApp.`);
      await reload();
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Invoice email could not be sent.'); }
    finally { setSendingId(''); }
  }

  async function revoke(invoice: InvoiceRow) {
    if (!supabase) return;
    setActionId(invoice.id); setError(''); setNotice('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('contact-email', { body: { kind: 'invoice_revoked', invoiceId: invoice.id } });
      if (invokeError) {
        const response = (invokeError as typeof invokeError & { context?: Response }).context;
        const body = response ? await response.clone().json().catch(()=>null) : null;
        throw new Error(body?.error || invokeError.message || 'Invoice revoke function failed; deploy contact-email first.');
      }
      if (data?.error) throw new Error(data.error);
      setNotice(`Invoice ${invoice.invoice_number} was revoked and the client was emailed.${data?.orderDeleted?' The linked order was deleted.':''}`);
      await reload();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not revoke invoice.'); }
    finally { setActionId(''); }
  }

  async function markPaid(invoice: InvoiceRow) {
    if (!supabase || !invoice.order_id) { setError('This invoice must be linked to an order to record payment.'); return; }
    if (invoice.status === 'draft' || invoice.status === 'void' || invoice.status === 'paid') { setError('Only an active, unpaid invoice can be marked paid.'); return; }
    setActionId(invoice.id); setError(''); setNotice('');
    try {
      const { data: paymentId, error: paymentError } = await supabase.rpc('record_admin_invoice_payment', { p_invoice_id: invoice.id, p_method: manualPaymentMethod });
      if (paymentError) throw paymentError;
      if (typeof paymentId !== 'string') throw new Error('Payment record was not created.');
      const { data, error: invokeError } = await supabase.functions.invoke('payhero-payments', { body: { action: 'retry-notifications', paymentId } });
      if (invokeError) {
        const response = (invokeError as typeof invokeError & { context?: Response }).context;
        const body = response ? await response.clone().json().catch(()=>null) : null;
        throw new Error(body?.error || invokeError.message || 'Payment was recorded, but receipt email failed. Deploy payhero-payments.');
      }
      if (data?.error) throw new Error(data.error);
      if (data?.customerEmailSent !== true || data?.customerWhatsappSent !== true) throw new Error(data?.error || 'Payment was recorded, but both receipt email and WhatsApp delivery were not confirmed. Retry delivery from the Payments page.');
      setNotice(`Invoice ${invoice.invoice_number} marked paid; the PDF receipt was accepted by Resend and WhatsApp for ${data.customerEmail || invoice.customer_email || 'the client'}.`);
      await reload();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not record payment and send receipt.'); }
    finally { setActionId(''); await reload(); }
  }

  async function deleteInvoice(invoice: InvoiceRow) {
    if (!supabase || role !== 'admin') return;
    const detail = invoice.amount_paid > 0
      ? ` This invoice has ${money(invoice.amount_paid)} recorded as paid; payment ledger records will be retained.`
      : '';
    if (!window.confirm(`Permanently delete invoice ${invoice.invoice_number}?${detail}`)) return;
    setActionId(invoice.id); setError(''); setNotice('');
    try {
      // Documents use stable object names. Remove the generated invoice and any receipt PDFs
      // associated with its payment records before deleting the invoice row.
      const paths = [`invoices/${invoice.id}.pdf`];
      if (invoice.order_id) {
        const { data: payments, error: paymentsError } = await supabase
          .from('payments').select('id').eq('order_id', invoice.order_id);
        if (paymentsError) throw paymentsError;
        for (const payment of payments ?? []) paths.push(`receipts/${payment.id}.pdf`);
      }
      const { error: storageError } = await supabase.storage.from('payment-documents').remove(paths);
      if (storageError) throw new Error(`Could not delete the invoice PDF files: ${storageError.message}`);
      const { error: deleteError } = await supabase.rpc('delete_admin_invoice', { p_invoice_id: invoice.id });
      if (deleteError) throw deleteError;
      setNotice(`Invoice ${invoice.invoice_number} and its generated PDFs were deleted. Related payment ledger entries were retained.`);
      await reload();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete invoice.'); }
    finally { setActionId(''); }
  }

  function startEditInvoice(invoice: InvoiceRow) {
    if (invoice.status === 'paid') {
      setError('Cannot edit a paid invoice.');
      return;
    }
    setEditingInvoice(invoice);
    // Calculate delivery fee from total - subtotal
    const deliveryFee = Number(invoice.total) - Number(invoice.subtotal);
    setEditForm({
      subtotal: String(invoice.subtotal),
      deliveryFee: String(deliveryFee >= 0 ? deliveryFee : 0),
      tax: String(invoice.tax || 0),
      reason: '',
    });
    setError('');
    setNotice('');
  }

  async function saveEditInvoice(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !editingInvoice) return;
    
    setEditSaving(true);
    setError('');
    setNotice('');
    
    try {
      const subtotal = Number(editForm.subtotal);
      const deliveryFee = Number(editForm.deliveryFee);
      const tax = Number(editForm.tax);
      
      if (!Number.isFinite(subtotal) || subtotal < 0) {
        throw new Error('Enter a valid subtotal amount.');
      }
      if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
        throw new Error('Enter a valid delivery fee.');
      }
      if (!Number.isFinite(tax) || tax < 0) {
        throw new Error('Enter a valid tax amount.');
      }
      
      const { data, error: updateError } = await supabase.rpc('update_admin_invoice', {
        p_invoice_id: editingInvoice.id,
        p_new_subtotal: subtotal,
        p_new_delivery_fee: deliveryFee,
        p_new_tax: tax,
        p_reason: editForm.reason || null,
      });
      
      if (updateError) throw updateError;
      
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) {
        throw new Error(result?.message || 'Invoice update failed.');
      }
      
      setNotice(`Invoice ${editingInvoice.invoice_number} updated successfully. New total: ${money(subtotal + deliveryFee + tax)}`);
      setEditingInvoice(null);
      setEditForm({ subtotal: '', deliveryFee: '', tax: '', reason: '' });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update invoice.');
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteInvoice(invoice: InvoiceRow) {
    if (!supabase || role !== 'admin') return;
    const detail = invoice.amount_paid > 0
      ? ` This invoice has ${money(invoice.amount_paid)} recorded as paid; payment ledger records will be retained.`
      : '';
    if (!window.confirm(`Permanently delete invoice ${invoice.invoice_number}?${detail}`)) return;
    setActionId(invoice.id); setError(''); setNotice('');
    try {
      // Documents use stable object names. Remove the generated invoice and any receipt PDFs
      // associated with its payment records before deleting the invoice row.
      const paths = [`invoices/${invoice.id}.pdf`];
      if (invoice.order_id) {
        const { data: payments, error: paymentsError } = await supabase
          .from('payments').select('id').eq('order_id', invoice.order_id);
        if (paymentsError) throw paymentsError;
        for (const payment of payments ?? []) paths.push(`receipts/${payment.id}.pdf`);
      }
      const { error: storageError } = await supabase.storage.from('payment-documents').remove(paths);
      if (storageError) throw new Error(`Could not delete the invoice PDF files: ${storageError.message}`);
      const { error: deleteError } = await supabase.rpc('delete_admin_invoice', { p_invoice_id: invoice.id });
      if (deleteError) throw deleteError;
      setNotice(`Invoice ${invoice.invoice_number} and its generated PDFs were deleted. Related payment ledger entries were retained.`);
      await reload();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete invoice.'); }
    finally { setActionId(''); }
  }


  // Standalone invoice functions
  function updateStandaloneItem(index: number, field: keyof InvoiceLineItem, value: string | number) {
    setStandaloneForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      
      if (field === 'quantity' || field === 'rate') {
        const qty = Number(field === 'quantity' ? value : items[index].quantity) || 0;
        const rate = Number(field === 'rate' ? value : items[index].rate) || 0;
        items[index].amount = qty * rate;
      }
      
      return { ...prev, items };
    });
  }
  
  function addStandaloneItem() {
    setStandaloneForm(prev => ({ ...prev, items: [...prev.items, blankItem()] }));
  }
  
  function removeStandaloneItem(index: number) {
    if (standaloneForm.items.length === 1) return;
    setStandaloneForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }
  
  function calculateStandaloneTotal() {
    const subtotal = standaloneForm.items.reduce((sum, item) => sum + item.amount, 0);
    const deliveryFee = Number(standaloneForm.delivery_fee) || 0;
    const tax = Number(standaloneForm.tax) || 0;
    return { subtotal, deliveryFee, tax, total: subtotal + deliveryFee + tax };
  }
  
  async function createStandaloneInvoice(event: React.FormEvent) {
    event.preventDefault(); 
    setSaving(true); 
    setError(''); 
    setNotice('');
    
    try {
      if (!standaloneForm.customer_name.trim()) {
        throw new Error('Customer name is required.');
      }
      if (!standaloneForm.customer_phone.trim()) {
        throw new Error('Customer phone is required.');
      }
      
      const hasValidItems = standaloneForm.items.some(item => item.description.trim() && item.amount > 0);
      if (!hasValidItems) {
        throw new Error('Add at least one item with a description and amount.');
      }
      
      const { subtotal, deliveryFee, tax, total } = calculateStandaloneTotal();
      
      if (total <= 0) {
        throw new Error('Invoice total must be greater than zero.');
      }
      
      const invoice = await createInvoice({
        order_id: null,
        customer_name: standaloneForm.customer_name.trim(),
        customer_email: standaloneForm.customer_email.trim() || null,
        subtotal: subtotal + deliveryFee,
        tax,
        total,
        due_date: standaloneForm.due_date || null,
        created_by: user.id,
      });
      
      const issued = await updateInvoice(invoice.id, { 
        status: 'issued', 
        issued_at: new Date().toISOString() 
      });
      
      const delivery = await sendInvoiceEmail(issued.id);
      const sentChannels = [
        delivery.emailSent ? 'email' : '', 
        delivery.whatsappSent ? 'WhatsApp' : ''
      ].filter(Boolean);
      const deliveryIssues = [
        !delivery.emailSent && standaloneForm.customer_email ? `Email: ${delivery.emailError || 'not accepted'}` : '', 
        !delivery.whatsappSent ? `WhatsApp: ${delivery.whatsappError || 'not accepted'}` : ''
      ].filter(Boolean);
      
      if (deliveryIssues.length) {
        setError(`Invoice ${issued.invoice_number} was issued, but delivery was partial (${sentChannels.join(' and ') || 'no channel'} accepted). ${deliveryIssues.join(' · ')} Use Resend invoice below to retry.`);
      } else {
        setNotice(`Invoice ${issued.invoice_number} was issued and sent${sentChannels.length ? ` by ${sentChannels.join(' and ')}` : ''}.`);
      }
      
      setStandaloneOpen(false);
      setStandaloneForm(blankStandalone());
      setStandaloneStep('edit');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create and send the invoice.');
    } finally {
      setSaving(false);
    }
  }
  return <section className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-xs sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-brand-700">Finance</p><h2 className="mt-1 text-2xl font-bold">Invoices</h2><p className="mt-2 text-sm text-slate-600">Create, issue, and email invoices to customers. Resend an issued invoice whenever needed.</p></div><div className="flex gap-2">
      <button type="button" onClick={()=>{setOpen((value)=>!value);setError('');setNotice('');}} className="btn-outline">{open?<X size={16}/>:<Plus size={16}/>} {open?'Close':'From order'}</button>
      <button type="button" onClick={()=>{setStandaloneOpen((value)=>!value);setError('');setNotice('');}} className="btn-primary">{standaloneOpen?<X size={16}/>:<Plus size={16}/>} {standaloneOpen?'Close':'Walk-in invoice'}</button>
    </div></header>
    {error&&<p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800">{error}</p>}{notice&&<p role="status" className="rounded-lg border border-success-200 bg-success-50 p-3 text-sm text-success-800">{notice}</p>}
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><div><h3 className="font-semibold">Website orders awaiting invoices</h3><p className="mt-1 text-xs text-slate-500">Orders placed on the website appear here until an invoice is linked to them.</p></div><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{loading ? 'Loading…' : `${ordersAwaitingInvoice.length} awaiting`}</span></div>{loading?<div className="p-6 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" size={20}/>Loading website orders…</div>:ordersAwaitingInvoice.length===0?<p className="p-8 text-center text-sm text-slate-500">No website orders are waiting for an invoice.</p>:<div className="divide-y divide-line">{ordersAwaitingInvoice.map((order)=>{const hasPrice=order.total!=null||order.subtotal!=null;return <article key={order.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center"><div><p className="font-bold">{order.reference}</p><p className="mt-1 text-sm text-slate-600">{order.customer_name} · {order.customer_email}</p><p className="mt-1 text-xs text-slate-400">Placed {order.created_at?formatDateTime(order.created_at):'—'} · {humanize(order.status)}</p></div><div><p className="font-semibold">{hasPrice?money(order.total??order.subtotal??0):'Quotation required'}</p><p className="mt-1 text-xs text-slate-500">{hasPrice?'Order amount is available':'Confirm the order price before issuing an invoice.'}</p></div><button type="button" onClick={()=>startInvoiceForOrder(order)} className="btn-primary">{hasPrice?'Create invoice':'Set price & invoice'} <ArrowRight size={15}/></button></article>})}</div>}</div>
    {open&&<form onSubmit={create} className="grid gap-4 rounded-xl border border-line bg-white p-5 shadow-xs sm:grid-cols-2 sm:p-6"><h3 className="sm:col-span-2 text-lg font-bold">Create and send an invoice</h3>
      <label className="text-sm font-semibold sm:col-span-2">Link to customer order<select className="form-control mt-1" value={form.order_id} onChange={(event)=>chooseOrder(event.target.value)}><option value="">Manual invoice (no order link)</option>{orders.filter((order)=>order.status!=='cancelled').map((order)=><option key={order.id} value={order.id}>{order.reference} · {order.customer_name} · {order.customer_email}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Selecting an order fills its customer details and current totals.</span></label>
      <label className="text-sm font-semibold">Customer name<input required className="form-control mt-1" value={form.customer_name} onChange={(event)=>setForm((current)=>({...current,customer_name:event.target.value}))}/></label><label className="text-sm font-semibold">Customer email<input required type="email" className="form-control mt-1" value={form.customer_email} onChange={(event)=>setForm((current)=>({...current,customer_email:event.target.value}))}/></label>
      <label className="text-sm font-semibold">Subtotal (KES)<input required type="number" min="0" step="0.01" className="form-control mt-1" value={form.subtotal} onChange={(event)=>setForm((current)=>({...current,subtotal:event.target.value}))}/></label><label className="text-sm font-semibold">Tax (KES)<input type="number" min="0" step="0.01" className="form-control mt-1" value={form.tax} onChange={(event)=>setForm((current)=>({...current,tax:event.target.value}))}/></label>
      <label className="text-sm font-semibold">Total (KES)<input required type="number" min="0" step="0.01" className="form-control mt-1" value={form.total} onChange={(event)=>setForm((current)=>({...current,total:event.target.value}))}/></label><label className="text-sm font-semibold">Due date<input type="date" className="form-control mt-1" value={form.due_date} onChange={(event)=>setForm((current)=>({...current,due_date:event.target.value}))}/></label>
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-outline" onClick={()=>setOpen(false)}>Cancel</button><button disabled={saving} className="btn-primary">{saving?<Loader2 className="animate-spin" size={16}/>:<Mail size={16}/>} {saving?'Creating and sending…':'Issue and email invoice'}</button></div>
    </form>}

    {/* Standalone Walk-in Invoice Form */}
    {standaloneOpen && standaloneStep === 'edit' && (
      <form onSubmit={(e) => { e.preventDefault(); setStandaloneStep('preview'); }} className="grid gap-4 rounded-xl border border-line bg-white p-5 shadow-xs sm:p-6">
        <h3 className="text-lg font-bold sm:col-span-2">Walk-in Client Invoice</h3>
        <p className="text-sm text-slate-600 sm:col-span-2">Create an invoice for a walk-in client without an existing order.</p>
        
        <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2">
          <label className="text-sm font-semibold">
            Customer name *
            <input
              required
              className="form-control mt-1"
              value={standaloneForm.customer_name}
              onChange={(e) => setStandaloneForm({ ...standaloneForm, customer_name: e.target.value })}
              placeholder="John Doe"
            />
          </label>
          
          <label className="text-sm font-semibold">
            Phone number *
            <input
              required
              type="tel"
              className="form-control mt-1"
              value={standaloneForm.customer_phone}
              onChange={(e) => setStandaloneForm({ ...standaloneForm, customer_phone: e.target.value })}
              placeholder="0712345678"
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">Used for WhatsApp delivery</span>
          </label>
          
          <label className="text-sm font-semibold sm:col-span-2">
            Email (optional)
            <input
              type="email"
              className="form-control mt-1"
              value={standaloneForm.customer_email}
              onChange={(e) => setStandaloneForm({ ...standaloneForm, customer_email: e.target.value })}
              placeholder="john@example.com"
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">Leave blank if customer doesn't have email</span>
          </label>
        </div>
        
        <div className="sm:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold">Invoice Items</label>
            <button type="button" onClick={addStandaloneItem} className="btn-outline text-xs">
              <Plus size={14} /> Add item
            </button>
          </div>
          
          {standaloneForm.items.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <label className="text-xs font-semibold">
                Description *
                <input
                  required
                  className="form-control mt-1"
                  value={item.description}
                  onChange={(e) => updateStandaloneItem(index, 'description', e.target.value)}
                  placeholder="Banner printing"
                />
              </label>
              
              <label className="text-xs font-semibold">
                Quantity *
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  className="form-control mt-1"
                  value={item.quantity}
                  onChange={(e) => updateStandaloneItem(index, 'quantity', e.target.value)}
                />
              </label>
              
              <label className="text-xs font-semibold">
                Rate (KES) *
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control mt-1"
                  value={item.rate}
                  onChange={(e) => updateStandaloneItem(index, 'rate', e.target.value)}
                />
              </label>
              
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeStandaloneItem(index)}
                  disabled={standaloneForm.items.length === 1}
                  className="btn-outline text-red-600 disabled:opacity-30"
                  title="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="sm:col-span-4 text-right text-sm font-semibold text-slate-700">
                Amount: {money(item.amount)}
              </div>
            </div>
          ))}
        </div>
        
        <div className="grid gap-4 sm:grid-cols-3 sm:col-span-2">
          <label className="text-sm font-semibold">
            Delivery fee (KES)
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control mt-1"
              value={standaloneForm.delivery_fee}
              onChange={(e) => setStandaloneForm({ ...standaloneForm, delivery_fee: e.target.value })}
            />
          </label>
          
          <label className="text-sm font-semibold">
            Tax (KES)
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control mt-1"
              value={standaloneForm.tax}
              onChange={(e) => setStandaloneForm({ ...standaloneForm, tax: e.target.value })}
            />
          </label>
          
          <label className="text-sm font-semibold">
            Due date
            <input
              type="date"
              className="form-control mt-1"
              value={standaloneForm.due_date}
              onChange={(e) => setStandaloneForm({ ...standaloneForm, due_date: e.target.value })}
            />
          </label>
        </div>
        
        <label className="text-sm font-semibold sm:col-span-2">
          Notes (optional)
          <textarea
            className="form-control mt-1 min-h-20"
            value={standaloneForm.notes}
            onChange={(e) => setStandaloneForm({ ...standaloneForm, notes: e.target.value })}
            placeholder="Additional terms or instructions"
          />
        </label>
        
        <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 sm:col-span-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span className="font-semibold">{money(calculateStandaloneTotal().subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span>Delivery fee:</span>
            <span className="font-semibold">{money(calculateStandaloneTotal().deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span>Tax:</span>
            <span className="font-semibold">{money(calculateStandaloneTotal().tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-brand-200">
            <span>Total:</span>
            <span className="text-brand-700">{money(calculateStandaloneTotal().total)}</span>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn-outline" onClick={() => { setStandaloneOpen(false); setStandaloneForm(blankStandalone()); setStandaloneStep('edit'); }}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Preview invoice <ArrowRight size={16} />
          </button>
        </div>
      </form>
    )}

    {/* Standalone Invoice Preview */}
    {standaloneOpen && standaloneStep === 'preview' && (
      <div className="rounded-xl border border-line bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold">Preview Walk-in Invoice</h3>
          <button type="button" onClick={() => setStandaloneStep('edit')} className="btn-outline text-sm">
            <ArrowRight size={16} className="rotate-180" /> Back to edit
          </button>
        </div>
        
        <div className="rounded-lg border border-line bg-slate-50 p-6 space-y-4">
          <div className="border-b border-slate-300 pb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">Invoice To</h4>
            <p className="mt-2 font-semibold">{standaloneForm.customer_name}</p>
            <p className="text-sm text-slate-600">{standaloneForm.customer_phone}</p>
            {standaloneForm.customer_email && <p className="text-sm text-slate-600">{standaloneForm.customer_email}</p>}
          </div>
          
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Items</h4>
            <div className="space-y-2">
              {standaloneForm.items.map((item, index) => (
                item.description && item.amount > 0 && (
                  <div key={index} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-xs text-slate-500">{item.quantity} × {money(Number(item.rate))}</p>
                    </div>
                    <p className="font-semibold">{money(item.amount)}</p>
                  </div>
                )
              ))}
            </div>
          </div>
          
          <div className="border-t border-slate-300 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-semibold">{money(calculateStandaloneTotal().subtotal)}</span>
            </div>
            {calculateStandaloneTotal().deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Delivery fee:</span>
                <span className="font-semibold">{money(calculateStandaloneTotal().deliveryFee)}</span>
              </div>
            )}
            {calculateStandaloneTotal().tax > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span className="font-semibold">{money(calculateStandaloneTotal().tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-slate-300 pt-2">
              <span>Total:</span>
              <span className="text-brand-700">{money(calculateStandaloneTotal().total)}</span>
            </div>
          </div>
          
          {standaloneForm.notes && (
            <div className="border-t border-slate-300 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Notes</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{standaloneForm.notes}</p>
            </div>
          )}
          
          {standaloneForm.due_date && (
            <div className="text-sm text-slate-600">
              <span className="font-semibold">Due date:</span> {new Date(standaloneForm.due_date).toLocaleDateString()}
            </div>
          )}
        </div>
        
        <form onSubmit={createStandaloneInvoice} className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={() => setStandaloneStep('edit')}>
            Edit invoice
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
            {saving ? 'Creating and sending…' : 'Issue and send invoice'}
          </button>
        </form>
      </div>
    )}

    <div className="overflow-hidden rounded-xl border border-line bg-white"><div className="border-b border-line px-5 py-4"><h3 className="font-semibold">Recent invoices</h3><p className="mt-1 text-xs text-slate-500">Delivery status reflects when Resend or WhatsApp accepts the invoice; use Resend invoice to retry either channel.</p></div>{loading?<div className="p-8 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" size={20}/>Loading invoices…</div>:invoices.length===0?<p className="p-8 text-center text-sm text-slate-500">No invoices created yet.</p>:<div className="divide-y divide-line">{invoices.map((invoice)=><article key={invoice.id} className="grid gap-x-6 gap-y-4 px-5 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(15rem,.8fr)] lg:items-start">
      <div className="min-w-0"><p className="font-bold">{invoice.invoice_number}</p><p className="mt-1 text-sm text-slate-600">{invoice.customer_name}</p><p className="break-all text-sm text-slate-600">{invoice.customer_email||'No email'}</p><p className="mt-1 text-xs text-slate-400">{invoice.created_at?formatDateTime(invoice.created_at):''}</p></div>
      <div className="min-w-0 lg:text-right"><p className="text-lg font-bold">{money(invoice.total)}</p><p className="mt-1 text-xs text-slate-500">{humanize(invoice.status)} · Balance {money(Math.max(0,invoice.total-invoice.amount_paid))}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 lg:justify-end"><span>Email: {invoice.sent_at?`accepted ${formatDateTime(invoice.sent_at)}`:'not confirmed'}</span><span>WhatsApp: {invoice.whatsapp_sent_at?`accepted ${formatDateTime(invoice.whatsapp_sent_at)}`:'not confirmed'}</span></div></div>
      <div className="grid gap-2 border-t border-line pt-3 lg:col-span-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={sendingId===invoice.id||invoice.status==='draft'||invoice.status==='void'} onClick={()=>void send(invoice)} className="btn-outline whitespace-nowrap">{sendingId===invoice.id?<Loader2 className="animate-spin" size={15}/>:<Mail size={15}/>} {invoice.sent_at||invoice.whatsapp_sent_at?'Resend invoice':'Send invoice'}</button>
          {invoice.status!=='paid'&&invoice.status!=='void'&&<button type="button" onClick={()=>startEditInvoice(invoice)} className="btn-outline whitespace-nowrap">Edit amounts</button>}
          {invoice.status!=='paid'&&invoice.status!=='void'&&invoice.status!=='draft'&&<><label className="sr-only" htmlFor={`payment-method-${invoice.id}`}>Manual payment method</label><select id={`payment-method-${invoice.id}`} className="form-control w-auto min-w-32" value={manualPaymentMethod} onChange={event=>setManualPaymentMethod(event.target.value as 'mpesa'|'bank')}><option value="mpesa">M-Pesa</option><option value="bank">Bank</option></select><button type="button" disabled={actionId===invoice.id} onClick={()=>void markPaid(invoice)} className="btn-outline whitespace-nowrap">{actionId===invoice.id?<Loader2 className="animate-spin" size={15}/>:<Check size={15}/>} Mark paid</button></>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status!=='void'&&invoice.status!=='paid'&&<button type="button" disabled={actionId===invoice.id} onClick={()=>void revoke(invoice)} className="btn-outline whitespace-nowrap text-red-700">{actionId===invoice.id?<Loader2 className="animate-spin" size={15}/>:<Ban size={15}/>} Revoke</button>}
          {invoice.order_id&&<Link to={`/admin/orders?order=${encodeURIComponent(invoice.order_id)}`} className="btn-outline whitespace-nowrap">Order <ArrowRight size={15}/></Link>}
          {role==='admin'&&<button type="button" disabled={actionId===invoice.id} onClick={()=>void deleteInvoice(invoice)} className="btn-outline whitespace-nowrap text-red-700">{actionId===invoice.id?<Loader2 className="animate-spin" size={15}/>:<Trash2 size={15}/>} Delete invoice</button>}
        </div>
      </div>
    </article>)}</div>}</div>
    
    {/* Edit Invoice Modal */}
    {editingInvoice && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setEditingInvoice(null); }}>
        <form onSubmit={saveEditInvoice} className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-2xl">
          <h3 className="text-xl font-bold">Edit Invoice {editingInvoice.invoice_number}</h3>
          <p className="mt-2 text-sm text-slate-600">Update amounts when client requests changes (e.g., different size, additional items). The invoice will be updated and can be resent.</p>
          
          <div className="mt-6 space-y-4">
            <label className="text-sm font-semibold">
              Subtotal (KES) *
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className="form-control mt-1"
                value={editForm.subtotal}
                onChange={(e) => setEditForm({ ...editForm, subtotal: e.target.value })}
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Total of all line items (service + design assistance)
              </span>
            </label>
            
            <label className="text-sm font-semibold">
              Delivery Fee (KES)
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control mt-1"
                value={editForm.deliveryFee}
                onChange={(e) => setEditForm({ ...editForm, deliveryFee: e.target.value })}
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Shown separately below subtotal on invoice
              </span>
            </label>
            
            <label className="text-sm font-semibold">
              Tax (KES)
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control mt-1"
                value={editForm.tax}
                onChange={(e) => setEditForm({ ...editForm, tax: e.target.value })}
              />
            </label>
            
            <label className="text-sm font-semibold">
              Reason for change (optional)
              <textarea
                className="form-control mt-1 min-h-20"
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                placeholder="E.g., Client requested larger banner size"
              />
            </label>
            
            <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm">
              <p className="font-semibold text-brand-900">New Total</p>
              <p className="mt-1 text-lg font-bold text-brand-700">
                {money((Number(editForm.subtotal) || 0) + (Number(editForm.deliveryFee) || 0) + (Number(editForm.tax) || 0))}
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="btn-outline"
              onClick={() => setEditingInvoice(null)}
              disabled={editSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={editSaving}
            >
              {editSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              {editSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    )}
  </section>;
}

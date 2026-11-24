import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, PackageCheck, Plus, RefreshCw, Truck, X } from 'lucide-react';
import { Card, CardBody, CardHeader, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { formatDateTime, formatMoney, humanize } from '@/lib/format';
import { useAdmin } from '../AdminContext';

type Supplier = { id: string; name: string; phone: string | null; email: string | null; is_active: boolean };
type StockItem = { id: string; name: string; sku: string | null; unit: string; quantity_on_hand: number; average_cost: number; is_active: boolean };
type Request = { id: string; reference: string; supplier_id: string | null; status: string; expected_at: string | null; notes: string | null; requested_by: string | null; approved_by: string | null; created_at: string };
type RequestLine = { id: string; purchase_request_id: string; inventory_item_id: string; description: string; quantity: number; received_quantity: number; unit_cost: number };
const receiptKey = (id: string) => `receipt-${id}`;

export default function ProcurementPage() {
  const { refreshKey, refresh } = useAdmin();
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [lines, setLines] = useState<RequestLine[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [itemId, setItemId] = useState('');
  const [requestSupplierId, setRequestSupplierId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase is not configured.'); return; }
    setLoading(true); setError('');
    try {
      const [supplierRes, stockRes, requestRes, lineRes] = await Promise.all([
        supabase.from('suppliers').select('id,name,phone,email,is_active').eq('is_active', true).order('name'),
        supabase.from('inventory_items').select('id,name,sku,unit,quantity_on_hand,average_cost,is_active').eq('is_active', true).order('name'),
        supabase.from('purchase_requests').select('id,reference,supplier_id,status,expected_at,notes,requested_by,approved_by,created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('purchase_request_items').select('id,purchase_request_id,inventory_item_id,description,quantity,received_quantity,unit_cost').limit(500),
      ]);
      for (const result of [supplierRes, stockRes, requestRes, lineRes]) if (result.error) throw result.error;
      setSuppliers(supplierRes.data ?? []); setStock(stockRes.data ?? []); setRequests(requestRes.data ?? []); setLines(lineRes.data ?? []);
      if (!itemId && stockRes.data?.length) setItemId(stockRes.data[0].id);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Procurement records could not be loaded.'); }
    finally { setLoading(false); }
  }, [itemId]);
  useEffect(() => { void load(); }, [load, refreshKey]);

  async function addSupplier(event: React.FormEvent) {
    event.preventDefault(); if (!supabase || !supplierName.trim()) return;
    setBusy('supplier');
    try {
      const { error: saveError } = await supabase.rpc('create_supplier', { p_name: supplierName.trim(), p_phone: supplierPhone.trim() || null, p_email: supplierEmail.trim() || null });
      if (saveError) throw saveError;
      setSupplierName(''); setSupplierPhone(''); setSupplierEmail(''); toast.success('Supplier saved.'); await load(); refresh();
    } catch (saveError) { toast.error(saveError instanceof Error ? saveError.message : 'Supplier was not saved.'); }
    finally { setBusy(''); }
  }
  async function createRequest(event: React.FormEvent) {
    event.preventDefault(); if (!supabase || !itemId) return;
    setBusy('request');
    try {
      const { data, error: saveError } = await supabase.rpc('create_purchase_request', { p_supplier_id: requestSupplierId || null, p_expected_at: null, p_notes: notes || null, p_lines: [{ inventory_item_id: itemId, quantity: Number(quantity), unit_cost: Number(unitCost) }] });
      if (saveError) throw saveError;
      setNotes(''); setQuantity('1'); setUnitCost(''); setRequestSupplierId(''); toast.success('Purchase request submitted for approval.'); await load(); refresh();
      if (!data) throw new Error('Database did not return the purchase reference.');
    } catch (saveError) { toast.error(saveError instanceof Error ? saveError.message : 'Purchase request was not saved.'); }
    finally { setBusy(''); }
  }
  async function decide(row: Request, decision: 'approved' | 'rejected') {
    if (!supabase) return; setBusy(row.id);
    try { const { error: updateError } = await supabase.rpc('decide_purchase_request', { p_request_id: row.id, p_decision: decision, p_note: null }); if (updateError) throw updateError; toast.success(`Purchase request ${decision}.`); await load(); refresh(); }
    catch (updateError) { toast.error(updateError instanceof Error ? updateError.message : 'Decision could not be saved.'); }
    finally { setBusy(''); }
  }
  async function receive(row: Request) {
    if (!supabase) return;
    const pending = lines.filter(line => line.purchase_request_id === row.id && line.received_quantity < line.quantity);
    if (!pending.length) { toast.error('There are no remaining quantities to receive.'); return; }
    setBusy(row.id);
    try {
      const key = receiptKey(row.id);
      const { error: receiveError } = await supabase.rpc('receive_purchase_request', { p_purchase_request_id: row.id, p_reference: `GRN-${row.reference}`, p_lines: pending.map(line => ({ item_id: line.id, quantity: Number(line.quantity) - Number(line.received_quantity) })), p_idempotency_key: key, p_notes: null });
      if (receiveError) throw receiveError;
      toast.success('Goods received; stock and inventory movement were posted together.'); await load(); refresh();
    } catch (receiveError) { toast.error(receiveError instanceof Error ? receiveError.message : 'Goods receipt could not be posted.'); }
    finally { setBusy(''); }
  }
  async function paySupplier(row: Request) {
    const amountRaw = window.prompt('Enter supplier payment amount (KES):');
    if (!amountRaw || !supabase) return;
    const amount = Number(amountRaw); if (!Number.isFinite(amount) || amount <= 0) { toast.error('Enter a valid positive amount.'); return; }
    const method = window.prompt('Payment method: mpesa, bank, card, or cash', 'bank')?.toLowerCase(); if (!method) return;
    const reference = window.prompt('Enter a unique bank/provider transaction reference:') || ''; if (!reference.trim()) { toast.error('A payment reference is required so retries cannot duplicate a supplier payment.'); return; }
    setBusy(row.id);
    try { const { error: payError } = await supabase.rpc('record_supplier_payment', { p_request_id: row.id, p_amount: amount, p_method: method, p_reference: reference, p_idempotency_key: `supplier-${row.id}-${reference.trim().toLowerCase()}` }); if (payError) throw payError; toast.success('Supplier payment recorded against received goods.'); await load(); refresh(); }
    catch (payError) { toast.error(payError instanceof Error ? payError.message : 'Payment could not be recorded.'); }
    finally { setBusy(''); }
  }

  return <div className="space-y-6">
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm"><p className="text-xs font-bold tracking-[.16em] text-brand-700">OPERATIONS · SUPPLIER LEDGER</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-bold">Procurement</h2><p className="mt-2 text-sm text-slate-600">Purchase requests require a separate approver. Receiving records inventory and audit movements in one database transaction.</p></div><button onClick={() => void load()} className="btn-outline btn-sm"><RefreshCw size={15}/> Refresh</button></div></section>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <section className="grid gap-5 xl:grid-cols-2">
      <Card><CardHeader title="Suppliers" description="Maintain supplier contacts for purchasing."/><CardBody><form className="grid gap-3 sm:grid-cols-3" onSubmit={event => void addSupplier(event)}><input className="form-control" placeholder="Supplier name *" required value={supplierName} onChange={e=>setSupplierName(e.target.value)}/><input className="form-control" placeholder="Phone" value={supplierPhone} onChange={e=>setSupplierPhone(e.target.value)}/><div className="flex gap-2"><input className="form-control min-w-0" type="email" placeholder="Email" value={supplierEmail} onChange={e=>setSupplierEmail(e.target.value)}/><button className="btn-primary btn-sm" disabled={busy==='supplier'}>{busy==='supplier'?<Loader2 size={14} className="animate-spin"/>:<Plus size={14}/>} Add</button></div></form><div className="mt-4 divide-y divide-line">{suppliers.map(s => <div key={s.id} className="flex justify-between gap-3 py-3 text-sm"><strong className="text-slate-800">{s.name}</strong><span className="text-slate-500">{s.phone || s.email || 'No contact details'}</span></div>)}{!suppliers.length&&<p className="py-4 text-sm text-slate-500">No suppliers recorded.</p>}</div></CardBody></Card>
      <Card><CardHeader title="Request a purchase" description="New requests are submitted for approval and do not change stock until goods are received."/><CardBody><form className="grid gap-3 sm:grid-cols-2" onSubmit={event => void createRequest(event)}><label className="text-xs font-semibold text-slate-600">Supplier<select className="form-control mt-1" value={requestSupplierId} onChange={e=>setRequestSupplierId(e.target.value)}><option value="">Choose supplier (optional)</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Inventory item<select className="form-control mt-1" required value={itemId} onChange={e=>{setItemId(e.target.value);setUnitCost(String(stock.find(x=>x.id===e.target.value)?.average_cost||''));}}><option value="">Choose inventory item</option>{stock.map(item=><option key={item.id} value={item.id}>{item.name}{item.sku?` · ${item.sku}`:''} · on hand {item.quantity_on_hand} {item.unit}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Quantity<input className="form-control mt-1" type="number" step="0.001" min="0.001" required value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label className="text-xs font-semibold text-slate-600">Unit cost (KES)<input className="form-control mt-1" type="number" step="0.01" min="0" required value={unitCost} onChange={e=>setUnitCost(e.target.value)}/></label><input className="form-control sm:col-span-2" placeholder="Request note" value={notes} onChange={e=>setNotes(e.target.value)}/><button className="btn-primary btn-sm w-fit" disabled={busy==='request'||!stock.length}>{busy==='request'?<Loader2 size={15} className="animate-spin"/>:<Plus size={15}/>} Submit for approval</button></form></CardBody></Card>
    </section>
    <Card><CardHeader title="Purchase requests" description="Approval, goods receipts, and supplier payment actions."/>{loading?<div className="p-10 text-center text-sm text-slate-500">Loading procurement records…</div>:!requests.length?<div className="p-10 text-center text-sm text-slate-500">No purchase requests recorded.</div>:<div className="divide-y divide-line">{requests.map(row=>{const requestLines=lines.filter(line=>line.purchase_request_id===row.id);const supplier=suppliers.find(x=>x.id===row.supplier_id);const total=requestLines.reduce((sum,line)=>sum+Number(line.quantity)*Number(line.unit_cost),0);return <article key={row.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{row.reference} <span className="ml-2 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">{humanize(row.status)}</span></p><p className="mt-1 text-sm text-slate-600">{supplier?.name||'Supplier not assigned'} · Requested {formatDateTime(row.created_at)}</p><p className="mt-1 text-sm font-semibold text-slate-800">Requested value: {formatMoney(total,{currency:'KES',decimals:2})}</p></div><div className="flex flex-wrap gap-2">{row.status==='submitted'&&<><button className="btn-primary btn-sm" disabled={busy===row.id} onClick={()=>void decide(row,'approved')}><Check size={14}/> Approve</button><button className="btn-outline btn-sm" disabled={busy===row.id} onClick={()=>void decide(row,'rejected')}><X size={14}/> Reject</button></>}{['approved','partially_received'].includes(row.status)&&<button className="btn-outline btn-sm" disabled={busy===row.id} onClick={()=>void receive(row)}><PackageCheck size={14}/> Receive goods</button>}{['received','partially_received'].includes(row.status)&&<button className="btn-outline btn-sm" disabled={busy===row.id} onClick={()=>void paySupplier(row)}><Truck size={14}/> Record payment</button>}{busy===row.id&&<Loader2 className="animate-spin" size={17}/>}</div></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{requestLines.map(line=><div key={line.id} className="rounded-lg border border-line bg-slate-50 p-3 text-xs"><strong className="text-slate-800">{line.description}</strong><p className="mt-1 text-slate-600">{line.received_quantity}/{line.quantity} received · {formatMoney(line.unit_cost,{currency:'KES',decimals:2})} per unit</p></div>)}</div>{row.notes&&<p className="mt-2 text-xs text-slate-500">{row.notes}</p>}</article>})}</div>}</Card>
  </div>;
}

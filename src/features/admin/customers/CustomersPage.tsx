import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, Plus, UserRound, X, FileText, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui';

type Client = { id: string; source: 'registered' | 'contact'; display_name: string; company_name: string | null; email: string; phone: string; created_at: string };
type StatementOrder = { id: string; reference: string; customer_name: string; customer_email: string; total: number | null; payment_status: string; created_at: string };
type StatementInvoice = { id: string; order_id: string | null; invoice_number: string; customer_name: string; customer_email: string | null; total: number; amount_paid: number; status: string; created_at: string };
const blank = { display_name: '', company_name: '', email: '', phone: '' };
const money = (value: number) => `KES ${value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CustomersPage() {
  const toast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Client | null>(null);
  const [statementBusy, setStatementBusy] = useState(false);
  const [orders, setOrders] = useState<StatementOrder[]>([]);
  const [invoices, setInvoices] = useState<StatementInvoice[]>([]);

  const reload = useCallback(async () => {
    if (!supabase) return;
    setLoading(true); setError('');
    try {
      const [contactsResult, profilesResult] = await Promise.all([
        supabase.from('client_contacts').select('id,display_name,company_name,email,phone,created_at').order('company_name', { ascending: false, nullsFirst: false }).order('display_name'),
        supabase.rpc('admin_list_customer_profiles'),
      ]);
      if (contactsResult.error) throw contactsResult.error;
      if (profilesResult.error) throw profilesResult.error;
      const contacts: Client[] = (contactsResult.data ?? []).map(row => ({ ...row, source: 'contact' as const, company_name: row.company_name ?? null }));
      const profiles: Client[] = (profilesResult.data ?? []).map((row: { id: string; full_name: string | null; company: string | null; email: string; phone: string | null; created_at: string }) => {
        const savedContact = contacts.find(contact => contact.email.toLowerCase() === row.email.toLowerCase());
        return { id: row.id, source: 'registered', display_name: row.full_name || savedContact?.display_name || row.email, company_name: row.company || savedContact?.company_name || null, email: row.email, phone: row.phone || savedContact?.phone || '', created_at: row.created_at };
      });
      const registeredEmails = new Set(profiles.map(c => c.email.toLowerCase()));
      setClients([...profiles, ...contacts.filter(contact => !registeredEmails.has(contact.email.toLowerCase()))].sort((a,b) => (a.company_name || a.display_name).localeCompare(b.company_name || b.display_name)));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load clients.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setError('');
    try {
      const { error: saveError } = await supabase.from('client_contacts').insert({ display_name: form.display_name.trim(), company_name: form.company_name.trim() || null, email: form.email.trim().toLowerCase(), phone: form.phone.trim() });
      if (saveError) throw saveError;
      setForm(blank); setOpen(false); toast.success('Client saved.'); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save client.'); }
    finally { setBusy(false); }
  }

  async function showStatement(client: Client) {
    if (!supabase) return;
    setSelected(client); setStatementBusy(true); setOrders([]); setInvoices([]);
    try {
      const email = client.email.toLowerCase();
      const [orderResult, invoiceResult] = await Promise.all([
        supabase.from('orders').select('id,reference,customer_name,customer_email,total,payment_status,created_at').ilike('customer_email', email).order('created_at', { ascending: false }).limit(500),
        supabase.from('invoices').select('id,order_id,invoice_number,customer_name,customer_email,total,amount_paid,status,created_at').ilike('customer_email', email).order('created_at', { ascending: false }).limit(500),
      ]);
      if (orderResult.error) throw orderResult.error;
      if (invoiceResult.error) throw invoiceResult.error;
      setOrders(orderResult.data ?? []); setInvoices(invoiceResult.data ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load client account statement.'); setSelected(null); }
    finally { setStatementBusy(false); }
  }

  const billed = useMemo(() => invoices.filter(i => i.status !== 'void').reduce((sum, i) => sum + Number(i.total || 0), 0), [invoices]);
  const received = useMemo(() => invoices.filter(i => i.status !== 'void').reduce((sum, i) => sum + Number(i.amount_paid || 0), 0), [invoices]);
  const outstanding = Math.max(0, billed - received);
  const invoiceByOrder = useMemo(() => new Set(invoices.map(i => i.order_id).filter(Boolean)), [invoices]);
  const uninvoicedOrders = orders.filter(o => !invoiceByOrder.has(o.id));

  return <section className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-xs sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-brand-700">Commerce</p><h2 className="mt-1 text-2xl font-bold">Clients</h2><p className="mt-2 text-sm text-slate-600">Registered customers and staff-entered client contacts, with account statements.</p></div><button type="button" className="btn-primary" onClick={()=>setOpen(v=>!v)}><Plus size={16}/> Add client</button></header>
    {error&&<p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800">{error}</p>}
    {open&&<form onSubmit={save} className="grid gap-4 rounded-xl border border-line bg-white p-5 sm:grid-cols-2"><h3 className="text-lg font-bold sm:col-span-2">New client contact</h3><label className="text-sm font-semibold">Client or contact name *<input required className="form-control mt-1" value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})}/></label><label className="text-sm font-semibold">Company name <span className="font-normal text-slate-500">(optional)</span><input className="form-control mt-1" value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})}/></label><label className="text-sm font-semibold">Client email *<input required type="email" className="form-control mt-1" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label className="text-sm font-semibold">Phone number *<input required className="form-control mt-1" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-outline" onClick={()=>setOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy?<Loader2 className="animate-spin" size={16}/>:<Plus size={16}/>} Save client</button></div></form>}
    {loading?<div className="rounded-xl border border-line bg-white p-10 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" size={20}/>Loading client accounts…</div>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{clients.map(client=><article key={`${client.source}:${client.id}`} className="rounded-xl border border-line bg-white p-5 shadow-xs"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">{client.company_name?<Building2 size={19}/>:<UserRound size={19}/>}</span><div className="min-w-0"><h3 className="truncate font-bold">{client.company_name||client.display_name}</h3>{client.company_name&&<p className="truncate text-sm text-slate-500">{client.display_name}</p>}<p className="text-xs text-slate-500">{client.source==='registered'?'Website account':'Saved client contact'}</p></div></div><p className="mt-4 break-all text-sm text-slate-700">{client.email}</p><p className="mt-1 text-sm text-slate-500">{client.phone||'No phone recorded'}</p><button type="button" className="btn-outline mt-4 w-full" onClick={()=>void showStatement(client)}><FileText size={15}/> Account statement</button></article>)}</div>}
    {!loading&&!clients.length&&<div className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-sm text-slate-500">No clients found yet. Website signups will appear here automatically.</div>}

    {selected&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Client account statement"><div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-line bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white p-5"><div><p className="text-xs font-bold uppercase tracking-widest text-brand-700">Client account statement</p><h3 className="mt-1 text-xl font-bold">{selected.company_name||selected.display_name}</h3><p className="text-sm text-slate-500">{selected.email}</p></div><button className="btn-outline" onClick={()=>setSelected(null)} aria-label="Close statement"><X size={17}/></button></div>
      {statementBusy?<div className="p-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin"/>Loading account activity…</div>:<div className="space-y-5 p-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-line bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">Invoices billed</p><p className="mt-2 text-xl font-bold">{money(billed)}</p></div><div className="rounded-xl border border-line bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase text-emerald-700">Payments received</p><p className="mt-2 text-xl font-bold text-emerald-800">{money(received)}</p></div><div className="rounded-xl border border-line bg-amber-50 p-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase text-amber-800"><Wallet size={14}/>Outstanding balance</p><p className="mt-2 text-xl font-bold text-amber-900">{money(outstanding)}</p></div></div>
        <div className="overflow-hidden rounded-xl border border-line"><div className="border-b border-line px-4 py-3"><h4 className="font-semibold">Invoices and payments</h4></div>{invoices.length?<div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Date / invoice</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Billed</th><th className="px-4 py-3 text-right">Received</th><th className="px-4 py-3 text-right">Balance</th></tr></thead><tbody className="divide-y divide-line">{invoices.map(invoice=><tr key={invoice.id}><td className="px-4 py-3"><strong>{invoice.invoice_number}</strong><p className="text-xs text-slate-500">{new Date(invoice.created_at).toLocaleDateString()}</p></td><td className="px-4 py-3">{orders.find(o=>o.id===invoice.order_id)?.reference||'—'}</td><td className="px-4 py-3 capitalize">{invoice.status}</td><td className="px-4 py-3 text-right">{money(Number(invoice.total||0))}</td><td className="px-4 py-3 text-right">{money(Number(invoice.amount_paid||0))}</td><td className="px-4 py-3 text-right font-semibold">{money(invoice.status==='void'?0:Math.max(0,Number(invoice.total||0)-Number(invoice.amount_paid||0)))}</td></tr>)}</tbody></table></div>:<p className="p-5 text-sm text-slate-500">No invoices recorded for this client.</p>}</div>
        {!!uninvoicedOrders.length&&<div className="overflow-hidden rounded-xl border border-line"><div className="border-b border-line px-4 py-3"><h4 className="font-semibold">Orders without an invoice</h4></div><div className="divide-y divide-line">{uninvoicedOrders.map(order=><div key={order.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"><div><strong>{order.reference}</strong><p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p></div><span className="capitalize">{order.payment_status} · {order.total==null?'Quote pending':money(Number(order.total))}</span></div>)}</div></div>}
        <p className="text-xs text-slate-500">Statement is based on invoices and recorded payments. Voided invoices are excluded from totals.</p></div>}</div></div>}
  </section>;
}

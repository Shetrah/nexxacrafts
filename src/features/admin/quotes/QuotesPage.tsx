import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Clock3, FileText, Loader2, Mail, MessageSquareText, RefreshCw, Save, Search, X } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, Modal, SpecList, useToast } from '@/components/ui';
import { formatDateTime, formatMoney, humanize } from '@/lib/format';
import { convertAcceptedQuote, getQuote, listQuoteDeliveryLogs, listQuotes, saveQuoteAmount, updateQuoteStatus, type QuoteDeliveryLog, type QuoteSummary } from '@/lib/api/quotes';
import { sendInvoiceEmail } from '@/lib/platform';
import { supabase } from '@/lib/supabase';
import type { QuoteRequestRow, QuoteStatus } from '@/types/db';
import { useAdmin } from '../AdminContext';

const FLOW: QuoteStatus[] = ['submitted', 'under_review', 'need_information', 'quoted', 'accepted', 'declined', 'converted'];
const NEXT: Record<QuoteStatus, QuoteStatus[]> = {
  submitted: ['under_review', 'need_information', 'declined'],
  under_review: ['need_information', 'quoted', 'declined'],
  need_information: ['under_review', 'quoted', 'declined'],
  quoted: ['accepted', 'declined', 'under_review'],
  accepted: [], declined: ['under_review'], converted: [],
};

export default function QuotesPage() {
  const { refreshKey, refresh } = useAdmin();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams,setSearchParams]=useSearchParams();
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('open');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQuote,setSelectedQuote]=useState<QuoteRequestRow|null>(null);
  const [detailLoading,setDetailLoading]=useState(false);
  const [deliveryLogs,setDeliveryLogs]=useState<QuoteDeliveryLog[]>([]);
  const selectedQuoteId=searchParams.get('quote');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const rows = await listQuotes({ limit: 300 }); setQuotes(rows); setAmounts(Object.fromEntries(rows.map(row => [row.id, row.quoted_amount === null ? '' : String(row.quoted_amount)]))); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Quotation records could not be loaded.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load, refreshKey]);
  useEffect(()=>{if(!selectedQuoteId){setSelectedQuote(null);return;}let active=true;setDetailLoading(true);void getQuote(selectedQuoteId).then(row=>{if(active)setSelectedQuote(row);}).catch(e=>{if(active)toast.error(e instanceof Error?e.message:'Could not load quote details.');}).finally(()=>{if(active)setDetailLoading(false);});return()=>{active=false;};},[selectedQuoteId,toast]);
  useEffect(()=>{if(!selectedQuoteId){setDeliveryLogs([]);return;}let active=true;void listQuoteDeliveryLogs(selectedQuoteId).then(rows=>{if(active)setDeliveryLogs(rows);}).catch(e=>{if(active)toast.error(e instanceof Error?e.message:'Quotation delivery history could not be loaded.');});return()=>{active=false;};},[selectedQuoteId,toast]);
  const visible = quotes.filter(row => {
    const matchesText = `${row.reference} ${row.customer_name} ${row.company ?? ''} ${row.email} ${row.service_slug}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = filter === 'all' || (filter === 'open' ? ['submitted', 'under_review', 'need_information'].includes(row.status) : filter === 'priced' ? ['quoted', 'accepted'].includes(row.status) : row.status === filter);
    return matchesText && matchesStatus;
  });

  async function setStatus(row: QuoteSummary, status: QuoteStatus) {
    setBusyId(row.id);
    try { await updateQuoteStatus(row.id, status); toast.success(`Quotation moved to ${humanize(status)}.`); refresh(); await load(); }
    catch (saveError) { toast.error(saveError instanceof Error ? saveError.message : 'Status was not saved.'); }
    finally { setBusyId(''); }
  }
  async function deliverQuote(row: Pick<QuoteSummary,'id'>) {
    if(!supabase) throw new Error('Quotation delivery is unavailable.');
    const {data,error:invokeError}=await supabase.functions.invoke('contact-email',{body:{kind:'issued_quote',quoteId:row.id}});
    if(invokeError){
      const context=invokeError.context;
      if(context instanceof Response){try{const body=await context.clone().json();throw new Error(body?.error||body?.message||invokeError.message);}catch(parseError){if(parseError instanceof Error&&parseError.message!==invokeError.message)throw parseError;}}
      throw invokeError;
    }
    if(data?.error)throw new Error(data.error);
    const sentChannels=[data?.emailSent?'email':null,data?.whatsappSent?'WhatsApp':null].filter(Boolean);
    const failedChannels=[data?.emailError?`Email: ${data.emailError}`:null,data?.whatsappError?`WhatsApp: ${data.whatsappError}`:null].filter(Boolean);
    if(!sentChannels.length)throw new Error(failedChannels.join(' · ')||'No delivery channel accepted the quotation.');
    toast.success(`Quotation sent by ${sentChannels.join(' and ')}.${failedChannels.length?` ${failedChannels.join(' · ')}`:''}`);
    if(selectedQuoteId===row.id) setDeliveryLogs(await listQuoteDeliveryLogs(row.id));
  }
  async function saveAmount(row: QuoteSummary) {
    const amount = Number(amounts[row.id]);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('Enter a valid quote amount greater than zero.'); return; }
    setBusyId(row.id);
    try {
      await saveQuoteAmount(row.id, amount); toast.success('Quote amount saved and quotation issued.'); refresh(); await load();
      try { await deliverQuote(row); }
      catch (deliveryError) { toast.error(`Quotation was issued, but delivery failed: ${deliveryError instanceof Error?deliveryError.message:'retry with Send quotation.'}`); }
    }
    catch (saveError) { toast.error(saveError instanceof Error ? saveError.message : 'Quote amount was not saved.'); }
    finally { setBusyId(''); }
  }
  async function resendQuote(row: Pick<QuoteSummary,'id'>) {
    setBusyId(row.id);
    try { await deliverQuote(row); if(selectedQuoteId===row.id)setDeliveryLogs(await listQuoteDeliveryLogs(row.id)); }
    catch (deliveryError) { toast.error(deliveryError instanceof Error?deliveryError.message:'Quotation delivery failed. Check the delivery history and retry.'); if(selectedQuoteId===row.id)void listQuoteDeliveryLogs(row.id).then(setDeliveryLogs).catch(()=>{}); }
    finally { setBusyId(''); }
  }

  async function convert(row: QuoteSummary) {
    setBusyId(row.id);
    try {
      const created = await convertAcceptedQuote(row.id);
      refresh();
      try {
        await sendInvoiceEmail(created.invoice_id);
        toast.success(`Order ${created.order_reference} and invoice ${created.invoice_number} created and sent.`);
      } catch (deliveryError) {
        toast.error(`Order ${created.order_reference} was created. Invoice delivery failed: ${deliveryError instanceof Error ? deliveryError.message : 'retry from Invoices.'}`);
      }
      navigate(`/admin/orders?order=${encodeURIComponent(created.order_id)}`);
    } catch (conversionError) { toast.error(conversionError instanceof Error ? conversionError.message : 'Quotation could not be converted.'); }
    finally { setBusyId(''); }
  }

  return <div className="space-y-6">
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm"><p className="text-xs font-bold tracking-[.16em] text-brand-700">COMMERCE · APPROVAL WORKFLOW</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-bold">Quotations</h2><p className="mt-2 text-sm text-slate-600">Review client requirements, request changes, price work, and record each decision in the approval history.</p></div><button type="button" onClick={() => void load()} className="btn-outline btn-sm" disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh</button></div></section>
    <Card><CardHeader title="Quote requests" description={`${visible.length} of ${quotes.length} requests`} actions={<div className="flex flex-wrap gap-2"><label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="form-control pl-9" placeholder="Search client or reference" value={query} onChange={e => setQuery(e.target.value)}/></label><select className="form-control min-w-40" value={filter} onChange={e => setFilter(e.target.value)}><option value="open">Open requests</option><option value="priced">Priced / accepted</option><option value="all">All statuses</option>{FLOW.filter(s => !['submitted','under_review','need_information','quoted','accepted'].includes(s)).map(s => <option key={s} value={s}>{humanize(s)}</option>)}</select></div>}/>
    {error && <p role="alert" className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading quote requests…</div> : !visible.length ? <div className="p-12 text-center text-sm text-slate-500">No quote requests match this view.</div> : <div className="divide-y divide-line">{visible.map(row => <article key={row.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-slate-900">{row.reference} <span className="ml-2 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">{humanize(row.status)}</span></p><p className="mt-1 text-sm text-slate-800">{row.company || row.customer_name} <span className="text-slate-500">· {row.email}</span></p><p className="mt-1 text-xs text-slate-500">{humanize(row.service_slug)} · Received {formatDateTime(row.created_at)}</p></div><div className="flex flex-wrap gap-2">{Number(row.quoted_amount)>0&&['quoted','accepted','converted'].includes(row.status)&&<button type="button" onClick={()=>void resendQuote(row)} disabled={busyId===row.id} className="btn-primary btn-sm whitespace-nowrap">{busyId===row.id?<Loader2 size={15} className="animate-spin"/>:<Mail size={15}/>} Send / resend quotation</button>}<Link to={`/admin/quotes?quote=${encodeURIComponent(row.id)}`} className="btn-outline btn-sm whitespace-nowrap"><FileText size={15}/> Details</Link></div></div>
        <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-xs font-semibold text-slate-600">Quoted amount (KES)<input className="form-control mt-1 block w-48" inputMode="decimal" type="number" min="0.01" step="0.01" value={amounts[row.id] ?? ''} onChange={e => setAmounts(current => ({...current,[row.id]:e.target.value}))}/></label><button type="button" className="btn-primary btn-sm" disabled={busyId===row.id} onClick={() => void saveAmount(row)}>{busyId===row.id?<Loader2 size={15} className="animate-spin"/>:<Save size={15}/>} Save & issue quote</button><div className="flex flex-wrap gap-2">{NEXT[row.status].map(status => <button type="button" key={status} disabled={busyId===row.id} onClick={() => void setStatus(row,status)} className={status==='accepted'?'btn-primary btn-sm':'btn-outline btn-sm'}>{status==='accepted'?<Check size={14}/>:status==='declined'?<X size={14}/>:status==='need_information'?<MessageSquareText size={14}/>:<ChevronDown size={14}/>} {humanize(status)}</button>)}{row.status==='accepted'&&<button type="button" className="btn-primary btn-sm" disabled={busyId===row.id||!row.customer_id} title={!row.customer_id?'Link the quote to a client account before converting it.':undefined} onClick={()=>void convert(row)}>{busyId===row.id?<Loader2 size={15} className="animate-spin"/>:<ArrowRight size={15}/>} Convert to order & invoice</button>}</div></div>
        {row.quoted_amount !== null && <p className="mt-3 text-xs text-slate-500">Current quote: <strong className="text-slate-800">{formatMoney(row.quoted_amount,{currency:row.currency,decimals:2})}</strong></p>}
      </article>)}</div>}
    </Card>
    <p className="flex items-center gap-2 rounded-xl border border-line bg-slate-50 p-4 text-xs text-slate-600"><Clock3 size={15}/> Every status change is written by the database trigger to the quote approval history with its actor and timestamp.</p>
    <Modal open={Boolean(selectedQuoteId)} onClose={()=>setSearchParams({})} title={selectedQuote?.reference||'Quote details'} description="Client request details and configured selections." size="lg">{detailLoading?<div className="p-10 text-center text-sm text-slate-500">Loading quote details…</div>:selectedQuote?<div className="space-y-5"><SpecList columns={2} items={[{label:'Client',value:selectedQuote.company||selectedQuote.customer_name},{label:'Email',value:selectedQuote.email},{label:'Phone',value:selectedQuote.phone||'—'},{label:'Service',value:humanize(selectedQuote.service_slug)},{label:'Status',value:humanize(selectedQuote.status)},{label:'Quoted amount',value:selectedQuote.quoted_amount===null?'Not priced':formatMoney(selectedQuote.quoted_amount,{currency:selectedQuote.currency,decimals:2})}]}/><section className="rounded-xl border border-line p-4"><h3 className="font-semibold">Request brief</h3><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selectedQuote.description}</p></section>{Object.entries(selectedQuote.configuration||{}).length>0&&<section><h3 className="mb-2 font-semibold">Selected requirements</h3><SpecList columns={2} items={Object.entries(selectedQuote.configuration).map(([key,value])=>({label:humanize(key),value:Array.isArray(value)?value.join(', '):typeof value==='object'&&value!==null?JSON.stringify(value):String(value)}))}/></section>}{selectedQuote.internal_notes&&<section className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold">Internal notes</h3><p className="mt-2 whitespace-pre-wrap text-sm">{selectedQuote.internal_notes}</p></section>}<section className="rounded-xl border border-line p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Quotation delivery history</h3><p className="mt-1 text-xs text-slate-500">Accepted provider deliveries are recorded per send attempt.</p></div>{Number(selectedQuote.quoted_amount)>0&&<button type="button" className="btn-primary btn-sm" disabled={busyId===selectedQuote.id} onClick={()=>void resendQuote(selectedQuote)}>{busyId===selectedQuote.id?<Loader2 size={15} className="animate-spin"/>:<Mail size={15}/>} Send / resend PDF</button>}</div>{deliveryLogs.length?<div className="mt-4 divide-y divide-line">{deliveryLogs.map(log=><div key={log.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[7rem_8rem_1fr_auto]"><span className="font-semibold capitalize">{log.channel}</span><span className={log.status==='sent'?'text-emerald-700':log.status==='failed'?'text-red-700':'text-amber-700'}>{humanize(log.status)}</span><span className="break-all text-slate-600">{log.error||log.recipient}</span><span className="text-xs text-slate-500">{formatDateTime(log.sent_at||log.created_at)}</span></div>)}</div>:<p className="mt-4 text-sm text-slate-500">No quotation delivery attempts recorded yet.</p>}</section></div>:<p className="p-8 text-center text-sm text-slate-500">Quote not found or not available to this role.</p>}</Modal>
  </div>;
}

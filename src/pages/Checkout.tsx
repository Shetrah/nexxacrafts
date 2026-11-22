import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, CreditCard, Landmark, Loader2, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { submitOrder } from '../lib/platform';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { money } from '../lib/catalog';
import { CheckoutPrintout, type PrintoutLine } from '@/components/CheckoutPrintout';

const Checkout: React.FC = () => {
  const { items, clearCart } = useCart();
  const { user, profile } = useAuth();
  const [form,setForm] = useState({ name: profile?.full_name || '', email: user?.email || '', phone: profile?.phone || '', paymentMethod: 'mpesa' as 'mpesa'|'bank'|'card', deliveryMethod: 'collection' as 'collection'|'local_delivery'|'courier', deliveryAddress: '', deliveryInstructions: '', notes: '' });
  const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const [result,setResult] = useState<{reference:string;mode:'live'|'demo';method:string;name:string;email:string;hasUnknown:boolean;notificationSent:boolean;whatsappNotificationError?:string;customerEmailSent:boolean;invoiceEmailSent:boolean;invoiceWhatsappSent:boolean;invoiceEmailError?:string;invoiceWhatsappError?:string;invoiceId?:string;invoiceNumber?:string;invoiceTotal?:number;invoiceSubtotal?:number;invoiceTax?:number;invoiceAmountPaid:number;invoiceLines:PrintoutLine[]}|null>(null);
  const total = items.reduce((sum,item)=>sum+(item.estimate||0),0); const hasUnknown = items.some(item=>item.estimate===null);
  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(current=>({...current,[key]:value}));
  const submit = async (event:React.FormEvent) => {
    event.preventDefault(); if (!items.length) return;
    if (supabase && !user) { setError('Please sign in or create a customer account before submitting an order.'); return; }
    if (supabase && !navigator.onLine) { setError('You appear to be offline. Reconnect to the internet before submitting your order. Your cart is still saved.'); return; }
    if (form.deliveryMethod !== 'collection' && !form.deliveryAddress.trim()) { setError('Enter the delivery address for your selected delivery method.'); return; }
    setBusy(true);setError('');
    try {
      const submittedItems = [...items];
      const saved = await submitOrder({...form,paymentMethod:form.paymentMethod,items:submittedItems});
      let invoice: {id:string;invoice_number:string;subtotal:number;tax:number;total:number;amount_paid:number}|undefined;
      let invoiceLines: PrintoutLine[] = submittedItems.map(item=>({description:item.serviceName,quantity:item.quantity,amount:item.estimate??0}));
      if (supabase && saved.mode==='live' && !hasUnknown) {
        const [{data:invoiceRow,error:invoiceError},{data:orderRows,error:orderItemsError}] = await Promise.all([
          supabase.from('invoices').select('id,invoice_number,subtotal,tax,total,amount_paid').eq('order_id',saved.id).maybeSingle(),
          supabase.from('order_items').select('service_slug,service_name,configuration,quantity,estimated_amount,confirmed_amount').eq('order_id',saved.id).order('created_at',{ascending:true}),
        ]);
        if (invoiceError) console.error('Invoice was emailed but could not be loaded for printing.',invoiceError);
        if (orderItemsError) console.error('Saved invoice line items could not be loaded for printing.',orderItemsError);
        if (invoiceRow) invoice={id:invoiceRow.id,invoice_number:invoiceRow.invoice_number,subtotal:Number(invoiceRow.subtotal||0),tax:Number(invoiceRow.tax||0),total:Number(invoiceRow.total),amount_paid:Number(invoiceRow.amount_paid||0)};
        if (orderRows?.length) {
          const slugs=[...new Set(orderRows.map(row=>row.service_slug).filter(Boolean))];
          const {data:serviceRows}=await supabase.from('services').select('slug,fields').in('slug',slugs);
          const fieldsBySlug=new Map((serviceRows??[]).map(row=>[row.slug,Array.isArray(row.fields)?row.fields as Array<{name:string;label?:string;type?:string;optionPrices?:Record<string,number>}>:[]]));
          invoiceLines=orderRows.map(row=>{
            const config=row.configuration&&typeof row.configuration==='object'&&!Array.isArray(row.configuration)?row.configuration as Record<string,unknown>:{};
            const fields=fieldsBySlug.get(row.service_slug)??[];
            const details=Object.entries(config).flatMap(([key,raw])=>{
              if(raw===null||raw===undefined||raw===''||raw===false)return [];
              const field=fields.find(item=>item.name===key);
              const label=key==='mount_photo_name'?'Uploaded photo':field?.label||key.replace(/[_-]+/g,' ').replace(/\b\w/g,char=>char.toUpperCase());
              let value=typeof raw==='boolean'?(raw?'Yes':'No'):String(raw);
              if(field?.type==='file'){try{const parsed=JSON.parse(value);value=Array.isArray(parsed)?`${parsed.length} file${parsed.length===1?'':'s'} attached`:'File attached';}catch{value='File attached';}}
              const optionPrice=field?.type==='select'?Number(field.optionPrices?.[String(raw)]??0):0;
              return [`${label}: ${value}${optionPrice>0?` (+ KES ${optionPrice.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})} per item)`:''}`];
            });
            return {description:row.service_name,quantity:Number(row.quantity),amount:Number(row.confirmed_amount??row.estimated_amount??0),details};
          });
        }
      }
      setResult({reference:saved.reference,mode:saved.mode,method:form.paymentMethod,name:form.name,email:form.email,hasUnknown,notificationSent:saved.whatsappNotificationSent===true,whatsappNotificationError:saved.whatsappNotificationError,customerEmailSent:saved.customerEmailSent===true,invoiceEmailSent:saved.invoiceEmailSent===true,invoiceWhatsappSent:saved.invoiceWhatsappSent===true,invoiceEmailError:saved.invoiceEmailError,invoiceWhatsappError:saved.invoiceWhatsappError,invoiceId:invoice?.id,invoiceNumber:invoice?.invoice_number,invoiceSubtotal:invoice?.subtotal,invoiceTax:invoice?.tax,invoiceTotal:invoice?.total,invoiceAmountPaid:invoice?.amount_paid??0,invoiceLines});
      clearCart();
    }
    catch(err){
      const message=err instanceof Error?err.message:'';
      if(!navigator.onLine)setError('Your internet connection was lost while submitting. Reconnect and check your account orders before retrying, in case the order was saved just before the connection dropped.');
      else if(/failed to fetch|network|internet disconnected/i.test(message))setError('Could not reach the order service. Check your internet connection and try again. If this persists, contact support with the time of your attempt.');
      else setError(message||'Unable to submit your order.');
    }
    finally{setBusy(false);}
  };
  if (result) return <div className="container-shell py-12 sm:py-16"><div className="mx-auto max-w-4xl"><div className="mb-8 text-center"><div className="eyebrow">ORDER CONFIRMED</div><h1 className="page-title mt-3">Your order is <span className="text-gradient">in motion.</span></h1><p className="lead mt-3">Reference <strong className="text-slate-900">{result.reference}</strong> · Preferred payment: {result.method.toUpperCase()}</p></div>
    {result.mode==='live'&&result.invoiceId&&result.invoiceNumber&&result.invoiceTotal!==undefined&&!result.hasUnknown&&<><CheckoutPrintout kind="invoice" number={result.invoiceNumber} orderReference={result.reference} customerName={result.name} customerEmail={result.email} lines={result.invoiceLines} subtotal={result.invoiceSubtotal} tax={result.invoiceTax} total={Math.max(0,result.invoiceTotal-result.invoiceAmountPaid)} paymentMethod={result.method}/><div className="checkout-invoice-next"><div><CheckCircle2 size={18}/><span>{result.invoiceEmailSent&&result.invoiceWhatsappSent?`Invoice ${result.invoiceNumber} was sent to your email and WhatsApp.`:result.invoiceEmailSent?`Invoice ${result.invoiceNumber} was emailed to ${result.email}.${result.invoiceWhatsappError?' WhatsApp delivery could not be confirmed.':''}`:result.invoiceWhatsappSent?`Invoice ${result.invoiceNumber} and its secure payment link were sent to your WhatsApp.`:'Your invoice is ready to print. Email and WhatsApp delivery were not confirmed.'}</span></div>{result.method==='mpesa'&&<Link to={`/pay/${result.invoiceId}`} className="btn-primary">Pay invoice with M-Pesa <Smartphone size={17}/></Link>}</div>{!result.invoiceEmailSent&&result.invoiceEmailError&&<p className="mt-3 text-sm text-amber-700">Email: {result.invoiceEmailError}</p>}{!result.invoiceWhatsappSent&&result.invoiceWhatsappError&&<p className="mt-2 text-sm text-amber-700">WhatsApp: {result.invoiceWhatsappError}</p>}</>}
    {result.hasUnknown&&<div className="rounded-2xl border border-line bg-white p-6 text-center shadow-xs dark:bg-slate-900"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-700"><CheckCircle2 size={28}/></div><h2 className="mt-4 text-xl font-bold">We’ll confirm your quotation</h2><p className="mt-2 text-sm text-slate-500">Your order is saved. The team will confirm any unpriced requirements and email the invoice and payment link.</p></div>}
    {result.mode==='live'&&!result.customerEmailSent&&<p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">We could not confirm the order acknowledgement email. Please keep your order reference.</p>}
    {result.mode==='demo'&&<div className="rounded-2xl border border-line bg-white p-6 text-center dark:bg-slate-900"><CheckCircle2 className="mx-auto text-emerald-600" size={30}/><h2 className="mt-3 text-xl font-bold">Order request saved</h2><p className="mt-2 text-sm text-slate-500">Demo mode stores this order only in this browser. Connect Supabase to generate and email live invoices.</p></div>}
    {result.mode==='live'&&!result.hasUnknown&&!result.invoiceId&&<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">The order was submitted, but its invoice record could not be loaded. You can find it in your account or contact our team with the order reference.</p>}
    {result.mode==='live'&&!result.notificationSent&&<p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Your order is saved, but the team WhatsApp alert could not be confirmed. {result.whatsappNotificationError||'The team can still see your order in the admin workspace.'}</p>}
    <div className="mt-8 text-center"><Link to="/" className="btn-outline">Return home</Link></div></div></div>;
  if (!items.length) return <div className="container-shell py-24 text-center"><h1 className="text-2xl font-bold">No items to check out</h1><Link to="/services" className="btn-primary mt-6">Browse services</Link></div>;
  return <div className="container-shell py-12"><Link to="/cart" className="back-link"><ArrowLeft size={16}/> Back to cart</Link><h1 className="page-title mt-5">Checkout</h1><p className="lead mt-2">Submit your order details and choose your preferred payment method.</p><div className="grid lg:grid-cols-[1fr_350px] gap-8 mt-9 items-start"><form onSubmit={submit} className="form-panel space-y-5"><h2 className="font-bold text-xl">Customer details</h2>{supabase&&!user&&<div className="rounded-lg p-3 bg-blue-50 text-blue-800 text-sm">Sign in is required for secure order ownership and file access. <Link to="/account" className="font-bold underline">Open customer account</Link>.</div>}<div className="grid sm:grid-cols-2 gap-5"><div><label className="form-label">Full name *</label><input className="form-control" required value={form.name} onChange={e=>update('name',e.target.value)}/></div><div><label className="form-label">Email *</label><input className="form-control" required type="email" value={form.email} readOnly={Boolean(user)} aria-describedby={user?'account-email-note':undefined} onChange={e=>update('email',e.target.value)}/>{user&&<p id="account-email-note" className="mt-1 text-xs text-slate-500">Order updates will be sent to your account email.</p>}</div><div><label className="form-label">Phone *</label><input className="form-control" required value={form.phone} onChange={e=>update('phone',e.target.value)}/></div></div><div><label className="form-label">Order notes</label><textarea className="form-control min-h-24" value={form.notes} onChange={e=>update('notes',e.target.value)} placeholder="Delivery preferences, timing or other instructions"/></div><div className="border-t border-slate-100 pt-5"><h2 className="font-bold text-lg">Preferred payment method</h2><p className="text-xs text-slate-500 mt-1">For priced orders, your invoice and payment link are sent after submission. If your order needs a quote, we’ll confirm the price first.</p><div className="grid sm:grid-cols-3 gap-3 mt-4">{[{id:'mpesa' as const,label:'M-Pesa',icon:Smartphone},{id:'bank' as const,label:'Bank transfer',icon:Landmark},{id:'card' as const,label:'Card',icon:CreditCard}].map(method=><button type="button" key={method.id} onClick={()=>update('paymentMethod',method.id)} className={`payment-option ${form.paymentMethod===method.id?'selected':''}`}><method.icon size={21}/><span className="font-semibold text-sm">{method.label}</span></button>)}</div></div><div className="border-t border-slate-100 pt-5"><h2 className="font-bold text-lg">Delivery or collection</h2><div className="grid sm:grid-cols-3 gap-3 mt-4">{[{id:'collection' as const,label:'Collect from us'},{id:'local_delivery' as const,label:'Local delivery'},{id:'courier' as const,label:'Courier' }].map(option=><button type="button" key={option.id} onClick={()=>update('deliveryMethod',option.id)} className={`payment-option ${form.deliveryMethod===option.id?'selected':''}`}><span className="font-semibold text-sm">{option.label}</span></button>)}</div>{form.deliveryMethod!=='collection'&&<div className="grid sm:grid-cols-2 gap-4 mt-4"><div className="sm:col-span-2"><label className="form-label">Delivery address *</label><input className="form-control" required value={form.deliveryAddress} onChange={e=>update('deliveryAddress',e.target.value)} placeholder="Building, street, town and county"/></div><div className="sm:col-span-2"><label className="form-label">Delivery instructions</label><textarea className="form-control min-h-20" value={form.deliveryInstructions} onChange={e=>update('deliveryInstructions',e.target.value)} placeholder="Landmark, recipient or timing instructions"/></div></div>}</div>{error&&<p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}<button disabled={busy||(Boolean(supabase)&&!user)} className="btn-primary btn-lg w-full sm:w-auto">{busy?<><Loader2 size={17} className="animate-spin"/> Submitting…</>:'Submit order request'}</button></form><aside className="summary-panel"><h2 className="font-bold text-lg">Order summary</h2>{items.map(item=><div key={item.id} className="flex justify-between gap-3 mt-4 text-sm"><span className="text-slate-600">{item.serviceName} × {item.quantity}</span><strong className="text-right">{item.estimate===null?'To quote':money(item.estimate)}</strong></div>)}<div className="border-t border-slate-100 mt-5 pt-5 flex justify-between"><strong>{hasUnknown?'Estimated total':'Order total'}</strong><strong className="text-xl">{hasUnknown?'To be confirmed':money(total)}</strong></div><p className="text-xs text-slate-400 mt-3">{hasUnknown?'Your team will confirm any unpriced requirements before sending a payment request.':'The total is calculated from the selected service options and active pricing rules.'}</p></aside></div></div>;
};
export default Checkout;

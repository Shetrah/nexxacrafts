import { useEffect, useState } from 'react';
import { CheckCircle2, Home, Loader2, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';

export type PrintoutLine = { description: string; quantity: number; amount: number; unitAmount?: number };
export type PrintoutKind = 'invoice' | 'receipt';

export function CheckoutPrintout({
  kind,
  number,
  orderReference,
  customerName,
  customerEmail,
  lines,
  total,
  amountPaid,
  subtotal,
  tax,
  deliveryFee,
  paymentMethod,
  transactionReference,
}: {
  kind: PrintoutKind;
  number: string;
  orderReference: string;
  customerName: string;
  customerEmail: string;
  lines: PrintoutLine[];
  total: number;
  amountPaid?: number;
  subtotal?: number;
  tax?: number;
  deliveryFee?: number;
  paymentMethod: string;
  transactionReference?: string;
}) {
  const [stage, setStage] = useState<'processing' | 'printing' | 'complete'>('processing');
  const isReceipt = kind === 'receipt';
  const amountLabel = isReceipt ? 'Total paid' : 'Amount due';
  const amount = isReceipt ? (amountPaid ?? total) : total;
  useEffect(() => {
    const first = window.setTimeout(() => setStage('printing'), 450);
    const second = window.setTimeout(() => setStage('complete'), 2350);
    return () => { window.clearTimeout(first); window.clearTimeout(second); };
  }, [kind, number]);

  return <section className="checkout-printout" aria-label={isReceipt ? 'Payment receipt' : 'Order invoice'}>
    <div className="checkout-printer-machine">
      <header className="checkout-printer-header"><Logo variant="wordmark" tone="inverse" className="h-6 w-auto"/><Link to="/" className="checkout-printer-home"><Home size={14}/> Home</Link></header>
      <div className="checkout-printer-screen">
        <div className="flex items-start justify-between gap-3"><div><p className="checkout-printer-kicker">NEXXACRAFT · {isReceipt ? 'PAYMENT' : 'ORDER'}</p><strong>{isReceipt ? 'Payment confirmed' : 'Order received'}</strong></div><span className="checkout-printer-status-icon">{stage === 'complete' ? <CheckCircle2 size={20}/> : <Loader2 size={19} className="animate-spin motion-reduce:animate-none"/>}</span></div>
        <div className="checkout-printer-screen-row"><span>Reference</span><strong>{orderReference}</strong></div>
        <div className="checkout-printer-screen-row"><span>{isReceipt ? 'Paid' : 'Invoice total'}</span><strong>KES {amount.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>
        <p className="checkout-printer-status" role="status">{stage === 'processing' ? 'Preparing your document…' : stage === 'printing' ? `Printing your ${kind}…` : `${isReceipt ? 'Receipt' : 'Invoice'} ready`}</p>
      </div>
      <div className="checkout-printer-slot" aria-hidden="true"/>
      <article className={`checkout-print-paper ${stage === 'processing' ? 'is-hidden' : ''} ${stage === 'printing' ? 'is-printing' : ''}`}>
        <div className="checkout-print-paper-content">
          <div className="checkout-print-brand"><Logo variant="wordmark" className="h-7 w-auto"/><span>{isReceipt ? 'PAYMENT RECEIPT' : 'CUSTOMER INVOICE'}</span></div>
          <div className="checkout-print-number"><div><small>{isReceipt ? 'RECEIPT NO.' : 'INVOICE NO.'}</small><strong>{number}</strong></div><div className="text-right"><small>ORDER REFERENCE</small><strong>{orderReference}</strong></div></div>
          <div className="checkout-print-billto"><small>{isReceipt ? 'RECEIVED FROM' : 'BILLED TO'}</small><strong>{customerName}</strong><span>{customerEmail}</span></div>
          <div className="checkout-print-lines"><div className="checkout-print-line header"><span>Description</span><span>Qty</span><span>Unit Price</span><span>Amount</span></div>
            {lines.map((line,index)=><div className="checkout-print-line" key={`${line.description}-${index}`}><span>{line.description}</span><span>{line.quantity}</span><span>KES {(line.unitAmount ?? line.amount / line.quantity).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}</span><span>KES {line.amount.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>)}
          </div>
          {!isReceipt&&subtotal!==undefined&&<div className="checkout-print-payment"><span>Subtotal</span><strong>KES {subtotal.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>}
          {!isReceipt&&deliveryFee!==undefined&&deliveryFee>0&&<div className="checkout-print-payment"><span>Delivery fee</span><strong>KES {deliveryFee.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>}
          {!isReceipt&&tax!==undefined&&<div className="checkout-print-payment"><span>Tax</span><strong>KES {tax.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>}
          <div className="checkout-print-total"><span>{amountLabel}</span><strong>KES {amount.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>
          <div className="checkout-print-payment"><span>Payment method</span><strong>{paymentMethod.toUpperCase()}</strong></div>
          {isReceipt&&transactionReference&&<div className="checkout-print-payment"><span>Payment reference</span><strong>{transactionReference}</strong></div>}
          <div className="checkout-print-thanks">{isReceipt ? 'Thank you. Your payment has been received.' : 'Thank you for choosing NexxaCraft.'}<small>Design · Print · Build · nexxacrafts.co.ke</small></div>
        </div>
      </article>
    </div>
    <div className="checkout-print-actions"><button type="button" className="btn-outline" onClick={()=>window.print()} disabled={stage!=='complete'}><Printer size={16}/> Print {isReceipt?'receipt':'invoice'}</button></div>
  </section>;
}

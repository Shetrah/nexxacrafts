import { supabase } from './supabase';
import type { CartItem } from '../context/CartContext';

export interface RequestResult { id: string; reference: string; mode: 'live' | 'demo'; notificationSent?: boolean; customerEmailSent?: boolean; }
const DEMO_KEYS = { quotes: 'nexxacrafts-demo-quotes', orders: 'nexxacrafts-demo-orders' };
// Tracking works with a reference alone, so new references need a high-entropy random suffix.
const makeReference = (prefix: string) => `${prefix}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
const readDemo = (key: string) => { try { return JSON.parse(localStorage.getItem(key) || '[]') as any[]; } catch { return []; } };
const writeDemo = (key: string, row: unknown) => localStorage.setItem(key, JSON.stringify([row, ...readDemo(key)]));

export async function submitQuote(input: { name: string; email: string; phone: string; company?: string; serviceSlug: string; description: string; configuration: Record<string, unknown>; }): Promise<RequestResult> {
  const reference = makeReference('NCQ');
  if (supabase) {
    const { data, error } = await supabase.functions.invoke('contact-email', {
      body: { kind: 'quote', reference, ...input },
    });
    if (error) {
      let message = error.message;
      try {
        const response = (error as typeof error & { context?: Response }).context;
        if (response) {
          const details = await response.clone().json();
          if (typeof details?.error === 'string') message = details.error;
        }
      } catch { /* Keep the invocation error if the function returned no JSON detail. */ }
      throw new Error(message || 'Unable to submit your quotation request.');
    }
    if (!data?.id || !data?.reference) throw new Error('Your request could not be saved. Please try again.');
    return { id: data.id, reference: data.reference, mode: 'live', notificationSent: data.notificationSent === true };
  }
  const id = crypto.randomUUID();
  writeDemo(DEMO_KEYS.quotes, { id, reference, ...input, status: 'submitted', created_at: new Date().toISOString() });
  return { id, reference, mode: 'demo' };
}

export async function submitOrder(input: { name: string; email: string; phone: string; paymentMethod: 'mpesa' | 'bank' | 'card'; deliveryMethod: 'collection' | 'local_delivery' | 'courier'; deliveryAddress?: string; deliveryInstructions?: string; items: CartItem[]; notes?: string; }): Promise<RequestResult> {
  const reference = makeReference('NCO');
  if (supabase) {
    const { data, error } = await supabase.rpc('create_customer_order', {
      p_reference: reference,
      p_customer_name: input.name,
      p_customer_email: input.email,
      p_customer_phone: input.phone,
      p_payment_method: input.paymentMethod,
      p_delivery_method: input.deliveryMethod,
      p_delivery_address: input.deliveryAddress || null,
      p_delivery_instructions: input.deliveryInstructions || null,
      p_customer_notes: input.notes || null,
      p_items: input.items.map(item => ({
        serviceSlug: item.serviceSlug,
        serviceName: item.serviceName,
        configuration: item.configuration,
        quantity: item.quantity,
        estimate: item.estimate,
        files: item.files,
      })),
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    const { data: notification, error: notificationError } = await supabase.functions.invoke('contact-email', {
      body: { kind: 'order', order: { ...input, reference: row.reference } },
    });
    if (notificationError) console.error('Order saved, but WhatsApp notification could not be requested.', notificationError);
    return { id: row.id, reference: row.reference, mode: 'live', notificationSent: notification?.notificationSent === true, customerEmailSent: notification?.customerEmailSent === true };
  }
  const id = crypto.randomUUID();
  writeDemo(DEMO_KEYS.orders, { id, reference, ...input, status: 'awaiting_review', payment_status: 'unpaid', created_at: new Date().toISOString() });
  return { id, reference, mode: 'demo', notificationSent: false };
}

export async function sendInvoiceEmail(invoiceId: string): Promise<void> {
  if (!supabase) throw new Error('Connect Supabase before sending an invoice email.');
  const { data, error } = await supabase.functions.invoke('contact-email', { body: { kind: 'invoice', invoiceId } });
  if (error) {
    let message = error.message;
    try {
      const response = (error as typeof error & { context?: Response }).context;
      if (response) {
        const details = await response.clone().json();
        if (typeof details?.error === 'string') message = details.error;
      }
    } catch { /* Preserve the invocation error if no JSON response details are available. */ }
    throw new Error(message || 'Could not send the invoice email.');
  }
  if (!data?.invoiceEmailSent) throw new Error(data?.error || 'The invoice email was not accepted by the email provider.');
}

export function getDemoRecords(kind: 'quotes' | 'orders') { return readDemo(DEMO_KEYS[kind]); }
export function isLiveBackend() { return Boolean(supabase); }

export async function loadAdminRecords() {
  if (!supabase) return { orders: getDemoRecords('orders'), quotes: getDemoRecords('quotes') };
  const [{ data: orders, error: orderError }, { data: quotes, error: quoteError }] = await Promise.all([
    supabase.from('orders').select('id, reference, customer_name, customer_email, status, payment_status, created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('quote_requests').select('id, reference, customer_name, email, service_slug, status, quoted_amount, created_at').order('created_at', { ascending: false }).limit(100),
  ]);
  if (orderError) throw orderError;
  if (quoteError) throw quoteError;
  return { orders: orders || [], quotes: quotes || [] };
}

export async function updateOrderStatus(id: string, status: string) {
  if (!supabase) {
    const rows = getDemoRecords('orders').map(row => row.id === id ? { ...row, status } : row);
    localStorage.setItem(DEMO_KEYS.orders, JSON.stringify(rows));
    return;
  }
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updateQuoteStatus(id: string, status: string) {
  if (!supabase) {
    const rows = getDemoRecords('quotes').map(row => row.id === id ? { ...row, status } : row);
    localStorage.setItem(DEMO_KEYS.quotes, JSON.stringify(rows));
    return;
  }
  const { error } = await supabase.from('quote_requests').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function saveQuoteAmount(id: string, amount: number) {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Enter a valid non-negative quotation amount.');
  if (!supabase) {
    const rows = getDemoRecords('quotes').map(row => row.id === id ? { ...row, quoted_amount: amount, status: 'quoted' } : row);
    localStorage.setItem(DEMO_KEYS.quotes, JSON.stringify(rows));
    return;
  }
  const { error } = await supabase.from('quote_requests').update({ quoted_amount: amount, status: 'quoted' }).eq('id', id);
  if (error) throw error;
}

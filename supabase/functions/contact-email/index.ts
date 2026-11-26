import { createPaymentPdf, pdfBase64, uploadPaymentPdf, PAYMENT_PDF_DESIGN_VERSION, type PaymentPdfLine } from '../_shared/payment-pdf.ts';

const allowedOrigins = new Set([
  'https://nexxacrafts.co.ke',
  'https://www.nexxacrafts.co.ke',
  'https://nexxacrafts.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
]);

const corsHeaders = (origin: string | null) => ({
  ...(origin && allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character] ?? character));

const asText = (value: unknown, maxLength: number) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

function invoiceItemName(item: Record<string, unknown>) {
  const configuration = item.configuration && typeof item.configuration === 'object' && !Array.isArray(item.configuration)
    ? item.configuration as Record<string, unknown> : {};
  const product = Object.entries(configuration).find(([key, value]) => key.toLowerCase() === 'product' && typeof value === 'string')?.[1];
  const serviceName = asText(item.service_name, 140);
  const productName = asText(product, 100);
  return productName && !serviceName.toLowerCase().includes(productName.toLowerCase())
    ? `${serviceName} - ${productName}` : serviceName;
}

function buildCustomerOrderEmail(order: Record<string, unknown>, items: Array<Record<string, unknown>>) {
  const esc = (value: unknown) => escapeHtml(asText(value, 500));
  const money = (value: unknown) => {
    const amount = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(amount) ? `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'To be confirmed';
  };
  const rows = items.map((item, index) => {
    const quantity = Number(item.quantity) || 1;
    const amount = item.estimated_amount;
    const estimate = amount === null || amount === undefined ? 'To be quoted' : money(amount);
    return `<tr style="background:${index % 2 ? '#f7f9ff' : '#ffffff'}">
      <td style="padding:13px 14px;border-bottom:1px solid #e6ebf4;color:#18243b;font:600 14px/20px Arial,Helvetica,sans-serif">${esc(item.service_name)}</td>
      <td align="center" style="padding:13px 10px;border-bottom:1px solid #e6ebf4;color:#53627a;font:14px/20px Arial,Helvetica,sans-serif">${quantity}</td>
      <td align="right" style="padding:13px 14px;border-bottom:1px solid #e6ebf4;color:#18243b;font:700 14px/20px Arial,Helvetica,sans-serif">${estimate}</td>
    </tr>`;
  }).join('');
  const unpriced = items.some((item) => item.estimated_amount === null || item.estimated_amount === undefined);
  const estimateLabel = unpriced ? 'Preliminary estimate' : 'Estimated total';
  const total = unpriced ? 'Final amount to be confirmed' : money(order.total);
  const reference = esc(order.reference);
  const customerName = esc(order.customer_name) || 'there';
  const intro = `We’ve received your order request, ${customerName}. Our team will review the specifications and send your final invoice once the amount is approved.`;
  const textItems = items.map((item) => `${asText(item.service_name, 120)} × ${Number(item.quantity) || 1}: ${item.estimated_amount == null ? 'To be quoted' : money(item.estimated_amount)}`).join('\n');
  const text = `NexxaCraft order received\nReference: ${asText(order.reference, 60)}\n\n${intro}\n\nOrder estimate\n${textItems}\n\n${estimateLabel}: ${total}\nPreferred payment method: ${asText(order.payment_method, 30).toUpperCase()}\n\nThis is an order acknowledgement and estimate, not an invoice. We will email the invoice after the final amount is approved. A receipt will be sent after payment is confirmed.`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#edf2fa;color:#17243a;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">Order ${reference} received. Your itemized quotation summary is inside.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf2fa;padding:28px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;border:1px solid #dce5f2;border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 14px 36px rgba(13,32,70,.1)">
      <tr><td style="height:5px;background:#0341fc;font-size:0;line-height:0">&nbsp;</td></tr>
      <tr><td style="padding:25px 30px;background:#101b34"><div style="font-size:23px;line-height:28px;font-weight:800;letter-spacing:-.6px"><span style="color:#fff">Nexxa</span><span style="color:#ef4444">CRAFT</span></div><div style="margin-top:5px;color:#b7c6e0;font-size:10px;line-height:15px;font-weight:700;letter-spacing:1.7px;text-transform:uppercase">Design&nbsp; · &nbsp;Print&nbsp; · &nbsp;Build</div></td></tr>
      <tr><td style="padding:30px 30px 12px"><div style="color:#0341fc;font-size:10px;line-height:16px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase">Order acknowledgement</div><h1 style="margin:8px 0 0;color:#111c32;font-size:27px;line-height:34px;letter-spacing:-.5px">We’ve got your request.</h1><p style="margin:12px 0 0;color:#596780;font-size:14px;line-height:23px">${intro}</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:19px"><tr><td style="border:1px solid #dce6ff;border-radius:999px;background:#f0f4ff;padding:8px 12px;color:#123bba;font-size:11px;line-height:16px;font-weight:800;letter-spacing:.5px">ORDER&nbsp;&nbsp;${reference}</td></tr></table>
      </td></tr>
      <tr><td style="padding:14px 30px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f2;border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden"><tr style="background:#f0f4fb"><th align="left" style="padding:11px 14px;color:#68758b;font:700 10px/15px Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase">Service</th><th align="center" style="padding:11px 10px;color:#68758b;font:700 10px/15px Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase">Qty</th><th align="right" style="padding:11px 14px;color:#68758b;font:700 10px/15px Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase">Estimate</th></tr>${rows}</table></td></tr>
      <tr><td style="padding:17px 30px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:13px 14px;border-radius:10px;background:#f0f4ff;color:#344361;font:700 13px/20px Arial,Helvetica,sans-serif">${estimateLabel}</td><td align="right" style="padding:13px 14px;border-radius:10px;background:#f0f4ff;color:#123bba;font:800 15px/20px Arial,Helvetica,sans-serif">${total}</td></tr></table></td></tr>
      <tr><td style="padding:20px 30px 28px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left:3px solid #ef4444;background:#fff8f6"><tr><td style="padding:13px 15px;color:#53627a;font-size:12px;line-height:20px"><strong style="color:#17243a">What happens next</strong><br>This order acknowledgement includes a preliminary estimate. We’ll email your final invoice once the amount is approved. A payment receipt is sent only after your payment is confirmed.</td></tr></table>
        <p style="margin:20px 0 0;color:#596780;font-size:12px;line-height:20px">Preferred payment method: <strong style="color:#17243a">${esc(order.payment_method).toUpperCase()}</strong><br>Delivery: <strong style="color:#17243a">${esc(asText(order.delivery_method, 40).replace(/_/g, ' '))}</strong></p>
        <div style="padding-top:19px;text-align:center"><a href="https://nexxacrafts.co.ke/account" style="display:inline-block;border-radius:9px;background:#0341fc;padding:12px 20px;color:#fff;text-decoration:none;font-size:13px;line-height:18px;font-weight:700">View your account</a></div>
      </td></tr>
      <tr><td style="padding:17px 25px;border-top:1px solid #e7edf5;background:#f7f9fc;text-align:center;color:#76839a;font-size:10px;line-height:17px">Need help? Reply to this email and our team will assist you.<br><a href="https://nexxacrafts.co.ke" style="color:#0341fc;text-decoration:none;font-weight:700">nexxacrafts.co.ke</a>&nbsp;&nbsp;·&nbsp;&nbsp;Design · Print · Brand · Digital</td></tr>
    </table><div style="padding:13px 8px 0;color:#8a96a8;text-align:center;font-size:10px;line-height:16px">This email acknowledges your order request. It is not an invoice or payment receipt.</div>
  </td></tr></table>
</body></html>`;
  return { html, text };
}

async function sendCustomerOrderEmail(order: Record<string, unknown>, items: Array<Record<string, unknown>>) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
  const to = asText(order.customer_email, 254);
  if (!resendKey || !fromEmail || !to) {
    console.error('Customer order email is not configured or has no recipient.');
    return false;
  }
  const email = buildCustomerOrderEmail(order, items);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromEmail, to: [to], reply_to: Deno.env.get('RESEND_REPLY_TO') || fromEmail, subject: `Order received · ${asText(order.reference, 60)}`, text: email.text, html: email.html }),
  });
  if (!response.ok) {
    console.error('Resend rejected the customer order email', response.status, (await response.text()).slice(0, 1000));
    return false;
  }
  const result = await response.json().catch(() => null);
  console.log('Resend accepted the customer order email', { emailId: result?.id ?? 'unknown', recipient: to });
  return true;
}

function buildNotificationEmail(input: {
  kind: 'contact' | 'quote';
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  message: string;
  reference?: string;
}) {
  const isQuote = input.kind === 'quote';
  const title = isQuote ? 'A new quote request is here' : 'A new enquiry is here';
  const intro = isQuote
    ? 'A customer has shared a project brief. Review the details below and follow up when you are ready.'
    : 'Someone has reached out to NexxaCraft. Their project details are ready for your review.';
  const esc = escapeHtml;
  const rows = [
    ['Name', esc(input.name)],
    ['Email', `<a href="mailto:${esc(input.email)}" style="color:#0341fc;text-decoration:none;font-weight:700">${esc(input.email)}</a>`],
    ['Phone', input.phone ? `<a href="tel:${esc(input.phone.replace(/[^+\d]/g, ''))}" style="color:#17243a;text-decoration:none;font-weight:700">${esc(input.phone)}</a>` : '<span style="color:#778197">Not provided</span>'],
    ...(isQuote && input.company ? [['Company', esc(input.company)]] : []),
    ['Service', esc(input.service)],
  ];
  const details = rows.map(([label, value], index) => `
    <tr>
      <td style="padding:${index === 0 ? '15px' : '12px'} 16px;${index ? 'border-top:1px solid #eee7dc;' : ''}width:112px;vertical-align:top;color:#778197;font:600 13px/20px Arial,sans-serif">${label}</td>
      <td style="padding:${index === 0 ? '15px' : '12px'} 16px;${index ? 'border-top:1px solid #eee7dc;' : ''}vertical-align:top;color:#17243a;font:600 14px/21px Arial,sans-serif;word-break:break-word">${value}</td>
    </tr>`).join('');
  const brief = esc(input.message).replace(/\r?\n/g, '<br>');
  const referenceBlock = isQuote && input.reference ? `
    <div style="display:inline-block;margin-top:16px;padding:8px 12px;border:1px solid #dce6ff;border-radius:999px;background:#f3f6ff;color:#123bba;font:700 12px/16px Arial,sans-serif;letter-spacing:.04em">REFERENCE&nbsp;&nbsp;${esc(input.reference)}</div>` : '';

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#f4f1eb;color:#17243a;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${isQuote ? 'A new quotation request needs your review.' : 'A new customer enquiry needs your attention.'}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f1eb;padding:34px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#fffdfa;border:1px solid #e8e1d6;border-radius:18px;overflow:hidden;box-shadow:0 12px 34px rgba(28,37,56,.08)">
        <tr><td style="height:5px;background:#0341fc;font-size:0;line-height:0">&nbsp;</td></tr>
        <tr><td style="padding:25px 32px;background:#101b2d">
          <div style="font-size:23px;line-height:28px;font-weight:800;letter-spacing:-.7px"><span style="color:#fff">Nexxa</span><span style="color:#ff424b">CRAFT</span></div>
          <div style="margin-top:5px;color:#aab8ce;font-size:11px;line-height:16px;letter-spacing:1.7px;text-transform:uppercase">Create&nbsp; · &nbsp;Print&nbsp; · &nbsp;Build</div>
        </td></tr>
        <tr><td style="padding:32px 32px 12px">
          <div style="color:#0341fc;font-size:11px;line-height:16px;font-weight:800;letter-spacing:2px;text-transform:uppercase">${isQuote ? 'Quotation desk' : 'Customer enquiry'}</div>
          <h1 style="margin:10px 0 0;color:#17243a;font-size:27px;line-height:34px;letter-spacing:-.6px">${title}</h1>
          <p style="margin:12px 0 0;color:#667187;font-size:15px;line-height:24px">${intro}</p>
          ${referenceBlock}
        </td></tr>
        <tr><td style="padding:20px 32px 0">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #eee7dc;border-radius:12px;background:#fff;border-collapse:separate">${details}</table>
        </td></tr>
        <tr><td style="padding:22px 32px 28px">
          <div style="margin-bottom:9px;color:#778197;font-size:11px;line-height:16px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase">${isQuote ? 'Project brief' : 'Project details'}</div>
          <div style="padding:17px 18px;border:1px solid #eee7dc;border-left:3px solid #ef4444;border-radius:10px;background:#fff8ef;color:#29364b;font-size:14px;line-height:23px;overflow-wrap:anywhere">${brief}</div>
          <div style="padding-top:22px;text-align:center"><a href="mailto:${esc(input.email)}" style="display:inline-block;padding:12px 19px;border-radius:9px;background:#0341fc;color:#fff;text-decoration:none;font-size:14px;line-height:20px;font-weight:700">Reply to ${esc(input.name)}</a></div>
        </td></tr>
        <tr><td style="padding:18px 32px;background:#f8f5ef;border-top:1px solid #eee7dc;text-align:center;color:#778197;font-size:11px;line-height:18px">
          Sent securely from the <a href="https://nexxacrafts.co.ke" style="color:#0341fc;text-decoration:none;font-weight:700">NexxaCraft website</a><br>Design · Print · Brand · Digital
        </td></tr>
      </table>
      <div style="padding:16px 8px 0;color:#969385;text-align:center;font-size:10px;line-height:16px">This notification was sent to the NexxaCraft team inbox.</div>
    </td></tr>
  </table>
</body></html>`;
  return { html };
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') {
    if (origin && !allowedOrigins.has(origin)) return new Response('Origin not allowed', { status: 403, headers: corsHeaders(origin) });
    return new Response('ok', { headers: corsHeaders(origin) });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return json({ error: 'Origin not allowed' }, 403, origin);

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 1_000_000) return json({ error: 'Request is too large' }, 413, origin);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400, origin);
  }

  if (payload.kind === 'invoice_revoked') {
    const supabaseUrl = Deno.env.get('SUPABASE_URL'), anonKey = Deno.env.get('SUPABASE_ANON_KEY'), serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('authorization'), resendKey = Deno.env.get('RESEND_API_KEY'), fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
    if (!supabaseUrl || !anonKey || !serviceKey || !authorization) return json({ error: 'Sign in is required to revoke an invoice.' }, 401, origin);
    try {
      const auth = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
      if (!auth.ok) return json({ error: 'Your staff session could not be verified.' }, 401, origin);
      const user = await auth.json() as { id?: string };
      const roleResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=role&id=eq.${user.id}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
      const profiles = await roleResponse.json();
      if (!Array.isArray(profiles) || !['admin','finance'].includes(profiles[0]?.role)) return json({ error: 'Only admins or finance staff can revoke invoices.' }, 403, origin);
      if (!resendKey || !fromEmail) return json({ error: 'Email delivery is not configured.' }, 503, origin);
      const id = typeof payload.invoiceId === 'string' ? payload.invoiceId : '';
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'A valid invoice ID is required.' }, 400, origin);
      const found = await fetch(`${supabaseUrl}/rest/v1/invoices?select=id,order_id,invoice_number,customer_name,customer_email,status&id=eq.${id}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
      const rows = await found.json(); const invoice = Array.isArray(rows) ? rows[0] : null;
      if (!invoice) return json({ error: 'Invoice not found.' }, 404, origin);
      if (invoice.status === 'paid') return json({ error: 'A paid invoice cannot be revoked.' }, 409, origin);
      if (!invoice.customer_email) return json({ error: 'Invoice has no client email address.' }, 400, origin);
      const html = `<html><body style="font-family:Arial;background:#edf2fa;padding:28px;color:#17243a"><main style="max-width:600px;margin:auto;background:#fff;border-radius:14px;padding:28px"><h1>Invoice revoked</h1><p>Hello ${escapeHtml(invoice.customer_name)}, invoice <b>${escapeHtml(invoice.invoice_number)}</b> has been revoked and is no longer payable. Contact our team if you need an updated invoice.</p></main></body></html>`;
      const sent = await fetch('https://api.resend.com/emails', { method:'POST', headers:{Authorization:`Bearer ${resendKey}`,'Content-Type':'application/json'}, body:JSON.stringify({from:fromEmail,to:[invoice.customer_email],subject:`Invoice ${invoice.invoice_number} has been revoked · NexxaCraft`,html,text:`Invoice ${invoice.invoice_number} has been revoked and is no longer payable. Contact NexxaCraft if you need an updated invoice.`}) });
      if (!sent.ok) return json({ error: `Could not email the client (${sent.status}); invoice remains active.` }, 502, origin);
      if (invoice.order_id) {
        const removed = await fetch(`${supabaseUrl}/rest/v1/rpc/delete_admin_order_for_invoice`, { method:'POST', headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'}, body:JSON.stringify({p_invoice_id:id}) });
        if (!removed.ok) throw new Error(`Client was emailed, but the linked order could not be deleted (${removed.status}).`);
        return json({ok:true,revoked:true,orderDeleted:true},200,origin);
      }
      const saved = await fetch(`${supabaseUrl}/rest/v1/invoices?id=eq.${id}`, {method:'PATCH',headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({status:'void'})});
      if (!saved.ok) throw new Error(`Client was emailed, but invoice status update failed (${saved.status}).`);
      return json({ok:true,revoked:true,orderDeleted:false},200,origin);
    } catch (error) { return json({error:error instanceof Error?error.message:'Could not revoke invoice.'},500,origin); }
  }
  if (payload.kind === 'issued_quote') {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('authorization');
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
    const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey || !authorization) return json({ error: 'A staff session is required to send an issued quotation.' }, 401, origin);
    try {
      const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
      if (!authResponse.ok) return json({ error: 'Your staff session could not be verified.' }, 401, origin);
      const actor = await authResponse.json() as { id?: string };
      if (!actor.id) return json({ error: 'Your staff session could not be verified.' }, 401, origin);
      const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(actor.id)}&limit=1`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
      const profiles = profileResponse.ok ? await profileResponse.json() : [];
      if (!Array.isArray(profiles) || !['admin', 'sales', 'finance'].includes(profiles[0]?.role)) return json({ error: 'Admin, sales, or finance access is required to send quotations.' }, 403, origin);

      const quoteId = typeof payload.quoteId === 'string' ? payload.quoteId : '';
      if (!/^[0-9a-f-]{36}$/i.test(quoteId)) return json({ error: 'A valid quotation is required.' }, 400, origin);
      const quoteResponse = await fetch(`${supabaseUrl}/rest/v1/quote_requests?select=id,reference,customer_name,email,phone,company,service_slug,description,configuration,status,quoted_amount,currency,created_at&id=eq.${encodeURIComponent(quoteId)}&limit=1`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
      if (!quoteResponse.ok) throw new Error(`Quotation lookup failed (${quoteResponse.status}).`);
      const quoteRows = await quoteResponse.json();
      const quote = Array.isArray(quoteRows) ? quoteRows[0] as Record<string, unknown> | undefined : undefined;
      if (!quote) return json({ error: 'Quotation not found.' }, 404, origin);
      if (quote.status !== 'quoted' || !Number.isFinite(Number(quote.quoted_amount)) || Number(quote.quoted_amount) <= 0) return json({ error: 'Save and issue a positive quotation amount before sending it.' }, 409, origin);

      const recipient = asText(quote.email, 254);
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);
      const phoneDigits = asText(quote.phone, 40).replace(/\D/g, '');
      const whatsappRecipient = phoneDigits.startsWith('0') && phoneDigits.length === 10 ? `254${phoneDigits.slice(1)}` : phoneDigits.startsWith('254') && phoneDigits.length === 12 ? phoneDigits : phoneDigits.length === 9 ? `254${phoneDigits}` : '';
      if ((!emailValid || !resendKey || !fromEmail) && (!whatsappRecipient || !whatsappApiKey)) return json({ error: 'No quotation delivery channel is ready. Check the client email/phone and Resend/WhatsApp configuration.' }, 400, origin);

      const requestId = crypto.randomUUID();
      const requestedChannels = [
        ...(emailValid && resendKey && fromEmail ? [{ channel: 'email', recipient }] : []),
        ...(whatsappRecipient && whatsappApiKey ? [{ channel: 'whatsapp', recipient: whatsappRecipient }] : []),
      ];
      const logs = new Map<string, string>();
      for (const channel of requestedChannels) {
        const logResponse = await fetch(`${supabaseUrl}/rest/v1/quote_delivery_logs`, { method: 'POST', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ quote_id: quoteId, request_id: requestId, channel: channel.channel, recipient: channel.recipient, status: 'pending', created_by: actor.id }) });
        const logRows = logResponse.ok ? await logResponse.json() : null;
        if (!logResponse.ok || !Array.isArray(logRows) || !logRows[0]?.id) throw new Error(`Could not create quotation delivery record (${logResponse.status}).`);
        logs.set(channel.channel, String(logRows[0].id));
      }

      const quoteAmount = Number(quote.quoted_amount);
      const quoteNumber = asText(quote.reference, 80);
      const customerName = asText(quote.company, 160) || asText(quote.customer_name, 120);
      const serviceLabel = asText(quote.service_slug, 120).replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
      const quotePdf = await createPaymentPdf({
        kind: 'quotation', number: quoteNumber, orderReference: quoteNumber,
        customerName, customerEmail: recipient,
        date: new Date().toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' }),
        dueDate: 'As agreed', lines: [{ description: serviceLabel, quantity: 1, amount: quoteAmount }],
        subtotal: quoteAmount, tax: 0, total: quoteAmount,
      });
      const filename = `${quoteNumber.replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`;
      const amountLabel = `KES ${quoteAmount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const brief = asText(quote.description, 1500);
      const safeName = escapeHtml(customerName);
      const safeRef = escapeHtml(quoteNumber);
      const safeService = escapeHtml(serviceLabel);
      const safeBrief = escapeHtml(brief).replace(/\r?\n/g, '<br>');
      const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://nexxacrafts.co.ke').replace(/\/$/, '');
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"></head><body style="margin:0;padding:28px 12px;background:#edf2fa;color:#17243a;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border:1px solid #dce5f2;border-radius:16px;background:#fff;overflow:hidden"><tr><td style="height:5px;background:#0341fc"></td></tr><tr><td style="padding:24px 30px;background:#101b34"><div style="font-size:22px;font-weight:800"><span style="color:#fff">Nexxa</span><span style="color:#ef4444">CRAFT</span></div><div style="margin-top:5px;color:#b7c6e0;font-size:10px;letter-spacing:1.5px">DESIGN · PRINT · BUILD</div></td></tr><tr><td style="padding:28px 30px"><div style="color:#0341fc;font-size:11px;font-weight:800;letter-spacing:1.5px">YOUR QUOTATION</div><h1 style="margin:9px 0;color:#111c32;font-size:26px">${safeRef}</h1><p style="color:#596780;line-height:1.6">Hello ${safeName}, your quotation for <strong>${safeService}</strong> is ready. The attached PDF contains the quotation details.</p><div style="margin:20px 0;padding:18px;border-radius:12px;background:#f0f4ff"><span style="font-size:11px;color:#68758b;text-transform:uppercase;letter-spacing:1px">Quoted amount</span><div style="margin-top:5px;color:#123bba;font-size:23px;font-weight:800">${amountLabel}</div></div>${brief ? `<p style="color:#596780;line-height:1.6"><strong>Project brief</strong><br>${safeBrief}</p>` : ''}<p style="color:#596780;line-height:1.6">Please review the attached quotation and contact our team if you would like to proceed or discuss any changes.</p></td></tr><tr><td style="padding:18px;background:#f7f9fc;text-align:center;color:#76839a;font-size:11px">NexxaCraft · Design · Print · Build<br><a href="${escapeHtml(siteUrl)}" style="color:#0341fc">nexxacrafts.co.ke</a></td></tr></table></td></tr></table></body></html>`;
      const textBody = `NexxaCraft quotation ${quoteNumber}\nClient: ${customerName}\nService: ${serviceLabel}\nQuoted amount: ${amountLabel}\n\n${brief ? `Project brief: ${brief}\n\n` : ''}Please review the attached PDF and contact NexxaCraft if you would like to proceed or discuss changes.`;
      const results: Record<string, { sent: boolean; error?: string }> = {};
      if (logs.has('email')) {
        try {
          const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: fromEmail, to: [recipient], reply_to: Deno.env.get('RESEND_REPLY_TO') || fromEmail, subject: `Quotation ${quoteNumber} · NexxaCraft`, text: textBody, html, attachments: [{ filename, content: pdfBase64(quotePdf) }] }) });
          const responseText = await response.text();
          const responseBody = (() => { try { return JSON.parse(responseText) as Record<string, unknown>; } catch { return {}; } })();
          if (!response.ok) throw new Error(`Resend rejected quotation (${response.status}): ${asText(responseBody.message, 250) || responseText.slice(0, 250)}`);
          await fetch(`${supabaseUrl}/rest/v1/quote_delivery_logs?id=eq.${encodeURIComponent(logs.get('email')!)}`, { method: 'PATCH', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'sent', provider_message_id: asText(responseBody.id, 180), sent_at: new Date().toISOString() }) });
          results.email = { sent: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Email delivery failed.';
          await fetch(`${supabaseUrl}/rest/v1/quote_delivery_logs?id=eq.${encodeURIComponent(logs.get('email')!)}`, { method: 'PATCH', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'failed', error: message.slice(0, 500) }) });
          results.email = { sent: false, error: message };
        }
      }
      if (logs.has('whatsapp')) {
        try {
          const mediaUrl = await uploadPaymentPdf(supabaseUrl, serviceKey, `quotations/${quoteId}/${requestId}.pdf`, quotePdf);
          const response = await fetch('https://whatsy.elitesamttech.co.ke/api/v1/messages/media', { method: 'POST', headers: { 'X-API-Key': whatsappApiKey!, 'Content-Type': 'application/json' }, body: JSON.stringify({ to: whatsappRecipient, mimetype: 'application/pdf', mediaUrl, caption: `NexxaCraft quotation ${quoteNumber} for ${customerName}. Quoted amount: ${amountLabel}. Please review the attached PDF and reply if you would like to proceed.`, fileName: filename }) });
          const responseText = await response.text();
          const responseBody = (() => { try { return JSON.parse(responseText) as Record<string, unknown>; } catch { return {}; } })();
          if (!response.ok || responseBody.success !== true) throw new Error(`WhatsApp rejected quotation (${response.status}): ${asText(responseBody.message || responseBody.error, 250) || responseText.slice(0, 250)}`);
          await fetch(`${supabaseUrl}/rest/v1/quote_delivery_logs?id=eq.${encodeURIComponent(logs.get('whatsapp')!)}`, { method: 'PATCH', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'sent', provider_message_id: asText(responseBody.messageId, 180), sent_at: new Date().toISOString() }) });
          results.whatsapp = { sent: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'WhatsApp delivery failed.';
          await fetch(`${supabaseUrl}/rest/v1/quote_delivery_logs?id=eq.${encodeURIComponent(logs.get('whatsapp')!)}`, { method: 'PATCH', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'failed', error: message.slice(0, 500) }) });
          results.whatsapp = { sent: false, error: message };
        }
      }
      const emailSent = results.email?.sent === true;
      const whatsappSent = results.whatsapp?.sent === true;
      if (!emailSent && !whatsappSent) return json({ error: 'Quotation delivery failed on all configured channels.', emailError: results.email?.error, whatsappError: results.whatsapp?.error, requestId }, 502, origin);
      return json({ ok: true, requestId, emailSent, whatsappSent, emailError: results.email?.error, whatsappError: results.whatsapp?.error }, 200, origin);
    } catch (error) {
      console.error('Issued quotation delivery failed', error);
      return json({ error: error instanceof Error ? error.message : 'Could not send the issued quotation.' }, 500, origin);
    }
  }
  const kind = payload.kind === 'invoice' || payload.kind === 'checkout_invoice'
    ? 'invoice'
    : payload.kind === 'quote' ? 'quote' : payload.kind === 'order' ? 'order' : 'contact';
  if (kind === 'invoice') {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('authorization');
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
    const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey || !authorization) return json({ error: 'Sign in is required to send an invoice.' }, 401, origin);
    let authUser: { id?: string } | null = null;
    try {
      const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
      if (!authResponse.ok) return json({ error: 'Your customer session could not be verified. Please sign in again and retry invoice delivery.' }, 401, origin);
      authUser = await authResponse.json();
    } catch { return json({ error: 'Your customer session could not be verified. Please sign in again and retry invoice delivery.' }, 401, origin); }
    if (!authUser?.id) return json({ error: 'Your customer session could not be verified. Please sign in again and retry invoice delivery.' }, 401, origin);
    let invoiceStage = 'validate invoice request';
    try {
      const invoiceId = typeof payload.invoiceId === 'string' ? payload.invoiceId : '';
      if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return json({ error: 'A valid invoice ID is required.' }, 400, origin);
      invoiceStage = 'load invoice';
      const invoiceQuery = new URLSearchParams({ select: 'id,order_id,invoice_number,customer_name,customer_email,subtotal,tax,total,amount_paid,status,due_date,issued_at,sent_at', id: `eq.${invoiceId}` });
      const invoiceResponse = await fetch(`${supabaseUrl}/rest/v1/invoices?${invoiceQuery}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
      if (!invoiceResponse.ok) throw new Error(`Invoice lookup failed (${invoiceResponse.status}): ${(await invoiceResponse.text()).slice(0, 500)}`);
      const invoices = await invoiceResponse.json();
      const invoice = Array.isArray(invoices) ? invoices[0] : null;
      if (!invoice) return json({ error: 'Invoice not found.' }, 404, origin);
      if (invoice.status === 'draft' || invoice.status === 'void') return json({ error: 'Issue the invoice before sending it.' }, 409, origin);
      // Delivery columns were added by a later migration. Keep them out of the
      // core invoice lookup so an unapplied optional-column migration cannot
      // prevent the actual invoice from being sent.
      invoiceStage = 'load optional invoice delivery status';
      let deliveryMeta: Record<string, unknown> = {};
      try {
        const metadataQuery = new URLSearchParams({ select: 'whatsapp_sent_at,email_pdf_version,whatsapp_pdf_version', id: `eq.${invoiceId}` });
        const metadataResponse = await fetch(`${supabaseUrl}/rest/v1/invoices?${metadataQuery}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
        if (metadataResponse.ok) {
          const metadataRows = await metadataResponse.json();
          deliveryMeta = Array.isArray(metadataRows) && metadataRows[0] ? metadataRows[0] as Record<string, unknown> : {};
        } else {
          console.warn('Invoice delivery metadata is unavailable; proceeding with delivery and retryable status tracking.', metadataResponse.status, (await metadataResponse.text()).slice(0, 300));
        }
      } catch (error) {
        console.warn('Invoice delivery metadata lookup failed; proceeding with delivery.', error instanceof Error ? error.message : 'unknown error');
      }
      let invoicePhone = '';
      let invoicePaymentMethod = '';
      let invoiceOrderReference = '';
      if (invoice.order_id) {
        const orderQuery = new URLSearchParams({ select: 'id,customer_id,customer_email,customer_phone,payment_method,reference', id: `eq.${invoice.order_id}`, limit: '1' });
        const orderResponse = await fetch(`${supabaseUrl}/rest/v1/orders?${orderQuery}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
        const orderRows = orderResponse.ok ? await orderResponse.json() : [];
        const order = Array.isArray(orderRows) ? orderRows[0] : null;
        if (!order) return json({ error: 'The invoice order could not be verified.' }, 403, origin);
        if (payload.kind === 'checkout_invoice' && order.customer_id !== authUser?.id) return json({ error: 'This invoice does not belong to your account.' }, 403, origin);
        if (asText(order.customer_email, 254).toLowerCase() !== asText(invoice.customer_email, 254).toLowerCase()) return json({ error: 'The invoice recipient does not match the saved order.' }, 403, origin);
        invoicePhone = asText(order.customer_phone, 40);
        invoicePaymentMethod = asText(order.payment_method, 40);
        invoiceOrderReference = asText(order.reference, 60);
      }
      const emailPdfCurrent = Number(deliveryMeta.email_pdf_version || 0) >= PAYMENT_PDF_DESIGN_VERSION;
      const whatsappPdfCurrent = Number(deliveryMeta.whatsapp_pdf_version || 0) >= PAYMENT_PDF_DESIGN_VERSION;
      if (payload.kind === 'checkout_invoice' && invoice.sent_at && deliveryMeta.whatsapp_sent_at && emailPdfCurrent && whatsappPdfCurrent) return json({ ok: true, invoiceEmailSent: true, whatsappInvoiceSent: true, alreadySent: true, invoiceNumber: invoice.invoice_number }, 200, origin);
      const recipient = asText(invoice.customer_email, 254);
      const validRecipient = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);
      const emailConfigured = Boolean(resendKey && fromEmail && validRecipient);
      if (!validRecipient && !whatsappApiKey) return json({ error: 'Add a valid customer email or configure WhatsApp delivery for this invoice.' }, 400, origin);
      if (validRecipient && !emailConfigured && !whatsappApiKey) return json({ error: 'Invoice email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in Supabase Edge Function secrets.' }, 503, origin);

      const esc = escapeHtml;
      const currency = (value: unknown) => {
        const amount = Number(value);
        return Number.isFinite(amount) ? `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'KES 0.00';
      };
      let itemRows = '';
      let textItems = '';
      let invoicePdfLines: PaymentPdfLine[] = [];
      if (invoice.order_id) {
        const itemsQuery = new URLSearchParams({ select: 'service_name,service_slug,configuration,quantity,estimated_amount,confirmed_amount', order_id: `eq.${invoice.order_id}`, order: 'created_at.asc' });
        const itemsResponse = await fetch(`${supabaseUrl}/rest/v1/order_items?${itemsQuery}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
        if (!itemsResponse.ok) throw new Error(`Invoice order details lookup failed (${itemsResponse.status}).`);
        const invoiceItems = await itemsResponse.json();
        const validInvoiceItems = Array.isArray(invoiceItems) ? invoiceItems as Array<Record<string, unknown>> : [];
        
        // Extract delivery fee and design assistance pricing from configuration
        let deliveryFee = 0;
        let designFee = 0;
        let designServiceName = '';
        
        for (const item of validInvoiceItems) {
          const config = item.configuration && typeof item.configuration === 'object' && !Array.isArray(item.configuration)
            ? item.configuration as Record<string, unknown> : {};
          
          // Get delivery fee
          const fee = Number(config.delivery_fee || 0);
          if (fee > 0) deliveryFee = fee;
          
          // Get design assistance fee if artwork status is "Need design assistance"
          if (config.artwork === 'Need design assistance' && config.design_service) {
            // Fetch the service fields to get option prices
            const serviceSlug = asText(item.service_slug, 100);
            if (serviceSlug) {
              const serviceQuery = new URLSearchParams({ select: 'fields', slug: `eq.${serviceSlug}`, limit: '1' });
              const serviceResponse = await fetch(`${supabaseUrl}/rest/v1/services?${serviceQuery}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
              if (serviceResponse.ok) {
                const services = await serviceResponse.json();
                const service = Array.isArray(services) ? services[0] : null;
                if (service?.fields && Array.isArray(service.fields)) {
                  const designField = service.fields.find((f: any) => f.name === 'design_service');
                  if (designField?.optionPrices) {
                    const selectedDesign = String(config.design_service);
                    designFee = Number(designField.optionPrices[selectedDesign] || 0);
                    designServiceName = selectedDesign;
                  }
                }
              }
            }
          }
        }
        
        // Calculate subtotal (excluding ONLY delivery fee, design stays in items)
        const subtotalAmount = Number(invoice.total || 0) - deliveryFee;
        
        // Build line items - subtract delivery fee but NOT design fee
        invoicePdfLines = validInvoiceItems.map(item => {
          const quantity = Number(item.quantity) || 1;
          const totalAmount = Number(item.confirmed_amount ?? item.estimated_amount ?? 0);
          // Subtract ONLY delivery fee from the item amount
          const amount = totalAmount - deliveryFee;
          return {
            description: invoiceItemName(item),
            quantity,
            amount,
            unitAmount: amount / quantity,
          };
        });
        
        // Add design assistance as a LINE ITEM in the main table
        if (designFee > 0 && designServiceName) {
          invoicePdfLines.push({
            description: `Design Assistance - ${designServiceName}`,
            quantity: 1,
            amount: designFee,
            unitAmount: designFee,
          });
        }
        
        // Build HTML table rows for email
        itemRows = validInvoiceItems.map((item: Record<string, unknown>, index: number) => {
          const totalAmount = Number(item.confirmed_amount ?? item.estimated_amount ?? 0);
          const quantity = Number(item.quantity) || 1;
          // Subtract ONLY delivery fee
          const amount = totalAmount - deliveryFee;
          const unitPrice = amount / quantity;
          const itemName = invoiceItemName(item);
          textItems += `${itemName} × ${quantity} @ ${currency(unitPrice)} = ${currency(amount)}\n`;
          return `<tr style="background:${index % 2 ? '#f7f9ff' : '#fff'}"><td style="padding:12px;border-bottom:1px solid #e6ebf4"><strong>${esc(itemName)}</strong></td><td align="center" style="padding:12px;border-bottom:1px solid #e6ebf4">${quantity}</td><td align="right" style="padding:12px;border-bottom:1px solid #e6ebf4;white-space:nowrap">${currency(unitPrice)}</td><td align="right" style="padding:12px;border-bottom:1px solid #e6ebf4;white-space:nowrap">${currency(amount)}</td></tr>`;
        }).join('');
        
        // Add design assistance row to email HTML table
        if (designFee > 0 && designServiceName) {
          const rowIndex = validInvoiceItems.length;
          textItems += `Design Assistance - ${designServiceName} × 1 @ ${currency(designFee)} = ${currency(designFee)}\n`;
          itemRows += `<tr style="background:${rowIndex % 2 ? '#f7f9ff' : '#fff'}"><td style="padding:12px;border-bottom:1px solid #e6ebf4"><strong>Design Assistance - ${esc(designServiceName)}</strong></td><td align="center" style="padding:12px;border-bottom:1px solid #e6ebf4">1</td><td align="right" style="padding:12px;border-bottom:1px solid #e6ebf4;white-space:nowrap">${currency(designFee)}</td><td align="right" style="padding:12px;border-bottom:1px solid #e6ebf4;white-space:nowrap">${currency(designFee)}</td></tr>`;
        }
        
        // Add delivery to text summary (not in table)
        if (deliveryFee > 0) {
          textItems += `Delivery Fee: ${currency(deliveryFee)}\n`;
        }
      }
      const dueDate = invoice.due_date ? new Date(`${invoice.due_date}T00:00:00`).toLocaleDateString('en-KE', { dateStyle: 'long' }) : 'As agreed';
      const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://nexxacrafts.co.ke').replace(/\/$/, '');
      const paymentUrl = invoice.order_id ? `${siteUrl}/pay/${invoice.id}` : '';
      let trackingUrl = '';
      if (invoice.order_id) {
        const orderReferenceQuery = new URLSearchParams({ select: 'reference', id: `eq.${invoice.order_id}`, limit: '1' });
        const orderReferenceResponse = await fetch(`${supabaseUrl}/rest/v1/orders?${orderReferenceQuery}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
        if (orderReferenceResponse.ok) {
          const orderRows = await orderReferenceResponse.json();
          const orderReference = Array.isArray(orderRows) ? asText(orderRows[0]?.reference, 60) : '';
          if (orderReference) trackingUrl = `${siteUrl}/track/${encodeURIComponent(orderReference)}`;
        }
      }
      const dueAmount = Number(invoice.total) - Number(invoice.amount_paid || 0);
      const payText = paymentUrl ? `\nPay securely by M-Pesa: ${paymentUrl}` : '';
      const trackingText = trackingUrl ? `\nTrack your order status: ${trackingUrl}` : '';
      const text = `NexxaCraft invoice ${invoice.invoice_number}\nBill to: ${invoice.customer_name}\nDue: ${dueDate}\n\n${textItems || 'Please contact our team if you need the itemized breakdown.'}\nSubtotal: ${currency(subtotalAmount)}\n${deliveryFee > 0 ? `Delivery Fee: ${currency(deliveryFee)}\n` : ''}Tax: ${currency(invoice.tax)}\nTotal due: ${currency(dueAmount)}${payText}${trackingText}\n\nThank you for choosing NexxaCraft.`;
      const invoicePdf = await createPaymentPdf({
        kind: 'invoice',
        number: asText(invoice.invoice_number, 80),
        orderReference: invoiceOrderReference,
        customerName: asText(invoice.customer_name, 120),
        customerEmail: asText(invoice.customer_email, 254),
        date: new Date(String(invoice.issued_at || new Date().toISOString())).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' }),
        dueDate,
        lines: invoicePdfLines,
        subtotal: subtotalAmount,
        deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
        tax: Number(invoice.tax || 0),
        total: dueAmount,
        amountPaid: Number(invoice.amount_paid || 0),
        paymentMethod: invoice.order_id ? 'mpesa' : invoicePaymentMethod,
      });
      const invoiceFilename = `${asText(invoice.invoice_number, 80).replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`;
      const payButton = paymentUrl ? `<tr><td align="center" style="padding:0 30px 28px"><a href="${esc(paymentUrl)}" style="display:inline-block;border-radius:9px;background:#0341fc;padding:14px 24px;color:#fff;text-decoration:none;font-size:15px;font-weight:700">Pay invoice securely</a><p style="font-size:11px;color:#76839a">You’ll receive an M-Pesa prompt on your phone.</p></td></tr>` : '';
      const trackingButton = trackingUrl ? `<tr><td align="center" style="padding:0 30px 28px"><a href="${esc(trackingUrl)}" style="display:inline-block;border:1px solid #ccd7eb;border-radius:9px;padding:12px 20px;color:#183db7;text-decoration:none;font-size:14px;font-weight:700">Track your order status</a><p style="font-size:11px;color:#76839a">Use your order reference to check progress any time.</p></td></tr>` : '';
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"></head><body style="margin:0;padding:28px 12px;background:#edf2fa;color:#17243a;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border:1px solid #dce5f2;border-radius:16px;background:#fff;overflow:hidden"><tr><td style="height:5px;background:#0341fc"></td></tr><tr><td style="padding:24px 30px;background:#101b34"><div style="font-size:22px;font-weight:800"><span style="color:#fff">Nexxa</span><span style="color:#ef4444">CRAFT</span></div><div style="margin-top:5px;color:#b7c6e0;font-size:10px;letter-spacing:1.5px">DESIGN · PRINT · BUILD</div></td></tr><tr><td style="padding:28px 30px 10px"><div style="color:#0341fc;font-size:11px;font-weight:800;letter-spacing:1.5px">INVOICE</div><h1 style="margin:9px 0;color:#111c32;font-size:27px">${esc(invoice.invoice_number)}</h1><p style="color:#596780;line-height:1.6">Hello ${esc(invoice.customer_name)}, please find your invoice below. Due date: <strong>${esc(dueDate)}</strong>.</p></td></tr><tr><td style="padding:12px 30px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e2e8f2"><tr style="background:#f0f4fb"><th align="left" style="padding:11px">Description</th><th style="padding:11px">Qty</th><th align="right" style="padding:11px">Unit Price</th><th align="right" style="padding:11px">Amount</th></tr>${itemRows || `<tr><td colspan="4" style="padding:14px">Invoice details are available from our team.</td></tr>`}</table></td></tr><tr><td align="right" style="padding:16px 30px 24px"><div style="line-height:1.9;color:#53627a">Subtotal: <strong>${currency(subtotalAmount)}</strong>${deliveryFee > 0 ? `<br>Delivery Fee: <strong>${currency(deliveryFee)}</strong>` : ''}<br>Tax: <strong>${currency(invoice.tax)}</strong><br><span style="font-size:19px;color:#123bba;font-weight:800">Amount due: ${currency(dueAmount)}</span></div></td></tr>${payButton}${trackingButton}<tr><td style="padding:18px;background:#f7f9fc;text-align:center;color:#76839a;font-size:11px">Thank you for choosing NexxaCraft · <a href="${esc(siteUrl)}" style="color:#0341fc">nexxacrafts.co.ke</a></td></tr></table></td></tr></table></body></html>`;
      invoiceStage = 'send invoice email';
      let invoiceEmailSent = Boolean(invoice.sent_at && payload.kind === 'checkout_invoice' && emailPdfCurrent);
      let invoiceEmailError = '';
      if (validRecipient && !invoiceEmailSent && emailConfigured) {
        try {
          const sent = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: fromEmail, to: [recipient], reply_to: Deno.env.get('RESEND_REPLY_TO') || fromEmail, subject: `Invoice ${invoice.invoice_number} · NexxaCraft`, text, html, attachments: [{ filename: invoiceFilename, content: pdfBase64(invoicePdf) }] }) });
          if (!sent.ok) {
            const details = (await sent.text()).slice(0, 1000);
            invoiceEmailError = `Email provider rejected delivery (${sent.status}). ${details}`;
            console.error('Resend rejected invoice email', sent.status, details);
          } else {
            const emailResult = await sent.json().catch(() => null);
            invoiceEmailSent = true;
            const markResponse = await fetch(`${supabaseUrl}/rest/v1/invoices?id=eq.${invoiceId}`, { method: 'PATCH', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ sent_at: new Date().toISOString(), email_pdf_version: PAYMENT_PDF_DESIGN_VERSION }) });
            if (!markResponse.ok) console.error('Invoice email accepted but sent_at could not be saved', markResponse.status, (await markResponse.text()).slice(0, 500));
            console.log('Resend accepted invoice email', { emailId: emailResult?.id ?? 'unknown', invoiceNumber: invoice.invoice_number, recipient });
          }
        } catch (error) { invoiceEmailError = error instanceof Error ? error.message : 'Invoice email delivery failed.'; }
      } else if (validRecipient && !invoiceEmailSent && !emailConfigured) {
        invoiceEmailError = 'Email service is not configured; WhatsApp delivery will be attempted.';
      }

      invoiceStage = 'send invoice WhatsApp';
      let whatsappInvoiceSent = Boolean(deliveryMeta.whatsapp_sent_at && payload.kind === 'checkout_invoice' && whatsappPdfCurrent);
      let whatsappInvoiceError = whatsappInvoiceSent ? '' : whatsappApiKey ? '' : 'WhatsApp delivery is not configured. Set WHATSAPP_API_KEY in Supabase Edge Function secrets.';
      if (whatsappApiKey && invoicePhone && !whatsappInvoiceSent) {
        const digits = invoicePhone.replace(/\D/g, '');
        const to = digits.startsWith('0') && digits.length === 10 ? `254${digits.slice(1)}` : digits.startsWith('254') ? digits : digits.length === 9 ? `254${digits}` : '';
        if (to) {
          try {
            const invoicePdfUrl = await uploadPaymentPdf(supabaseUrl, serviceKey, `invoices/${invoiceId}.pdf`, invoicePdf);
            const caption = `NexxaCraft invoice ${asText(invoice.invoice_number, 80)} for ${asText(invoice.customer_name, 120)}. Amount due: ${currency(dueAmount)}.${paymentUrl ? ` Pay securely: ${paymentUrl}` : ''}${trackingUrl ? ` Track order: ${trackingUrl}` : ''}`;
            const whatsappResponse = await fetch('https://whatsy.elitesamttech.co.ke/api/v1/messages/media', { method: 'POST', headers: { 'X-API-Key': whatsappApiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ to, mimetype: 'application/pdf', mediaUrl: invoicePdfUrl, caption, fileName: invoiceFilename }) });
            const whatsappBodyText = await whatsappResponse.text();
            let whatsappBody: Record<string, unknown> = {};
            try { whatsappBody = JSON.parse(whatsappBodyText) as Record<string, unknown>; } catch { /* preserve provider status in the error */ }
            if (!whatsappResponse.ok || whatsappBody.success !== true) {
              whatsappInvoiceError = `WhatsApp provider rejected invoice (${whatsappResponse.status}): ${asText(whatsappBody.message || whatsappBody.error, 240) || whatsappBodyText.slice(0, 300)}`;
              console.error(whatsappInvoiceError);
            } else {
              whatsappInvoiceSent = true;
              const savedWhatsApp = await fetch(`${supabaseUrl}/rest/v1/invoices?id=eq.${invoiceId}`, { method: 'PATCH', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ whatsapp_sent_at: new Date().toISOString(), whatsapp_pdf_version: PAYMENT_PDF_DESIGN_VERSION }) });
              if (!savedWhatsApp.ok) console.error('WhatsApp accepted invoice but whatsapp_sent_at could not be saved', savedWhatsApp.status, (await savedWhatsApp.text()).slice(0, 400));
            }
          } catch (error) { whatsappInvoiceError = error instanceof Error ? error.message : 'WhatsApp invoice delivery failed.'; }
        } else whatsappInvoiceError = 'The saved customer phone number is not a valid Kenyan number.';
      } else if (whatsappApiKey && !invoicePhone) whatsappInvoiceError = 'No customer phone number is saved for WhatsApp delivery.';

      if (!invoiceEmailSent && !whatsappInvoiceSent) {
        return json({ error: [invoiceEmailError, whatsappInvoiceError].filter(Boolean).join(' · ') || 'No invoice delivery channel accepted the message.', invoiceEmailSent, whatsappInvoiceSent, invoiceNumber: invoice.invoice_number }, 502, origin);
      }
      return json({ ok: true, invoiceEmailSent, whatsappInvoiceSent, invoiceEmailError: invoiceEmailError || undefined, whatsappInvoiceError: whatsappInvoiceError || undefined, invoiceNumber: invoice.invoice_number }, 200, origin);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send invoice email.';
      console.error('Invoice delivery failed', { stage: invoiceStage, message });
      return json({ error: `${message} (stage: ${invoiceStage})` }, 500, origin);
    }
  }
  if (kind === 'order') {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('authorization');
    if (!supabaseUrl || !anonKey || !serviceKey || !authorization) return json({ error: 'Sign in is required to notify the team about an order.' }, 401, origin);
    let authUser: { id?: string; email?: string };
    try {
      const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
      if (!userResponse.ok) return json({ error: 'Sign in is required to notify the team about an order.' }, 401, origin);
      authUser = await userResponse.json();
    } catch {
      return json({ error: 'Could not verify the order submission session.' }, 401, origin);
    }
    const order = payload.order && typeof payload.order === 'object' ? payload.order as Record<string, unknown> : {};
    const name = asText(order.name, 120);
    const email = asText(order.email, 254);
    const phone = asText(order.phone, 40);
    const reference = asText(order.reference, 60);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone || !/^NCO-[A-Z0-9-]{8,32}$/.test(reference) || !Array.isArray(order.items)) {
      return json({ error: 'Order notification details were invalid.' }, 400, origin);
    }
    if (!authUser.id) return json({ error: 'Could not verify the order owner.' }, 401, origin);
    try {
      const query = new URLSearchParams({ select: 'id,reference,customer_id,customer_name,customer_email,customer_phone,payment_method,delivery_method,delivery_address,subtotal,tax,total,currency,created_at', reference: `eq.${reference}`, customer_id: `eq.${authUser.id}` });
      const orderResponse = await fetch(`${supabaseUrl}/rest/v1/orders?${query}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
      if (!orderResponse.ok) throw new Error(`Order lookup failed (${orderResponse.status}).`);
      const savedOrders = await orderResponse.json();
      const savedOrder = Array.isArray(savedOrders) ? savedOrders[0] : null;
      if (!savedOrder || asText(savedOrder.customer_email, 254).toLowerCase() !== asText(authUser.email, 254).toLowerCase()) return json({ error: 'This order does not belong to the signed-in customer.' }, 403, origin);
      const itemQuery = new URLSearchParams({ select: 'service_name,quantity,estimated_amount', order_id: `eq.${savedOrder.id}`, order: 'created_at.asc' });
      const itemResponse = await fetch(`${supabaseUrl}/rest/v1/order_items?${itemQuery}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
      if (!itemResponse.ok) throw new Error(`Order items lookup failed (${itemResponse.status}).`);
      const savedItems = await itemResponse.json();
      const validItems = Array.isArray(savedItems) ? savedItems : [];
      let emailSent = false;
      let invoiceEmailSent = false;
      let invoiceWhatsappSent = false;
      let invoiceEmailError = '';
      let invoiceWhatsappError = '';
      if (savedOrder.total !== null && Number(savedOrder.total) > 0) {
        try {
          const invoiceQuery = new URLSearchParams({ select: 'id,invoice_number', order_id: `eq.${savedOrder.id}`, limit: '1' });
          const existingResponse = await fetch(`${supabaseUrl}/rest/v1/invoices?${invoiceQuery}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
          if (!existingResponse.ok) throw new Error(`Invoice lookup failed (${existingResponse.status}).`);
          const existingRows = await existingResponse.json();
          let invoice = Array.isArray(existingRows) ? existingRows[0] : null;
          if (!invoice) {
            const invoiceNumber = `INV-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${crypto.randomUUID().replace(/-/g,'').slice(0,5).toUpperCase()}`;
            const insertResponse = await fetch(`${supabaseUrl}/rest/v1/invoices`, { method: 'POST', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=ignore-duplicates' }, body: JSON.stringify({ order_id: savedOrder.id, invoice_number: invoiceNumber, customer_name: savedOrder.customer_name, customer_email: savedOrder.customer_email, subtotal: savedOrder.subtotal ?? savedOrder.total, tax: savedOrder.tax ?? 0, total: savedOrder.total, amount_paid: 0, status: 'issued', issued_at: new Date().toISOString() }) });
            if (!insertResponse.ok) throw new Error(`Invoice creation failed (${insertResponse.status}): ${(await insertResponse.text()).slice(0,400)}`);
            const inserted = await insertResponse.json(); invoice = Array.isArray(inserted) ? inserted[0] : null;
            if (!invoice) {
              const retryQuery = new URLSearchParams({ select: 'id,invoice_number', order_id: `eq.${savedOrder.id}`, limit: '1' });
              const retryResponse = await fetch(`${supabaseUrl}/rest/v1/invoices?${retryQuery}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
              const retryRows = retryResponse.ok ? await retryResponse.json() : [];
              invoice = Array.isArray(retryRows) ? retryRows[0] : null;
            }
          }
          if (!invoice?.id) throw new Error('The order invoice was not created.');
          const paymentQuery = new URLSearchParams({ select: 'id', order_id: `eq.${savedOrder.id}`, status: 'eq.pending', limit: '1' });
          const paymentResponse = await fetch(`${supabaseUrl}/rest/v1/payments?${paymentQuery}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
          if (!paymentResponse.ok) throw new Error(`Payment lookup failed (${paymentResponse.status}).`);
          const paymentRows = await paymentResponse.json(); const payment = Array.isArray(paymentRows) ? paymentRows[0] : null;
          if (payment?.id) {
            const linkResponse = await fetch(`${supabaseUrl}/rest/v1/payments?id=eq.${payment.id}`, { method: 'PATCH', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ invoice_id: invoice.id, amount: savedOrder.total, provider: 'payhero' }) });
            if (!linkResponse.ok) throw new Error(`Invoice payment link failed (${linkResponse.status}).`);
          }
      const invoiceEmail = await fetch(`${supabaseUrl}/functions/v1/contact-email`, { method: 'POST', headers: { apikey: anonKey, Authorization: authorization!, 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'checkout_invoice', invoiceId: invoice.id }) });
          const invoiceDelivery = await invoiceEmail.json().catch(() => ({}));
          invoiceEmailSent = invoiceEmail.ok && invoiceDelivery.invoiceEmailSent === true;
          invoiceWhatsappSent = invoiceEmail.ok && invoiceDelivery.whatsappInvoiceSent === true;
          invoiceWhatsappError = asText(invoiceDelivery.whatsappInvoiceError, 500);
          if (!invoiceEmailSent) {
            invoiceEmailError = asText(invoiceDelivery.invoiceEmailError || invoiceDelivery.error, 500) || (invoiceEmail.ok ? 'Invoice email was not sent.' : `Invoice request failed (${invoiceEmail.status}).`);
            console.error('Auto invoice created but invoice email was not accepted', invoiceEmail.status, invoiceEmailError);
          }
        } catch (error) {
          invoiceEmailError = error instanceof Error ? error.message : 'Could not automatically issue order invoice.';
          console.error('Could not automatically issue order invoice', error);
        }
      } else {
        invoiceEmailError = 'A final order total is not saved yet, so an invoice cannot be issued. An admin must confirm the price first.';
      }
      try { emailSent = await sendCustomerOrderEmail(savedOrder, validItems); }
      catch (error) { console.error('Could not send customer order email', error); }
      return json({ ok: true, customerEmailSent: emailSent, invoiceEmailSent, invoiceWhatsappSent, invoiceEmailError, invoiceWhatsappError }, 200, origin);
    } catch (error) {
      console.error('Could not send customer order confirmation', error);
      return json({ ok: true, notificationSent: false, customerEmailSent: false }, 200, origin);
    }
  }
  // Quietly accept bot submissions without storing or sending them.
  const contactTrap = typeof payload.contactCheck === 'string' ? payload.contactCheck : payload.website;
  if (typeof contactTrap === 'string' && contactTrap.trim()) {
    console.warn(`Ignored contact submission after honeypot was filled`, { kind });
    return json({ ok: true, ignored: true, notificationSent: false }, 200, origin);
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
  const service = typeof payload.service === 'string' ? payload.service.trim() : '';
  const serviceSlug = typeof payload.serviceSlug === 'string' ? payload.serviceSlug.trim() : '';
  const company = typeof payload.company === 'string' ? payload.company.trim() : '';
  const description = typeof payload.description === 'string' ? payload.description.trim() : '';
  const message = (kind === 'quote' ? description : typeof payload.message === 'string' ? payload.message.trim() : '');
  const serviceLabel = kind === 'quote'
    ? serviceSlug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : service;
  if (name.length < 1 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || phone.length > 40 || company.length > 160 || serviceLabel.length < 1 || serviceLabel.length > 160 || message.length < 10 || message.length > 2000) {
    return json({ error: 'Please check the enquiry details and try again.' }, 400, origin);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
  const toEmail = 'nexxacrafts@gmail.com';
  if (!supabaseUrl || !serviceKey) {
    console.error('Contact email function is missing required server-side configuration');
    return json({ error: 'The enquiry form is temporarily unavailable. Please contact us by phone or email.' }, 503, origin);
  }

  let savedRecord: { id?: string; reference?: string } = {};
  let saved: Response;
  let emailMessage: string;
  if (kind === 'quote') {
    const authorization = request.headers.get('authorization');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!authorization || !anonKey) return json({ error: 'Sign in with your registered client account before requesting a quotation.' }, 401, origin);
    let quoteUser: { id?: string; email?: string; email_confirmed_at?: string | null };
    try {
      const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
      if (!userResponse.ok) return json({ error: 'Your client session could not be verified. Sign in and try again.' }, 401, origin);
      quoteUser = await userResponse.json();
    } catch {
      return json({ error: 'Your client session could not be verified. Sign in and try again.' }, 401, origin);
    }
    if (!quoteUser.id || !quoteUser.email || !quoteUser.email_confirmed_at) {
      return json({ error: 'Verify your client account email before requesting a quotation.' }, 403, origin);
    }
    if (email.toLowerCase() !== quoteUser.email.toLowerCase()) {
      return json({ error: 'Use the email address registered to your signed-in client account.' }, 403, origin);
    }
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(quoteUser.id)}&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const profileRows = profileResponse.ok ? await profileResponse.json() : [];
    if (!Array.isArray(profileRows) || profileRows[0]?.role !== 'customer') {
      return json({ error: 'Only registered client accounts can request quotations.' }, 403, origin);
    }
    const reference = typeof payload.reference === 'string' && /^NCQ-[A-Z0-9-]{8,32}$/.test(payload.reference)
      ? payload.reference
      : `NCQ-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    saved = await fetch(`${supabaseUrl}/rest/v1/quote_requests?select=id,reference`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        reference,
        customer_id: quoteUser.id,
        customer_name: name,
        email,
        phone: phone || null,
        company: company || null,
        service_slug: serviceSlug,
        description,
        configuration: payload.configuration && typeof payload.configuration === 'object' ? payload.configuration : {},
        status: 'submitted',
      }),
    });
    emailMessage = `New NexxaCraft quotation request\n\nReference: ${reference}\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\nCompany: ${company || 'Not provided'}\nService: ${serviceLabel}\n\nProject brief:\n${description}`;
  } else {
    saved = await fetch(`${supabaseUrl}/rest/v1/contact_inquiries`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ name, email, phone: phone || null, service, message }),
    });
    emailMessage = `New NexxaCraft website enquiry\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\nService: ${service}\n\nProject details:\n${message}`;
  }

  if (!saved.ok) {
    console.error(`Failed to store ${kind} submission`, saved.status, await saved.text());
    return json({ error: `We could not save your ${kind === 'quote' ? 'quotation request' : 'enquiry'}. Please try again.` }, 502, origin);
  }
  if (kind === 'quote') {
    const rows = await saved.json().catch(() => []);
    savedRecord = Array.isArray(rows) ? rows[0] ?? {} : {};
  }

  if (!resendKey || !fromEmail) {
    console.error(`Resend configuration is missing for ${kind} submission`);
    return json({ ok: true, notificationSent: false, id: savedRecord.id, reference: savedRecord.reference }, 200, origin);
  }

  const notificationEmail = buildNotificationEmail({
    kind,
    name,
    email,
    phone,
    company,
    service: serviceLabel,
    message,
    reference: savedRecord.reference,
  });
  try {
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `${kind === 'quote' ? 'New quotation request' : 'New website enquiry'} · ${serviceLabel}`,
        text: emailMessage,
        html: notificationEmail.html,
      }),
    });
    if (!sent.ok) {
      console.error(`Resend rejected ${kind} notification`, sent.status, await sent.text());
      return json({ ok: true, notificationSent: false, id: savedRecord.id, reference: savedRecord.reference }, 200, origin);
    }
    const result = await sent.json().catch(() => null);
    console.log(`Resend accepted ${kind} notification`, { emailId: result?.id ?? 'unknown', recipient: toEmail });
  } catch (error) {
    console.error(`Could not reach Resend for ${kind} notification`, error);
    return json({ ok: true, notificationSent: false, id: savedRecord.id, reference: savedRecord.reference }, 200, origin);
  }
  return json({ ok: true, notificationSent: true, id: savedRecord.id, reference: savedRecord.reference }, 200, origin);
});

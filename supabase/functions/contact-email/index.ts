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

async function sendOrderWhatsApp(input: Record<string, unknown>) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const apiKey = Deno.env.get('TWILIO_API_KEY');
  const apiSecret = Deno.env.get('TWILIO_API_SECRET');
  const from = Deno.env.get('TWILIO_WHATSAPP_FROM');
  const to = Deno.env.get('TWILIO_WHATSAPP_TO');
  const contentSid = Deno.env.get('TWILIO_WHATSAPP_CONTENT_SID');
  if (!accountSid || !apiKey || !apiSecret || !from || !to) {
    console.error('Twilio WhatsApp credentials or sender/recipient are not configured.');
    return false;
  }

  const items = Array.isArray(input.items) ? input.items.slice(0, 20) : [];
  const lines = items.map((item) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return `• ${asText(row.serviceName, 120)} × ${Number(row.quantity) || 1}`;
  });
  const message = [
    `New NexxaCraft order: ${asText(input.reference, 60)}`,
    `Name: ${asText(input.name, 120)}`,
    `Phone: ${asText(input.phone, 40)}`,
    `Email: ${asText(input.email, 254)}`,
    `Payment: ${asText(input.paymentMethod, 30)}`,
    `Delivery: ${asText(input.deliveryMethod, 40)}`,
    ...lines,
    `Notes: ${asText(input.notes, 500) || 'None'}`,
  ].join('\n').slice(0, 1500);

  const form = new URLSearchParams({ From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`, To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}` });
  if (contentSid) {
    form.set('ContentSid', contentSid);
    form.set('ContentVariables', JSON.stringify({ '1': asText(input.reference, 60), '2': asText(input.name, 120), '3': asText(input.phone, 40), '4': lines.join(', ').slice(0, 500) || 'No item details' }));
  } else {
    form.set('Body', message);
  }
  const auth = btoa(`${apiKey}:${apiSecret}`);
  const sent = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!sent.ok) {
    console.error('Twilio rejected the order WhatsApp notification', sent.status, (await sent.text()).slice(0, 1000));
    return false;
  }
  return true;
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
  const intro = `We’ve received your order request, ${customerName}. Our team will review the specifications and confirm the final amount before requesting payment.`;
  const textItems = items.map((item) => `${asText(item.service_name, 120)} × ${Number(item.quantity) || 1}: ${item.estimated_amount == null ? 'To be quoted' : money(item.estimated_amount)}`).join('\n');
  const text = `NexxaCraft order received\nReference: ${asText(order.reference, 60)}\n\n${intro}\n\nQuotation summary\n${textItems}\n\n${estimateLabel}: ${total}\nPreferred payment method: ${asText(order.payment_method, 30).toUpperCase()}\n\nThis is an estimate, not a final invoice. We will send the invoice after the final amount is approved. A receipt will be sent after payment is confirmed.`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#edf2fa;color:#17243a;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">Order ${reference} received. Your itemized quotation summary is inside.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf2fa;padding:28px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;border:1px solid #dce5f2;border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 14px 36px rgba(13,32,70,.1)">
      <tr><td style="height:5px;background:#0341fc;font-size:0;line-height:0">&nbsp;</td></tr>
      <tr><td style="padding:25px 30px;background:#101b34"><div style="font-size:23px;line-height:28px;font-weight:800;letter-spacing:-.6px"><span style="color:#fff">Nexxa</span><span style="color:#ef4444">CRAFT</span></div><div style="margin-top:5px;color:#b7c6e0;font-size:10px;line-height:15px;font-weight:700;letter-spacing:1.7px;text-transform:uppercase">Design&nbsp; · &nbsp;Print&nbsp; · &nbsp;Build</div></td></tr>
      <tr><td style="padding:30px 30px 12px"><div style="color:#0341fc;font-size:10px;line-height:16px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase">Order confirmation</div><h1 style="margin:8px 0 0;color:#111c32;font-size:27px;line-height:34px;letter-spacing:-.5px">We’ve got your request.</h1><p style="margin:12px 0 0;color:#596780;font-size:14px;line-height:23px">${intro}</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:19px"><tr><td style="border:1px solid #dce6ff;border-radius:999px;background:#f0f4ff;padding:8px 12px;color:#123bba;font-size:11px;line-height:16px;font-weight:800;letter-spacing:.5px">ORDER&nbsp;&nbsp;${reference}</td></tr></table>
      </td></tr>
      <tr><td style="padding:14px 30px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f2;border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden"><tr style="background:#f0f4fb"><th align="left" style="padding:11px 14px;color:#68758b;font:700 10px/15px Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase">Service</th><th align="center" style="padding:11px 10px;color:#68758b;font:700 10px/15px Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase">Qty</th><th align="right" style="padding:11px 14px;color:#68758b;font:700 10px/15px Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase">Estimate</th></tr>${rows}</table></td></tr>
      <tr><td style="padding:17px 30px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:13px 14px;border-radius:10px;background:#f0f4ff;color:#344361;font:700 13px/20px Arial,Helvetica,sans-serif">${estimateLabel}</td><td align="right" style="padding:13px 14px;border-radius:10px;background:#f0f4ff;color:#123bba;font:800 15px/20px Arial,Helvetica,sans-serif">${total}</td></tr></table></td></tr>
      <tr><td style="padding:20px 30px 28px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left:3px solid #ef4444;background:#fff8f6"><tr><td style="padding:13px 15px;color:#53627a;font-size:12px;line-height:20px"><strong style="color:#17243a">What happens next</strong><br>This quotation is an estimate while our team checks your order details. We’ll email the final invoice once the amount is approved. A payment receipt is sent only after your payment is confirmed.</td></tr></table>
        <p style="margin:20px 0 0;color:#596780;font-size:12px;line-height:20px">Preferred payment method: <strong style="color:#17243a">${esc(order.payment_method).toUpperCase()}</strong><br>Delivery: <strong style="color:#17243a">${esc(asText(order.delivery_method, 40).replace(/_/g, ' '))}</strong></p>
        <div style="padding-top:19px;text-align:center"><a href="https://nexxacrafts.co.ke/account" style="display:inline-block;border-radius:9px;background:#0341fc;padding:12px 20px;color:#fff;text-decoration:none;font-size:13px;line-height:18px;font-weight:700">View your account</a></div>
      </td></tr>
      <tr><td style="padding:17px 25px;border-top:1px solid #e7edf5;background:#f7f9fc;text-align:center;color:#76839a;font-size:10px;line-height:17px">Need help? Reply to this email and our team will assist you.<br><a href="https://nexxacrafts.co.ke" style="color:#0341fc;text-decoration:none;font-weight:700">nexxacrafts.co.ke</a>&nbsp;&nbsp;·&nbsp;&nbsp;Design · Print · Brand · Digital</td></tr>
    </table><div style="padding:13px 8px 0;color:#8a96a8;text-align:center;font-size:10px;line-height:16px">This email confirms your order request. It is not a payment receipt.</div>
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
  if (contentLength > 12_000) return json({ error: 'Request is too large' }, 413, origin);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400, origin);
  }

  const kind = payload.kind === 'quote' ? 'quote' : payload.kind === 'order' ? 'order' : 'contact';
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
      try { emailSent = await sendCustomerOrderEmail(savedOrder, validItems); }
      catch (error) { console.error('Could not send customer order email', error); }
      let whatsappSent = false;
      try {
        whatsappSent = await sendOrderWhatsApp({ ...order, name: savedOrder.customer_name, email: savedOrder.customer_email, phone: savedOrder.customer_phone, reference: savedOrder.reference, items: validItems });
      } catch (error) { console.error('Could not send the order WhatsApp notification', error); }
      return json({ ok: true, notificationSent: whatsappSent, customerEmailSent: emailSent }, 200, origin);
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
    const reference = typeof payload.reference === 'string' && /^NCQ-[A-Z0-9-]{8,32}$/.test(payload.reference)
      ? payload.reference
      : `NCQ-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    let customerId: string | null = null;
    const authHeader = request.headers.get('authorization');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (authHeader && anonKey) {
      try {
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
        if (userResponse.ok) customerId = (await userResponse.json()).id ?? null;
      } catch { /* Guest quote requests are valid; keep customer_id null. */ }
    }
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
        customer_id: customerId,
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

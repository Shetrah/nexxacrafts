import {
  createPaymentPdf,
  pdfBase64,
  uploadPaymentPdf,
  PAYMENT_PDF_DESIGN_VERSION,
} from '../_shared/payment-pdf.ts';

const origins = new Set([
  'https://nexxacrafts.co.ke',
  'https://www.nexxacrafts.co.ke',
  'https://nexxacrafts.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
]);

// NexxaCraft's confirmed active PayHero M-Pesa till channel.
const DEFAULT_PAYHERO_CHANNEL_ID = 6751;
const PAYHERO_API_BASE = 'https://backend.payhero.co.ke/api/v2';

type Row = Record<string, unknown>;

const cors = (origin: string | null, requestedHeaders: string | null = null) => ({
  ...(origin && origins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
  'Access-Control-Allow-Headers': requestedHeaders || [
    'authorization',
    'apikey',
    'x-client-info',
    'content-type',
    'x-supabase-api-version',
    'x-supabase-client-platform',
    'x-supabase-client-platform-version',
    'x-supabase-client-runtime',
    'x-supabase-client-runtime-version',
  ].join(', '),
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin, Access-Control-Request-Headers',
});

const json = (body: Row, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(origin),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[c] ?? c));

const text = (s: unknown, n = 200) => typeof s === 'string' ? s.trim().slice(0, n) : '';

function receiptItemName(item: Row) {
  const configuration = item.configuration && typeof item.configuration === 'object' && !Array.isArray(item.configuration)
    ? item.configuration as Row
    : {};
  const product = Object.entries(configuration)
    .find(([key, value]) => key.toLowerCase() === 'product' && typeof value === 'string')?.[1];
  const serviceName = text(item.service_name, 140);
  const productName = text(product, 100);
  return productName && !serviceName.toLowerCase().includes(productName.toLowerCase())
    ? `${serviceName} - ${productName}`
    : serviceName;
}

function base64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** PayHero Basic token first; username/password are the fallback. */
function payheroAuthorization(): string {
  const configuredToken = (
    Deno.env.get('PAYHERO_AUTH_TOKEN') ||
    Deno.env.get('PAYHERO_BASIC_AUTH_TOKEN') ||
    ''
  ).trim();

  if (configuredToken) {
    const token = configuredToken.replace(/^Basic\s+/i, '').trim();
    if (token) {
      return token.includes(':')
        ? `Basic ${base64Utf8(token)}`
        : `Basic ${token}`;
    }
  }

  const username = Deno.env.get('PAYHERO_API_USERNAME')?.trim();
  const password = Deno.env.get('PAYHERO_API_PASSWORD')?.trim();
  if (username && password) return `Basic ${base64Utf8(`${username}:${password}`)}`;
  return '';
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  plain: string,
  attachments?: Array<{ filename: string; content: string }>,
) {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM_EMAIL');
  if (!key || !from || !to) throw new Error('Email delivery is not configured.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: Deno.env.get('RESEND_REPLY_TO') || from,
      subject,
      html,
      text: plain,
      ...(attachments?.length ? { attachments } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend rejected email (${response.status}): ${(await response.text()).slice(0, 400)}`);
  }
}

function emailFrame(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#edf2fa;font-family:Arial,sans-serif;color:#17243a;padding:28px 12px"><table role="presentation" width="100%"><tr><td align="center"><table role="presentation" width="100%" style="max-width:620px;background:white;border:1px solid #dce5f2;border-radius:16px;overflow:hidden"><tr><td style="height:5px;background:#0341fc"></td></tr><tr><td style="padding:22px 28px;background:#101b34;color:white;font-size:23px;font-weight:bold">Nexxa<span style="color:#ef4444">CRAFT</span></td></tr><tr><td style="padding:28px"><p style="font-size:11px;color:#0341fc;font-weight:bold;letter-spacing:1.5px">${title.toUpperCase()}</p>${body}</td></tr><tr><td style="padding:16px;text-align:center;background:#f7f9fc;color:#76839a;font-size:11px">NexxaCraft · Design · Print · Build</td></tr></table></td></tr></table></body></html>`;
}

async function rest(url: string, key: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Database request failed (${response.status}): ${body.slice(0, 500)}`);
  return body ? JSON.parse(body) : null;
}

const money = (value: unknown) =>
  `KES ${Number(value).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, '');
  if (/^0[71]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[71]\d{8}$/.test(digits)) return digits;
  if (/^[71]\d{8}$/.test(digits)) return `254${digits}`;
  throw new Error('Enter a valid Kenyan M-Pesa phone number.');
}

/**
 * Resolve only the requested active Till/Paybill channel. Never silently fall
 * back to a different channel: that could route customer funds to the wrong
 * destination. NexxaCraft has confirmed channel ID 6751 (Till 3251128).
 */
async function discoverPayheroChannel(authorization: string, preferredChannelId: number) {
  const response = await fetch(`${PAYHERO_API_BASE}/payment_channels`, {
    method: 'GET',
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(20000),
  });

  const raw = await response.text();
  let data: Row = {};
  try {
    data = JSON.parse(raw) as Row;
  } catch {
    // Report provider status below without exposing credentials.
  }

  if (!response.ok) {
    const providerMessage = text(data.message ?? data.error_message ?? data.error ?? data.detail, 220);
    throw new Error(`PayHero channel lookup failed (HTTP ${response.status}). ${providerMessage || raw.slice(0, 220) || 'Check your PayHero API credentials.'}`);
  }

  const channels = Array.isArray(data.payment_channels)
    ? data.payment_channels as Row[]
    : [];
  const selected = channels.find(channel => Number(channel.id) === preferredChannelId);

  if (!selected) {
    throw new Error(`PayHero channel ${preferredChannelId} was not returned by your account. Check PAYHERO_CHANNEL_ID.`);
  }

  const isActive = selected.is_active === true || String(selected.is_active).toLowerCase() === 'true';
  if (!isActive) {
    throw new Error(`PayHero channel ${preferredChannelId} is inactive. Activate it in PayHero before accepting payments.`);
  }

  const channelType = text(selected.channel_type, 30).toLowerCase();
  if (!['till', 'paybill'].includes(channelType)) {
    throw new Error(`PayHero channel ${preferredChannelId} is a ${channelType || 'unknown'} channel, not a Till or Paybill channel.`);
  }

  const id = Number(selected.id);
  if (!Number.isInteger(id) || id <= 0) throw new Error('PayHero returned an invalid payment channel ID.');

  return {
    id,
    channelType,
    shortCode: text(selected.short_code, 40),
    description: text(selected.description, 100),
  };
}

async function deliverPendingEmails(url: string, service: string, paymentId: unknown) {
  const id = String(paymentId);
  let rows = await rest(
    url,
    service,
    `payment_email_outbox?select=*&payment_id=eq.${encodeURIComponent(id)}&limit=1`,
  ) as Row[];
  let row = rows[0];

  if (!row) {
    const paymentQuery = new URLSearchParams({
      select: 'id,invoice_id,order_id,amount,status,method,provider,transaction_reference,provider_reference',
      id: `eq.${encodeURIComponent(id)}`,
      limit: '1',
    });
    const payments = await rest(url, service, `payments?${paymentQuery}`) as Row[];
    const payment = payments[0];
    if (!payment || !['confirmed', 'reconciled'].includes(text(payment.status, 30))) {
      throw new Error('No confirmed payment email record exists for this payment.');
    }

    const invoiceQuery = new URLSearchParams({
      select: 'id,invoice_number,customer_name,customer_email,total,amount_paid',
      id: `eq.${encodeURIComponent(String(payment.invoice_id))}`,
      limit: '1',
    });
    const invoices = await rest(url, service, `invoices?${invoiceQuery}`) as Row[];
    const invoice = invoices[0];
    if (!invoice) throw new Error('The invoice for this payment could not be found.');

    const amount = Number(payment.amount);
    const invoiceTotal = Number(invoice.total);
    const amountPaid = Number(invoice.amount_paid || 0);
    await rest(url, service, 'payment_email_outbox', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({
        payment_id: id,
        invoice_id: invoice.id,
        customer_email: invoice.customer_email,
        customer_name: invoice.customer_name,
        invoice_number: invoice.invoice_number,
        invoice_total: invoiceTotal,
        amount_paid: amountPaid,
        prior_amount_paid: Math.max(0, amountPaid - amount),
        payment_amount: amount,
        transaction_reference: payment.transaction_reference || 'Confirmed',
        provider_reference: payment.provider_reference || null,
        payment_method: payment.method || payment.provider || 'payment',
      }),
    });

    rows = await rest(
      url,
      service,
      `payment_email_outbox?select=*&payment_id=eq.${encodeURIComponent(id)}&limit=1`,
    ) as Row[];
    row = rows[0];
  }

  if (!row) throw new Error('Could not prepare the payment receipt email.');

  const paymentDetails = await rest(
    url,
    service,
    `payments?select=order_id,confirmed_at,failure_reason&id=eq.${encodeURIComponent(id)}&limit=1`,
  ) as Row[];
  const paymentRecord = paymentDetails[0];
  const orderDetails = paymentRecord?.order_id
    ? await rest(url, service, `orders?select=reference,customer_phone&id=eq.${encodeURIComponent(String(paymentRecord.order_id))}&limit=1`) as Row[]
    : [];
  const orderRecord = orderDetails[0];
  const receiptItems = paymentRecord?.order_id
    ? await rest(url, service, `order_items?select=service_name,configuration,quantity,confirmed_amount,estimated_amount&order_id=eq.${encodeURIComponent(String(paymentRecord.order_id))}&order=created_at.asc`) as Row[]
    : [];

  const storedReceiptReference = text(row.transaction_reference, 100);
  const receipt = storedReceiptReference.startsWith('PayHero ')
    || ['confirmed', 'recorded by admin'].includes(storedReceiptReference.toLowerCase())
    ? ''
    : storedReceiptReference;
  const paymentMethod = text(row.payment_method, 40).toLowerCase() === 'bank' ? 'Bank' : 'M-Pesa';
  const receiptReference = receipt || text(row.provider_reference, 100) || `${paymentMethod === 'Bank' ? 'BANK' : 'MPESA'}-${id.slice(0, 8).toUpperCase()}`;
  const amount = Number(row.payment_amount);
  const balance = Number(row.invoice_total) - Number(row.prior_amount_paid);
  const amountRemaining = Math.max(0, balance - amount);
  const emailPdfIsCurrent = Number(row.customer_email_pdf_version || 1) >= PAYMENT_PDF_DESIGN_VERSION;
  const whatsappPdfIsCurrent = Number(row.customer_whatsapp_pdf_version || 1) >= PAYMENT_PDF_DESIGN_VERSION;
  const formatMoney = (value: unknown) =>
    `KES ${Number(value).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const receiptPdf = await createPaymentPdf({
    kind: 'receipt',
    number: `RCP-${id.slice(0, 8).toUpperCase()}`,
    orderReference: text(orderRecord?.reference, 60),
    customerName: text(row.customer_name, 120),
    customerEmail: text(row.customer_email, 254),
    date: paymentRecord?.confirmed_at
      ? new Date(String(paymentRecord.confirmed_at)).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
      : new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
    lines: receiptItems.length
      ? receiptItems.map(item => {
          const quantity = Number(item.quantity) || 1;
          const amount = Number(item.confirmed_amount ?? item.estimated_amount ?? 0);
          return {
            description: receiptItemName(item) || 'Order item',
            quantity,
            amount,
            unitAmount: amount / quantity,
          };
        })
      : [{ description: `Payment for invoice ${text(row.invoice_number, 80)}`, quantity: 1, amount, unitAmount: amount }],
    total: Number(row.invoice_total),
    amountPaid: amount,
    balanceDue: amountRemaining,
    paymentMethod,
    transactionReference: receiptReference,
  });

  const receiptItemsHtml = receiptItems.map(item =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #e6ebf4">${esc(receiptItemName(item) || 'Order item')}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e6ebf4">${Number(item.quantity) || 1}</td></tr>`
  ).join('');
  const receiptItemsText = receiptItems.map(item =>
    `${receiptItemName(item) || 'Order item'} × ${Number(item.quantity) || 1}`
  ).join('\n');
  const receiptFilename = `${text(row.invoice_number, 80).replace(/[^a-zA-Z0-9_-]/g, '-')}-receipt.pdf`;
  const receiptStoragePath = text(row.receipt_pdf_path, 300) || `receipts/${id}.pdf`;
  let receiptPdfUrl = '';

  let customerEmailError = text(row.customer_email_error, 300);
  if (!row.customer_email_sent_at || !emailPdfIsCurrent) {
    try {
      const customerEmail = text(row.customer_email, 254);
      if (!customerEmail) throw new Error('The invoice has no customer email address.');
      await sendEmail(
        customerEmail,
        `Payment receipt · ${text(row.invoice_number, 80)}`,
        emailFrame('Payment receipt', `<h1 style="margin:0 0 12px">Payment received</h1><p>Hello ${esc(row.customer_name)}, your payment has been confirmed.</p><table role="presentation" width="100%" style="border-collapse:collapse;margin:16px 0">${receiptItemsHtml}</table><div style="padding:16px;background:#f0f4ff;border-radius:10px"><p>Invoice: <b>${esc(row.invoice_number)}</b></p><p>Amount paid: <b>${formatMoney(amount)}</b></p><p>Payment method: <b>${paymentMethod}</b></p><p>Reference: <b>${esc(receiptReference)}</b></p><p>Balance due: <b>${formatMoney(amountRemaining)}</b></p></div><p>Thank you for choosing NexxaCraft.</p>`),
        `Payment received for invoice ${text(row.invoice_number, 80)}. ${receiptItemsText ? `${receiptItemsText}\n` : ''}Amount ${formatMoney(amount)} via ${paymentMethod}. Reference ${receiptReference}.`,
        [{ filename: receiptFilename, content: pdfBase64(receiptPdf) }],
      );

      const sentAt = new Date().toISOString();
      await rest(url, service, `payment_email_outbox?payment_id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ customer_email_sent_at: sentAt, customer_email_error: null, customer_email_pdf_version: PAYMENT_PDF_DESIGN_VERSION }),
      });
      await rest(url, service, `payments?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ receipt_sent_at: sentAt }),
      });
      row.customer_email_sent_at = sentAt;
      customerEmailError = '';
    } catch (error) {
      customerEmailError = error instanceof Error ? error.message : 'Customer receipt email failed.';
      await rest(url, service, `payment_email_outbox?payment_id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ customer_email_error: customerEmailError.slice(0, 500) }),
      }).catch(() => {});
      console.error('Could not send payment receipt email', customerEmailError);
    }
  }

  let customerWhatsappError = text(row.customer_whatsapp_error, 300);
  if (!row.customer_whatsapp_sent_at || !whatsappPdfIsCurrent) {
    try {
      const apiKey = Deno.env.get('WHATSAPP_API_KEY');
      if (!apiKey) throw new Error('WhatsApp is not configured. Set WHATSAPP_API_KEY in Supabase secrets.');
      const rawPhone = text(orderRecord?.customer_phone, 40);
      const digits = rawPhone.replace(/\D/g, '');
      const to = digits.startsWith('0') && digits.length === 10 ? `254${digits.slice(1)}`
        : digits.startsWith('254') ? digits
        : digits.length === 9 ? `254${digits}`
        : '';
      if (!to) throw new Error('A valid client WhatsApp number is not saved on this order.');
      if (!receiptPdfUrl) receiptPdfUrl = await uploadPaymentPdf(url, service, receiptStoragePath, receiptPdf);
      if (!row.receipt_pdf_path) {
        await rest(url, service, `payment_email_outbox?payment_id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ receipt_pdf_path: receiptStoragePath }),
        });
        row.receipt_pdf_path = receiptStoragePath;
      }
      const caption = `Payment received for invoice ${text(row.invoice_number, 80)}.\nAmount received: ${formatMoney(amount)}\nPayment reference: ${receiptReference}\nPayment method: ${paymentMethod}\nBalance remaining: ${formatMoney(amountRemaining)}\nThank you for choosing NexxaCraft.`;
      const response = await fetch('https://whatsy.elitesamttech.co.ke/api/v1/messages/media', {
        method: 'POST',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, mimetype: 'application/pdf', mediaUrl: receiptPdfUrl, caption, fileName: receiptFilename }),
      });
      const responseText = await response.text();
      let result: Row = {};
      try { result = JSON.parse(responseText) as Row; } catch { /* include provider status below */ }
      if (!response.ok || result.success !== true) {
        throw new Error(`WhatsApp provider rejected receipt (${response.status}): ${text(result.message || result.error || responseText, 240)}`);
      }
      const sentAt = new Date().toISOString();
      await rest(url, service, `payment_email_outbox?payment_id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ customer_whatsapp_sent_at: sentAt, customer_whatsapp_error: null, customer_whatsapp_pdf_version: PAYMENT_PDF_DESIGN_VERSION }),
      });
      await rest(url, service, `payments?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ receipt_whatsapp_sent_at: sentAt }),
      });
      row.customer_whatsapp_sent_at = sentAt;
      customerWhatsappError = '';
    } catch (error) {
      customerWhatsappError = error instanceof Error ? error.message : 'WhatsApp receipt delivery failed.';
      await rest(url, service, `payment_email_outbox?payment_id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ customer_whatsapp_error: customerWhatsappError.slice(0, 500) }),
      }).catch(() => {});
      console.error('Could not send payment receipt through WhatsApp', customerWhatsappError);
    }
  }

  if (!row.admin_email_sent_at) {
    const adminEmail = Deno.env.get('PAYMENT_ADMIN_EMAIL') || 'nexxacrafts@gmail.com';
    await sendEmail(
      adminEmail,
      `Payment received · ${text(row.invoice_number, 80)}`,
      emailFrame('Payment notification', `<h1>Successful payment</h1><p>${esc(row.customer_name)} paid <b>${formatMoney(amount)}</b> for invoice <b>${esc(row.invoice_number)}</b>.</p><p>Receipt: <b>${esc(receipt || 'Confirmed')}</b></p><p>Customer email: ${esc(row.customer_email)}</p>${paymentRecord?.failure_reason ? `<p style="padding:12px;background:#fff1f0;color:#9f2d24;border-radius:8px"><b>Reconciliation required:</b> ${esc(paymentRecord.failure_reason)}</p>` : ''}`),
      `Payment received: ${formatMoney(amount)}, invoice ${text(row.invoice_number, 80)}, receipt ${receipt}.${paymentRecord?.failure_reason ? ` Reconciliation required: ${text(paymentRecord.failure_reason, 300)}` : ''}`,
    );
    const sentAt = new Date().toISOString();
    await rest(url, service, `payment_email_outbox?payment_id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ admin_email_sent_at: sentAt }),
    });
    row.admin_email_sent_at = sentAt;
  }

  return {
    customerEmailSent: Boolean(row.customer_email_sent_at),
    customerEmailError: customerEmailError || undefined,
    customerWhatsappSent: Boolean(row.customer_whatsapp_sent_at),
    customerWhatsappError: customerWhatsappError || undefined,
    adminEmailSent: Boolean(row.admin_email_sent_at),
    customerEmail: text(row.customer_email, 254),
  };
}

async function notifyAdmins(url: string, service: string, paymentId: unknown) {
  const id = String(paymentId);
  const rows = await rest(
    url,
    service,
    `payment_admin_notifications?select=payment_id,dashboard_notified_at&payment_id=eq.${encodeURIComponent(id)}&limit=1`,
  ) as Row[];
  if (!rows[0] || rows[0].dashboard_notified_at) return;

  const paymentRows = await rest(url, service, `payments?select=invoice_id,amount,transaction_reference,failure_reason&id=eq.${encodeURIComponent(id)}`) as Row[];
  const payment = paymentRows[0];
  if (!payment) return;
  const invoiceRows = await rest(url, service, `invoices?select=invoice_number,order_id&id=eq.${encodeURIComponent(String(payment.invoice_id))}`) as Row[];
  const invoice = invoiceRows[0];
  if (!invoice) return;
  const orderRows = await rest(url, service, `orders?select=customer_name&id=eq.${encodeURIComponent(String(invoice.order_id))}`) as Row[];
  const order = orderRows[0];
  const profiles = await rest(url, service, 'profiles?select=id&role=eq.admin') as Array<{ id: string }>;

  if (profiles.length) {
    const message = `${text(order?.customer_name, 120) || 'A customer'} paid ${money(payment.amount)} for invoice ${text(invoice.invoice_number, 80)}${payment.transaction_reference ? ` (M-Pesa ${text(payment.transaction_reference, 50)})` : ''}.${payment.failure_reason ? ` ACTION REQUIRED: ${text(payment.failure_reason, 220)}` : ''}`;
    await rest(url, service, 'notifications', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(profiles.map(profile => ({
        user_id: profile.id,
        title: 'Payment received',
        message,
        link: '/admin/payments',
      }))),
    });
  }

  await rest(url, service, `payment_admin_notifications?payment_id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ dashboard_notified_at: new Date().toISOString() }),
  });
}

Deno.serve(async req => {
  const origin = req.headers.get('origin');

  // Return immediately for browser preflight. Do not parse JSON or call services.
  if (req.method === 'OPTIONS') {
    const requestedMethod = req.headers.get('access-control-request-method');
    if (origin && !origins.has(origin)) {
      return new Response('Origin not allowed.', {
        status: 403,
        headers: cors(null, req.headers.get('access-control-request-headers')),
      });
    }
    if (requestedMethod && !['GET', 'POST'].includes(requestedMethod.toUpperCase())) {
      return new Response('Method not allowed.', {
        status: 405,
        headers: cors(origin, req.headers.get('access-control-request-headers')),
      });
    }
    return new Response('ok', {
      status: 200,
      headers: cors(origin, req.headers.get('access-control-request-headers')),
    });
  }

  if (req.method === 'GET') return json({ ok: true, service: 'payhero-payments' }, 200, origin);
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);

  const queryAction = new URL(req.url).searchParams.get('action');
  const payload = await req.json().catch(() => ({})) as Row;
  const action = queryAction === 'callback' ? 'callback' : text(payload.action, 30);
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !service) return json({ error: 'Payment service is not configured.' }, 503, origin);

  if (action === 'callback') {
    const response = (payload.response && typeof payload.response === 'object'
      ? payload.response
      : payload) as Row;
    const externalRef = text(
      response.ExternalReference ?? response.external_reference ?? payload.user_reference ?? payload.external_reference ?? payload.reference,
      100,
    );
    if (!externalRef) return json({ received: true }, 200, origin);

    try {
      const query = new URLSearchParams({
        select: 'id,invoice_id,amount,status,order_id,provider_reference,payhero_reference,transaction_reference',
        provider: 'eq.payhero',
        provider_reference: `eq.${externalRef}`,
        limit: '1',
      });
      const rows = await rest(url, service, `payments?${query}`) as Row[];
      const payment = rows[0];
      if (!payment) return json({ received: true }, 200, origin);

      // PayHero callbacks do not carry a documented signature. Treat the
      // callback only as a wake-up signal and ask PayHero's authenticated API
      // for the final result before writing any payment state.
      const lookupReference = text(payment.payhero_reference, 180);
      const authorization = payheroAuthorization();
      if (!authorization || !lookupReference) return json({ received: true }, 200, origin);
      const lookup = await fetch(
        `${PAYHERO_API_BASE}/transaction-status?reference=${encodeURIComponent(lookupReference)}`,
        { method: 'GET', headers: { Authorization: authorization, Accept: 'application/json' }, signal: AbortSignal.timeout(12000) },
      );
      if (!lookup.ok) {
        console.warn('PayHero callback verification lookup failed', { status: lookup.status });
        return json({ received: true }, 200, origin);
      }
      const lookupText = await lookup.text();
      let detail = {} as Row;
      try { detail = JSON.parse(lookupText) as Row; } catch { return json({ received: true }, 200, origin); }
      for (const key of ['data', 'transaction', 'result']) {
        if (detail[key] && typeof detail[key] === 'object' && !Array.isArray(detail[key])) {
          detail = detail[key] as Row;
          break;
        }
      }
      const verifiedStatus = text(detail.status, 40).toUpperCase();
      if (verifiedStatus === 'FAILED') {
        if (['initiated', 'pending'].includes(text(payment.status, 30))) {
          await rest(url, service, `payments?id=eq.${encodeURIComponent(String(payment.id))}&status=in.(initiated,pending)`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'failed',
              failure_reason: text(detail.message ?? detail.error_message ?? detail.description, 300)
                || 'PayHero reported that the M-Pesa payment failed.',
            }),
          });
        }
        return json({ received: true }, 200, origin);
      }
      if (verifiedStatus !== 'SUCCESS') return json({ received: true }, 200, origin);

      const receiptReference = text(
        detail.third_party_reference ?? detail.provider_reference ?? detail.MpesaReceiptNumber
          ?? detail.transaction_reference ?? detail.receipt_number,
        100,
      );
      const amount = Number(detail.amount ?? detail.paid_amount ?? detail.Amount ?? payment.amount);
      if (!receiptReference || !Number.isFinite(amount) || amount <= 0) return json({ received: true }, 200, origin);
      if (text(payment.transaction_reference, 160).startsWith('PayHero ')) {
        await rest(url, service, `payments?id=eq.${encodeURIComponent(String(payment.id))}&status=in.(initiated,pending)`, {
          method: 'PATCH',
          body: JSON.stringify({ transaction_reference: null }),
        });
      }

      const claimed = await rest(url, service, 'rpc/confirm_payhero_payment', {
        method: 'POST',
        body: JSON.stringify({
          p_external_reference: externalRef,
          p_provider_reference: text(detail.reference ?? lookupReference, 100),
          p_transaction_reference: receiptReference,
          p_paid_amount: amount,
          p_phone: text(detail.phone_number ?? detail.Phone ?? detail.phone, 40),
        }),
      }) as Row[];
      const paid = claimed?.[0];
      if (!paid) return json({ received: true }, 200, origin);

      try { await notifyAdmins(url, service, paid.payment_id); }
      catch (error) { console.error('Admin dashboard notification failed', error); }
      try { await deliverPendingEmails(url, service, paid.payment_id); }
      catch (error) { console.error('Payment was recorded, but receipt delivery is pending retry', error); }
      return json({ received: true }, 200, origin);
    } catch (error) {
      console.error('PayHero callback processing failed', error);
      // Respond 200 to prevent endless provider retries; inspect the log and retry internally.
      return json({ received: true }, 200, origin);
    }
  }

  if (action === 'record-manual-payment') {
    const authorization = req.headers.get('authorization');
    if (!authorization || !anon) return json({ error: 'Please sign in to record a payment.' }, 401, origin);
    const userResponse = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: authorization },
    });
    if (!userResponse.ok) return json({ error: 'Your staff session could not be verified.' }, 401, origin);
    const user = await userResponse.json() as { id: string };
    const profiles = await rest(url, service, `profiles?select=role&id=eq.${encodeURIComponent(user.id)}&limit=1`) as Array<{ role: string }>;
    if (!profiles[0] || !['admin', 'finance'].includes(profiles[0].role)) return json({ error: 'Admin access is required.' }, 403, origin);

    try {
      const invoiceId = text(payload.invoiceId, 50);
      const amount = Number(payload.amount);
      if (!/^[0-9a-f-]{36}$/i.test(invoiceId) || !Number.isFinite(amount) || amount <= 0) {
        return json({ error: 'A valid invoice and payment amount are required.' }, 400, origin);
      }
      const iq = new URLSearchParams({
        select: 'id,order_id,invoice_number,customer_name,customer_email,total,amount_paid,status',
        id: `eq.${invoiceId}`,
        limit: '1',
      });
      const invoices = await rest(url, service, `invoices?${iq}`) as Row[];
      const invoice = invoices[0];
      if (!invoice || !invoice.order_id || ['draft', 'void', 'paid'].includes(text(invoice.status, 30))) {
        return json({ error: 'This invoice cannot accept a manual payment.' }, 409, origin);
      }
      const balance = Number(invoice.total) - Number(invoice.amount_paid || 0);
      if (amount > balance + 0.005) return json({ error: 'Payment amount exceeds the invoice balance.' }, 400, origin);

      const paymentRows = await rest(url, service, 'payments', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          order_id: invoice.order_id,
          invoice_id: invoice.id,
          method: 'bank',
          amount,
          currency: 'KES',
          status: 'confirmed',
          provider: 'manual',
          provider_reference: text(payload.transactionReference, 100) || `ADMIN-${crypto.randomUUID()}`,
          transaction_reference: text(payload.transactionReference, 100) || 'Recorded by admin',
          recorded_by: user.id,
          confirmed_at: new Date().toISOString(),
        }),
      }) as Row[];

      const paidAmount = Math.min(Number(invoice.total), Number(invoice.amount_paid || 0) + amount);
      const newStatus = paidAmount >= Number(invoice.total) ? 'paid' : 'partially_paid';
      await rest(url, service, `invoices?id=eq.${encodeURIComponent(invoiceId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ amount_paid: paidAmount, status: newStatus }),
      });
      await rest(url, service, `orders?id=eq.${encodeURIComponent(String(invoice.order_id))}`, {
        method: 'PATCH',
        body: JSON.stringify({ payment_status: newStatus === 'paid' ? 'paid' : 'partially_paid', updated_at: new Date().toISOString() }),
      });

      const payment = paymentRows[0];
      if (payment?.id) {
        await rest(url, service, 'payment_email_outbox', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            payment_id: payment.id,
            invoice_id: invoice.id,
            customer_email: invoice.customer_email,
            customer_name: invoice.customer_name,
            invoice_number: invoice.invoice_number,
            invoice_total: invoice.total,
            amount_paid: paidAmount,
            prior_amount_paid: invoice.amount_paid || 0,
            payment_amount: amount,
            transaction_reference: text(payload.transactionReference, 100) || 'Recorded by admin',
            provider_reference: payment.provider_reference,
            payment_method: 'bank',
          }),
        });
        await notifyAdmins(url, service, payment.id).catch(() => {});
        await deliverPendingEmails(url, service, payment.id);
      }
      return json({ ok: true, status: newStatus, paymentId: payment?.id }, 200, origin);
    } catch (error) {
      console.error('Manual payment recording failed', error);
      return json({ error: error instanceof Error ? error.message : 'Could not record offline payment.' }, 500, origin);
    }
  }

  if (!['invoice', 'initiate', 'status', 'retry-notifications'].includes(action)) {
    return json({ error: 'Unknown payment action.' }, 400, origin);
  }

  if (action === 'retry-notifications') {
    const authorization = req.headers.get('authorization');
    if (!authorization || !anon) return json({ error: 'Please sign in to retry payment notifications.' }, 401, origin);
    const userResponse = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: authorization },
    });
    if (!userResponse.ok) return json({ error: 'Your sign-in session has expired.' }, 401, origin);
    const authUser = await userResponse.json() as { id: string };
    const profiles = await rest(url, service, `profiles?select=role&id=eq.${encodeURIComponent(authUser.id)}&limit=1`) as Array<{ role: string }>;
    if (!profiles[0] || !['admin', 'finance'].includes(profiles[0].role)) return json({ error: 'Admin access is required.' }, 403, origin);
    const paymentId = text(payload.paymentId, 50);
    if (!/^[0-9a-f-]{36}$/i.test(paymentId)) return json({ error: 'A valid payment ID is required.' }, 400, origin);
    try {
      try { await notifyAdmins(url, service, paymentId); }
      catch (error) { console.error('Admin dashboard notification retry failed', error); }
      const delivery = await deliverPendingEmails(url, service, paymentId);
      if (!delivery.customerEmailSent || !delivery.customerWhatsappSent) {
        const failures = [delivery.customerEmailError, delivery.customerWhatsappError].filter(Boolean).join(' ');
        return json({ ok: false, ...delivery, error: failures || 'Receipt delivery was not accepted by both email and WhatsApp.' }, 502, origin);
      }
      return json({ ok: true, ...delivery }, 200, origin);
    } catch (error) {
      console.error('Payment notification retry failed', error);
      return json({ error: error instanceof Error ? error.message : 'Could not resend notifications.' }, 502, origin);
    }
  }

  if (action === 'invoice') {
    const invoiceId = text(payload.invoiceId, 50);
    if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return json({ error: 'Invalid invoice.' }, 400, origin);
    try {
      const iq = new URLSearchParams({
        select: 'id,invoice_number,customer_name,customer_email,total,amount_paid,status,order_id',
        id: `eq.${invoiceId}`,
        limit: '1',
      });
      const invoices = await rest(url, service, `invoices?${iq}`) as Row[];
      const invoice = invoices[0];
      if (!invoice || !invoice.order_id || ['draft', 'void'].includes(text(invoice.status, 30))) {
        return json({ error: 'This invoice is not available for payment.' }, 404, origin);
      }
      const oq = new URLSearchParams({
        select: 'id,customer_id,customer_phone,reference',
        id: `eq.${invoice.order_id}`,
        limit: '1',
      });
      const orders = await rest(url, service, `orders?${oq}`) as Row[];
      const order = orders[0];
      if (!order) return json({ error: 'Invoice order details are unavailable.' }, 404, origin);
      const orderItems = await rest(
        url,
        service,
        `order_items?select=service_name,configuration,quantity,confirmed_amount,estimated_amount&order_id=eq.${encodeURIComponent(String(invoice.order_id))}&order=created_at.asc`,
      ) as Row[];
      return json({
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          customer_name: invoice.customer_name,
          customer_email: invoice.customer_email,
          order_reference: order.reference,
          total: invoice.total,
          amount_due: Math.max(0, Number(invoice.total) - Number(invoice.amount_paid)),
          status: invoice.status,
          lines: orderItems.map(item => ({
            description: receiptItemName(item) || 'Order item',
            quantity: Number(item.quantity) || 1,
            amount: Number(item.confirmed_amount ?? item.estimated_amount ?? 0),
          })),
        },
        phone: order.customer_phone,
      }, 200, origin);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Could not load invoice.' }, 500, origin);
    }
  }

  if (action === 'status') {
    const invoiceId = text(payload.invoiceId, 50);
    if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) {
      return json({ error: 'Invalid invoice.' }, 400, origin);
    }

    try {
      // Check all recent attempts for this invoice. Do not inspect only the
      // newest row: an earlier STK attempt may have succeeded while a newer
      // attempt is still queued.
      const query = new URLSearchParams({
        select: 'id,invoice_id,status,amount,transaction_reference,provider_reference,payhero_reference,confirmed_at,receipt_sent_at,receipt_whatsapp_sent_at,failure_reason,created_at',
        invoice_id: `eq.${invoiceId}`,
        provider: 'eq.payhero',
        order: 'created_at.desc',
        limit: '100',
      });

      let rows = await rest(url, service, `payments?${query}`) as Row[];
      if (!rows.length) return json({ payment: null, attempts: [] }, 200, origin);

      const authorization = payheroAuthorization();
      if (authorization) {
        const unresolved = rows.filter(payment =>
          ['initiated', 'pending'].includes(text(payment.status, 30)),
        );

        // Batches keep the edge function responsive while still checking every
        // unresolved attempt returned for the invoice.
        for (let offset = 0; offset < unresolved.length; offset += 5) {
          const batch = unresolved.slice(offset, offset + 5);
          const results = await Promise.all(batch.map(async payment => {
            // Current flow stores the PayHero response's `reference` in its own
            // column. The fallbacks support rows created by earlier deployments.
            const legacyTransactionReference = text(payment.transaction_reference, 180);
            const lookupReference = text(payment.payhero_reference, 180)
              || (legacyTransactionReference.startsWith('PayHero ')
                ? legacyTransactionReference.replace(/^PayHero\s+/i, '')
                : legacyTransactionReference);

            if (!lookupReference || !/^[A-Za-z0-9._:-]{3,180}$/.test(lookupReference)) {
              return { payment, skipped: true as const };
            }

            try {
              const lookup = await fetch(
                `${PAYHERO_API_BASE}/transaction-status?reference=${encodeURIComponent(lookupReference)}`,
                {
                  method: 'GET',
                  headers: {
                    Authorization: authorization,
                    Accept: 'application/json',
                  },
                  signal: AbortSignal.timeout(12000),
                },
              );
              const raw = await lookup.text();
              let data: Row = {};
              try { data = JSON.parse(raw) as Row; } catch { /* reported below */ }

              if (!lookup.ok) {
                console.warn('PayHero transaction-status lookup failed', {
                  paymentId: payment.id,
                  httpStatus: lookup.status,
                  response: raw.slice(0, 250),
                });
                return { payment, skipped: false as const, error: `PayHero status lookup returned HTTP ${lookup.status}.` };
              }

              let detail = data;
              for (const key of ['data', 'transaction', 'result']) {
                if (detail[key] && typeof detail[key] === 'object' && !Array.isArray(detail[key])) {
                  detail = detail[key] as Row;
                  break;
                }
              }

              // PayHero Kenya documents the transaction status values as
              // QUEUED, SUCCESS and FAILED. `success: true` means the lookup
              // request succeeded; it does NOT by itself mean the payment was paid.
              const providerStatus = text(detail.status, 40).toUpperCase();
              return { payment, skipped: false as const, lookupReference, detail, providerStatus };
            } catch (error) {
              console.warn('PayHero transaction-status request failed', {
                paymentId: payment.id,
                message: error instanceof Error ? error.message : String(error),
              });
              return { payment, skipped: false as const, error: 'Could not reach PayHero transaction-status endpoint.' };
            }
          }));

          for (const result of results) {
            if (result.skipped || 'error' in result) continue;

            const payment = result.payment;
            const detail = result.detail;
            const status = result.providerStatus;

            if (status === 'FAILED') {
              await rest(
                url,
                service,
                `payments?id=eq.${encodeURIComponent(String(payment.id))}&status=in.(initiated,pending)`,
                {
                  method: 'PATCH',
                  body: JSON.stringify({
                    status: 'failed',
                    failure_reason: text(detail.message ?? detail.error_message ?? detail.description, 300)
                      || 'PayHero reported that the M-Pesa payment failed.',
                  }),
                },
              );
              payment.status = 'failed';
              payment.failure_reason = text(detail.message ?? detail.error_message ?? detail.description, 300)
                || 'PayHero reported that the M-Pesa payment failed.';
              continue;
            }

            if (status !== 'SUCCESS') {
              // QUEUED means PayHero has not yet received/processed the callback.
              // Keep this attempt pending and let the next status poll check it.
              continue;
            }

            const externalReference = text(payment.provider_reference, 180);
            if (!externalReference) {
              console.error('PayHero reports SUCCESS but payment has no external_reference for DB matching', {
                paymentId: payment.id,
                payheroReference: result.lookupReference,
              });
              continue;
            }

            // The documented status response may omit amount. Since this exact
            // authenticated PayHero reference belongs to this payment row, use
            // the requested amount only when the response does not include one.
            const paidAmount = Number(
              detail.amount ?? detail.paid_amount ?? detail.Amount ?? payment.amount,
            );
            if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
              console.error('PayHero returned SUCCESS with an invalid amount', {
                paymentId: payment.id,
                amount: detail.amount ?? detail.paid_amount ?? detail.Amount,
              });
              continue;
            }

            // Older deployments temporarily stored `PayHero <reference>` in
            // transaction_reference. Clear only that temporary marker; the new
            // payhero_reference column is retained for audit/status lookups.
            if (text(payment.transaction_reference, 180).startsWith('PayHero ')) {
              await rest(
                url,
                service,
                `payments?id=eq.${encodeURIComponent(String(payment.id))}&status=in.(initiated,pending)`,
                {
                  method: 'PATCH',
                  body: JSON.stringify({ transaction_reference: null }),
                },
              );
            }

            const mpesaReceipt = text(
              detail.third_party_reference
                ?? detail.provider_reference
                ?? detail.MpesaReceiptNumber
                ?? detail.transaction_reference
                ?? detail.receipt_number,
              100,
            );

            // PayHero status `SUCCESS` is authenticated, but require the M-Pesa
            // receipt before applying money to an invoice. A cancellation or
            // incomplete provider record must never appear as a paid order.
            if (!mpesaReceipt) {
              console.warn('PayHero reports SUCCESS without an M-Pesa receipt; payment remains pending', {
                paymentId: payment.id,
                payheroReference: result.lookupReference,
              });
              continue;
            }

            const confirmed = await rest(url, service, 'rpc/confirm_payhero_payment', {
              method: 'POST',
              body: JSON.stringify({
                // This is our unique external_reference sent with the STK push;
                // it matches payments.provider_reference in the database.
                p_external_reference: externalReference,
                p_provider_reference: text(detail.reference ?? result.lookupReference, 100),
                p_transaction_reference: mpesaReceipt,
                p_paid_amount: paidAmount,
                p_phone: text(detail.phone_number ?? detail.Phone ?? detail.phone, 40),
              }),
            }) as Row[];

            const confirmedPayment = confirmed?.[0];
            if (confirmedPayment) {
              payment.status = 'confirmed';
              payment.transaction_reference = mpesaReceipt || payment.transaction_reference;
              payment.confirmed_at = new Date().toISOString();
              try { await notifyAdmins(url, service, confirmedPayment.payment_id); }
              catch (error) { console.error('Admin dashboard notification failed', error); }
              try { await deliverPendingEmails(url, service, confirmedPayment.payment_id); }
              catch (error) { console.error('Payment was recorded, but receipt delivery is pending retry', error); }
            }
          }
        }
      }

      // Refresh all rows after processing. Prefer a confirmed payment for the
      // checkout UI, even if a newer attempt remains queued.
      rows = await rest(url, service, `payments?${query}`) as Row[];
      const displayPayment = rows.find(payment =>
        ['confirmed', 'reconciled'].includes(text(payment.status, 30)),
      ) ?? rows[0];

      return json({
        payment: {
          id: displayPayment.id,
          status: displayPayment.status,
          amount: displayPayment.amount,
          transaction_reference: displayPayment.transaction_reference,
          payhero_reference: displayPayment.payhero_reference,
          confirmed_at: displayPayment.confirmed_at,
          receipt_sent_at: displayPayment.receipt_sent_at,
          receipt_whatsapp_sent_at: displayPayment.receipt_whatsapp_sent_at,
          failure_reason: displayPayment.failure_reason,
        },
        attempts: rows.map(payment => ({
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          created_at: payment.created_at,
          confirmed_at: payment.confirmed_at,
          transaction_reference: payment.transaction_reference,
          payhero_reference: payment.payhero_reference,
          failure_reason: payment.failure_reason,
        })),
      }, 200, origin);
    } catch (error) {
      console.error('Payment status check failed', error);
      return json({ error: error instanceof Error ? error.message : 'Could not check payment status.' }, 500, origin);
    }
  }

  if (action === 'initiate') {
    const invoiceId = text(payload.invoiceId, 50);
    let phone = '';
    try {
      phone = normalizePhone(text(payload.phone, 40));
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Invalid phone number.' }, 400, origin);
    }

    const authorization = payheroAuthorization();
    // Use the confirmed NexxaCraft channel 6751 unless an explicit secret overrides it.
    const configuredChannel = Deno.env.get('PAYHERO_CHANNEL_ID')?.trim();
    const preferredChannel = configuredChannel ? Number(configuredChannel) : DEFAULT_PAYHERO_CHANNEL_ID;
    if (!authorization || !Number.isInteger(preferredChannel) || preferredChannel <= 0) {
      return json({
        error: 'PayHero is not fully configured. Set PAYHERO_AUTH_TOKEN and PAYHERO_CHANNEL_ID (6751), or configure the API username/password fallback.',
      }, 503, origin);
    }

    try {
      const iq = new URLSearchParams({
        select: 'id,invoice_number,customer_name,customer_email,total,amount_paid,status,order_id',
        id: `eq.${invoiceId}`,
        limit: '1',
      });
      const invoices = await rest(url, service, `invoices?${iq}`) as Row[];
      const invoice = invoices[0];
      if (!invoice || !invoice.order_id || ['draft', 'void', 'paid'].includes(text(invoice.status, 30))) {
        return json({ error: 'This invoice cannot be paid.' }, 400, origin);
      }

      const oq = new URLSearchParams({
        select: 'id,customer_name,customer_phone',
        id: `eq.${invoice.order_id}`,
        limit: '1',
      });
      const orders = await rest(url, service, `orders?${oq}`) as Row[];
      const order = orders[0];
      if (!order) return json({ error: 'Invoice order details are unavailable.' }, 404, origin);

      const amount = Math.ceil(Number(invoice.total) - Number(invoice.amount_paid || 0));
      if (!Number.isFinite(amount) || amount < 1) return json({ error: 'Invoice has no balance due.' }, 400, origin);

      // Verify the exact destination before creating a pending payment row.
      const channel = await discoverPayheroChannel(authorization, preferredChannel);

      // Multiple attempts per invoice are intentionally allowed. Each attempt
      // gets its own immutable external_reference, so callbacks reconcile the
      // exact payment row. The database confirmation RPC serializes invoice
      // balance updates and flags any genuine overpayment for reconciliation.

      // Use the complete UUID so every concurrent/retried STK attempt has
      // its own practically collision-proof callback reference.
      const externalRef = `${text(invoice.invoice_number, 60)}-${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`;
      let payment: Row | undefined;
      try {
        const paymentInit = await rest(url, service, 'payments', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            order_id: order.id,
            invoice_id: invoice.id,
            method: 'mpesa',
            amount,
            currency: 'KES',
            status: 'initiated',
            provider: 'payhero',
            // This is the exact external_reference sent to PayHero and returned in callback.
            provider_reference: externalRef,
          }),
        }) as Row[];
        payment = paymentInit[0];
      } catch (error) {
        if (error instanceof Error && error.message.includes('already awaiting a result')) {
          throw new Error(
            'The database still has the duplicate-pending-payment trigger enabled. Run the supplied payment retry migration in Supabase SQL Editor, then retry.',
          );
        }
        throw error;
      }
      if (!payment?.id) return json({ error: 'Could not start an M-Pesa request.' }, 502, origin);

      const callbackUrl = `${url}/functions/v1/payhero-payments?action=callback`;
      const stkPayload = {
        amount,
        phone_number: phone,
        channel_id: channel.id,
        provider: 'm-pesa',
        external_reference: externalRef,
        customer_name: text(invoice.customer_name, 120),
        callback_url: callbackUrl,
      };

      let response: Response;
      try {
        response = await fetch(`${PAYHERO_API_BASE}/payments`, {
          method: 'POST',
          headers: {
            Authorization: authorization,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(stkPayload),
          signal: AbortSignal.timeout(30000),
        });
      } catch (networkError) {
        // Network timeout is ambiguous: PayHero may have received the STK request.
        // Keep the payment initiated so the callback/status check can reconcile it;
        // do not automatically create a second STK request.
        console.error('PayHero STK request transport error', {
          paymentId: payment.id,
          externalReference: externalRef,
          message: networkError instanceof Error ? networkError.message : String(networkError),
        });
        return json({
          error: 'Could not confirm PayHero response. The request may have reached PayHero; check payment status before retrying.',
          paymentId: payment.id,
          reference: externalRef,
        }, 504, origin);
      }

      const responseBody = await response.text();
      let data: Row = {};
      try { data = JSON.parse(responseBody) as Row; }
      catch { /* handled as invalid provider response below */ }

      const responseStatus = text(data.status, 40).toUpperCase();
      const payheroReference = text(data.reference, 160);
      const checkoutRequestId = text(data.CheckoutRequestID ?? data.checkout_request_id, 160);
      const explicitlySuccessful = data.success === true
        || ['QUEUED', 'SUCCESS', 'SUCCESSFUL'].includes(responseStatus);
      const explicitlyFailed = data.success === false
        || ['FAILED', 'FAILURE', 'ERROR', 'REJECTED', 'CANCELLED', 'CANCELED'].includes(responseStatus);
      const hasProviderReference = Boolean(payheroReference || checkoutRequestId);

      if (!response.ok || explicitlyFailed || !explicitlySuccessful || !hasProviderReference) {
        const providerMessage = text(data.message ?? data.error_message ?? data.error ?? data.detail ?? data.description, 300);
        const failureReason = `PayHero HTTP ${response.status}${providerMessage ? `: ${providerMessage}` : responseBody ? `: ${responseBody.slice(0, 250)}` : ''}`;
        console.error('PayHero rejected the STK push request', {
          status: response.status,
          channel: channel.id,
          channelType: channel.channelType,
          externalReference: externalRef,
          providerMessage,
          response: responseBody.slice(0, 500),
        });
        await rest(url, service, `payments?id=eq.${encodeURIComponent(String(payment.id))}&status=in.(initiated,pending)`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'failed', failure_reason: failureReason }),
        }).catch(error => console.error('Could not mark rejected STK request as failed', error));
        return json({
          error: `PayHero rejected the M-Pesa request (HTTP ${response.status}).${providerMessage ? ` ${providerMessage}` : ''}`,
        }, 502, origin);
      }

      // `reference` is the exact identifier required by PayHero's documented
      // GET /api/v2/transaction-status?reference=... endpoint. Store it in its
      // own column; do not mix it with the M-Pesa receipt in transaction_reference.
      if (payheroReference) {
        try {
          await rest(url, service, `payments?id=eq.${encodeURIComponent(String(payment.id))}`, {
            method: 'PATCH',
            body: JSON.stringify({ payhero_reference: payheroReference }),
          });
        } catch (storageError) {
          // Callback still matches using provider_reference = externalRef.
          console.error('STK accepted but PayHero reference could not be saved', {
            paymentId: payment.id,
            externalReference: externalRef,
            message: storageError instanceof Error ? storageError.message : String(storageError),
          });
        }
      }

      return json({
        ok: true,
        paymentId: payment.id,
        reference: externalRef,
        payheroReference: payheroReference || undefined,
        checkoutRequestId: checkoutRequestId || undefined,
        status: data.status || 'QUEUED',
        channel: channel.description || String(channel.id),
        channelId: channel.id,
      }, 200, origin);
    } catch (error) {
      console.error('Could not initiate PayHero payment', error);
      return json({ error: error instanceof Error ? error.message : 'Could not start M-Pesa payment.' }, 500, origin);
    }
  }

  return json({ error: 'Unknown payment action.' }, 400, origin);
});

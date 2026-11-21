const origins = new Set([
  'https://nexxacrafts.co.ke',
  'https://www.nexxacrafts.co.ke',
  'https://nexxacrafts.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
]);

const cors = (origin: string | null, requestedHeaders: string | null = null) => ({
  ...(origin && origins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
  // Echo the browser's requested header names for allow-listed origins. This
  // avoids preflight failures when the Supabase JS client adds version headers.
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

const json = (body: Record<string, unknown>, status = 200, origin: string | null = null) =>
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

/** Encode UTF-8 safely before creating the HTTP Basic Authorization header. */
function base64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * PayHero Kenya uses HTTP Basic authentication.
 * Prefer PAYHERO_AUTH_TOKEN (the newest secret name configured in Supabase),
 * then PAYHERO_BASIC_AUTH_TOKEN, and finally the API username/password pair.
 * Token secrets may be stored as "Basic <base64>", raw base64, or the raw
 * "username:password" pair. Never log or return the credential itself.
 */
function payheroAuthorization(): string {
  const configuredToken = (
    Deno.env.get('PAYHERO_AUTH_TOKEN') ||
    Deno.env.get('PAYHERO_BASIC_AUTH_TOKEN') ||
    ''
  ).trim();

  if (configuredToken) {
    const token = configuredToken.replace(/^Basic\s+/i, '').trim();
    if (token) {
      // Support a raw username:password value as well as an encoded token.
      if (token.includes(':')) {
        return `Basic ${base64Utf8(token)}`;
      }
      return `Basic ${token}`;
    }
  }

  const username = Deno.env.get('PAYHERO_API_USERNAME')?.trim();
  const password = Deno.env.get('PAYHERO_API_PASSWORD')?.trim();
  if (username && password) {
    return `Basic ${base64Utf8(`${username}:${password}`)}`;
  }

  return '';
}

async function sendEmail(to: string, subject: string, html: string, plain: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM_EMAIL');
  if (!key || !from || !to) throw new Error('Email delivery is not configured.');

  const r = await fetch('https://api.resend.com/emails', {
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
    }),
  });

  if (!r.ok) {
    throw new Error(`Resend rejected email (${r.status}): ${(await r.text()).slice(0, 400)}`);
  }
}

function emailFrame(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#edf2fa;font-family:Arial,sans-serif;color:#17243a;padding:28px 12px"><table role="presentation" width="100%"><tr><td align="center"><table role="presentation" width="100%" style="max-width:620px;background:white;border:1px solid #dce5f2;border-radius:16px;overflow:hidden"><tr><td style="height:5px;background:#0341fc"></td></tr><tr><td style="padding:22px 28px;background:#101b34;color:white;font-size:23px;font-weight:bold">Nexxa<span style="color:#ef4444">CRAFT</span></td></tr><tr><td style="padding:28px"><p style="font-size:11px;color:#0341fc;font-weight:bold;letter-spacing:1.5px">${title.toUpperCase()}</p>${body}</td></tr><tr><td style="padding:16px;text-align:center;background:#f7f9fc;color:#76839a;font-size:11px">NexxaCraft · Design · Print · Build</td></tr></table></td></tr></table></body></html>`;
}

async function rest(url: string, key: string, path: string, init: RequestInit = {}) {
  const r = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`Database request failed (${r.status}): ${body.slice(0, 500)}`);
  return body ? JSON.parse(body) : null;
}

const money = (v: unknown) =>
  `KES ${Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function normalizePhone(input: string) {
  const d = input.replace(/\D/g, '');
  if (/^0[71]\d{8}$/.test(d)) return `254${d.slice(1)}`;
  if (/^254[71]\d{8}$/.test(d)) return d;
  if (/^[71]\d{8}$/.test(d)) return `254${d}`;
  throw new Error('Enter a valid Kenyan M-Pesa phone number.');
}

async function discoverPayheroChannel(authorization: string, preferredChannelId: number) {
  const response = await fetch('https://backend.payhero.co.ke/api/v2/payment_channels', {
    method: 'GET',
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const raw = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // The response is reported below without exposing credentials.
  }

  if (!response.ok) {
    const providerMessage = text(
      data.message ?? data.error_message ?? data.error ?? data.detail,
      220,
    );
    throw new Error(
      `PayHero channel lookup failed (HTTP ${response.status}). ${providerMessage || raw.slice(0, 220) || 'Check your PayHero API credentials.'}`,
    );
  }

  const channels = Array.isArray(data.payment_channels)
    ? data.payment_channels as Array<Record<string, unknown>>
    : [];

  const active = channels.filter(channel =>
    channel.is_active === true || String(channel.is_active).toLowerCase() === 'true'
  );

  const eligible = active.filter(channel => {
    const type = text(channel.channel_type, 30).toLowerCase();
    return ['till', 'paybill', 'wallet'].includes(type) || Boolean(text(channel.transaction_type, 40));
  });

  const selected = (preferredChannelId > 0
    ? eligible.find(channel => Number(channel.id) === preferredChannelId)
    : undefined) ?? eligible[0];

  if (!selected) {
    throw new Error(
      'PayHero has no active eligible M-Pesa channel. Activate a Till, Paybill, or wallet channel in PayHero, or set PAYHERO_CHANNEL_ID to an active channel ID.',
    );
  }

  const id = Number(selected.id);
  const accountId = Number(selected.account_id);

  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(accountId) || accountId <= 0) {
    throw new Error(
      'PayHero returned an active channel without a valid channel ID and account ID. Check the channel details in your PayHero dashboard.',
    );
  }

  return {
    id,
    accountId,
    description: text(selected.description, 100),
  };
}

async function deliverPendingEmails(url: string, service: string, paymentId: unknown) {
  const id = String(paymentId);
  let rows = await rest(
    url,
    service,
    `payment_email_outbox?select=*&payment_id=eq.${encodeURIComponent(id)}&limit=1`,
  ) as Array<Record<string, unknown>>;
  let row = rows[0];

  // Older/manual payments may predate the outbox insert. Rebuild it from the
  // confirmed payment and invoice so a retry can deliver the receipt.
  if (!row) {
    const pq = new URLSearchParams({
      select: 'id,invoice_id,amount,status,method,provider,transaction_reference,provider_reference',
      id: `eq.${encodeURIComponent(id)}`,
      limit: '1',
    });
    const payments = await rest(url, service, `payments?${pq}`) as Array<Record<string, unknown>>;
    const payment = payments[0];

    if (!payment || !['confirmed', 'reconciled'].includes(text(payment.status, 30))) {
      throw new Error('No confirmed payment email record exists for this payment.');
    }

    const iq = new URLSearchParams({
      select: 'id,invoice_number,customer_name,customer_email,total,amount_paid',
      id: `eq.${encodeURIComponent(String(payment.invoice_id))}`,
      limit: '1',
    });
    const invoices = await rest(url, service, `invoices?${iq}`) as Array<Record<string, unknown>>;
    const invoice = invoices[0];
    if (!invoice) throw new Error('The invoice for this payment could not be found.');

    const amount = Number(payment.amount);
    const invoiceTotal = Number(invoice.total);
    const amountPaid = Number(invoice.amount_paid || 0);
    const priorAmountPaid = Math.max(0, amountPaid - amount);

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
        prior_amount_paid: priorAmountPaid,
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
    ) as Array<Record<string, unknown>>;
    row = rows[0];
  }

  if (!row) throw new Error('Could not prepare the payment receipt email.');

  const receipt = text(row.transaction_reference, 100);
  const amount = Number(row.payment_amount);
  const balance = Number(row.invoice_total) - Number(row.prior_amount_paid);
  const formatMoney = (v: unknown) =>
    `KES ${Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!row.customer_email_sent_at) {
    const customerEmail = text(row.customer_email, 254);
    if (!customerEmail) throw new Error('The invoice has no customer email address.');

    await sendEmail(
      customerEmail,
      `Payment receipt · ${text(row.invoice_number, 80)}`,
      emailFrame('Payment receipt', `<h1 style="margin:0 0 12px">Payment received</h1><p>Hello ${esc(row.customer_name)}, your payment has been confirmed.</p><div style="padding:16px;background:#f0f4ff;border-radius:10px"><p>Invoice: <b>${esc(row.invoice_number)}</b></p><p>Amount paid: <b>${formatMoney(amount)}</b></p><p>Receipt: <b>${esc(receipt || 'Confirmed')}</b></p><p>Balance due: <b>${formatMoney(balance)}</b></p></div><p>Thank you for choosing NexxaCraft.</p>`),
      `Payment received for invoice ${text(row.invoice_number, 80)}. Amount ${formatMoney(amount)}. Receipt ${receipt}.`,
    );

    const sentAt = new Date().toISOString();
    await rest(url, service, `payment_email_outbox?payment_id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ customer_email_sent_at: sentAt }),
    });
    await rest(url, service, `payments?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ receipt_sent_at: sentAt }),
    });
    row.customer_email_sent_at = sentAt;
  }

  if (!row.admin_email_sent_at) {
    const adminEmail = Deno.env.get('PAYMENT_ADMIN_EMAIL') || 'nexxacrafts@gmail.com';
    await sendEmail(
      adminEmail,
      `Payment received · ${text(row.invoice_number, 80)}`,
      emailFrame('Payment notification', `<h1>Successful payment</h1><p>${esc(row.customer_name)} paid <b>${formatMoney(amount)}</b> for invoice <b>${esc(row.invoice_number)}</b>.</p><p>Receipt: <b>${esc(receipt || 'Confirmed')}</b></p><p>Customer email: ${esc(row.customer_email)}</p>`),
      `Payment received: ${formatMoney(amount)}, invoice ${text(row.invoice_number, 80)}, receipt ${receipt}.`,
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
  ) as Array<Record<string, unknown>>;

  if (!rows[0] || rows[0].dashboard_notified_at) return;

  const paymentRows = await rest(
    url,
    service,
    `payments?select=invoice_id,amount,transaction_reference&id=eq.${encodeURIComponent(id)}`,
  ) as Array<Record<string, unknown>>;
  const payment = paymentRows[0];
  if (!payment) return;

  const invoiceRows = await rest(
    url,
    service,
    `invoices?select=invoice_number,order_id&id=eq.${encodeURIComponent(String(payment.invoice_id))}`,
  ) as Array<Record<string, unknown>>;
  const invoice = invoiceRows[0];
  if (!invoice) return;

  const orderRows = await rest(
    url,
    service,
    `orders?select=customer_name&id=eq.${encodeURIComponent(String(invoice.order_id))}`,
  ) as Array<Record<string, unknown>>;
  const order = orderRows[0];
  const profiles = await rest(url, service, 'profiles?select=id&role=eq.admin') as Array<{ id: string }>;

  if (profiles.length) {
    const message = `${text(order?.customer_name, 120) || 'A customer'} paid ${money(payment.amount)} for invoice ${text(invoice.invoice_number, 80)}${payment.transaction_reference ? ` (M-Pesa ${text(payment.transaction_reference, 50)})` : ''}.`;
    const notifications = profiles.map(profile => ({
      user_id: profile.id,
      title: 'Payment received',
      message,
      link: '/admin/payments',
    }));

    await rest(url, service, 'notifications', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(notifications),
    });
  }

  await rest(url, service, `payment_admin_notifications?payment_id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ dashboard_notified_at: new Date().toISOString() }),
  });
}

Deno.serve(async req => {
  const origin = req.headers.get('origin');

  // Handle CORS preflight before parsing JSON, reading secrets, or making any
  // database/provider calls. The browser requires a successful 2xx response.
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

  // Simple health check: opening the function URL in a browser should return
  // { ok: true } and confirms that the deployed worker is serving requests.
  if (req.method === 'GET') return json({ ok: true, service: 'payhero-payments' }, 200, origin);
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);

  const queryAction = new URL(req.url).searchParams.get('action');
  const payload = await req.json().catch(() => ({})) as Record<string, unknown>;
  const action = queryAction === 'callback' ? 'callback' : text(payload.action, 30);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !service) return json({ error: 'Payment service is not configured.' }, 503, origin);

  if (action === 'callback') {
    const response = (payload.response && typeof payload.response === 'object'
      ? payload.response
      : payload) as Record<string, unknown>;

    const ref = text(
      response.ExternalReference ?? response.external_reference ?? payload.user_reference ?? payload.external_reference ?? payload.reference,
      100,
    );
    const status = text(response.Status ?? response.status, 30).toLowerCase();
    const callbackFlag = payload.status === true || String(payload.status).toLowerCase() === 'true';
    const success = callbackFlag
      && ['success', 'successful', 'paid', 'completed'].includes(status)
      && (response.ResultCode === undefined || Number(response.ResultCode) === 0);

    if (!ref) return json({ received: true }, 200, origin);

    try {
      const query = new URLSearchParams({
        select: 'id,invoice_id,amount,status,order_id,provider_reference,transaction_reference',
        provider: 'eq.payhero',
        provider_reference: `eq.${ref}`,
        limit: '1',
      });
      const rows = await rest(url, service, `payments?${query}`) as Array<Record<string, unknown>>;
      const payment = rows[0];
      if (!payment) return json({ received: true }, 200, origin);

      if (!success) {
        if (payment.status === 'initiated') {
          await rest(url, service, `payments?id=eq.${encodeURIComponent(String(payment.id))}&status=eq.initiated`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'failed',
              failure_reason: text(response.ResultDesc, 300) || 'Payment was not completed.',
            }),
          });
        }
        return json({ received: true }, 200, origin);
      }

      const amount = Number(response.Amount);
      if (!Number.isFinite(amount) || amount <= 0) return json({ received: true }, 200, origin);

      // The confirmation RPC reserves transaction_reference for the actual M-Pesa receipt.
      // Clear the temporary PayHero request reference before confirming the payment.
      if (text(payment.transaction_reference, 160).startsWith('PayHero ')) {
        await rest(url, service, `payments?id=eq.${encodeURIComponent(String(payment.id))}&status=in.(initiated,pending)`, {
          method: 'PATCH',
          body: JSON.stringify({ transaction_reference: null }),
        });
      }

      const claimed = await rest(url, service, 'rpc/confirm_payhero_payment', {
        method: 'POST',
        body: JSON.stringify({
          p_external_reference: ref,
          p_provider_reference: text(response.PayHeroReference ?? response.reference, 100),
          p_transaction_reference: text(response.MpesaReceiptNumber, 100),
          p_paid_amount: amount,
          p_phone: text(response.Phone, 40),
        }),
      }) as Array<Record<string, unknown>>;

      const paid = claimed?.[0];
      if (!paid) return json({ received: true }, 200, origin);

      try {
        await notifyAdmins(url, service, paid.payment_id);
      } catch (e) {
        console.error('Admin dashboard notification failed', e);
      }
      try {
        await deliverPendingEmails(url, service, paid.payment_id);
      } catch (e) {
        console.error('Payment was recorded, but email delivery is pending retry', e);
      }

      return json({ received: true }, 200, origin);
    } catch (e) {
      console.error('PayHero callback processing failed', e);
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
    const profiles = await rest(url, service, `profiles?select=role&id=eq.${user.id}&limit=1`) as Array<{ role: string }>;
    if (!profiles[0] || !['admin', 'finance'].includes(profiles[0].role)) {
      return json({ error: 'Admin access is required.' }, 403, origin);
    }

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
      const rows = await rest(url, service, `invoices?${iq}`) as Array<Record<string, unknown>>;
      const invoice = rows[0];
      if (!invoice || !invoice.order_id || ['draft', 'void', 'paid'].includes(text(invoice.status))) {
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
      }) as Array<Record<string, unknown>>;

      const paid = Math.min(Number(invoice.total), Number(invoice.amount_paid || 0) + amount);
      const newStatus = paid >= Number(invoice.total) ? 'paid' : 'partially_paid';

      await rest(url, service, `invoices?id=eq.${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ amount_paid: paid, status: newStatus }),
      });
      await rest(url, service, `orders?id=eq.${encodeURIComponent(String(invoice.order_id))}`, {
        method: 'PATCH',
        body: JSON.stringify({
          payment_status: newStatus === 'paid' ? 'paid' : 'partially_paid',
          updated_at: new Date().toISOString(),
        }),
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
            amount_paid: paid,
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
    } catch (e) {
      console.error('Manual payment recording failed', e);
      return json({ error: e instanceof Error ? e.message : 'Could not record offline payment.' }, 500, origin);
    }
  }

  if (action !== 'invoice' && action !== 'initiate' && action !== 'status' && action !== 'retry-notifications') {
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
    const profiles = await rest(url, service, `profiles?select=role&id=eq.${authUser.id}&limit=1`) as Array<{ role: string }>;
    if (!profiles[0] || !['admin', 'finance'].includes(profiles[0].role)) {
      return json({ error: 'Admin access is required.' }, 403, origin);
    }

    const paymentId = text(payload.paymentId, 50);
    if (!/^[0-9a-f-]{36}$/i.test(paymentId)) return json({ error: 'A valid payment ID is required.' }, 400, origin);

    try {
      try {
        await notifyAdmins(url, service, paymentId);
      } catch (e) {
        console.error('Admin dashboard notification retry failed', e);
      }
      const delivery = await deliverPendingEmails(url, service, paymentId);
      if (!delivery.customerEmailSent) {
        throw new Error('Resend did not confirm acceptance of the customer receipt email.');
      }
      return json({ ok: true, ...delivery }, 200, origin);
    } catch (e) {
      console.error('Payment email retry failed', e);
      return json({ error: e instanceof Error ? e.message : 'Could not resend notifications.' }, 502, origin);
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
      const invoices = await rest(url, service, `invoices?${iq}`) as Array<Record<string, unknown>>;
      const invoice = invoices[0];
      if (!invoice || !invoice.order_id || invoice.status === 'draft' || invoice.status === 'void') {
        return json({ error: 'This invoice is not available for payment.' }, 404, origin);
      }

      const oq = new URLSearchParams({
        select: 'id,customer_id,customer_phone,reference',
        id: `eq.${invoice.order_id}`,
        limit: '1',
      });
      const orders = await rest(url, service, `orders?${oq}`) as Array<Record<string, unknown>>;
      const order = orders[0];
      if (!order) return json({ error: 'Invoice order details are unavailable.' }, 404, origin);

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
        },
        phone: order.customer_phone,
      }, 200, origin);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'Could not load invoice.' }, 500, origin);
    }
  }

  if (action === 'status') {
    const invoiceId = text(payload.invoiceId, 50);
    if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return json({ error: 'Invalid invoice.' }, 400, origin);

    try {
      const query = new URLSearchParams({
        select: 'id,invoice_id,status,amount,transaction_reference,provider_reference,confirmed_at,receipt_sent_at,created_at',
        invoice_id: `eq.${invoiceId}`,
        provider: 'eq.payhero',
        order: 'created_at.desc',
        limit: '1',
      });
      const rows = await rest(url, service, `payments?${query}`) as Array<Record<string, unknown>>;
      let payment = rows[0];
      if (!payment) return json({ payment: null }, 200, origin);

      if (['initiated', 'pending'].includes(text(payment.status, 30))) {
        const authorization = payheroAuthorization();
        if (authorization) {
          // For the Kenya /api/v2/payments flow, the matching status endpoint
          // accepts the PayHero reference returned when the STK request was created.
          const storedTransactionReference = text(payment.transaction_reference, 180)
            .replace(/^PayHero\s+/i, '');
          const candidates = [storedTransactionReference].filter(value =>
            /^[A-Za-z0-9._:-]{3,180}$/.test(value)
          );

          let providerData: Record<string, unknown> | null = null;
          for (const candidate of candidates) {
            try {
              const lookup = await fetch(
                `https://backend.payhero.co.ke/api/v2/transaction-status?reference=${encodeURIComponent(candidate)}`,
                {
                  method: 'GET',
                  headers: {
                    Authorization: authorization,
                    Accept: 'application/json',
                  },
                },
              );

              const raw = await lookup.text();
              let parsed: Record<string, unknown> = {};
              try {
                parsed = JSON.parse(raw) as Record<string, unknown>;
              } catch {
                // Leave providerData unset if the response is not JSON.
              }

              if (lookup.ok) {
                providerData = parsed;
                break;
              }

              console.warn('PayHero transaction status lookup was not accepted', {
                status: lookup.status,
                response: raw.slice(0, 250),
              });
            } catch (error) {
              console.warn('PayHero transaction status lookup failed', error);
            }
          }

          if (providerData) {
            let detail = providerData;
            for (const key of ['data', 'transaction', 'result']) {
              if (detail[key] && typeof detail[key] === 'object' && !Array.isArray(detail[key])) {
                detail = detail[key] as Record<string, unknown>;
                break;
              }
            }

            const providerStatus = text(
              detail.status ?? detail.payment_status ?? detail.transaction_status ?? detail.state,
              40,
            ).toLowerCase();
            const successFlag = detail.success === true || String(detail.success).toLowerCase() === 'true';
            const failed = ['failed', 'failure', 'cancelled', 'canceled', 'rejected', 'declined', 'expired'].includes(providerStatus)
              || (detail.success === false && providerStatus !== '' && !['queued', 'pending', 'processing', 'initiated', 'in_progress', 'waiting'].includes(providerStatus));
            const successful = ['success', 'successful', 'paid', 'completed', 'complete', 'settled'].includes(providerStatus)
              || successFlag;

            if (failed) {
              await rest(
                url,
                service,
                `payments?id=eq.${encodeURIComponent(String(payment.id))}&status=in.(initiated,pending)`,
                {
                  method: 'PATCH',
                  body: JSON.stringify({
                    status: 'failed',
                    failure_reason: text(detail.message ?? detail.error_message ?? detail.description, 300) || 'Payment was not completed.',
                  }),
                },
              );
              payment = { ...payment, status: 'failed' };
            } else if (successful) {
              const amount = Number(detail.amount ?? detail.paid_amount ?? detail.Amount ?? payment.amount);
              if (Number.isFinite(amount) && amount > 0) {
                if (text(payment.transaction_reference, 160).startsWith('PayHero ')) {
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

                const confirmed = await rest(url, service, 'rpc/confirm_payhero_payment', {
                  method: 'POST',
                  body: JSON.stringify({
                    p_external_reference: text(payment.provider_reference, 180),
                    p_provider_reference: text(
                      detail.PayHeroReference ?? detail.reference ?? detail.provider_reference,
                      100,
                    ),
                    p_transaction_reference: text(
                      detail.MpesaReceiptNumber ?? detail.third_party_reference ?? detail.provider_reference ?? detail.transaction_reference ?? detail.receipt_number,
                      100,
                    ),
                    p_paid_amount: amount,
                    p_phone: text(detail.Phone ?? detail.phone_number ?? detail.phone, 40),
                  }),
                }) as Array<Record<string, unknown>>;

                const confirmedPayment = confirmed?.[0];
                if (confirmedPayment) {
                  try {
                    await notifyAdmins(url, service, confirmedPayment.payment_id);
                  } catch (error) {
                    console.error('Admin dashboard notification failed', error);
                  }
                  try {
                    await deliverPendingEmails(url, service, confirmedPayment.payment_id);
                  } catch (error) {
                    console.error('Payment was recorded, but email delivery is pending retry', error);
                  }

                  const refreshed = await rest(url, service, `payments?${query}`) as Array<Record<string, unknown>>;
                  payment = refreshed[0] ?? {
                    ...payment,
                    status: 'confirmed',
                    amount,
                    transaction_reference: text(
                      detail.MpesaReceiptNumber ?? detail.third_party_reference ?? detail.provider_reference,
                      100,
                    ),
                  };
                }
              }
            }
          }
        }
      }

      return json({
        payment: {
          status: payment.status,
          amount: payment.amount,
          transaction_reference: payment.transaction_reference,
          confirmed_at: payment.confirmed_at,
          receipt_sent_at: payment.receipt_sent_at,
        },
      }, 200, origin);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'Could not check payment status.' }, 500, origin);
    }
  }

  if (action === 'initiate') {
    const invoiceId = text(payload.invoiceId, 50);
    let phone = '';
    try {
      phone = normalizePhone(text(payload.phone, 40));
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'Invalid phone number.' }, 400, origin);
    }

    const authorization = payheroAuthorization();
    const preferredChannel = Number(Deno.env.get('PAYHERO_CHANNEL_ID') || 0);

    if (!authorization || !Number.isInteger(preferredChannel) || preferredChannel < 0) {
      return json({
        error: 'PayHero is not fully configured. Set PAYHERO_AUTH_TOKEN or PAYHERO_BASIC_AUTH_TOKEN, or both PAYHERO_API_USERNAME and PAYHERO_API_PASSWORD. PAYHERO_CHANNEL_ID is optional; active eligible channels are discovered automatically.',
      }, 503, origin);
    }

    try {
      const iq = new URLSearchParams({
        select: 'id,invoice_number,customer_name,customer_email,total,amount_paid,status,order_id',
        id: `eq.${invoiceId}`,
        limit: '1',
      });
      const invoices = await rest(url, service, `invoices?${iq}`) as Array<Record<string, unknown>>;
      const invoice = invoices[0];
      if (!invoice || !invoice.order_id || ['draft', 'void', 'paid'].includes(text(invoice.status))) {
        return json({ error: 'This invoice cannot be paid.' }, 400, origin);
      }

      const oq = new URLSearchParams({
        select: 'id,customer_name,customer_phone',
        id: `eq.${invoice.order_id}`,
        limit: '1',
      });
      const orders = await rest(url, service, `orders?${oq}`) as Array<Record<string, unknown>>;
      const order = orders[0];
      if (!order) return json({ error: 'Invoice order details are unavailable.' }, 404, origin);

      const amount = Math.ceil(Number(invoice.total) - Number(invoice.amount_paid));
      if (!Number.isFinite(amount) || amount < 1) return json({ error: 'Invoice has no balance due.' }, 400, origin);

      const channel = await discoverPayheroChannel(authorization, preferredChannel);

      const activeQuery = new URLSearchParams({
        select: 'id',
        invoice_id: `eq.${invoice.id}`,
        provider: 'eq.payhero',
        status: 'in.(pending,initiated)',
        limit: '1',
      });
      const activeRows = await rest(url, service, `payments?${activeQuery}`) as Array<{ id: string }>;
      if (activeRows.length) {
        return json({
          error: 'There is already an M-Pesa request awaiting a response. Complete or wait for it before requesting another prompt.',
        }, 409, origin);
      }

      const externalRef = `${text(invoice.invoice_number, 60)}-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
      let payment: Record<string, unknown> | undefined;

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
            provider_reference: externalRef,
          }),
        }) as Array<Record<string, unknown>>;
        payment = paymentInit[0];
      } catch (error) {
        if (error instanceof Error && error.message.includes('already awaiting a result')) {
          return json({ error: 'Another M-Pesa request was started for this invoice. Refresh to check its status.' }, 409, origin);
        }
        throw error;
      }

      if (!payment?.id) return json({ error: 'Could not start an M-Pesa request.' }, 502, origin);

      const callbackUrl = `${url}/functions/v1/payhero-payments?action=callback`;
      const response = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
        method: 'POST',
        headers: {
          Authorization: authorization,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          phone_number: phone,
          provider: 'm-pesa',
          channel_id: channel.id,
          account_id: channel.accountId,
          external_reference: externalRef,
          customer_name: text(invoice.customer_name, 120),
          callback_url: callbackUrl,
        }),
      });

      const responseBody = await response.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(responseBody) as Record<string, unknown>;
      } catch {
        // A non-JSON provider response is handled as a rejected response below.
      }

      const responseStatus = text(data.status ?? data.message, 40).toLowerCase();
      const explicitFailure = data.success === false
        || ['failed', 'failure', 'error', 'rejected', 'cancelled', 'canceled'].includes(responseStatus);
      const payheroReference = text(data.reference, 160);
      const hasCheckoutReference = Boolean(
        payheroReference || text(data.CheckoutRequestID, 160) || text(data.checkout_request_id, 160)
      );

      if (!response.ok || explicitFailure || (!hasCheckoutReference && data.success !== true)) {
        const providerMessage = text(data.message ?? data.error_message ?? data.error ?? data.detail ?? data.description, 300);
        const failureReason = `PayHero HTTP ${response.status}${providerMessage ? `: ${providerMessage}` : ''}`;

        console.error('PayHero rejected the STK push request', {
          status: response.status,
          channel: channel.id,
          account: channel.accountId,
          providerMessage,
          externalReference: externalRef,
          response: responseBody.slice(0, 500),
        });

        await rest(url, service, `payments?id=eq.${encodeURIComponent(String(payment.id))}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'failed', failure_reason: failureReason }),
        });

        return json({
          error: `PayHero rejected the M-Pesa request (HTTP ${response.status}).${providerMessage ? ` ${providerMessage}` : ''}`,
        }, 502, origin);
      }

      // Keep provider_reference as our external_reference for callback matching.
      // Store PayHero's returned reference temporarily in transaction_reference
      // so the status endpoint can query the same Kenya API transaction.
      if (payheroReference) {
        await rest(url, service, `payments?id=eq.${encodeURIComponent(String(payment.id))}`, {
          method: 'PATCH',
          body: JSON.stringify({ transaction_reference: `PayHero ${payheroReference}` }),
        });
      }

      return json({
        ok: true,
        paymentId: payment.id,
        reference: externalRef,
        checkoutRequestId: text(data.CheckoutRequestID ?? data.checkout_request_id, 160),
        status: data.status || 'QUEUED',
        channel: channel.description || String(channel.id),
      }, 200, origin);
    } catch (e) {
      console.error('Could not initiate PayHero payment', e);
      return json({ error: e instanceof Error ? e.message : 'Could not start M-Pesa payment.' }, 500, origin);
    }
  }
});

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

  const kind = payload.kind === 'quote' ? 'quote' : 'contact';
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

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

  // Quietly accept bot submissions without storing or sending them.
  if (typeof payload.website === 'string' && payload.website.trim()) return json({ ok: true, notificationSent: true }, 200, origin);

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
  const service = typeof payload.service === 'string' ? payload.service.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (name.length < 1 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || phone.length > 40 || service.length < 1 || service.length > 160 || message.length < 10 || message.length > 2000) {
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

  const stored = await fetch(`${supabaseUrl}/rest/v1/contact_inquiries`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ name, email, phone: phone || null, service, message }),
  });
  if (!stored.ok) {
    console.error('Failed to store contact inquiry', stored.status);
    return json({ error: 'We could not save your enquiry. Please try again.' }, 502, origin);
  }

  if (!resendKey || !fromEmail) {
    console.error('Contact email function is missing Resend configuration');
    return json({ ok: true, notificationSent: false }, 200, origin);
  }

  const escapedName = escapeHtml(name);
  const escapedEmail = escapeHtml(email);
  const escapedPhone = escapeHtml(phone || 'Not provided');
  const escapedService = escapeHtml(service);
  const escapedMessage = escapeHtml(message).replace(/\n/g, '<br>');
  try {
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `New website enquiry: ${service}`,
        text: `New NexxaCraft website enquiry\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\nService: ${service}\n\nProject details:\n${message}`,
        html: `<h2>New NexxaCraft website enquiry</h2><p><strong>Name:</strong> ${escapedName}</p><p><strong>Email:</strong> ${escapedEmail}</p><p><strong>Phone:</strong> ${escapedPhone}</p><p><strong>Service:</strong> ${escapedService}</p><p><strong>Project details:</strong><br>${escapedMessage}</p>`,
      }),
    });
    if (!sent.ok) {
      console.error('Resend rejected contact notification', sent.status, await sent.text());
      return json({ ok: true, notificationSent: false }, 200, origin);
    }
    const result = await sent.json().catch(() => null);
    console.log('Resend accepted contact notification', { emailId: result?.id ?? 'unknown', recipient: toEmail });
  } catch (error) {
    console.error('Could not reach Resend for contact notification', error);
    return json({ ok: true, notificationSent: false }, 200, origin);
  }
  return json({ ok: true, notificationSent: true }, 200, origin);
});

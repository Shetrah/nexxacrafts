const allowedOrigins = new Set(['https://nexxacrafts.co.ke','https://www.nexxacrafts.co.ke','https://nexxacrafts.vercel.app','http://localhost:5173','http://localhost:5174']);
const cors = (origin: string | null) => ({ ...(origin && allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}), 'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' });
const json = (body: Record<string, unknown>, status = 200, origin: string | null = null) => new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const text = (value: unknown, limit = 500) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

async function db(url: string, key: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const body = await response.text();
  if (!response.ok) throw new Error(`Database request failed (${response.status}): ${body.slice(0, 400)}`);
  return body ? JSON.parse(body) : null;
}

async function isAdmin(url: string, anon: string, service: string, authorization: string | null) {
  if (!authorization) return false;
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: authorization } });
  if (!response.ok) return false;
  const user = await response.json() as { id?: string };
  if (!user.id) return false;
  const profiles = await db(url, service, `profiles?select=role&id=eq.${encodeURIComponent(user.id)}&limit=1`) as Array<{ role: string }>;
  return profiles.some(profile => ['admin', 'finance'].includes(profile.role));
}

async function whatsapp(apiKey: string, path: 'send' | 'media', data: Record<string, unknown>) {
  const response = await fetch(`https://whatsy.elitesamttech.co.ke/api/v1/messages/${path}`, { method: 'POST', headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const bodyText = await response.text();
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(bodyText) as Record<string, unknown>; } catch { /* Preserve the HTTP error below. */ }
  if (!response.ok || body.success !== true) {
    console.error('WhatsApp provider rejected a message', { status: response.status, response: bodyText.slice(0, 500) });
    throw new Error(`WhatsApp provider rejected the message (HTTP ${response.status}). ${text(body.message || body.error, 250)}`);
  }
  return body;
}

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const apiKey = Deno.env.get('WHATSAPP_API_KEY');
  if (!url || !anon || !service || !apiKey) return json({ error: 'WhatsApp is not configured. Set WHATSAPP_API_KEY and WHATSAPP_ADMIN_PHONE in Supabase secrets.' }, 503, origin);

  const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = text(payload.action, 40);
  try {
    if (action === 'new-order') {
      // Public checkout may invoke this after saving an order. The recipient is
      // fixed in a secret and the database key prevents repeated notifications.
      const orderId = text(payload.orderId, 50);
      const to = text(Deno.env.get('WHATSAPP_ADMIN_PHONE'), 30);
      if (!/^[0-9a-f-]{36}$/i.test(orderId) || !to) return json({ error: 'Order notification is not configured.' }, 400, origin);
      const orders = await db(url, service, `orders?select=id,reference,customer_name,customer_email,customer_phone,status,payment_status,total&id=eq.${encodeURIComponent(orderId)}&limit=1`) as Array<Record<string, unknown>>;
      const order = orders[0];
      if (!order) return json({ error: 'Order was not found.' }, 404, origin);
      const idempotencyKey = `new-order:${orderId}`;
      const inserted = await db(url, service, 'whatsapp_delivery_logs', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify({ order_id: orderId, kind: 'new_order_admin', recipient: to, idempotency_key: idempotencyKey, status: 'pending' }) }) as Array<Record<string, unknown>>;
      if (!inserted?.length) return json({ ok: true, alreadyNotified: true }, 200, origin);
      const message = `New NexxaCraft order ${text(order.reference, 60)}\nClient: ${text(order.customer_name, 120)}\nEmail: ${text(order.customer_email, 200)}\nPhone: ${text(order.customer_phone, 40)}\nStatus: ${text(order.status, 40)} · Payment: ${text(order.payment_status, 40)}\nTotal: KES ${Number(order.total || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
      try {
        const result = await whatsapp(apiKey, 'send', { to, message });
        await db(url, service, `whatsapp_delivery_logs?id=eq.${encodeURIComponent(String(inserted[0].id))}`, { method: 'PATCH', body: JSON.stringify({ status: 'sent', provider_message_id: text(result.messageId, 160), sent_at: new Date().toISOString() }) });
        return json({ ok: true }, 200, origin);
      } catch (error) {
        await db(url, service, `whatsapp_delivery_logs?id=eq.${encodeURIComponent(String(inserted[0].id))}`, { method: 'PATCH', body: JSON.stringify({ status: 'failed', error: error instanceof Error ? error.message.slice(0, 500) : 'WhatsApp delivery failed.' }) }).catch(() => {});
        throw error;
      }
    }

    if (action === 'share-artwork') {
      if (!await isAdmin(url, anon, service, request.headers.get('authorization'))) return json({ error: 'Admin access is required to share client artwork.' }, 403, origin);
      const orderId = text(payload.orderId, 50), mediaUrl = text(payload.mediaUrl, 2000), fileName = text(payload.fileName, 180), caption = text(payload.caption, 900);
      if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: 'A valid order is required.' }, 400, origin);
      let parsedUrl: URL;
      try { parsedUrl = new URL(mediaUrl); } catch { return json({ error: 'Upload the design file before sharing it.' }, 400, origin); }
      if (parsedUrl.protocol !== 'https:' || !fileName) return json({ error: 'The artwork must use a secure file URL and have a filename.' }, 400, origin);
      const orders = await db(url, service, `orders?select=id,reference,customer_name,customer_phone&id=eq.${encodeURIComponent(orderId)}&limit=1`) as Array<Record<string, unknown>>;
      const order = orders[0];
      if (!order) return json({ error: 'Order was not found.' }, 404, origin);
      const to = text(order.customer_phone, 40).replace(/\D/g, '');
      if (!to) return json({ error: 'This order has no client phone number.' }, 400, origin);
      const mime = text(payload.mimetype, 100) || (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const result = await whatsapp(apiKey, 'media', { to, mimetype: mime, mediaUrl: parsedUrl.toString(), caption: caption || `Please review the design for order ${text(order.reference, 60)} and reply with your approval or requested changes.`, fileName });
      await db(url, service, 'whatsapp_delivery_logs', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ order_id: orderId, kind: 'artwork_proof', recipient: to, idempotency_key: `artwork:${crypto.randomUUID()}`, status: 'sent', provider_message_id: text(result.messageId, 160), sent_at: new Date().toISOString() }) });
      return json({ ok: true, recipient: to, providerMessageId: text(result.messageId, 160) }, 200, origin);
    }

    return json({ error: 'Unknown WhatsApp action.' }, 400, origin);
  } catch (error) {
    console.error('WhatsApp message operation failed', error);
    return json({ error: error instanceof Error ? error.message : 'WhatsApp delivery failed.' }, 502, origin);
  }
});

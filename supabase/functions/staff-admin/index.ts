const allowedOrigins = new Set([
  'https://nexxacrafts.co.ke',
  'https://www.nexxacrafts.co.ke',
  'https://nexxacrafts.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
]);

const cors = (origin: string | null) => ({
  ...(origin && allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
});

const respond = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const STAFF_ROLES = new Set([
  'admin', 'sales', 'finance', 'designer', 'print_operator', 'laser_operator',
  'developer', 'production_manager', 'dispatch',
]);

function clean(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
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
  const text = await response.text();
  if (!response.ok) throw new Error(`Database request failed (${response.status}): ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') {
    if (origin && !allowedOrigins.has(origin)) return respond({ error: 'Origin not allowed.' }, 403, null);
    return new Response('ok', { headers: cors(origin) });
  }
  if (request.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return respond({ error: 'Origin not allowed.' }, 403, null);

  const authorization = request.headers.get('authorization');
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return respond({ error: 'Staff invitations are not configured on the server.' }, 503, origin);
  if (!authorization?.startsWith('Bearer ')) return respond({ error: 'Sign in as an administrator to add staff.' }, 401, origin);

  try {
    const userResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
    if (!userResponse.ok) return respond({ error: 'Your session could not be verified. Sign in again.' }, 401, origin);
    const caller = await userResponse.json() as { id?: string };
    if (!caller.id) return respond({ error: 'Your session could not be verified.' }, 401, origin);
    const profiles = await rest(url, serviceKey, `profiles?select=role&id=eq.${encodeURIComponent(caller.id)}&limit=1`) as Array<{ role: string }>;
    if (profiles[0]?.role !== 'admin') return respond({ error: 'Only an administrator can add staff profiles.' }, 403, origin);

    const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
    const name = clean(payload.name, 120);
    const email = clean(payload.email, 254).toLowerCase();
    const phone = clean(payload.phone, 40);
    const role = clean(payload.role, 40);
    if (name.length < 2) return respond({ error: 'Enter the staff member’s full name.' }, 400, origin);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respond({ error: 'Enter a valid staff email address.' }, 400, origin);
    if (!STAFF_ROLES.has(role)) return respond({ error: 'Choose a valid staff role.' }, 400, origin);

    const redirectTo = `${origin?.startsWith('http://localhost:') ? origin : 'https://nexxacrafts.co.ke'}/account?mode=reset&staff_invite=1`;
    const inviteUrl = new URL(`${url}/auth/v1/invite`);
    inviteUrl.searchParams.set('redirect_to', redirectTo);
    const inviteResponse = await fetch(inviteUrl, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, data: { full_name: name, phone } }),
    });
    const inviteText = await inviteResponse.text();
    let invited: { id?: string; user?: { id?: string }; message?: string; msg?: string } = {};
    try { invited = JSON.parse(inviteText); } catch { /* Report a stable, non-sensitive error below. */ }
    const userId = invited.id || invited.user?.id;
    if (!inviteResponse.ok || !userId) {
      if (inviteResponse.status === 422 || /already|registered|exists/i.test(inviteText)) {
        return respond({ error: 'This email already has an account. Use a new email for the invitation, or contact support to convert an existing client account to staff.' }, 409, origin);
      }
      console.error('Supabase rejected a staff invitation', { status: inviteResponse.status, body: inviteText.slice(0, 400) });
      return respond({ error: 'Supabase could not send the staff invitation. Check Auth email delivery and invite settings.' }, 502, origin);
    }

    try {
      await rest(url, serviceKey, `profiles?id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ full_name: name, phone: phone || null, role }),
      });
    } catch (error) {
      console.error('Staff invite was created but role assignment failed', error instanceof Error ? error.message : 'unknown error');
      return respond({ error: 'The invitation was created, but the staff role could not be assigned. Contact support before sending another invite.' }, 500, origin);
    }

    return respond({ ok: true, email, name, role, invited: true }, 200, origin);
  } catch (error) {
    console.error('Staff management request failed', error instanceof Error ? error.message : 'unknown error');
    return respond({ error: 'Could not add this staff member. Please try again or inspect the staff-admin function logs.' }, 500, origin);
  }
});

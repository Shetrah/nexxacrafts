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

const json = (
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json',
    },
  });

const text = (value: unknown, limit: number) =>
  typeof value === 'string' ? value.trim().slice(0, limit) : '';

type ChatTurn = { role: 'user' | 'assistant'; text: string };
type ServiceInfo = {
  slug: string;
  name: string;
  category: string;
  description: string;
  pricing_mode: string;
  image_url: string | null;
  fields?: unknown;
};

const requestTimestamps = new Map<string, number[]>();

async function loadCatalog(url: string, anonKey: string, serviceKey: string) {
  const key = serviceKey || anonKey;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };

  const serviceQuery = new URLSearchParams({
    select: 'slug,name,category,description,pricing_mode,image_url,fields',
    is_active: 'eq.true',
    order: 'sort_order.asc',
  });

  const rateQuery = new URLSearchParams({
    select: 'service_slug,unit_rate,setup_fee,unit_label',
    active: 'eq.true',
    unit_rate: 'gt.0',
  });

  const [servicesResponse, ratesResponse] = await Promise.all([
    fetch(`${url}/rest/v1/services?${serviceQuery}`, { headers }),
    fetch(`${url}/rest/v1/pricing_rates?${rateQuery}`, { headers }),
  ]);

  if (!servicesResponse.ok) {
    throw new Error(`Catalogue lookup failed (${servicesResponse.status}).`);
  }

  const services = await servicesResponse.json() as ServiceInfo[];
  const rates = ratesResponse.ok
    ? await ratesResponse.json() as Array<Record<string, unknown>>
    : [];

  return { services, rates };
}

Deno.serve(async request => {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405, origin);
  }

  if (origin && !allowedOrigins.has(origin)) {
    return json(
      { error: 'This website is not allowed to use the assistant.' },
      403,
      origin,
    );
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!apiKey) {
    return json({
      error: 'The AI assistant is not configured yet. Please use the Services page or contact our team.',
    }, 503, origin);
  }

  if (!supabaseUrl || !anonKey) {
    return json({
      error: 'The assistant could not load our live services. Please try again shortly.',
    }, 503, origin);
  }

  const clientKey =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const recent = (requestTimestamps.get(clientKey) || [])
    .filter(timestamp => now - timestamp < 60_000);

  if (recent.length >= 12) {
    return json({
      error: 'You’ve sent several messages in a short time. Please wait a moment and try again.',
    }, 429, origin);
  }

  recent.push(now);
  requestTimestamps.set(clientKey, recent);

  try {
    const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
    const rawMessages = Array.isArray(payload.messages)
      ? payload.messages.slice(-10)
      : [];

    const messages: ChatTurn[] = rawMessages.flatMap(item => {
      if (!item || typeof item !== 'object') return [];

      const row = item as Record<string, unknown>;
      const role =
        row.role === 'assistant' ? 'assistant'
          : row.role === 'user' ? 'user'
          : null;
      const value = text(row.text, 1200);

      return role && value ? [{ role, text: value }] : [];
    });

    const audioPayload = payload.audio && typeof payload.audio === 'object'
      ? payload.audio as Record<string, unknown>
      : null;
    const rawAudioData = audioPayload?.data;
    const audioData = typeof rawAudioData === 'string' ? rawAudioData.trim() : '';
    const audioMimeType = typeof audioPayload?.mimeType === 'string'
      ? audioPayload.mimeType.split(';')[0].trim().toLowerCase()
      : '';
    const supportedAudioTypes = new Set([
      'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav',
      'audio/mpeg', 'audio/mp3', 'audio/aac', 'audio/flac', 'audio/opus',
    ]);

    if (audioData.length > 8 * 1024 * 1024) {
      return json({ error: 'That voice message is too large. Please record a shorter message.' }, 413, origin);
    }
    if (audioPayload && !audioData) {
      return json({ error: 'The voice message was empty. Please record it again.' }, 400, origin);
    }
    if (audioData && (
      !supportedAudioTypes.has(audioMimeType)
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(audioData)
    )) {
      return json({ error: 'This audio format is not supported. Please record again or type your message.' }, 400, origin);
    }

    if (!audioData && (!messages.length || messages.at(-1)?.role !== 'user')) {
      return json({ error: 'Enter a question to start chatting.' }, 400, origin);
    }

    const { services, rates } = await loadCatalog(
      supabaseUrl,
      anonKey,
      serviceKey || '',
    );

    const serviceContext = services.slice(0, 50).map(service => ({
      slug: service.slug,
      name: service.name,
      category: service.category,
      description: service.description,
      imageUrl: service.image_url,
      pricing: service.pricing_mode === 'quote'
        ? 'Custom quote; do not invent a price.'
        : 'Instant price; use selected size/options in its order form.',
      questions: Array.isArray(service.fields)
        ? service.fields.map((field: unknown) => {
          if (!field || typeof field !== 'object') return null;
          const value = field as Record<string, unknown>;
          return {
            label: value.label,
            options: value.options,
            optionPrices: value.optionPrices,
          };
        }).filter(Boolean)
        : [],
    }));

    const rateContext = rates.slice(0, 50).map(rate => ({
      service: rate.service_slug,
      unitRate: rate.unit_rate,
      setupFee: rate.setup_fee,
      unit: rate.unit_label,
    }));

    const systemInstruction = `You are Levine, a warm and capable member of NexxaCraft's customer support team serving clients in Kenya. Speak naturally as Levine from the team, not as a software product. Do not volunteer technical implementation details or mention Gemini, models, APIs, or internal systems. If directly asked whether you are automated, answer honestly that you are a virtual customer support assistant representing the NexxaCraft team. Be concise, kind, practical, and ask only one useful follow-up question at a time. Help visitors understand design, printing, branding, fabrication and digital services; explain how to use the site; recommend the best exact service from the live catalogue below and help them get to its order form. You may mention the public service names and their configured public prices/options. These service details, option prices, general rates, and image URLs come from the live website data maintained by NexxaCraft staff; use those values and never replace them with guesses. Never invent prices, delivery promises, turnaround commitments, payment confirmation, stock availability, or company policies. For quote services say the team confirms a quotation. For an instant-price service direct the visitor to its order form to choose options and see the current calculated estimate. Do not claim you checked or changed an order; direct tracking questions to /track and account questions to /account. Never request a password, M-Pesa PIN, card number, or one-time code. Do not execute database, payment, account, admin, or website changes. When a service is clearly the best match, add [[SERVICE:service-slug]] on a separate line after your answer using a catalogue slug; otherwise omit it. If the customer asks to see an example, photo, or what a service looks like, and the catalogue has an imageUrl for it, add [[IMAGE:service-slug]] on its own separate line so the website can show the admin-managed service image. Use at most one of each marker, never invent image URLs, and do not mention the markers.

LIVE SERVICE CATALOGUE:
${JSON.stringify(serviceContext)}
ACTIVE GENERAL PRICING RULES:
${JSON.stringify(rateContext)}

NexxaCraft pages: services /services, order forms /order/{slug}, custom quote /quote, track order /track, contact /contact. The customer is chatting on the public website.`;

    // Flash-Lite is Google's low-latency, high-throughput choice for support chat.
    const fastModel = 'gemini-3.5-flash-lite';
    const fallbackModel = 'gemini-3.8-flash';
    const interactionBody = (model: string) => JSON.stringify({
      model,
      system_instruction: systemInstruction,
      input: [
        ...messages.map(message => ({
          type: message.role === 'assistant' ? 'model_output' : 'user_input',
          content: [{ type: 'text', text: message.text }],
        })),
        ...(audioData ? [{
          type: 'user_input',
          content: [
            { type: 'text', text: 'The customer sent a voice message. Understand the audio and respond naturally as customer support.' },
            { type: 'audio', data: audioData, mime_type: audioMimeType },
          ],
        }] : []),
      ],
      generation_config: {
        temperature: 0.45,
        thinking_level: 'minimal',
        max_output_tokens: 380,
      },
      stream: true,
      store: false,
    });
    const requestModel = async (model: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        return await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: interactionBody(model),
        });
      } finally {
        clearTimeout(timeout);
      }
    };

    let upstreamModel = fastModel;
    let fallbackUsed = false;
    let upstream: Response;
    try {
      upstream = await requestModel(upstreamModel);
    } catch (error) {
      console.error('Gemini fast model timed out before streaming; trying fallback', error);
      upstreamModel = fallbackModel;
      fallbackUsed = true;
      upstream = await requestModel(upstreamModel);
    }

    if ((!upstream.ok || !upstream.body) && !fallbackUsed) {
      const details = (await upstream.text().catch(() => '')).slice(0, 800);
      console.error('Gemini fast model request failed; trying fallback', { status: upstream.status, detail: details });
      upstreamModel = fallbackModel;
      fallbackUsed = true;
      upstream = await requestModel(upstreamModel);
    }

    if (!upstream.ok || !upstream.body) {
      const details = (await upstream.text().catch(() => '')).slice(0, 800);
      console.error('Gemini fallback model request failed', { status: upstream.status, detail: details });
      return json({ error: 'Customer support is taking longer than usual. Please try again in a moment.' }, 502, origin);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Keep the reader in scope so downstream cancellation cancels the reader,
    // not the upstream stream while it is locked by that reader.
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let downstreamCancelled = false;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        reader = upstream.body!.getReader();
        let buffer = '';
        let receivedText = false;
        let firstTextDeadline = Date.now() + 7000;

        const emitFrame = (frame: string) => {
          if (downstreamCancelled) return;

          const data = frame
            .split('\n')
            .filter(line => line.startsWith('data:'))
            .map(line => line.slice(5).trim())
            .join('\n');

          if (!data || data === '[DONE]') return;

          try {
            const chunk = JSON.parse(data) as {
              event_type?: string;
              delta?: { type?: string; text?: string };
              error?: { message?: string };
            };

            if (chunk.event_type === 'error' || chunk.error) {
              const detail = chunk.error?.message || 'The assistant stream failed.';
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: detail })}\n\n`),
              );
              return;
            }

            const delta =
              chunk.event_type === 'step.delta' && chunk.delta?.type === 'text'
                ? chunk.delta.text || ''
                : '';

            if (delta) {
              receivedText = true;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`),
              );
            }
          } catch {
            // Ignore incomplete or non-content provider events.
          }
        };

        try {
          while (!downstreamCancelled) {
            let readResult: ReadableStreamReadResult<Uint8Array>;
            if (!receivedText) {
              const remaining = Math.max(0, firstTextDeadline - Date.now());
              let timeoutId: ReturnType<typeof setTimeout> | undefined;
              const outcome = await Promise.race([
                reader.read().then(result => ({ kind: 'read' as const, result })),
                new Promise<{ kind: 'timeout' }>(resolve => {
                  timeoutId = setTimeout(() => resolve({ kind: 'timeout' }), remaining);
                }),
              ]);
              if (timeoutId) clearTimeout(timeoutId);
              if (outcome.kind === 'timeout') {
                if (fallbackUsed) throw new Error('Both support models exceeded the first response time limit.');
                fallbackUsed = true;
                await reader.cancel('Fast model response timed out.');
                reader.releaseLock();
                const fallback = await requestModel(fallbackModel);
                if (!fallback.ok || !fallback.body) throw new Error(`Fallback model request failed (${fallback.status}).`);
                upstream = fallback;
                reader = fallback.body.getReader();
                buffer = '';
                firstTextDeadline = Date.now() + 7000;
                continue;
              }
              readResult = outcome.result;
            } else {
              readResult = await reader.read();
            }
            const { value, done } = readResult;
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const frames = buffer.split('\n\n');
            buffer = frames.pop() || '';
            frames.forEach(emitFrame);
          }

          if (!downstreamCancelled && buffer.trim()) {
            emitFrame(buffer);
          }

          if (!downstreamCancelled) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        } catch (error) {
          if (!downstreamCancelled) {
            console.error('Gemini response stream interrupted', error);

            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    error: 'The live response was interrupted. Please try again.',
                  })}\n\n`,
                ),
              );
              controller.close();
            } catch {
              // The client may have disconnected while the error was handled.
            }
          }
        } finally {
          if (reader) {
            try {
              reader.releaseLock();
            } catch {
              // Ignore a reader that was already released.
            }
            reader = null;
          }
        }
      },

      async cancel(reason) {
        downstreamCancelled = true;

        // Cancel through the active reader; calling upstream.body.cancel()
        // here throws because the body is locked while the reader is active.
        try {
          await reader?.cancel(reason);
        } catch {
          // The stream may already have completed or been cancelled.
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Gemini assistant failed before streaming', error);

    return json({
      error: 'The assistant could not load service details. Please try again or contact our team.',
    }, 500, origin);
  }
});

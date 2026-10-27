/* Lee capturas o texto con Claude y devuelve el JSON que pide el prompt (plan de una sesión o parciales). Cada pedido
   cuenta para el tope del mes (AI_MONTHLY_LIMIT): pasado el tope, responde `quota` sin llamar a Claude. */
import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AI_LIMITS, AI_MODEL, aiConfigured, aiMonthlyLimit } from '@/lib/ai/server';
import { requireUser, svError } from '@/lib/strava/server';

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
const fail = (code: string, message: string, status: number) => NextResponse.json({ code, message }, { status });

/* el modelo devuelve el JSON solo o dentro de un bloque de código: me quedo con el primer objeto o lista */
function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    return JSON.parse(t);
  } catch {
    const i = t.search(/[[{]/),
      j = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
    if (i < 0 || j <= i) throw new Error('sin JSON');
    return JSON.parse(t.slice(i, j + 1));
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sb } = await requireUser();
    if (!aiConfigured()) return fail('not_configured', 'Falta ANTHROPIC_API_KEY en el servidor.', 503);
    const fd = await request.formData();
    const prompt = String(fd.get('prompt') || '').slice(0, 20000);
    if (!prompt) return fail('bad_request', 'Falta el texto del pedido.', 400);
    const files = fd.getAll('images').filter((f): f is File => f instanceof File);
    if (files.length > AI_LIMITS.maxCount) return fail('too_many', 'Máximo ' + AI_LIMITS.maxCount + ' imágenes por vez.', 400);

    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    for (const f of files) {
      if (!AI_LIMITS.mediaTypes.includes(f.type)) return fail('bad_image', 'Formato de imagen no soportado: ' + f.type, 400);
      const data = Buffer.from(await f.arrayBuffer()).toString('base64');
      content.push({ type: 'image', source: { type: 'base64', media_type: f.type as MediaType, data } });
    }
    content.push({ type: 'text', text: prompt + '\n\nRespondé solo con el JSON, sin texto antes ni después.' });

    /* se cuenta recién con el pedido armado, y en un solo paso en la base: dos pedidos a la vez no pasan el tope */
    const limit = aiMonthlyLimit();
    const { data: n, error } = await sb.rpc('ai_take', { lim: limit });
    if (error) throw error;
    if (n == null) return NextResponse.json({ code: 'quota', message: 'Se usaron las ' + limit + ' lecturas del mes.', limit }, { status: 429 });

    const client = new Anthropic();
    const res = await client.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      // si un filtro de seguridad rechaza el pedido, la API lo reintenta sola con otro modelo
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{ role: 'user', content }],
    });
    if (res.stop_reason === 'refusal') return fail('refusal', 'Claude no pudo leer este pedido.', 422);
    const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    try {
      return NextResponse.json(parseJson(text));
    } catch {
      return fail('bad_output', 'No entendí la respuesta. Probá con otra captura.', 502);
    }
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return fail('rate_limited', 'Demasiados pedidos seguidos. Probá en un minuto.', 429);
    if (e instanceof Anthropic.AuthenticationError) return fail('bad_key', 'La clave de Anthropic no es válida.', 503);
    if (e instanceof Anthropic.APIError) return fail('api_error', e.message, 502);
    return svError(e);
  }
}

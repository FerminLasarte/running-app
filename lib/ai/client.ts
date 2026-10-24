/* Lectura de capturas y texto con Claude (reemplaza la capacidad `sample` del artifact).
   Pasa por /api/ai, que usa la ANTHROPIC_API_KEY del servidor. Sin clave, `aiAvailable()` devuelve null
   y la interfaz esconde todo lo de IA, igual que el original cuando no tenía `sample`. */

export interface AiLimits {
  images: boolean;
  maxCount: number;
  mediaTypes: string[];
}

let cached: Promise<AiLimits | null> | null = null;

export function aiAvailable(): Promise<AiLimits | null> {
  if (!cached)
    cached = fetch('/api/ai/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && j.enabled ? (j.limits as AiLimits) : null))
      .catch(() => null);
  return cached;
}

export class AiError extends Error {
  code: string;
  constructor(code: string, message = '') {
    super(message || code);
    this.code = code;
  }
}

/* las capturas del celu pesan varios MB: las achico a 1600 px de lado mayor en JPEG, que alcanza para leer números */
async function shrink(f: File): Promise<File> {
  if (!/^image\//.test(f.type)) return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.85));
    return blob ? new File([blob], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : f;
  } catch {
    return f;
  }
}

/** Pide a Claude que devuelva JSON. Las imágenes se mandan como archivos (se achican antes de subir). */
export async function aiJson<T = unknown>(prompt: string, opts: { images?: File[] } = {}): Promise<T> {
  const fd = new FormData();
  fd.set('prompt', prompt);
  for (const f of await Promise.all((opts.images || []).map(shrink))) fd.append('images', f);
  let res: Response;
  try {
    res = await fetch('/api/ai/json', { method: 'POST', body: fd });
  } catch {
    throw new AiError('network');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new AiError((body && body.code) || 'error', (body && body.message) || '');
  return body as T;
}

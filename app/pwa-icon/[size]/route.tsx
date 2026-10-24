/* Íconos de la PWA en tamaños fijos (192 y 512; «m» = maskable, con más margen). */
import { appIcon } from '@/lib/appIcon';

export async function GET(_req: Request, ctx: RouteContext<'/pwa-icon/[size]'>) {
  const { size } = await ctx.params;
  const mask = size.endsWith('m'),
    n = parseInt(size, 10);
  if (n !== 192 && n !== 512) return new Response('no', { status: 404 });
  return appIcon(n, { pad: mask ? 0.26 : 0.2 });
}

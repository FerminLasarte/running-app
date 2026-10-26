/* Ícono de la app: la marca (la pista en blanco sobre tartán), dibujada con next/og para el favicon, iOS y la PWA.
   `pad`: el margen alrededor de la pista, como parte del lado (la de «maskable» lleva más, para que Android pueda
   recortarla en círculo sin comerse la pista). */
import { ImageResponse } from 'next/og';
import { BRAND_ACC, trackRects } from '@/components/shell/BrandMark';

export function appIcon(size: number, opts: { rounded?: boolean; pad?: number } = {}) {
  const pad = opts.pad ?? 0,
    s = Math.round(size * (1 - pad * 2));
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND_ACC,
          borderRadius: opts.rounded ? size * 0.13 : 0,
        }}
      >
        {/* la caja de la marca sin su borde de 1: la pista queda donde está en la barra lateral */}
        <svg width={s} height={s} viewBox="1 1 30 30">
          {trackRects()}
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}

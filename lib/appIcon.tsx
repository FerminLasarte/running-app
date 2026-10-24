/* Ícono de la app (cronómetro blanco sobre naranja), dibujado con next/og para el favicon, iOS y la PWA. */
import { ImageResponse } from 'next/og';

export function appIcon(size: number, opts: { rounded?: boolean; pad?: number } = {}) {
  const pad = opts.pad ?? 0.2,
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
          background: 'linear-gradient(145deg,#FF8A3D,#E8450A)',
          borderRadius: opts.rounded ? size * 0.22 : 0,
        }}
      >
        <svg width={s} height={s} viewBox="0 0 24 24">
          <circle cx="12" cy="13.5" r="8.5" fill="rgba(255,255,255,.5)" />
          <rect x="9.8" y="1.6" width="4.4" height="3.2" rx="1.4" fill="#fff" />
          <path d="M12 5a8.5 8.5 0 0 1 0 17z" fill="#fff" />
          <circle cx="12" cy="13.5" r="2.6" fill="#E8450A" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}

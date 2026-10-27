/* La vista previa del link (LinkedIn, WhatsApp, X): 1200 × 630, el estadio de noche con los andariveles, la marca y la
   frase de la portada. La dibujan app/opengraph-image.tsx y app/twitter-image.tsx (la misma imagen). Los títulos van en
   Archivo angosta e itálica, como en la app: next/og no lee las letras de next/font, así que el archivo está en
   assets/fonts (licencia OFL, al lado); el resto, en Geist, la que trae next/og (al pasarle letras propias hay que
   pasársela también). */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { BRAND_ACC, trackRects } from '@/components/shell/BrandMark';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = 'Lane One: registro y plan de running. Corré con plan.';

const HERO = '#151515',
  INK = '#F2F1ED';

/* al cargar el módulo, como en la guía de Next: así la imagen se arma una vez al compilar */
const archivo = await readFile(join(process.cwd(), 'assets/fonts/Archivo-ExtraCondensedBlackItalic.ttf'));
const geist = await readFile(join(process.cwd(), 'node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf'));

export function ogImage() {
  const title = { fontFamily: 'Archivo', fontStyle: 'italic' as const, fontWeight: 900, textTransform: 'uppercase' as const, lineHeight: 0.86 };
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: HERO, color: INK, padding: '64px 72px', fontFamily: 'Geist' }}>
        {/* los andariveles de fondo, uno en tartán, como en el estadio de la app */}
        <svg width="1400" height="870" viewBox="0 0 900 560" style={{ position: 'absolute', right: -470, top: -150 }}>
          {Array.from({ length: 7 }, (_, k) => {
            const o = 40 + k * 24;
            return <rect key={k} x={o} y={o} width={900 - o * 2} height={560 - o * 2} rx={240 - k * 24} fill="none" stroke={k === 3 ? BRAND_ACC : INK} strokeWidth={k === 3 ? 2 : 1} opacity={k === 3 ? 0.6 : 0.1} />;
          })}
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <svg width="64" height="64" viewBox="0 0 32 32">
              <rect x="1" y="1" width="30" height="30" rx="4" fill={BRAND_ACC} />
              {trackRects()}
            </svg>
            <span style={{ ...title, fontSize: 46, lineHeight: 1 }}>Lane One</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...title, display: 'flex', flexDirection: 'column', fontSize: 176 }}>
              <span>Corré</span>
              <span style={{ display: 'flex' }}>
                con plan<span style={{ color: BRAND_ACC }}>.</span>
              </span>
            </div>
            <div style={{ display: 'flex', marginTop: 34, fontSize: 32, lineHeight: 1.3, color: 'rgba(242, 241, 237, .78)', maxWidth: 900 }}>
              Registro y plan de running: cada salida, la semana hacia tu próxima carrera y cómo venís.
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Geist', data: geist, style: 'normal', weight: 400 },
        { name: 'Archivo', data: archivo, style: 'italic', weight: 900 },
      ],
    },
  );
}

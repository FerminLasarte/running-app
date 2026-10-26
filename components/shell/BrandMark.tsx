/* La marca: la pista vista desde arriba, en blanco sobre tartán, con la línea de llegada. La usan la barra lateral, el
   login y los íconos de la app (lib/appIcon.tsx). Los íconos se dibujan en el servidor, sin las variables de CSS: por eso
   los colores también van acá. */

/** el tartán y la tinta del tema claro (app/styles/tokens.css) */
export const BRAND_ACC = '#DC4520';
const BRAND_INK = '#141414';

/** la pista y la línea de llegada, en una caja de 32 × 32. Es una función y no un componente porque adentro del <svg>
    de los íconos (next/og) solo entran elementos */
export const trackRects = () => [
  <rect key="pista" x="5.5" y="10" width="21" height="12" rx="6" fill="none" stroke="#fff" strokeWidth="2.4" />,
  <rect key="andarivel" x="9.4" y="13.6" width="13.2" height="4.8" rx="2.4" fill="none" stroke="#fff" strokeWidth="1" opacity=".55" />,
  <rect key="llegada" x="11.4" y="7.4" width="1.8" height="6" fill={BRAND_INK} />,
];

export const BrandMark = ({ className = 'mark' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
    <rect x="1" y="1" width="30" height="30" rx="4" fill="var(--acc)" />
    {trackRects()}
  </svg>
);

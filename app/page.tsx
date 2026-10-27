/* La portada, pública (proxy.ts): qué es Lane One y los dos caminos, probar sin cuenta o crear la cuenta. Con sesión, el
   proxy lleva a la semana. La vista previa del link (Open Graph) sale de app/layout.tsx y app/opengraph-image.tsx. */
import type { Metadata } from 'next';
import Portada from '@/components/portada/Portada';

export const metadata: Metadata = { title: { absolute: 'Lane One · Registro y plan de running' } };

export default function Home() {
  return <Portada />;
}

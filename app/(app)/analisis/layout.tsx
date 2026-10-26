import Frame from '@/components/analisis/Frame';

/* Análisis: el encabezado y las pestañas quedan; cada pestaña es una página (Volumen, Ritmo, Forma, Zapatillas) */
export default function AnalisisLayout({ children }: { children: React.ReactNode }) {
  return <Frame>{children}</Frame>;
}

import type { Metadata } from 'next';
import SummaryView from '@/components/views/SummaryView';

export const metadata: Metadata = { title: 'Análisis' };

export default function Page() {
  return <SummaryView />;
}

import '@/app/styles/screens/notfound.css';
import type { Metadata } from 'next';
import { NotFound } from '@/components/notfound/NotFound';

export const metadata: Metadata = { title: 'Te saliste del andarivel' };

export default function Page() {
  return <NotFound />;
}

/* Mini barras de los últimos seis meses (monthSpark, línea 4805 del original). */
import { Spark } from '@/components/ui/glance';
import type { Route } from '@/lib/domain/types';
import { sum, ymd } from '@/lib/domain/util';

export function MonthSpark({ L, f, c }: { L: Route[]; f: (r: Route) => number; c: string }) {
  const now = new Date(),
    a: { v: number; cur: boolean }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1),
      k = ymd(d).slice(0, 7);
    a.push({ v: sum(L.filter((r) => r.date.slice(0, 7) === k).map(f)), cur: i === 0 });
  }
  return <Spark a={a} c={c} />;
}

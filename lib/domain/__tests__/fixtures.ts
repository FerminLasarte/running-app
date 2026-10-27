/* Datos de prueba: sesiones armadas a mano y el estado global cargado con ellas. */
import { vi } from 'vitest';
import { setS } from '@/lib/store';
import { defaultCfg } from '../defaults';
import type { Cfg, Plan, Result, Session, SessionType } from '../types';

let n = 0;
/** una sesión con lo mínimo; `plan` y `result` se completan con lo que falte */
export function sess(type: SessionType, o: { plan?: Partial<Plan> | null; result?: Partial<Result> | null; missed?: boolean } = {}): Session {
  const plan = o.plan ? ({ date: o.plan.date || o.result?.date || '2026-10-01', ...o.plan } as Plan) : null;
  const result = o.result
    ? ({ date: plan?.date || '2026-10-01', distKm: 10, timeSec: 3000, paceSec: 300, ...o.result } as Result)
    : null;
  return { id: 't' + ++n, type, plan, result, missed: !!o.missed, created: 0, updated: 0 };
}

/** carga el estado global que lee el código de dominio (`S`) */
export function load(sessions: Session[], cfg: Partial<Cfg> = {}) {
  setS({ sessions, cfg: { ...defaultCfg(), hrMax: 200, hrSet: true, ...cfg }, routes: [] });
}

/** «hoy» fijo, al mediodía (lejos de los cambios de día) */
export function today(ymd: string) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(ymd + 'T12:00:00'));
}

/** un recorrido codificado como los de Strava (polilínea de Google, 5 decimales) a partir de [lat, lng] */
export function encodePoly(pts: [number, number][]): string {
  let out = '',
    pl = 0,
    pg = 0;
  const enc = (v: number) => {
    let x = v < 0 ? ~(v << 1) : v << 1;
    while (x >= 0x20) {
      out += String.fromCharCode((0x20 | (x & 0x1f)) + 63);
      x >>= 5;
    }
    out += String.fromCharCode(x + 63);
  };
  pts.forEach(([la, lg]) => {
    const a = Math.round(la * 1e5),
      g = Math.round(lg * 1e5);
    enc(a - pl);
    enc(g - pg);
    pl = a;
    pg = g;
  });
  return out;
}

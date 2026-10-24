/* Exportar e importar: planilla CSV y respaldo JSON (el mismo formato que el artifact original, así los respaldos
   hechos en claude.ai se importan acá tal cual). */
import { S } from '@/lib/store';
import type { Plan, Result, Session, SessionType } from './types';
import { isType } from './config';
import { cleanSteps, normSession } from './stages';
import { scoreSession } from './score';
import { sdate } from './stats';
import { newId, num } from './util';

export const HDR = ['id', 'tipo', 'fecha_plan', 'plan_dist_km', 'plan_dur_min', 'plan_ritmo_seg_km', 'plan_fc_min', 'plan_fc_max', 'plan_notas', 'fecha_real', 'dist_km', 'tiempo_seg', 'ritmo_seg_km', 'fc_prom', 'fc_max', 'sensacion', 'molestia', 'clima', 'notas', 'modo_suave', 'no_hecho', 'puntaje', 'etapas_plan', 'etapas_real', 'ritmo_principal_seg_km', 'zapatilla'];

export const csvQ = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export function toCsv() {
  const rows = S.sessions
    .slice()
    .sort((a, b) => sdate(a).localeCompare(sdate(b)))
    .map((s) => {
      const p: Partial<Plan> = s.plan || {},
        r: Partial<Result> = s.result || {},
        sc = scoreSession(s);
      return [s.id, s.type, p.date, p.distKm, p.durMin, p.paceSec, p.hrMin, p.hrMax, p.notes, r.date, r.distKm, r.timeSec, r.paceSec, r.hrAvg, r.hrMax, r.feel, r.date ? (r.pain ? 1 : 0) : '', r.weather, r.notes, r.easy ? 1 : '', s.missed ? 1 : '', sc && sc.score != null ? sc.score : '', p.steps ? JSON.stringify(p.steps) : '', r.stages ? JSON.stringify(r.stages) : '', r.mainPaceSec, r.shoe]
        .map(csvQ)
        .join(',');
    });
  return [HDR.join(',')].concat(rows).join('\n');
}

export function parseCSV(t: string): string[][] {
  t = t.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [],
    cur = '',
    q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cur);
      cur = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

export function rowsToSessions(rows: string[][]): Session[] {
  const h = (rows[0] || []).map((x) => x.trim()),
    ix = (k: string) => h.indexOf(k);
  if (ix('tipo') < 0 || ix('fecha_real') < 0) throw new Error('El CSV no tiene las columnas de este respaldo. Exportá uno desde acá para ver el formato.');
  const g = (r: string[], k: string) => {
      const i = ix(k);
      return i < 0 ? '' : (r[i] || '').trim();
    },
    n = (r: string[], k: string) => {
      const v = num(g(r, k));
      return v == null || isNaN(v) ? null : v;
    };
  return rows
    .slice(1)
    .map((r) => {
      const tp = g(r, 'tipo');
      const s: Session = { id: g(r, 'id') || newId(), type: (isType(tp) ? tp : 'fondo') as SessionType, plan: null, result: null, missed: g(r, 'no_hecho') === '1', created: Date.now(), updated: 0 };
      if (g(r, 'fecha_plan')) {
        const p: Plan = { date: g(r, 'fecha_plan'), type: s.type };
        (
          [
            ['distKm', 'plan_dist_km'],
            ['durMin', 'plan_dur_min'],
            ['paceSec', 'plan_ritmo_seg_km'],
            ['hrMin', 'plan_fc_min'],
            ['hrMax', 'plan_fc_max'],
          ] as const
        ).forEach((a) => {
          const v = n(r, a[1]);
          if (v != null) p[a[0]] = v;
        });
        if (g(r, 'plan_notas')) p.notes = g(r, 'plan_notas');
        try {
          if (g(r, 'etapas_plan')) {
            const st = cleanSteps(JSON.parse(g(r, 'etapas_plan')));
            if (st.length) p.steps = st;
          }
        } catch {
          /* etapas ilegibles: queda el plan sin etapas */
        }
        s.plan = p;
      }
      const dk = n(r, 'dist_km');
      if (g(r, 'fecha_real') && dk != null && dk > 0) {
        // tiempo y ritmo pueden venir vacíos: parseImport descarta lo que no tenga tiempo
        const x = { date: g(r, 'fecha_real'), distKm: dk, timeSec: n(r, 'tiempo_seg'), paceSec: n(r, 'ritmo_seg_km'), feel: n(r, 'sensacion') || 5, pain: g(r, 'molestia') === '1', easy: g(r, 'modo_suave') === '1' } as unknown as Result;
        if (!x.paceSec && x.timeSec) x.paceSec = Math.round(x.timeSec / x.distKm);
        const a = n(r, 'fc_prom'),
          b = n(r, 'fc_max');
        if (a != null) x.hrAvg = a;
        if (b != null) x.hrMax = b;
        if (g(r, 'clima')) x.weather = g(r, 'clima');
        if (g(r, 'notas')) x.notes = g(r, 'notas');
        const mp = n(r, 'ritmo_principal_seg_km');
        if (mp) x.mainPaceSec = mp;
        if (g(r, 'zapatilla')) x.shoe = g(r, 'zapatilla');
        try {
          if (g(r, 'etapas_real')) {
            const st = JSON.parse(g(r, 'etapas_real'));
            if (Array.isArray(st)) x.stages = st;
          }
        } catch {
          /* etapas ilegibles: queda el resultado sin etapas */
        }
        s.result = x;
      }
      return s;
    })
    .filter((s) => s.plan || s.result);
}

export interface Parsed {
  sessions: Session[];
  /** ajustes del respaldo JSON (sin normalizar), o null si no trae */
  cfg: Record<string, unknown> | null;
}

/** Lee un respaldo JSON (`{app:'registro-running', v:1, cfg, sessions}` o una lista de sesiones) o una planilla CSV. */
export function parseImport(text: string): Parsed {
  text = text.trim();
  if (!text) throw new Error('No hay nada para importar.');
  let sessions: Session[],
    cfg: Record<string, unknown> | null = null;
  if (text[0] === '{' || text[0] === '[') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j: any = JSON.parse(text);
    const arr = Array.isArray(j) ? j : j && j.sessions;
    if (!Array.isArray(arr)) throw new Error('El archivo no parece un respaldo de esta app.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessions = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => normSession(x, x.id || newId()));
    cfg = !Array.isArray(j) && j.cfg && typeof j.cfg === 'object' && !Array.isArray(j.cfg) ? j.cfg : null;
  } else sessions = rowsToSessions(parseCSV(text));
  const okD = (d: string | undefined) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
  sessions = sessions.filter((s) => (s.plan ? okD(s.plan.date) : true) && (s.result ? okD(s.result.date) && s.result.distKm > 0 && s.result.timeSec > 0 : true) && (s.plan || s.result));
  if (!sessions.length) throw new Error('No encontré sesiones válidas en ese texto.');
  return { sessions, cfg };
}

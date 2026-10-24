'use client';
/* Ajustes (viewSettings). Como en el original, cada campo se guarda solo al terminar de editarlo (el `change`:
   al salir del campo, o al instante en fechas, horas y casillas) y readSettings valida todo junto. */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { S, setUi, useS } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { afterPaint, blockDemo, buzz, saveCfg, toast } from '@/lib/data/actions';
import { doExport } from '@/lib/data/backup';
import type { Cfg, Race } from '@/lib/domain/types';
import { RACE_PRESETS, ZN, activeShoes, nextRace, normCfg, normRace, normShoe, zoneRange } from '@/lib/domain/config';
import { addDays, cleanObj, fmt, num, todayS, ymd } from '@/lib/domain/util';
import { raceDateLabel } from '@/lib/domain/week';
import { shoeKm } from '@/lib/domain/shoes';
import { ShoeMeter } from '@/components/summary/ShoeMeter';
import { HmsInput } from '@/components/ui/fields';
import { hmsFromSec, readHms, type Hms } from '@/lib/domain/hms';
import { stravaConnect, stravaStatus } from '@/lib/strava/client';
import { signOut } from '@/lib/auth/client';
import { toggleTheme } from '@/components/shell/Header';
import { GlassControl } from '@/components/shell/GlassControl';

/* ---- borrador de los campos ---- */
interface RaceDraft {
  name: string;
  km: string;
  date: string;
  time: string;
  place: string;
  start: string;
  lt: boolean;
  tgt: Hms;
  res: Hms;
}
interface ShoeDraft {
  name: string;
  start: string;
  lim: string;
}
interface Draft {
  hrMax: string;
  zones: [string, string][] | null;
  goal: string;
  age: string;
  since: string;
  races: RaceDraft[];
  shoes: ShoeDraft[];
}

const draftOf = (c: Cfg): Draft => ({
  hrMax: String(c.hrMax),
  zones: c.zones ? c.zones.map((z) => [String(z[0]), String(z[1])] as [string, string]) : null,
  goal: String(c.weeklyGoal),
  age: c.age ? String(c.age) : '',
  since: c.since || '',
  races: c.races.map((r) => ({ name: r.name, km: fmt(r.km, 4), date: r.date, time: r.time || '', place: r.place || '', start: r.planStart || '', lt: !!r.lt, tgt: hmsFromSec(r.targetSec || 0), res: hmsFromSec(r.resultSec || 0) })),
  shoes: (c.shoes || []).map((z) => ({ name: z.name, start: fmt(z.startKm, 1), lim: fmt(z.limitKm, 0) })),
});

const inR = (v: number | null, a: number, b: number): v is number => v != null && v >= a && v <= b;
/** número del campo; vacío cuenta como inválido (NaN) */
const nn = (v: string) => {
  const x = num(v);
  return x == null ? NaN : x;
};

/* la carrera ya pasó: muestra «tu tiempo» en vez del objetivo y el inicio del plan */
const isPast = (r: Race) => r.date < todayS();

function readSettings(d: Draft) {
  if (blockDemo()) return;
  const c = cleanObj(S.cfg);
  const hm = num(d.hrMax);
  if (inR(hm, 150, 230)) c.hrMax = Math.round(hm);
  const bad: string[] = [];
  if (c.zones && d.zones) {
    const z = d.zones.map((q) => [nn(q[0]), nn(q[1])]);
    const ok = z.every((q, i) => q[0] >= 40 && q[1] <= 240 && q[0] < q[1] && (i === 0 || q[0] >= z[i - 1][0]));
    if (ok) c.zones = z.map((q) => [Math.round(q[0]), Math.round(q[1])] as [number, number]);
    else bad.push('las zonas (cada una con desde menor que hasta, en orden)');
  }
  const g = num(d.goal);
  if (inR(g, 1, 7)) c.weeklyGoal = Math.round(g);
  const ag = num(d.age);
  if (inR(ag, 14, 80)) c.age = Math.round(ag);
  if (d.since) c.since = d.since;
  c.races.forEach((r, i) => {
    const v = d.races[i];
    if (!v) return;
    const past = isPast(S.cfg.races[i]);
    r.name = v.name.trim() || r.name;
    const km = num(v.km.trim());
    if (km != null) {
      if (km >= 0.4 && km <= 250) r.km = km;
      else bad.push(r.name + ': la distancia');
    }
    if (v.date.trim()) r.date = v.date.trim();
    const tm = v.time.trim();
    r.time = /^\d{1,2}:\d{2}$/.test(tm) ? tm : '';
    r.place = v.place.trim();
    if (!past) {
      r.planStart = v.start.trim();
      r.lt = v.lt;
      const t = readHms(v.tgt);
      if (t === null) r.targetSec = 0;
      else if (t > 0) r.targetSec = Math.round(t);
      else bad.push(r.name + ': el tiempo objetivo');
    } else {
      const t = readHms(v.res);
      if (t === null) delete r.resultSec;
      else if (t > 0) r.resultSec = Math.round(t);
      else bad.push(r.name + ': tu tiempo');
    }
  });
  (c.shoes || []).forEach((z, i) => {
    const v = d.shoes[i];
    if (!v) return;
    z.name = v.name.trim() || z.name;
    const a = num(v.start.trim());
    if (a != null) {
      if (a >= 0 && a <= 5000) z.startKm = a;
      else bad.push(z.name + ': los km que ya tenían');
    }
    const l = num(v.lim.trim());
    if (l != null) {
      if (l >= 100 && l <= 3000) z.limitKm = l;
      else bad.push(z.name + ': el límite (100 a 3000 km)');
    }
  });
  saveCfg(normCfg(c));
  toast(bad.length ? 'Guardé el resto. Revisá ' + bad.join(', ') + '.' : 'Ajustes guardados', bad.length ? 5000 : 3000);
}

/* después de agregar una carrera o un par de zapatillas: lleva al nombre para escribirlo */
const focusName = (id: string) =>
  afterPaint(() => {
    const e = document.getElementById(id) as HTMLInputElement | null;
    if (!e) return;
    e.scrollIntoView({ block: 'center' });
    e.focus();
    e.select();
  });

/* ---- acciones ---- */
function raceAdd() {
  if (blockDemo()) return;
  const c = cleanObj(S.cfg),
    r = normRace({ name: 'Nueva carrera', km: 10, date: ymd(addDays(new Date(), 90)) }, c);
  c.races.push(r);
  const n = normCfg(c);
  setUi('raceDel', null);
  saveCfg(n);
  focusName('st-r' + n.races.findIndex((x) => x.id === r.id) + '-name');
}
function raceDelDo(id: string) {
  if (blockDemo()) return;
  const c = cleanObj(S.cfg);
  c.races = c.races.filter((r) => r.id !== id);
  if (c.rcs) delete c.rcs[id];
  setUi('raceDel', null);
  saveCfg(normCfg(c));
  toast('Carrera borrada');
}
function shoeAdd() {
  if (blockDemo()) return;
  const c = cleanObj(S.cfg),
    z = normShoe({ name: 'Zapatillas nuevas', main: !activeShoes().length });
  c.shoes = (c.shoes || []).concat([z]);
  const n = normCfg(c);
  saveCfg(n);
  focusName('st-sh' + n.shoes.findIndex((x) => x.id === z.id) + '-name');
}
function shoeMain(id: string) {
  if (blockDemo()) return;
  const c = cleanObj(S.cfg);
  c.shoes.forEach((z) => {
    z.main = z.id === id;
  });
  saveCfg(normCfg(c));
}
function shoeRet(id: string) {
  if (blockDemo()) return;
  const c = cleanObj(S.cfg),
    z = c.shoes.find((x) => x.id === id);
  if (z) {
    z.retired = !z.retired;
    if (z.retired) z.main = false;
  }
  saveCfg(normCfg(c));
}
function zmode(v: 'pct' | 'custom') {
  if (blockDemo()) return;
  const c = cleanObj(S.cfg);
  c.zones = v === 'custom' ? c.zones || [0, 1, 2, 3, 4].map((i) => zoneRange(i)) : null;
  saveCfg(normCfg(c));
}
function avatarDel() {
  if (blockDemo()) return;
  const cf = cleanObj(S.cfg);
  delete cf.avatar;
  saveCfg(normCfg(cf));
  toast('Volvió el logo de la app');
}
function setAvatar(file: File) {
  if (blockDemo()) return;
  if (!/^image\//.test(file.type || '')) {
    toast('Elegí una imagen (JPG, PNG o HEIC)');
    return;
  }
  const url = URL.createObjectURL(file),
    im = new Image();
  im.onload = () => {
    /* recorte cuadrado al centro, 256 px: pesa poco y se ve nítida en cualquier pantalla */
    const n = 256,
      cv = document.createElement('canvas');
    cv.width = cv.height = n;
    const x = cv.getContext('2d')!;
    const sd = Math.min(im.naturalWidth, im.naturalHeight),
      sx = (im.naturalWidth - sd) / 2,
      sy = (im.naturalHeight - sd) / 2;
    x.imageSmoothingQuality = 'high';
    x.drawImage(im, sx, sy, sd, sd, 0, 0, n, n);
    URL.revokeObjectURL(url);
    const cf = cleanObj(S.cfg);
    cf.avatar = cv.toDataURL('image/jpeg', 0.86);
    saveCfg(normCfg(cf));
    buzz(8);
    toast('Listo, ya está tu foto');
  };
  im.onerror = () => {
    URL.revokeObjectURL(url);
    toast('No pude abrir esa imagen. Probá con otra (JPG o PNG).');
  };
  im.src = url;
}
function openImport() {
  if (blockDemo()) return;
  openSheet('import');
}

/* ---- tarjetas nuevas de la versión web ---- */
function StravaCard() {
  const [st, setSt] = useState<Awaited<ReturnType<typeof stravaStatus>> | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    stravaStatus().then((v) => {
      if (live) setSt(v);
    });
    return () => {
      live = false;
    };
  }, []);
  async function disconnect() {
    setBusy(true);
    try {
      const r = await fetch('/api/strava/disconnect', { method: 'POST' });
      if (!r.ok) throw new Error(String(r.status));
      setSt({ connected: false });
      toast('Strava desconectado');
    } catch {
      toast('No pude desconectar Strava. Probá de nuevo.');
    }
    setBusy(false);
  }
  return (
    <section className="card">
      <div className="h3">Strava</div>
      <p>Conectá tu cuenta para traer tus salidas, los parciales de cada vuelta y los recorridos del mapa.</p>
      <p className="sub">
        {st == null
          ? 'Revisando la conexión…'
          : st.configured === false
            ? 'La conexión con Strava todavía no está configurada en el servidor.'
            : st.connected
              ? 'Conectado' + (st.athlete ? ' como ' + st.athlete : '') + '.'
              : 'Sin conectar.'}
      </p>
      <div style={{ marginTop: 12 }}>
        {st && st.connected ? (
          <button className="btn blk" onClick={disconnect} disabled={busy}>
            Desconectar
          </button>
        ) : (
          <button className="btn pri blk" onClick={() => stravaConnect()} disabled={st == null || st.configured === false}>
            Conectar con Strava
          </button>
        )}
      </div>
    </section>
  );
}

function AccountCard({ email }: { email: string | null }) {
  return (
    <section className="card">
      <div className="h3">Cuenta</div>
      <p>{email ? 'Entraste como ' + email + '.' : 'No hay una sesión iniciada.'}</p>
      {email ? (
        <div style={{ marginTop: 12 }}>
          <button className="btn blk" onClick={() => signOut()}>
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </section>
  );
}

/* ---- vista ---- */
export default function SettingsView() {
  const st = useS(),
    c = st.cfg,
    raceDel = st.ui.raceDel as string | null | undefined;

  /* el borrador sigue a la configuración guardada (como el render() del original después de cada saveCfg) */
  const [draft, setDraft] = useState(() => draftOf(c));
  const [base, setBase] = useState(c);
  if (base !== c) {
    setBase(c);
    setDraft(draftOf(c));
  }
  const dirty = useRef(false);
  const [photoKey, setPhotoKey] = useState(0);

  /** cambio en un campo de texto: se guarda al salir del campo */
  const edit = (fn: (d: Draft) => Draft) => {
    dirty.current = true;
    setDraft(fn);
  };
  /** cambio que se guarda en el acto (fecha, hora, casilla, distancia elegida con un chip) */
  const commitNow = (fn: (d: Draft) => Draft) => {
    const n = fn(draft);
    dirty.current = false;
    setDraft(n);
    readSettings(n);
  };
  const flush = () => {
    if (!dirty.current) return;
    dirty.current = false;
    readSettings(draft);
  };

  const setRace = (i: number, patch: Partial<RaceDraft>) => (d: Draft) => ({ ...d, races: d.races.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const setShoe = (i: number, patch: Partial<ShoeDraft>) => (d: Draft) => ({ ...d, shoes: d.shoes.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const setZone = (i: number, k: 0 | 1, v: string) => (d: Draft) => ({ ...d, zones: d.zones ? d.zones.map((z, j) => (j === i ? ((k === 0 ? [v, z[1]] : [z[0], v]) as [string, string]) : z)) : null });

  const nx = nextRace();
  const races: ReactNode[] = c.races.map((r, i) => {
    const v = draft.races[i];
    if (!v) return null;
    const past = isPast(r),
      p = 'st-r' + i;
    return (
      <div className="lrow" style={{ '--kc2': past ? 'var(--base)' : 'var(--c1)', marginTop: 14 } as CSSProperties} key={r.id}>
        <div className="lhd">
          <div>
            <b>{r.name}</b>
            <small>{raceDateLabel(r) + (past ? ' · ya fue' : nx && r.id === nx.id ? ' · próxima' : '')}</small>
          </div>
          {raceDel === r.id ? (
            <div className="chips">
              <button className="chip s" data-a="race-del-do" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => raceDelDo(r.id)}>
                Sí, borrar
              </button>
              <button className="chip s" data-a="race-del-no" onClick={() => setUi('raceDel', null)}>
                No
              </button>
            </div>
          ) : (
            <button className="chip s" data-a="race-del" onClick={() => setUi('raceDel', r.id)}>
              Borrar
            </button>
          )}
        </div>
        <div className="field">
          <label htmlFor={p + '-name'}>Nombre</label>
          <input className="in l" id={p + '-name'} value={v.name} maxLength={40} onChange={(e) => edit(setRace(i, { name: e.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor={p + '-km'}>Distancia (km)</label>
          <input className="in" id={p + '-km'} inputMode="decimal" value={v.km} onChange={(e) => edit(setRace(i, { km: e.target.value }))} />
          <div className="chips">
            {RACE_PRESETS.map((q) => (
              <button className="chip s" data-a="rkm" aria-pressed={Math.abs(r.km - q[0]) < 0.01} key={q[1]} onClick={() => commitNow(setRace(i, { km: fmt(q[0], 4) }))}>
                {q[1]}
              </button>
            ))}
          </div>
        </div>
        <div className="g2">
          <div className="field">
            <label htmlFor={p + '-date'}>Fecha</label>
            <input className="in" type="date" id={p + '-date'} value={v.date} onChange={(e) => commitNow(setRace(i, { date: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor={p + '-time'}>Hora de largada</label>
            <input className="in" type="time" id={p + '-time'} value={v.time} onChange={(e) => commitNow(setRace(i, { time: e.target.value }))} />
          </div>
        </div>
        <div className="field">
          <label htmlFor={p + '-place'}>Lugar (opcional)</label>
          <input className="in l" id={p + '-place'} value={v.place} maxLength={60} onChange={(e) => edit(setRace(i, { place: e.target.value }))} />
        </div>
        {past ? (
          <div className="field">
            <span className="lab">Tu tiempo en la carrera</span>
            <HmsInput id={p + '-res'} value={v.res} onChange={(h) => edit(setRace(i, { res: h }))} />
            <span className="hint">Queda guardado como marca en Carrera.</span>
          </div>
        ) : (
          <>
            <div className="field">
              <span className="lab">Tiempo objetivo (opcional)</span>
              <HmsInput id={p} value={v.tgt} onChange={(h) => edit(setRace(i, { tgt: h }))} />
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', minHeight: 44, textTransform: 'none', letterSpacing: 0, fontSize: 15, fontWeight: 500, color: 'var(--ink2)' }}>
                <input type="checkbox" id={p + '-lt'} checked={v.lt} style={{ width: 22, height: 22, accentColor: 'var(--c1)' }} onChange={(e) => commitNow(setRace(i, { lt: e.target.checked }))} />
                El objetivo es bajar de ese tiempo
              </label>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor={p + '-start'}>Inicio del plan para esta carrera (opcional)</label>
              <input className="in" type="date" id={p + '-start'} value={v.start} onChange={(e) => commitNow(setRace(i, { start: e.target.value }))} />
              <span className="hint">Con esto aparece la barra de semanas del plan en Semana.</span>
            </div>
          </>
        )}
      </div>
    );
  });

  const shoes = (c.shoes || []).map((z, i) => {
    const v = draft.shoes[i];
    if (!v) return null;
    const p = 'st-sh' + i;
    return (
      <div className={'lrow' + (z.retired ? ' off' : '')} style={{ '--kc2': z.retired ? 'var(--base)' : 'var(--c1)', marginTop: 14 } as CSSProperties} key={z.id}>
        <div className="lhd">
          <div>
            <b>{z.name}</b>
            <small>{fmt(shoeKm(z), 0) + ' km' + (z.retired ? ' · retiradas' : z.main ? ' · principal' : '')}</small>
          </div>
          <div className="chips">
            {z.retired ? null : (
              <button className="chip s" data-a="shoe-main" aria-pressed={!!z.main} onClick={() => shoeMain(z.id)}>
                Principal
              </button>
            )}
            <button className="chip s" data-a="shoe-ret" onClick={() => shoeRet(z.id)}>
              {z.retired ? 'Volver a usar' : 'Retirar'}
            </button>
          </div>
        </div>
        <div className="field">
          <label htmlFor={p + '-name'}>Nombre</label>
          <input className="in l" id={p + '-name'} value={v.name} maxLength={40} onChange={(e) => edit(setShoe(i, { name: e.target.value }))} />
        </div>
        <div className="g2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor={p + '-start'}>Km que ya tenían</label>
            <input className="in" id={p + '-start'} inputMode="decimal" value={v.start} onChange={(e) => edit(setShoe(i, { start: e.target.value }))} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor={p + '-lim'}>Cambiarlas a los</label>
            <input className="in" id={p + '-lim'} inputMode="numeric" value={v.lim} onChange={(e) => edit(setShoe(i, { lim: e.target.value }))} />
          </div>
        </div>
        {z.retired ? null : <ShoeMeter z={z} />}
      </div>
    );
  });

  return (
    // los campos de texto se guardan al salir de ellos (o con Enter), como el `change` del original
    <div
      className="set-cols"
      onBlur={flush}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') flush();
      }}
    >
      <section className="card av-card">
        <div className="h3">Tu foto</div>
        <div className="av-row">
          <span className={'av-prev' + (c.avatar ? ' has' : '')}>
            {c.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="av-img" src={c.avatar} alt="Tu foto" />
            ) : (
              <svg viewBox="0 0 256 256" aria-hidden="true">
                <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" />
              </svg>
            )}
          </span>
          <div className="av-tx">
            <p>Aparece arriba, en lugar del logo de la app.</p>
            <div className="av-acts">
              <label className="btn sm pri" htmlFor="st-photo">
                {c.avatar ? 'Cambiar foto' : 'Elegir foto'}
              </label>
              {c.avatar ? (
                <button className="btn sm" data-a="avatar-del" onClick={avatarDel}>
                  Quitar
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <input
          type="file"
          id="st-photo"
          accept="image/*"
          hidden
          key={photoKey}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            // se vuelve a montar vacío, así elegir la misma foto otra vez también dispara el cambio
            setPhotoKey((k) => k + 1);
            if (f) setAvatar(f);
          }}
        />
      </section>
      <AccountCard email={st.email} />
      <section className="card">
        <div className="h3">Guardado</div>
        <p>{st.mode === 'cloud' ? 'Tus datos se guardan en tu cuenta. No se pierden al cerrar el navegador ni al cambiar de celular.' : 'Tus datos se guardan solo en este navegador. Puede borrarse si limpiás los datos del sitio, así que usá el respaldo de abajo seguido.'}</p>
      </section>
      <StravaCard />
      <section className="card">
        <div className="h3">Apariencia</div>
        <p>Claro u oscuro. Por defecto sigue al de tu teléfono.</p>
        <div style={{ marginTop: 12 }}>
          <button className="btn blk" data-a="theme" onClick={toggleTheme}>
            Cambiar entre claro y oscuro
          </button>
        </div>
        <GlassControl />
      </section>
      <section className="card">
        <div className="h3">Frecuencia cardíaca</div>
        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor="st-hrmax">FC máxima (lpm)</label>
          <input className="in" id="st-hrmax" inputMode="numeric" value={draft.hrMax} onChange={(e) => edit((d) => ({ ...d, hrMax: e.target.value }))} />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <span className="lab">Zonas</span>
          <div className="seg">
            <button className="chip" data-a="zmode" aria-pressed={!c.zones} onClick={() => zmode('pct')}>
              Por % de la FC máx.
            </button>
            <button className="chip" data-a="zmode" aria-pressed={!!c.zones} onClick={() => zmode('custom')}>
              Las cargo a mano
            </button>
          </div>
        </div>
        {c.zones && draft.zones ? (
          <>
            <div className="laph" style={{ gridTemplateColumns: '60px 1fr 1fr' }}>
              <span></span>
              <span>desde</span>
              <span>hasta</span>
            </div>
            {ZN.map((z, i) => (
              <div className="lap" style={{ gridTemplateColumns: '60px 1fr 1fr' }} key={z[0]}>
                <b title={z[1]}>{z[0]}</b>
                <input className="in" id={'st-z' + i + '-lo'} inputMode="numeric" aria-label={z[0] + ' desde'} value={draft.zones![i][0]} onChange={(e) => edit(setZone(i, 0, e.target.value))} />
                <input className="in" id={'st-z' + i + '-hi'} inputMode="numeric" aria-label={z[0] + ' hasta'} value={draft.zones![i][1]} onChange={(e) => edit(setZone(i, 1, e.target.value))} />
              </div>
            ))}
            <p className="sub" style={{ marginTop: 6 }}>
              Usá las zonas que te da tu entrenador o tu reloj. La app las usa para leer capturas y en las tarjetas de intensidad; cada sesión se evalúa con su propio rango planificado.
            </p>
          </>
        ) : (
          <>
            <table className="zt">
              <tbody>
                {ZN.map((z, i) => {
                  const r = zoneRange(i);
                  return (
                    <tr key={z[0]}>
                      <td>
                        <b>{z[0]}</b>
                      </td>
                      <td>{z[1]}</td>
                      <td style={{ textAlign: 'right' }}>{r[0] + '–' + r[1] + ' lpm'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="sub">Zonas como porcentaje de tu FC máxima. Si tu entrenador o tu reloj usan otras, elegí «Las cargo a mano».</p>
          </>
        )}
      </section>
      <section className="card">
        <div className="h3">Tu perfil (para el Test de nivel)</div>
        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor="st-age">Edad</label>
          <input className="in" id="st-age" inputMode="numeric" value={draft.age} onChange={(e) => edit((d) => ({ ...d, age: e.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="st-since">Corriendo desde</label>
          <input className="in" type="date" id="st-since" value={draft.since} onChange={(e) => commitNow((d) => ({ ...d, since: e.target.value }))} />
        </div>
        <p className="sub">Con esto comparo tu nivel con corredores de tu edad y de tu mismo tiempo de práctica.</p>
      </section>
      <section className="card" id="st-races">
        <div className="h3">Mis carreras</div>
        <p className="sub">La app trabaja siempre con la próxima carrera: cuando pasa una, sigue sola con la siguiente.</p>
        {races}
        <button className="btn blk" style={{ marginTop: 14 }} data-a="race-add" onClick={raceAdd}>
          + Agregar carrera
        </button>
        <div className="field" style={{ marginTop: 20 }}>
          <label htmlFor="st-goal">Entrenamientos por semana (para la racha)</label>
          <input className="in" id="st-goal" inputMode="numeric" value={draft.goal} onChange={(e) => edit((d) => ({ ...d, goal: e.target.value }))} />
        </div>
      </section>
      <section className="card" id="st-shoes">
        <div className="h3">Zapatillas</div>
        <p className="sub">La principal se elige sola al cargar cada salida; podés cambiarla ahí.</p>
        {shoes}
        <button className="btn blk" style={{ marginTop: 14 }} data-a="shoe-add" onClick={shoeAdd}>
          + Agregar zapatillas
        </button>
      </section>
      <section className="card">
        <div className="h3">Respaldo</div>
        <p>Descargá una copia de todo y guardala en tu celular o en la nube. Con el archivo JSON podés recuperar todo después.</p>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <button className="btn" data-a="exp" onClick={() => doExport('json')}>
            Exportar respaldo (JSON)
          </button>
          <button className="btn" data-a="exp" onClick={() => doExport('csv')}>
            Exportar planilla (CSV)
          </button>
          <button className="btn" data-a="imp" onClick={openImport}>
            Importar archivo o texto
          </button>
        </div>
      </section>
    </div>
  );
}

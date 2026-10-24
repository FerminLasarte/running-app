'use client';
/* Entrar con link mágico (por mail) o con contraseña. No hay registro abierto: la cuenta se crea con el primer link. */
import { useEffect, useLayoutEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { supabaseConfigured } from '@/lib/supabase/env';
import { pillInit, pillSync } from '@/components/shell/pill';

type Mode = 'link' | 'pass';

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>('link');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const e0 = useSearchParams().get('e');
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(
    e0 === 'link' ? { t: 'El link venció o ya se usó. Pedí uno nuevo.', bad: true } : e0 === 'denied' ? { t: 'Esta cuenta no tiene acceso a la app.', bad: true } : null,
  );

  /* la gota de vidrio del selector, como en la app */
  useEffect(() => pillInit(), []);
  useLayoutEffect(() => pillSync(), [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setMsg({ t: 'Revisá el mail.', bad: true });
    if (!supabaseConfigured()) return setMsg({ t: 'Falta configurar Supabase (variables de entorno).', bad: true });
    setBusy(true);
    setMsg(null);
    const sb = supabaseBrowser();
    if (mode === 'link') {
      const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin + '/auth/callback' } });
      setMsg(error ? { t: 'No pude mandar el link: ' + error.message, bad: true } : { t: 'Listo: te mandé un link a ' + email.trim() + '. Abrilo desde este mismo dispositivo.' });
    } else {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pass });
      if (error) setMsg({ t: error.message === 'Invalid login credentials' ? 'Mail o contraseña incorrectos.' : error.message, bad: true });
      // recarga completa: el proxy tiene que ver la cookie de sesión nueva
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      else window.location.href = '/';
    }
    setBusy(false);
  }

  return (
    <form className="login-card glass" onSubmit={submit}>
      <div className="login-brand">
        <span className="mk-logo">
          <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="b" cx="12" cy="13.5" r="8.5" />
            <rect className="f" x="9.8" y="1.6" width="4.4" height="3.2" rx="1.4" />
            <path className="f" d="M12 5a8.5 8.5 0 0 1 0 17z" />
            <circle className="h" cx="12" cy="13.5" r="2.6" />
          </svg>
        </span>
        <div>
          <b>My Running App</b>
          <span>Registro y progreso</span>
        </div>
      </div>
      <div className="seg subtabs" role="tablist" aria-label="Forma de entrar">
        <button type="button" className="chip" aria-pressed={mode === 'link'} onClick={() => setMode('link')}>
          Link por mail
        </button>
        <button type="button" className="chip" aria-pressed={mode === 'pass'} onClick={() => setMode('pass')}>
          Contraseña
        </button>
      </div>
      <div className="field">
        <label htmlFor="lg-email">Mail</label>
        <input className="in l" id="lg-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {mode === 'pass' ? (
        <div className="field">
          <label htmlFor="lg-pass">Contraseña</label>
          <input className="in l" id="lg-pass" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
          <p className="hint">¿No tenés o te la olvidaste? Entrá con el link por mail y creala en Ajustes → Cuenta.</p>
        </div>
      ) : (
        <p className="hint">Te llega un link al mail y entrás con un toque, sin contraseña.</p>
      )}
      <button className="btn pri blk" disabled={busy}>
        {busy ? 'Un momento…' : mode === 'link' ? 'Mandarme el link' : 'Entrar'}
      </button>
      <p className={'hint login-msg' + (msg?.bad ? ' bad' : '')} role="status">
        {msg?.t}
      </p>
    </form>
  );
}

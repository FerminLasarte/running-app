'use client';
/* Entrar o crear la cuenta: con Google (si está prendido) o con mail y contraseña, sin mandar mails. «Olvidé mi
   contraseña» manda uno, así que solo está con un SMTP propio; sin eso, el login dice a quién escribirle. */
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AUTH_EMAIL, AUTH_GOOGLE, supabaseConfigured } from '@/lib/supabase/env';
import { passErr, PASS_MIN, sendReset, signIn, signInGoogle, signUp } from '@/lib/auth/client';
import { BrandMark } from '@/components/shell/BrandMark';
import { Button } from '@/components/pista/controls';
import { Field, Input } from '@/components/pista/fields';
import { BrandTitle } from '@/components/pista/structure';

type Mode = 'in' | 'up' | 'reset';
const MAIL = 'fermin.lasarte@icloud.com';
const TITLE: Record<Mode, string> = { in: 'Entrar', up: 'Crear cuenta', reset: 'Contraseña nueva' };
const E0: Record<string, string> = {
  link: 'No pude completar la entrada: el link venció o se canceló. Probá de nuevo.',
  denied: 'Esta cuenta no tiene acceso a la app.',
};

/** la «G» de Google en sus colores, como piden sus pautas para el botón */
const GoogleG = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export default function LoginForm() {
  const sp = useSearchParams();
  const [mode, setMode] = useState<Mode>(sp.get('modo') === 'crear' ? 'up' : 'in');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const e0 = sp.get('e');
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(e0 && E0[e0] ? { t: E0[e0], bad: true } : null);

  /* cambiar entre entrar y crear la cuenta deja el mail escrito; la dirección sigue al modo (para compartir el link) */
  function go(m: Mode) {
    setMode(m);
    setMsg(null);
    window.history.replaceState(null, '', m === 'up' ? '/login?modo=crear' : '/login');
  }

  async function run(fn: () => Promise<{ t: string; bad?: boolean } | void>) {
    if (!supabaseConfigured()) return setMsg({ t: 'Falta configurar Supabase (variables de entorno).', bad: true });
    setBusy(true);
    setMsg(null);
    const r = await fn();
    /* si entró, la página ya se está yendo: el botón queda en «Un momento…» */
    if (r) {
      setMsg(r);
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const m = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(m)) return setMsg({ t: 'Revisá el mail.', bad: true });
    if (mode === 'reset') return run(async () => sendReset(m).then((r) => ({ t: r.msg, bad: !r.ok })));
    if (mode === 'up' && passErr(pass)) return setMsg({ t: passErr(pass), bad: true });
    if (!pass) return setMsg({ t: 'Escribí tu contraseña.', bad: true });
    return run(async () => {
      if (mode === 'in') {
        const err = await signIn(m, pass);
        if (err) return { t: err, bad: true };
      } else {
        const r = await signUp(m, pass);
        if (r) return { t: r.msg, bad: !r.sent };
      }
    });
  }

  const google = () =>
    run(async () => {
      const err = await signInGoogle();
      if (err) return { t: err, bad: true };
    });

  return (
    <form className="login-card" onSubmit={submit} noValidate>
      <Link className="brand" href="/">
        <BrandMark />
        <span>
          <b>Lane One</b>
          <small>Registro y progreso</small>
        </span>
      </Link>
      <BrandTitle>{TITLE[mode]}</BrandTitle>
      {mode === 'up' ? <p className="login-hint">Gratis. Arrancás de cero: cargás tus salidas, tu próxima carrera y tu FC.</p> : null}
      {mode === 'reset' ? <p className="login-hint">Te mando un link al mail para poner una contraseña nueva.</p> : null}
      {AUTH_GOOGLE && mode !== 'reset' ? (
        <>
          <Button size="lg" className="login-google" disabled={busy} onClick={google}>
            <GoogleG />
            Continuar con Google
          </Button>
          <p className="login-or" aria-hidden="true">
            <span>o con tu mail</span>
          </p>
        </>
      ) : null}
      <Field id="lg-email" label="Mail">
        <Input id="lg-email" type="email" autoComplete={mode === 'up' ? 'email' : 'username'} inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      {mode !== 'reset' ? (
        <Field id="lg-pass" label="Contraseña" help={mode === 'up' ? PASS_MIN + ' caracteres o más.' : undefined}>
          <Input id="lg-pass" type="password" autoComplete={mode === 'up' ? 'new-password' : 'current-password'} hasHelp={mode === 'up'} value={pass} onChange={(e) => setPass(e.target.value)} />
        </Field>
      ) : null}
      <Button type="submit" variant="pri" size="lg" disabled={busy}>
        {busy ? 'Un momento…' : mode === 'in' ? 'Entrar' : mode === 'up' ? 'Crear cuenta' : 'Mandarme el link'}
      </Button>
      <p className={'login-msg' + (msg?.bad ? ' bad' : '')} role="status">
        {msg?.t}
      </p>
      {mode === 'in' ? (
        AUTH_EMAIL ? (
          <button type="button" className="login-link" onClick={() => go('reset')}>
            Olvidé mi contraseña
          </button>
        ) : (
          <p className="login-hint">
            ¿No te acordás la contraseña? {AUTH_GOOGLE ? 'Entrá con Google si usás el mismo mail, o escribile' : 'Escribile'} a{' '}
            <a href={'mailto:' + MAIL}>{MAIL}</a>.
          </p>
        )
      ) : null}
      <p className="login-sw">
        {mode === 'up' ? '¿Ya tenés cuenta?' : mode === 'in' ? '¿Todavía no tenés cuenta?' : '¿Te acordaste?'}{' '}
        <button type="button" className="login-link" onClick={() => go(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Creala' : 'Entrá'}
        </button>
      </p>
      <p className="login-hint">
        Al {mode === 'up' ? 'crear la cuenta' : 'entrar'} aceptás las <Link href="/privacidad">condiciones de uso y la política de privacidad</Link>.
      </p>
    </form>
  );
}

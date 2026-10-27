'use client';
/* Entrar con mail y contraseña. La app es para dos personas: las cuentas se crean en Supabase (README) y no hay alta
   desde acá. Quien no se acuerda la contraseña le escribe al responsable, que la cambia desde Supabase. */
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabaseConfigured } from '@/lib/supabase/env';
import { signIn } from '@/lib/auth/client';
import { BrandMark } from '@/components/shell/BrandMark';
import { Button } from '@/components/pista/controls';
import { Field, Input } from '@/components/pista/fields';
import { BrandTitle } from '@/components/pista/structure';

const MAIL = 'fermin.lasarte@icloud.com';
const E0: Record<string, string> = {
  denied: 'Esta cuenta no tiene acceso a la app.',
};

export default function LoginForm() {
  const sp = useSearchParams();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const e0 = sp.get('e');
  const [msg, setMsg] = useState<string | null>(e0 && E0[e0] ? E0[e0] : null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const m = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(m)) return setMsg('Revisá el mail.');
    if (!pass) return setMsg('Escribí tu contraseña.');
    if (!supabaseConfigured()) return setMsg('Falta configurar Supabase (variables de entorno).');
    setBusy(true);
    setMsg(null);
    const err = await signIn(m, pass);
    /* si entró, la página ya se está yendo: el botón queda en «Un momento…» */
    if (err) {
      setMsg(err);
      setBusy(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit} noValidate>
      <Link className="brand" href="/">
        <BrandMark />
        <span>
          <b>Lane One</b>
          <small>Registro y progreso</small>
        </span>
      </Link>
      <BrandTitle>Entrar</BrandTitle>
      <Field id="lg-email" label="Mail">
        <Input id="lg-email" type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field id="lg-pass" label="Contraseña">
        <Input id="lg-pass" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
      </Field>
      <Button type="submit" variant="pri" size="lg" disabled={busy}>
        {busy ? 'Un momento…' : 'Entrar'}
      </Button>
      <p className="login-msg bad" role="status">
        {msg}
      </p>
      <p className="login-hint">
        ¿No te acordás la contraseña? Escribile a <a href={'mailto:' + MAIL}>{MAIL}</a>.
      </p>
      <p className="login-sw">
        ¿Querés ver cómo es? <Link href="/">Probala con datos de ejemplo</Link>.
      </p>
    </form>
  );
}

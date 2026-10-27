'use client';
/* Entrar con link mágico (por mail) o con contraseña. No hay registro abierto: la cuenta se crea con el primer link. */
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { supabaseConfigured } from '@/lib/supabase/env';
import { BrandMark } from '@/components/shell/BrandMark';
import { Button, Segmented } from '@/components/pista/controls';
import { Field, Input } from '@/components/pista/fields';
import { BrandTitle } from '@/components/pista/structure';

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
    <form className="login-card" onSubmit={submit}>
      <div className="brand">
        <BrandMark />
        <span>
          <b>My Running App</b>
          <small>Registro y progreso</small>
        </span>
      </div>
      <BrandTitle>Entrar</BrandTitle>
      <Segmented
        label="Forma de entrar"
        fill
        value={mode}
        onChange={setMode}
        options={[
          { value: 'link', label: 'Link por mail' },
          { value: 'pass', label: 'Contraseña' },
        ]}
      />
      <Field id="lg-email" label="Mail">
        <Input id="lg-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      {mode === 'pass' ? (
        <Field id="lg-pass" label="Contraseña" help="¿No tenés o te la olvidaste? Entrá con el link por mail y creala en Ajustes → Cuenta.">
          <Input id="lg-pass" type="password" autoComplete="current-password" hasHelp value={pass} onChange={(e) => setPass(e.target.value)} />
        </Field>
      ) : (
        <p className="login-hint">Te llega un link al mail y entrás con un toque, sin contraseña.</p>
      )}
      <Button type="submit" variant="pri" size="lg" disabled={busy}>
        {busy ? 'Un momento…' : mode === 'link' ? 'Mandarme el link' : 'Entrar'}
      </Button>
      <p className={'login-msg' + (msg?.bad ? ' bad' : '')} role="status">
        {msg?.t}
      </p>
    </form>
  );
}

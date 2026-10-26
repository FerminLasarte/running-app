'use client';
/* Primera vez: «En sus marcas.» con los cuatro pasos (cuenta, Strava, próxima carrera y FC máxima) y la opción de
   ver la app con datos de ejemplo. Cada paso pendiente lleva a donde se hace. */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Lightning } from '@phosphor-icons/react';
import { firstSteps, type FirstStepKey } from '@/lib/domain/firstRun';
import { nextRace } from '@/lib/domain/config';
import { raceDateLabel } from '@/lib/domain/week';
import { AJ_HRMAX, demoOn, goRaces } from '@/lib/data/actions';
import { navigate } from '@/lib/nav';
import { useApp } from '@/lib/store';
import { stravaConnect } from '@/lib/strava/client';
import { useStravaStatus } from '@/components/shell/useStravaStatus';
import { BrandTitle, Stadium } from '@/components/pista/structure';
import { Button, Chip } from '@/components/pista/controls';
import { cx } from '@/components/pista/util';

const goHr = () =>
  navigate('/ajustes', () => {
    const el = document.getElementById(AJ_HRMAX);
    el?.scrollIntoView({ block: 'center' });
    el?.focus({ preventScroll: true });
  });

export function Welcome() {
  const cloud = useApp((s) => s.mode === 'cloud'),
    hrMax = useApp((s) => s.cfg.hrMax),
    sv = useStravaStatus(),
    /* sin Strava configurado en el servidor no hay nada que conectar */
    svOk = cloud && sv?.configured !== false,
    steps = firstSteps(!!sv?.connected),
    race = nextRace(),
    cur = steps.find((s) => !s.done)?.k;

  const TEXT: Record<FirstStepKey, { t: string; todo: string; done: ReactNode; go?: () => void; href?: string }> = {
    account: { t: 'Crear tu cuenta', todo: 'Para guardar todo en la nube y conectar Strava', done: 'Listo', href: '/login' },
    strava: {
      t: 'Conectar Strava',
      todo: svOk ? 'Tus salidas se cargan solas, con parciales y recorrido' : cloud ? 'No está disponible en este servidor' : 'Primero creá tu cuenta',
      done: sv?.athlete ? 'Conectado como ' + sv.athlete : 'Conectado',
      go: svOk ? () => stravaConnect() : undefined,
    },
    race: { t: 'Tu próxima carrera', todo: 'Desde ahí se arma el plan y la cuenta regresiva', done: race ? race.name + ' · ' + raceDateLabel(race) : 'Lista', go: goRaces },
    hr: { t: 'Tu FC máxima', todo: 'Para guiar los fondos y los regenerativos', done: hrMax + ' lpm', go: goHr },
  };

  return (
    <Stadium
      className="p-c12 p-rise sem-welcome"
      sideWidth={380}
      side={
        <ol className="sem-onb">
          {steps.map((s, i) => {
            const x = TEXT[s.k],
              body = (
                <>
                  <span className="n">{i + 1}</span>
                  <span>
                    <b>{x.t}</b>
                    <small>{s.done ? x.done : x.todo}</small>
                  </span>
                  {s.done ? <Check weight="bold" aria-hidden="true" /> : x.go || x.href ? <ArrowRight aria-hidden="true" /> : <span />}
                </>
              );
            return (
              <li key={s.k} className={cx(s.done && 'ok', s.k === cur && 'cur')}>
                {s.done || !(x.go || x.href) ? (
                  <div className="sem-onb-r">{body}</div>
                ) : x.href ? (
                  <Link className="sem-onb-r" href={x.href}>
                    {body}
                  </Link>
                ) : (
                  <button type="button" className="sem-onb-r" onClick={x.go}>
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      }
    >
      <div className="p-st-top">
        <Chip color="var(--acc)" solid>
          Bienvenido
        </Chip>
        <span className="lbl">Cuatro pasos y arrancás</span>
      </div>
      <BrandTitle className="p-st-h">
        En sus
        <br />
        marcas
      </BrandTitle>
      <p className="sem-wl-p">Con tus salidas, tu próxima carrera y tu FC, la app arma la semana, te dice cómo vas y te avisa si te estás pasando.</p>
      <div className="sem-wl-acts">
        {svOk && !sv?.connected ? (
          <Button variant="acc" icon={Lightning} iconWeight="bold" onClick={() => stravaConnect()}>
            Conectar con Strava
          </Button>
        ) : null}
        <Button variant="on-dark" onClick={demoOn}>
          Ver la app con datos de ejemplo
        </Button>
      </div>
    </Stadium>
  );
}

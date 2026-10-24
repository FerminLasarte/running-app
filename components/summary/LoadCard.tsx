/* Carga de la semana: últimos 7 días contra el promedio de 4 semanas (línea 2663 del original). */
import { deloadInfo, loadInfo } from '@/lib/domain/stats';
import { clamp, fmt } from '@/lib/domain/util';

export function LoadCard() {
  const L = loadInfo(),
    dl = deloadInfo();
  if (!L)
    return (
      <section className="card">
        <div className="h3">Carga de la semana</div>
        <p>Necesito unas 3 semanas de entrenamientos para comparar tu semana con tu promedio y avisarte si estás subiendo muy rápido.</p>
      </section>
    );
  const r = L.ratio;
  let z: string, msg: string;
  if (r < 0.8) {
    z = 'baja';
    msg = 'Vas por debajo de tu promedio. Está bien si es una semana liviana a propósito.';
  } else if (r <= 1.3) {
    z = 'segura';
    msg = 'Estás subiendo a un ritmo razonable. En esta franja el riesgo de lesión fue bajo en estudios.';
  } else if (r <= 1.5) {
    z = 'atención';
    msg = 'Subida fuerte. Mirá cómo te sentís y evitá sumar intensidad esta semana.';
  } else {
    z = 'brusca';
    msg = 'Subida muy brusca. Por encima de 1,5 el riesgo de lesión sube de forma clara en estudios: considerá bajar los kilómetros.';
  }
  const pos = (clamp(r, 0, 2) / 2) * 100;
  return (
    <section className="card">
      <div className="h3">Carga de la semana</div>
      <div className="sub">
        Tus últimos 7 días: <b>{fmt(L.acute, 1)} km</b> · promedio semanal de las últimas 4 semanas: <b>{fmt(L.chronic, 1)} km</b>
      </div>
      <div className="zwrap">
        <div className="zbar">
          <i style={{ flex: 40, background: 'var(--info)' }}></i>
          <i style={{ flex: 25, background: 'var(--good)' }}></i>
          <i style={{ flex: 10, background: 'var(--warn)' }}></i>
          <i style={{ flex: 25, background: 'var(--crit)' }}></i>
        </div>
        <div className="zmark" style={{ left: pos + '%' }}></div>
      </div>
      <div className="zlab">
        <span style={{ flex: 40 }}>baja</span>
        <span style={{ flex: 25 }}>segura</span>
        <span style={{ flex: 10 }}></span>
        <span style={{ flex: 25 }}>brusca</span>
      </div>
      <p>
        <b>{fmt(r, 2)}×</b> · zona <b>{z}</b>. {msg}
      </p>
      {dl != null && dl >= 3 ? <p className="note">Hace {dl} semanas que no bajás el volumen. Una semana liviana (20–30% menos km) ayuda a asimilar el trabajo. Si tu plan ya tiene una, seguila a ella.</p> : null}
      <div className="tv-row">
        <details className="tv">
          <summary>¿Cómo se calcula?</summary>
          <p className="sub">
            Divido los km de tus últimos 7 días por tu promedio semanal de las últimas 4 semanas. Entre 0,8 y 1,3 es la zona más segura; sobre 1,5 el riesgo sube. No uso la regla del «10% por semana» porque los estudios no la respaldan.
          </p>
        </details>
      </div>
    </section>
  );
}

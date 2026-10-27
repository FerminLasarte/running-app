'use client';
/* El texto de la política de privacidad y las condiciones de uso (la página está en page.tsx). Va como componente de
   cliente, igual que el formulario del login, porque las piezas de la Pista (BrandTitle) lo son. Si cambia algo de lo
   que se guarda o de a quién se le manda, se actualiza acá y la fecha. */
import Link from 'next/link';
import { BrandMark } from '@/components/shell/BrandMark';
import { BrandTitle } from '@/components/pista/structure';

const MAIL = 'fermin.lasarte@icloud.com';

export default function Privacidad() {
  return (
    <main className="priv">
      <article className="priv-doc">
        <Link className="brand" href="/">
          <BrandMark />
          <span>
            <b>Lane One</b>
            <small>Registro y progreso</small>
          </span>
        </Link>
        <header className="priv-head">
          <BrandTitle>Privacidad</BrandTitle>
          <p>Qué guarda la app, dónde, qué lee de Strava y cómo borrar todo. Actualizada el 27 de octubre de 2026.</p>
        </header>

        <section>
          <h2>Quién es el responsable</h2>
          <p>
            Fermín Lasarte hace y mantiene Lane One, y es el responsable de tus datos. Para cualquier pregunta o pedido sobre
            ellos, escribile a <a href={'mailto:' + MAIL}>{MAIL}</a>.
          </p>
        </section>

        <section>
          <h2>Qué se guarda</h2>
          <ul>
            <li>
              <b>Tu cuenta:</b> el mail con el que entrás y la contraseña, guardada cifrada. Si entrás con Google, Google le
              pasa a la app tu mail, tu nombre y tu foto de perfil: se guardan con la cuenta y no se usan para nada más.
            </li>
            <li>
              <b>Tus sesiones:</b> lo que planificás y lo que corrés (distancias, tiempos, ritmos, frecuencia cardíaca, cómo te
              sentiste, notas).
            </li>
            <li>
              <b>Tu configuración:</b> carreras, zapatillas, zonas, desafíos y tu perfil (nombre, edad y foto, si los cargás).
            </li>
            <li>
              <b>Lo que viene de Strava, si lo conectás:</b> los recorridos de tus salidas (para el mapa), las series de cada
              salida (ritmo, frecuencia cardíaca, distancia, altura y posición a lo largo del recorrido) con las vueltas del
              reloj, y la conexión misma (tu número y nombre de atleta y los permisos de acceso).
            </li>
            <li>
              <b>Cuántas capturas leíste este mes,</b> para el tope mensual de esa función. Las capturas no se guardan.
            </li>
          </ul>
          <p>
            Además, la app guarda una copia de tus datos en este navegador, para abrir rápido y andar sin señal. Si la probás
            sin cuenta, no se guarda nada: ni en la nube ni en el navegador.
          </p>
        </section>

        <section>
          <h2>Dónde</h2>
          <p>
            La base de datos está en <a href="https://supabase.com">Supabase</a>, que también maneja las cuentas. La app corre
            en <a href="https://vercel.com">Vercel</a>. Cada cuenta ve solo lo suyo: la base no le deja leer a nadie los
            datos de otro.
          </p>
        </section>

        <section>
          <h2>Strava</h2>
          <p>
            Si conectás Strava, la app lee tu perfil y tus actividades, también las privadas: la lista de tus salidas, el
            detalle de cada una (vueltas y frecuencia cardíaca), sus series y su recorrido. Las usa para cargar tus salidas
            solas, dibujar el mapa y el gráfico de cada salida y calcular la deriva cardíaca. No publica nada en Strava ni
            cambia nada de tu cuenta de allá.
          </p>
          <p>
            Lane One no está hecha ni respaldada por Strava. Si revocás el acceso desde Strava, la app borra lo que había
            traído de ahí, igual que al desconectarlo desde Ajustes.
          </p>
        </section>

        <section>
          <h2>Las capturas del reloj</h2>
          <p>
            Si leés un plan o tus parciales desde una captura, la imagen (o el texto que pegás) se manda a la API de{' '}
            <a href="https://www.anthropic.com">Anthropic</a> en ese momento, para que Claude la lea. La app no la guarda:
            se queda solo con lo que leyó, que revisás antes de guardarlo.
          </p>
        </section>

        <section>
          <h2>Lo que no se hace</h2>
          <p>No hay publicidad, no se venden ni se comparten tus datos con nadie, y no hay cookies de seguimiento: solo las de la sesión.</p>
        </section>

        <section>
          <h2>Tus datos son tuyos</h2>
          <ul>
            <li>
              <b>Bajarlos:</b> Ajustes → Cuenta y datos → Respaldo JSON (todo) o Planilla CSV.
            </li>
            <li>
              <b>Desconectar Strava:</b> Ajustes → Conexiones → Desconectar. Se revoca el permiso y se borran los recorridos y
              las series; tus sesiones quedan.
            </li>
            <li>
              <b>Eliminar la cuenta:</b> Ajustes → Cuenta y datos → Eliminar mi cuenta. Se borra todo, en el momento.
            </li>
          </ul>
          <p>
            Si no podés entrar o preferís pedirlo por mail, escribí a <a href={'mailto:' + MAIL}>{MAIL}</a>.
          </p>
        </section>

        <section>
          <h2>Condiciones de uso</h2>
          <ul>
            <li>La app te ayuda a ordenar tus entrenamientos: no reemplaza a un entrenador ni a un médico. Los puntajes, zonas y estimaciones son orientativos.</li>
            <li>Si tenés dolor, mareos o algo raro al correr, pará y consultá a un médico.</li>
            <li>Se ofrece tal como está, sin garantías: puede fallar o cambiar. Bajá tu respaldo cada tanto.</li>
            <li>Usala para tus propios entrenamientos y no intentes entrar a datos de otros.</li>
          </ul>
        </section>

        <p className="priv-back">
          <Link href="/">Volver a Lane One</Link>
        </p>
      </article>
    </main>
  );
}

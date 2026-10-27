# My Running App

Registro y progreso de entrenamientos de running: fondos guiados por frecuencia cardíaca, series y tempos por ritmo.
Es el port a web del artifact original de claude.ai, con Next.js 16 (App Router, TypeScript), Supabase (login y base de
datos) y Strava (recorridos, parciales, series y deriva cardíaca). La interfaz es el rediseño «Pista»: estilo de marca
deportiva, pensado primero para la compu y que también anda en el celu, en claro u oscuro (o como el sistema). Se
instala como app (PWA).

## Puesta en marcha

### 1. Supabase

1. En el proyecto de Supabase: **SQL Editor → New query**, pegá el contenido de cada archivo de
   `supabase/migrations/`, en orden, y ejecutalo:
   - `20261024000000_init.sql` crea las tablas `settings`, `sessions`, `routes` y `strava_tokens`, con RLS (cada
     usuario ve solo lo suyo), y activa el tiempo real para sesiones y ajustes;
   - `20261025000000_streams.sql` crea `streams`, donde se guardan las series de Strava de cada salida (el gráfico de
     ritmo y FC del detalle), para no pedírselas de nuevo cada vez.

   (Alternativa con la CLI: `supabase link --project-ref <ref>` y `supabase db push`.)
2. **Authentication → URL Configuration**:
   - *Site URL*: la URL de producción de Vercel (por ejemplo `https://running-app.vercel.app`).
   - *Redirect URLs*: agregá `https://<tu-dominio>/auth/callback`, `http://localhost:3000/auth/callback` y, si querés
     probar en las vistas previas de Vercel, `https://*-<tu-equipo>.vercel.app/auth/callback`.
3. **Authentication → Sign In / Providers → Email**: dejalo activado (link mágico y contraseña usan el mismo proveedor).
4. Copiá **Project URL** y la **publishable key** (botón *Connect* o *Project Settings → API Keys*).
5. Cuando el corredor ya haya entrado una vez (eso crea su cuenta), apagá *Allow new users to sign up* en
   **Authentication → Sign In / Providers**, y/o cargá su mail en `ALLOWED_EMAILS`. Así nadie más puede usar la app.

### 2. Variables de entorno

Copiá `.env.example` a `.env.local` para desarrollo y cargá las mismas en **Vercel → Settings → Environment
Variables** (Production y Preview):

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → publishable key (o `NEXT_PUBLIC_SUPABASE_ANON_KEY` con la anon key vieja) |
| `ALLOWED_EMAILS` | mail(s) con acceso, separados por coma (opcional pero recomendado) |
| `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` | Strava → https://www.strava.com/settings/api |
| `ANTHROPIC_API_KEY` | opcional: lectura de capturas con Claude (ver abajo) |

### 3. Strava

La app de Strava la tiene que crear **el corredor con su propia cuenta** (las apps nuevas de Strava solo permiten
conectar a la cuenta que las creó). En https://www.strava.com/settings/api:

- *Website*: la URL de la app.
- *Authorization Callback Domain*: solo el dominio, sin `https://` (por ejemplo `running-app.vercel.app`). Para probar
  en tu compu, `localhost` también sirve.

Con `STRAVA_CLIENT_ID` y `STRAVA_CLIENT_SECRET` cargados, en la app: **Ajustes → Conexiones → Conectar con Strava**.

### 4. Vercel

1. **Add New → Project**, importá el repo de GitHub. Vercel detecta Next.js solo.
2. Cargá las variables del punto 2 y hacé el deploy.
3. Actualizá en Supabase la *Site URL* y las *Redirect URLs* con el dominio final (y en Strava el callback domain).

### 5. Pasar los datos del artifact

En el artifact de claude.ai: **Ajustes → Respaldo → Exportar respaldo (JSON)**. En la app nueva: **Ajustes → Cuenta y datos →
Respaldo → Importar** y elegí ese archivo. Se suman todas las sesiones y se copian la configuración, carreras y zapatillas. Los
recorridos del mapa no viajan en el respaldo: se vuelven a traer con **Mapa → Traer de Strava**.

### 6. Instalar como app

En el iPhone: abrí la URL en Safari → Compartir → **Agregar a inicio**. En la compu (Chrome o Edge): el botón
**Instalar** de la barra de direcciones. Abre en su propia ventana, con el ícono de la marca, y sin señal muestra lo
último que tenía.

## Lectura de capturas con Claude (opcional)

Planificar desde una captura del reloj y cargar parciales desde fotos usa la API de Anthropic. Mientras no haya
`ANTHROPIC_API_KEY`, esas opciones no aparecen. Para activarla, el corredor crea una clave en
https://console.anthropic.com (con su cuenta y su crédito), y se carga como variable de entorno en Vercel. Usa
`claude-opus-5-5`; cada captura cuesta centavos.

## Desarrollo

```bash
npm install
npm run dev
```

Sin las variables de Supabase la app funciona igual, guardando solo en el navegador (útil para probar con «Ver la app
con datos de ejemplo»).

- `app/(app)/`: una carpeta por sección (`/semana`, `/registro`, `/analisis`, `/carreras`, `/mapa`, `/logros`,
  `/ajustes`) y el detalle de cada salida (`/sesion/[id]`), todas adentro del shell. Además, `/login`, las rutas de API
  (`/api/strava/*`, `/api/ai/*`), el manifest y los íconos (`icon.tsx`, `apple-icon.tsx`, `pwa-icon/`).
- `app/styles/`: el CSS, por capas: tokens (colores, letras, medidas), base, shell, piezas y una hoja por pantalla.
- `components/shell/`: barra lateral (abajo en el celu), barra de arriba, avisos, paneles, paleta ⌘K y atajos.
- `components/pista/`: las piezas del sistema de diseño. En desarrollo se ven juntas en `/sistema`.
- `components/<sección>/`: cada pantalla; `components/panels/`: los paneles (cargar, planificar, puntaje…).
- `lib/domain/`: cálculos (puntaje, estadísticas, plan, VDOT, deriva, logros…), sin interfaz.
- `lib/data/`: acciones, sincronización con Supabase (con caché local y reintentos), respaldo, modo ejemplo.
- `docs/PORTING.md`: cómo está armado el código y qué viene del artifact original.
- `docs/REDISENO.md` y `docs/REDISENO-PLAN.md`: el rediseño «Pista», qué se decidió y cómo se hizo. Los bocetos están
  en `design/bocetos/` (se sirven con la configuración `bocetos` de `.claude/launch.json`).
- `docs/ARREGLOS-PLAN.md`: lo que se perdió del original al rehacer las pantallas, ordenado en tandas.

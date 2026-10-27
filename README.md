# Lane One

Registro y progreso de entrenamientos de running: fondos guiados por frecuencia cardíaca, series y tempos por ritmo.
El nombre sale del andarivel 1, el que se va completando en la pista de Semana. Es el port a web del artifact original de claude.ai, con Next.js 16 (App Router, TypeScript), Supabase (login y base de
datos) y Strava (recorridos, parciales, series y deriva cardíaca). La interfaz es el rediseño «Pista»: estilo de marca
deportiva, pensado primero para la compu y que también anda en el celu, en claro u oscuro (o como el sistema). Se
instala como app (PWA).

Es para dos personas: el corredor y el responsable (Fermín Lasarte). No hay alta de cuentas desde la app: las dos
cuentas se crean en Supabase. La portada (`/`) es pública y deja probar la app con datos de ejemplo, sin cuenta.

## Puesta en marcha

### 1. Supabase

1. En el proyecto de Supabase: **SQL Editor → New query**, pegá el contenido de cada archivo de
   `supabase/migrations/`, en orden, y ejecutalo:
   - `20261024000000_init.sql` crea las tablas `settings`, `sessions`, `routes` y `strava_tokens`, con RLS (cada
     usuario ve solo lo suyo), y activa el tiempo real para sesiones y ajustes;
   - `20261025000000_streams.sql` crea `streams`, donde se guardan las series de Strava de cada salida (el gráfico de
     ritmo y FC del detalle), para no pedírselas de nuevo cada vez (y, si Strava no tiene la salida, eso también).

   Las otras tres son de cuando la app se iba a abrir al público: `20261027000000_delete_account.sql` y
   `20261027000100_ai_usage.sql` crean eliminar la cuenta y el tope mensual de la lectura de capturas, y
   `20261027000200_dos_usuarios.sql` los borra. En un proyecto nuevo, salteá las tres; si ya habías aplicado las dos
   primeras, aplicá la tercera.

   (Alternativa con la CLI: `supabase link --project-ref <ref>` y `supabase db push`.)
2. **Authentication → URL Configuration** → *Site URL*: la URL de producción de Vercel
   (`https://running-app-lemon.vercel.app`). No hacen falta *Redirect URLs*: se entra con mail y contraseña, sin links.
3. **Authentication → Sign In / Providers**: apagá *Allow new users to sign up* (nadie se crea una cuenta solo) y dejá
   *Email* activado, con la contraseña mínima en **8** caracteres (la app ya lo pide) y *Secure password change*
   apagado (si no, cambiar la contraseña desde Ajustes pide haber entrado hace poco). Google y los demás, apagados.
4. **Las dos cuentas**: **Authentication → Users → Add user → Create new user**, con el mail, una contraseña
   provisoria y *Auto Confirm User* tildado. Cada uno la cambia después en **Ajustes → Cuenta y datos → Contraseña**. Si
   alguno se la olvida, el responsable le pone una provisoria nueva desde el **SQL Editor** (sin mandar mails):

   ```sql
   update auth.users set encrypted_password = crypt('la-provisoria', gen_salt('bf')) where email = 'su@mail.com';
   ```
5. Copiá **Project URL** y la **publishable key** (botón *Connect* o *Project Settings → API Keys*).

### 2. Variables de entorno

Copiá `.env.example` a `.env.local` para desarrollo y cargá las mismas en **Vercel → Settings → Environment
Variables** (Production y Preview):

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → publishable key (o `NEXT_PUBLIC_SUPABASE_ANON_KEY` con la anon key vieja) |
| `ALLOWED_EMAILS` | los dos mails con acceso, separados por coma. Cualquier otra cuenta queda afuera aunque exista |
| `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` | Strava → https://www.strava.com/settings/api |
| `ANTHROPIC_API_KEY` | opcional: lectura de capturas con Claude (ver abajo) |
| `SITE_URL` | opcional: la URL de la app para la vista previa del link (si no, la de producción de Vercel) |

### 3. Strava

La app de Strava la tiene que crear **el corredor con su propia cuenta** (las apps nuevas de Strava solo permiten
conectar a la cuenta que las creó). En https://www.strava.com/settings/api:

- *Website*: `https://running-app-lemon.vercel.app`.
- *Authorization Callback Domain*: solo el dominio, sin `https://`: `running-app-lemon.vercel.app`. Para probar en tu
  compu, `localhost` también sirve.

El corredor le pasa al responsable el *Client ID* y el *Client Secret* por un canal privado; el responsable los carga en
Vercel como `STRAVA_CLIENT_ID` y `STRAVA_CLIENT_SECRET` y hace un deploy nuevo. Después, en la app: **Ajustes →
Conexiones → Conectar con Strava**. La app de Strava es de la cuenta del corredor, así que solo él puede conectarse.

### 4. Vercel

1. **Add New → Project**, importá el repo de GitHub. Vercel detecta Next.js solo.
2. Cargá las variables del punto 2 y hacé el deploy.
3. Actualizá en Supabase la *Site URL* y las *Redirect URLs* con el dominio final (y en Strava el callback domain).

### 5. Pasar los datos del artifact

En el artifact de claude.ai: **Ajustes → Respaldo → Exportar respaldo (JSON)**. En la app nueva, creá la cuenta (o entrá) y
andá a **Ajustes → Cuenta y datos → Respaldo → Importar** y elegí ese archivo. Se suman todas las sesiones y se copian la configuración, carreras y zapatillas. Los
recorridos del mapa no viajan en el respaldo: llegan solos al conectar Strava (**Ajustes → Conexiones → Conectar con
Strava**), y los nuevos se traen después con **Sincronizar** o **Mapa → Traer recorridos nuevos**.

### 6. Instalar como app

En el iPhone: abrí la URL en Safari → Compartir → **Agregar a inicio**. En la compu (Chrome o Edge): el botón
**Instalar** de la barra de direcciones. Abre en su propia ventana, con el ícono de la marca, y sin señal muestra lo
último que tenía.

## Lectura de capturas con Claude (opcional)

Planificar desde una captura del reloj y cargar parciales desde fotos usa la API de Anthropic. Mientras no haya
`ANTHROPIC_API_KEY`, esas opciones no aparecen. Para activarla, el corredor crea una clave en
https://console.anthropic.com (con su cuenta y su crédito), y se carga como variable de entorno en Vercel. Usa
`claude-opus-5-5`; cada captura cuesta centavos.

## La portada y probar sin cuenta

`/` es la portada pública (con sesión, lleva a la semana): qué es Lane One, «Probar sin cuenta» y «Entrar».
«Probar sin cuenta» pone una cookie de invitado (`lo_guest`, se va al cerrar el navegador) que deja pasar a las páginas
de la app, nunca a `/api`, y la app arranca con los datos de ejemplo sin guardar nada: ni en la nube ni en el navegador.
Lo que guardaría avisa que nada se guarda; Strava, la lectura de capturas, importar y exportar no aparecen. La vista previa del link (LinkedIn, WhatsApp, X) sale de `app/opengraph-image.tsx` y `app/twitter-image.tsx`.

## Desarrollo

```bash
npm install
npm run dev
```

Sin las variables de Supabase la app funciona igual, guardando solo en el navegador (útil para probar con «Ver la app
con datos de ejemplo»). La portada está en `/`; la app, en `/semana`.

- `app/(app)/`: una carpeta por sección (`/semana`, `/registro`, `/analisis`, `/carreras`, `/mapa`, `/logros`,
  `/ajustes`) y el detalle de cada salida (`/sesion/[id]`), todas adentro del shell. Además, `/login`, las rutas de API
  (`/api/strava/*`, `/api/ai/*`), el manifest y los íconos (`icon.tsx`, `apple-icon.tsx`, `pwa-icon/`). La portada
  (`/`) es `app/page.tsx` con `components/portada/`.
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
- `docs/APERTURA-PLAN.md`: lo que hace falta para abrir la app al público, sin activar Strava ni la IA.

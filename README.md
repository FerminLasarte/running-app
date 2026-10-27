# Lane One

Registro y progreso de entrenamientos de running: fondos guiados por frecuencia cardíaca, series y tempos por ritmo.
El nombre sale del andarivel 1, el que se va completando en la pista de Semana. Es el port a web del artifact original de claude.ai, con Next.js 16 (App Router, TypeScript), Supabase (login y base de
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
     ritmo y FC del detalle), para no pedírselas de nuevo cada vez (y, si Strava no tiene la salida, eso también);
   - `20261027000000_delete_account.sql` crea `delete_account()`, con la que cada uno elimina su propia cuenta desde
     **Ajustes → Cuenta y datos**;
   - `20261027000100_ai_usage.sql` crea `ai_usage` y sus funciones, para el tope mensual de la lectura de capturas.

   (Alternativa con la CLI: `supabase link --project-ref <ref>` y `supabase db push`.)
2. **Authentication → URL Configuration**:
   - *Site URL*: la URL de producción de Vercel (por ejemplo `https://running-app.vercel.app`).
   - *Redirect URLs*: agregá `https://<tu-dominio>/auth/callback`, `http://localhost:3000/auth/callback` y, si querés
     probar en las vistas previas de Vercel, `https://*-<tu-equipo>.vercel.app/auth/callback`. Es la vuelta de Google.
     Con mails propios (abajo), también `https://<tu-dominio>/auth/clave` (la del link de «Olvidé mi contraseña»).
3. **Authentication → Sign In / Providers → Email**: dejalo activado y **apagá *Confirm email***: así se crea la cuenta
   y se entra en el momento, sin esperar un mail (el servicio de mails que trae Supabase es para pruebas). En la misma
   pantalla, la contraseña mínima en **8** caracteres (la app ya lo pide) y *Secure password change* apagado (si no,
   cambiar la contraseña desde Ajustes pide haber entrado hace poco).
4. Copiá **Project URL** y la **publishable key** (botón *Connect* o *Project Settings → API Keys*).
5. ¿Quién puede crear una cuenta? Con *Allow new users to sign up* prendido (**Authentication → Sign In / Providers**) y
   `ALLOWED_EMAILS` vacía, cualquiera. Para que sea solo para el corredor: apagalo cuando él ya tenga su cuenta, y/o
   cargá su mail en `ALLOWED_EMAILS`.

#### Entrar con Google (opcional)

El botón «Continuar con Google» aparece en el login solo con `NEXT_PUBLIC_AUTH_GOOGLE=1`. Antes:

1. En https://console.cloud.google.com, un proyecto nuevo (por ejemplo «Lane One»). En **Google Auth Platform**:
   - *Branding*: el nombre (Lane One), el mail de soporte, la página de inicio (`https://<tu-dominio>`), la política de
     privacidad (`https://<tu-dominio>/privacidad`) y, en *Authorized domains*, `<tu-dominio>` y `<ref>.supabase.co`.
   - *Audience*: **External**, y **Publish app** (en *Testing* solo entran los usuarios de prueba que cargues).
   - *Data Access*: alcanzan los permisos de siempre (`openid`, `email`, `profile`).
   - *Clients → Create client*, tipo **Web application**. *Authorized JavaScript origins*: `https://<tu-dominio>` y
     `http://localhost:3000`. *Authorized redirect URIs*: la *Callback URL* que muestra Supabase en el paso 2
     (`https://<ref>.supabase.co/auth/v1/callback`). Copiá el *Client ID* y el *Client secret*.
2. En Supabase, **Authentication → Sign In / Providers → Google**: prendelo y pegá el *Client ID* y el *Client secret*.
3. En Vercel, `NEXT_PUBLIC_AUTH_GOOGLE=1` y un deploy nuevo (las variables `NEXT_PUBLIC_` se leen al compilar).

Si alguien entra con Google con el mail de una cuenta que ya existe, Supabase la suma a esa misma cuenta (no quedan dos):
lo hace solo cuando el mail de Google está verificado, que es siempre.

#### Mails propios (opcional): «Olvidé mi contraseña»

Recuperar la contraseña manda un mail, y el servicio que trae Supabase es para pruebas (pocos mails por hora). Sin un
SMTP propio la app no lo ofrece: el login dice que entres con Google o que le escribas al responsable. Para prenderlo:

1. Un servicio de mails, por ejemplo [Resend](https://resend.com): necesita un **dominio propio verificado** (no sirve
   `*.vercel.app`). El plan gratis manda hasta 100 mails por día y 3.000 por mes (revisalo en resend.com/pricing).
2. En Supabase, **Authentication → Emails → SMTP Settings**: host `smtp.resend.com`, puerto `465`, usuario `resend`,
   contraseña: la API key de Resend, y un remitente de tu dominio (por ejemplo `Lane One <hola@tu-dominio>`).
3. La plantilla **Reset Password** en castellano (abajo, en «El mail de la contraseña nueva»).
4. En *Redirect URLs*, `https://<tu-dominio>/auth/clave`. En Vercel, `NEXT_PUBLIC_AUTH_EMAIL=1` y un deploy nuevo.

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
| `AI_MONTHLY_LIMIT` | opcional: tope de lecturas de capturas por usuario por mes (30 si no está) |
| `STRAVA_WEBHOOK_VERIFY_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` | solo al abrir la app al público (ver abajo) |
| `NEXT_PUBLIC_AUTH_GOOGLE` | `1` cuando Google esté configurado en Supabase (ver «Entrar con Google») |
| `NEXT_PUBLIC_AUTH_EMAIL` | `1` cuando haya un SMTP propio en Supabase (ver «Mails propios») |
| `SITE_URL` | opcional: la URL de la app para la vista previa del link (si no, la de producción de Vercel) |

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

Cada usuario tiene un tope de lecturas por mes (`AI_MONTHLY_LIMIT`, 30 si no está; se renuevan el 1, a la hora de
Argentina). Cada pedido cuenta una, traiga las capturas que traiga, y se cuenta antes de llamar a Claude. Pasado el
tope, la app avisa y no llama. **Ajustes → Conexiones** muestra cuántas quedan. Necesita la migración
`20261027000100_ai_usage.sql`.

## Abrir la app al público

Hoy la app es para un solo corredor. Lo que la envuelve para abrirla ya está hecho (la política de privacidad en
`/privacidad`, eliminar la cuenta, desconectar Strava borrando lo que vino de ahí, el webhook de Strava, el tope de la
lectura de capturas): falta activarlo, en este orden. Cuando se abra, nadie pasa claves: hay una sola app de Strava y
una sola clave de IA, las del responsable (Fermín Lasarte, fermin.lasarte@icloud.com).

1. **La app de Strava.** Crearla con la cuenta del responsable en https://www.strava.com/settings/api (*Website*: la
   URL de la app; *Authorization Callback Domain*: el dominio, sin `https://`). Una app nueva solo deja conectar a la
   cuenta que la creó: para sumar atletas hay que pedir la revisión de Strava. Antes de pedirla, leer las condiciones
   vigentes de la API y de la marca de Strava. Suele pedir:
   - la política de privacidad: `https://<tu-dominio>/privacidad`;
   - capturas de la app donde se vea qué se hace con los datos;
   - el botón «Connect with Strava» y el logo «Powered by Strava» oficiales, sin modificar. **No están en la app
     todavía**: se bajan de la página de marca de Strava y se agregan en esta etapa (el botón de **Ajustes →
     Conexiones**, el de la bienvenida de Semana y el logo donde se muestran datos de Strava, como el Mapa y el gráfico
     de cada salida);
   - mostrar a cada atleta solo sus datos y borrarlos cuando desconecta (ya está: **Desconectar** y el webhook).
2. **Las variables y el webhook.** En Vercel: `STRAVA_CLIENT_ID` y `STRAVA_CLIENT_SECRET` de la app nueva,
   `STRAVA_WEBHOOK_VERIFY_TOKEN` (una palabra que inventás) y `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings
   → API Keys: la secret key). Hacé el deploy y suscribí el webhook una sola vez:

   ```bash
   curl -X POST https://www.strava.com/api/v3/push_subscriptions -F client_id=<id> -F client_secret=<secret> -F callback_url=https://<tu-dominio>/api/strava/webhook -F verify_token=<la palabra>
   ```

   Strava llama a `/api/strava/webhook` para verificar y contesta con el id de la suscripción. Desde ahí, si alguien
   revoca el acceso desde Strava, la app confirma con Strava que el permiso ya no sirve y borra sus recorridos, sus
   series y la conexión. Al cambiar de app de Strava, quien ya la usaba tiene que volver a conectar (**Ajustes →
   Conexiones**): sus sesiones están en Supabase, no se pierde nada.
3. **La lectura de capturas, si se activa.** Cargar `ANTHROPIC_API_KEY` (la clave del responsable) y, si se quiere otro
   tope que 30, `AI_MONTHLY_LIMIT`. La migración `20261027000100_ai_usage.sql` tiene que estar aplicada.
4. **Abrir las altas.** En Supabase, **Authentication → Sign In / Providers**: prender *Allow new users to sign up* y
   apagar *Confirm email* (puesta en marcha, paso 3). En Vercel, dejar `ALLOWED_EMAILS` vacía (y volver a hacer el
   deploy). Entrar no manda mails: se entra con Google o con mail y contraseña. Solo «Olvidé mi contraseña» necesita un
   SMTP propio, y es opcional («Mails propios»).
5. **Los planes.** Revisar los planes de Supabase (base, usuarios activos, mails) y de Vercel (pedidos, funciones)
   según la gente que se espera, y el límite de pedidos de la app de Strava, que comparten todos los atletas (se puede
   pedir más a Strava).

### El mail de la contraseña nueva

Solo con un SMTP propio. Para pegar en Supabase → **Authentication → Email Templates → Reset Password**, asunto:
`Tu contraseña nueva para Lane One`

```html
<h2>Contraseña nueva para Lane One</h2>
<p>Tocá el botón para entrar y poner una contraseña nueva. Abrilo en el mismo dispositivo y el mismo navegador donde la pediste.</p>
<p><a href="{{ .ConfirmationURL }}">Poner una contraseña nueva</a></p>
<p>El link sirve una sola vez y vence en un rato. Si no la pediste, ignorá este mail: tu contraseña sigue igual.</p>
```

## La portada y probar sin cuenta

`/` es la portada pública (con sesión, lleva a la semana): qué es Lane One, «Probar sin cuenta» y «Crear cuenta».
«Probar sin cuenta» pone una cookie de invitado (`lo_guest`, se va al cerrar el navegador) que deja pasar a las páginas
de la app, nunca a `/api`, y la app arranca con los datos de ejemplo sin guardar nada: ni en la nube ni en el navegador.
Lo que guardaría ofrece crear la cuenta; Strava, la lectura de capturas, importar, exportar y eliminar la cuenta no
aparecen. La vista previa del link (LinkedIn, WhatsApp, X) sale de `app/opengraph-image.tsx` y `app/twitter-image.tsx`.

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

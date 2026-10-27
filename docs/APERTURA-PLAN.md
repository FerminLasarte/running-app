# Plan de apertura: dejar la app lista para el público

Hoy la app es para un solo corredor. Este plan deja hecho todo lo que hace falta para abrirla a más gente, **sin
activarlo**: la app de Strava propia (con la revisión de Strava para sumar atletas) y la lectura de capturas con IA
quedan para después. Lo que se hace acá funciona igual con un solo usuario y queda listo para el día que se abra.

Decidido por el usuario (27 de octubre de 2026):

- **Nombre: Lane One.** Por el andarivel 1, el que se va completando en la pista de Semana. Reemplaza a «My Running
  App» en todo lo que se ve.
- **Responsable de los datos:** Fermín Lasarte, fermin.lasarte@icloud.com.
- **Las cuentas nuevas arrancan neutras:** sin las carreras ni el perfil del artifact original.
- **Tope de la lectura de capturas:** 30 por usuario por mes, configurable.
- Nadie pasa claves: cuando se abra, habrá una sola app de Strava y una sola clave de IA, del responsable.

## Cómo trabajar

Igual que en `docs/ARREGLOS-PLAN.md` («Cómo trabajar»): una rama y un PR, `npx tsc --noEmit`, `npx eslint app
components lib proxy.ts`, `npm run build` y la prueba en el navegador en modo local, guardando y restaurando
`localStorage.rr1`. Al cerrar, «Hecho. Decisiones al pasarlo…» debajo de la tanda.

**Migraciones de Supabase:** cada cambio de base va como archivo nuevo en `supabase/migrations/` (con RLS, como las
demás) **y** se le pasa al usuario el SQL para pegar en el SQL Editor. Nunca `supabase db push`.

**Cruce con la tanda 7** de `docs/ARREGLOS-PLAN.md` (si todavía no está mergeada): toca las carreras
(`components/ajustes/Races.tsx`, `lib/domain/config.ts`) y la navegación (`components/shell/sections.ts`, `Rail`,
`Palette`, `useShortcuts`). Esta tanda no toca esos archivos, salvo el texto del nombre en `Rail.tsx`.

## Tanda A · Lo que envuelve a Strava y a la IA

- **AP-01 · Datos de fábrica neutros.**
  - Hoy: `DEF_CFG` (`lib/domain/defaults.ts:7-18`) trae los datos del corredor del artifact: el 10K del 28 de
    noviembre en Puerto Madero, el maratón de septiembre de 2027, 27 años, «corriendo desde» enero de 2026, inicio
    de plan y FC máxima 203. Cualquier cuenta nueva arranca con eso.
  - Hacer: una cuenta nueva arranca sin carreras, sin edad, sin «corriendo desde» y sin inicio de plan. La FC máxima
    se trata como «sin cargar» hasta que la persona la confirme: las zonas, el puntaje y el test de nivel tienen que
    andar sin ella (con un valor provisorio y la invitación a cargarla) y la bienvenida (`lib/domain/firstRun.ts`) la
    pide de verdad, no comparando con 203. El objetivo de 3 salidas por semana puede quedar.
  - Cuidar:
    - Los respaldos del artifact se siguen importando igual. Lo que `normRace` completa para la carrera con id `r10`
      (hora 20:00, Puerto Madero) es para esos respaldos: no se toca.
    - Una configuración ya guardada se mezcla con la de fábrica (`mergeCfg` en `lib/data/sync.ts`): revisar que a
      nadie que ya usa la app le desaparezca nada.
    - El modo ejemplo hoy usa tu configuración real (`demoOn` en `lib/data/actions.ts`). Con la de fábrica vacía se
      quedaría sin carreras, así que tiene que traer su propia configuración de muestra (carreras, FC máxima, zonas)
      y devolver la tuya al salir.
  - Listo cuando: una cuenta nueva ve la bienvenida con los cuatro pasos sin hacer, Carreras en el estado vacío, y
    los datos de ejemplo siguen mostrando todo.
- **AP-02 · Eliminar la cuenta.**
  - Ajustes → Cuenta y datos: «Eliminar mi cuenta», con una confirmación que no se pueda tocar sin querer (por
    ejemplo, escribir «eliminar»), y antes la oferta de bajar el respaldo JSON.
  - Borra todo: sesiones, configuración, recorridos, series, la conexión con Strava (revocándola en Strava, como
    «Desconectar») y la cuenta misma. Después limpia lo guardado en el navegador (`rr1`, `rr1_pend`, el borrador) y
    vuelve al login.
  - La cuenta se borra con una función de Supabase que solo borra a quien la llama (`security definer`, contra
    `auth.uid()`): las tablas ya borran en cascada al usuario. Va como migración y como SQL para pegar.
  - En modo local (sin Supabase) el botón borra lo de este navegador.
- **AP-03 · Desconectar Strava borra lo que vino de Strava.**
  - Hoy «Desconectar» (`app/api/strava/disconnect/route.ts`) revoca el permiso y borra los tokens; los recorridos y
    las series quedan.
  - Hacer: la confirmación dice qué se borra (los recorridos del mapa y las series de cada salida) y qué no (las
    sesiones cargadas, con sus datos). Al confirmar, borra `routes` y `streams` del usuario, en la base y en el
    navegador.
  - Webhook de Strava: `app/api/strava/webhook/route.ts`. El `GET` responde la verificación de la suscripción (con un
    token en `STRAVA_WEBHOOK_VERIFY_TOKEN`) y el `POST` atiende el aviso de que un atleta revocó el acceso desde
    Strava: busca al usuario por `athlete_id` en `strava_tokens` y borra lo mismo que «Desconectar». Como llega sin
    sesión, usa la clave de servicio de Supabase (`SUPABASE_SERVICE_ROLE_KEY`, solo en el servidor). Sin esas
    variables, responde 501. **No se suscribe en Strava**: eso se hace cuando exista la app propia.
- **AP-04 · Privacidad y condiciones.**
  - `/privacidad`, pública (sumarla a `PUBLIC` en `proxy.ts`), con el estilo de la app. Una sola página, en castellano
    rioplatense, corta y clara:
    - quién es el responsable y cómo escribirle;
    - qué se guarda: cuenta (el mail), sesiones, configuración, recorridos y series de Strava;
    - dónde: Supabase (la base) y Vercel (la app);
    - qué se lee de Strava y para qué; qué pasa con las capturas, que se mandan a la API de Anthropic solo al usarlas
      y no se guardan;
    - que no hay publicidad ni se venden datos;
    - cómo bajar los datos (respaldo), desconectar Strava y eliminar la cuenta;
    - las condiciones de uso: la app no reemplaza a un entrenador ni a un médico.
  - No inventar datos que no estén en el repo (por ejemplo, la región de los servidores): si falta algo, preguntar.
  - Links desde el login y desde Ajustes → Cuenta y datos.
- **AP-05 · Tope de la lectura de capturas.**
  - Tabla nueva `ai_usage` (usuario, mes, cantidad) con RLS, y una función que suma una lectura y dice si quedan, en
    un solo paso, para que dos pedidos a la vez no se pasen del tope. Migración y SQL para pegar.
  - `app/api/ai/json/route.ts` cuenta cada pedido (no cada imagen) antes de llamar a Claude y, si se pasó, responde el
    código `quota` sin llamarlo. El tope sale de `AI_MONTHLY_LIMIT` (30 si no está).
  - `aiErr` (`lib/domain/planForm.ts`) conoce `quota`: «Ya usaste las 30 lecturas de este mes. Se renuevan el 1.».
    Ajustes → Conexiones → «Leer capturas del reloj» dice cuántas quedan este mes.
  - Sin `ANTHROPIC_API_KEY` no cambia nada de lo que se ve.
- **AP-06 · Menos pedidos a Strava.**
  - Hoy, al abrir una sesión sin series guardadas, se buscan en Strava (hasta 5 páginas de 100) y, si no están, se
    vuelve a buscar en cada apertura de la app (`lib/data/streams.ts`). Con muchos usuarios eso gasta el límite de
    pedidos de la app, que comparten todos.
  - Hacer: recordar en la base que esa salida no está en Strava, para no buscarla de nuevo, salvo que el resultado
    cambie. Revisar si alcanza con la tabla `streams` tal como está; si hace falta migración, va con su SQL.
- **AP-07 · El nombre: Lane One.**
  - Reemplazar «My Running App» en lo que se ve: `app/layout.tsx` (título y descripción), `app/manifest.ts` (nombre y
    nombre corto de la app instalada), `app/login/LoginForm.tsx` y `components/shell/Rail.tsx` (solo el texto). El
    README también.
  - No cambiar las claves del navegador (`rr1`, `rr_theme`…), ni el formato del respaldo (`app: 'registro-running'`):
    los respaldos viejos se tienen que seguir importando.
- **AP-08 · Abrir las altas: la guía.**
  - En el README, una sección «Abrir la app al público» con los pasos que quedan, en orden:
    1. Crear la app de Strava con la cuenta del responsable y pedir la revisión. Strava suele pedir la política de
       privacidad, capturas, su botón y logo oficiales, y respetar sus condiciones. Leer las condiciones vigentes
       antes de pedirla.
    2. Cargar las variables y suscribir el webhook.
    3. Si se activa la lectura de capturas, cargar la clave y el tope.
    4. Abrir las altas en Supabase y vaciar `ALLOWED_EMAILS`.
    5. Revisar los planes de Supabase y Vercel según la gente esperada.
  - El texto del mail del link de entrada, en castellano y con el nombre nuevo, para pegar en Supabase
    (Authentication → Email Templates).
  - El botón y el logo oficiales de Strava no se bajan ahora: se agregan cuando exista la app propia.

**Hecho.** Decisiones al pasarlo:

- **AP-01.** La FC máxima «sin cargar» es un campo nuevo de la configuración, `hrSet`. Lo guardado antes (y los
  respaldos del artifact) trae su `hrMax`, así que cuenta como cargada: a nadie le cambia nada. Sin cargar, `hrMax` es
  una provisoria, 220 − edad (con 30 años si no hay edad): en Ajustes el campo queda vacío con la provisoria de fondo y
  la explicación, y el editor de tramos del plan avisa al elegir una zona de FC. Cargar las zonas a mano también cuenta
  como hecho en la bienvenida. Sin edad, el test de nivel sigue comparando con 27 años, pero lo dice («Sin tu edad») e
  invita a cargarla. Al importar un respaldo, lo que le falte se completa con la configuración de fábrica del artifact
  (`importCfgRaw`), no con la nueva: los respaldos viejos sin `races` siguen trayendo el 10K y el maratón. El ejemplo trae
  `demoCfg()`: un «10K de Palermo» dentro de un mes (con su plan desde que arrancan los datos), una media maratón, FC
  máxima 190 y 30 años; al salir vuelve la tuya.
- **AP-02.** La confirmación es un panel (como Importar): qué se borra, el botón del respaldo JSON y escribir
  «eliminar». La ruta `/api/account/delete` desconecta Strava (revoca y borra), llama a `delete_account()` y borra las
  cookies de la sesión. En el navegador se borran todas las claves que empiezan con `rr` (datos, pendientes, borrador,
  última sincronización con Strava, tema, capas del mapa). En modo local el botón dice «Borrar todo» y vuelve a la
  bienvenida.
- **AP-03.** La confirmación de «Desconectar» va en la misma fila de Strava, como la de borrar una carrera. En el
  servidor, `stravaDisconnect` y `forgetStrava` (`lib/strava/server.ts`) los comparten «Desconectar», eliminar la cuenta
  y el webhook. Los avisos de Strava no vienen firmados: antes de borrar, el webhook confirma con Strava que el permiso
  ya no anda (si todavía anda o Strava no responde, no borra nada). El borrado corre con `after()`, para responder en
  menos de 2 segundos. La clave de servicio está en `lib/supabase/admin.ts`.
- **AP-04.** La página vive fuera del shell, como el login, en `app/privacidad/` (la página con la metadata y el texto
  en un componente de cliente, porque las piezas de la Pista lo son). El login suma «Al entrar aceptás las condiciones
  de uso y la política de privacidad» con el link. No nombra la región de los servidores ni el plazo de los respaldos
  de Supabase. Dice que, si revocás el acceso desde Strava, se borra lo que vino de ahí: eso es cierto recién con el
  webhook suscripto (paso 2 de la guía).
- **AP-05.** `ai_usage` solo se puede leer: suma únicamente `ai_take(lim)` (`security definer`, contra `auth.uid()`),
  así nadie se resetea el contador. El mes es el de Argentina. Una lectura se cuenta aunque Claude falle después. Si la
  tabla no está, `/api/ai/status` igual muestra la función activada (sin el número) y leer falla con el error genérico.
- **AP-06.** Sin migración: si Strava no tiene la salida (o no tiene sus series), se guarda en `streams` una fila
  `{ none, of }` en vez de las series, con `of` = la actividad o, sin ella, la fecha y la distancia. Mientras el
  resultado sea el mismo no se vuelve a buscar. En el detalle, «No está en Strava» suma «Buscar de nuevo», por si la
  salida se subió a Strava después.
- **AP-07.** También el nombre corto de la app instalada y el título de iOS (antes «Running»). La migración inicial
  sigue diciendo «My Running App» en un comentario: ya está aplicada y no se toca.
- **AP-08.** Además de lo pedido, la guía avisa que el servicio de mails que trae Supabase es para pruebas (hace falta
  un SMTP propio para abrir) y que al cambiar de app de Strava quien ya la usaba tiene que volver a conectar. Los mails
  van en las dos plantillas que usa el link de entrada: *Magic Link* y *Confirm signup*. `.env.example` suma
  `STRAVA_WEBHOOK_VERIFY_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` y `AI_MONTHLY_LIMIT`.
- **Para probar después del deploy** (no se puede en local): aplicar las dos migraciones; eliminar una cuenta de
  prueba; desconectar Strava y ver que el Mapa queda vacío y que las sesiones siguen; con `ANTHROPIC_API_KEY`, ver
  cuántas lecturas quedan en Conexiones y el aviso al pasar el tope (por ejemplo con `AI_MONTHLY_LIMIT=1`); abrir una
  sesión cargada a mano, recargar la app, volver a abrirla y ver que no le pide nada a Strava.

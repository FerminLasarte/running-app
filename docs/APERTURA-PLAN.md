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

## Tanda B · La entrada pública

Decidida por el usuario el 27 de octubre de 2026, pensando en compartir la app en LinkedIn. Hoy cualquier link manda
directo al login (`proxy.ts`): quien llega no ve qué es la app, tiene que dejar el mail y abrir el link en el mismo
dispositivo, y recién ahí entra a una app vacía. Además, entrar depende de que Supabase mande un mail, y el servicio que
trae de fábrica es para pruebas: manda pocos mails por hora y, según varias guías, solo a las direcciones del equipo
del proyecto. Esta tanda deja una entrada que se entiende sin cuenta y que no depende de mandar mails.

Lo que necesita configuración en Supabase o en Google Cloud no se puede activar desde el código: va como pasos en el
README y como lista para el usuario al cerrar, y la interfaz no muestra lo que todavía no está configurado.

- **AP-09 · Portada pública en `/`.**
  - Hoy: `/` redirige a `/semana` (`next.config.ts`) y sin sesión todo va al login.
  - Hacer: sin sesión, `/` es la portada de Lane One. Arriba, qué es en una frase y los dos botones: «Probar sin cuenta»
    (AP-10) y «Crear cuenta» (o «Entrar» si ya tenés). Abajo, lo que hace la app: la semana con la pista, cargar y
    planificar, Análisis, Carreras con la pulsera, el Mapa y Logros. Usá las piezas de la Pista (la pista, el dorsal, la
    pulsera) con datos de ejemplo en vez de capturas pegadas. Pie con «Privacidad». Con sesión, `/` sigue yendo a
    `/semana`.
  - El estilo es el de la app (`docs/REDISENO.md`): marca deportiva, compu primero, y que en el celu se vea bien,
    porque desde LinkedIn la mayoría llega desde el teléfono.
  - Listo cuando: sin sesión, `/` muestra la portada en claro y oscuro, a 1440 y a 375 px; con sesión, va a la semana.
- **AP-10 · Probar sin cuenta.**
  - «Probar sin cuenta» entra a la app con los datos de ejemplo (`demoSessions`, `demoRoutes`, `demoCfg`), sin login y
    sin guardar nada: ni en la nube ni en `localStorage.rr1`. Se recorren todas las pantallas; lo que guardaría avisa y
    ofrece crear la cuenta (como hoy `blockDemo`). Strava, la IA, importar, exportar y eliminar la cuenta no se ofrecen.
  - Arriba, un aviso fijo: «Estás probando Lane One con datos de ejemplo. Creá tu cuenta para guardar lo tuyo.», con el
    botón. Al crear la cuenta se arranca de cero, sin los datos de ejemplo.
  - Cómo pasar el `proxy.ts`: una cookie de invitado que pone la portada (por ejemplo `lo_guest=1`), que deja pasar las
    páginas de la app pero **no** las rutas `/api/`. El arranque (`boot` en `lib/data/sync.ts`) con esa cookie y sin
    sesión entra en modo invitado. Cuidar que ningún camino escriba en la nube o en el navegador: `persistLocal`, el
    borrador, la celebración (`cfg.cel`), los trofeos vistos, las capas del mapa.
  - Listo cuando: desde la portada se entra, se recorren Semana, Registro, Análisis, Carreras, Mapa y Logros con datos,
    se abre el panel de carga y al guardar ofrece crear la cuenta; al cerrar el navegador no quedó nada guardado.
- **AP-11 · Entrar con Google.**
  - `signInWithOAuth({ provider: 'google' })` con la vuelta por `/auth/callback`, que ya existe. El botón va primero en
    el login y en «Crear cuenta», y solo aparece si `NEXT_PUBLIC_AUTH_GOOGLE=1`: así no se ve roto antes de configurarlo.
  - README: cómo crear el cliente OAuth en Google Cloud (pantalla de consentimiento, orígenes y la URL de vuelta de
    Supabase) y cómo prenderlo en Supabase → Authentication → Sign In / Providers → Google.
- **AP-12 · Entrar sin depender de mandar mails.**
  - Decidido: se saca el link por mail. Se entra con Google (AP-11) o con mail y contraseña.
  - «Crear cuenta» con mail y contraseña (`signUp`), sin mail de confirmación: en Supabase se apaga *Confirm email*
    (paso del README). Contraseña de 8 caracteres o más, y errores claros (mail ya usado, contraseña corta).
  - **Quien ya tiene cuenta con el link por mail no tiene contraseña.** En Ajustes → Cuenta y datos, «Poner contraseña»
    o «Cambiar contraseña» (`updateUser`). La guía de la mudanza del amigo hay que actualizarla con el flujo nuevo.
  - «Olvidé mi contraseña» manda un mail, así que solo aparece si `NEXT_PUBLIC_AUTH_EMAIL=1` (cuando haya un SMTP
    propio). Sin eso, el login dice «Si no te acordás, entrá con Google si usás el mismo mail, o escribile a
    fermin.lasarte@icloud.com».
  - Revisá qué pasa si alguien entra con Google con el mismo mail de una cuenta que ya existe: probá cómo lo resuelve
    Supabase y, si quedan dos cuentas separadas, avisame antes de seguir.
  - README: el SMTP propio queda como opcional (para recuperar la contraseña), con un ejemplo (Resend) y sus límites.
- **AP-13 · La vista previa del link.**
  - Para cuando se pegue en LinkedIn, WhatsApp o X: título, descripción e imagen. `metadata.openGraph` y `twitter` en
    `app/layout.tsx`, con `metadataBase` (la URL de producción de Vercel o una variable) y una imagen de 1200×630 con
    `opengraph-image.tsx` y la marca, como `app/icon.tsx`. Las guías de Next están en `node_modules/next/dist/docs/`.
  - Listo cuando: el HTML de `/` tiene las etiquetas `og:` y `twitter:` con una imagen que se puede abrir.
- **AP-14 · De `oauth/deauthorize` a `oauth/revoke`.**
  - Strava retira `oauth/deauthorize` el 1 de junio de 2027. Hoy lo usa `stravaDisconnect` (`lib/strava/server.ts`),
    que comparten «Desconectar», eliminar la cuenta y el webhook.
  - Hacer: pasarlo a `POST https://www.strava.com/oauth/revoke` **según la documentación oficial vigente**
    (developers.strava.com): qué parámetros pide y qué responde. Revisar de paso que todos los pedidos a Strava manden
    el token en el encabezado `Authorization`, que también es obligatorio desde esa fecha.

**Hecho.** Decisiones al pasarlo:

- **AP-09.** La portada es `app/page.tsx` con `components/portada/Portada.tsx` (fuera del shell, como el login y la
  privacidad) y su hoja `portada.css` (prefijo `po-`). Se saca la redirección de `/` en `next.config.ts`: el proxy deja
  ver `/` sin sesión y, con sesión, lleva a `/semana` (también desde `/login`, que antes iba a `/`). Arriba, el estadio
  con «Corré con plan.», qué es en una frase, «Probar sin cuenta» (el principal), «Crear cuenta» y el dorsal del «10K de
  Palermo»; abajo, seis tarjetas con una pieza de la Pista cada una (la pista de la semana, la estructura de tres
  sesiones, los km por semana apilados por tipo, la pulsera, la ciudad de noche y los escudos con el nivel) y un cierre
  «En sus marcas.». Los datos de muestra son fijos, no salen de `demoSessions`: así la página se arma al compilar y no
  depende de la fecha (la semana de la pista y la última barra de Análisis son la misma, 27,4 de 38 km). La ciudad de
  noche es un dibujo propio: el Mapa de verdad necesita el mapa de la Ciudad y un lienzo. El pie dice «Un proyecto de
  Fermín Lasarte» y lleva a Privacidad, Entrar y Crear cuenta. La portada no nombra a Strava: para gente de afuera todavía
  no se puede conectar.
- **AP-10.** El invitado es un modo de guardado más, `mode: 'guest'`, con `demo` prendido y los datos de `demoData()`
  (`lib/data/demo.ts`, que ahora usan también «Ver la app con datos de ejemplo»). Todo lo que ya cuidaba el modo ejemplo
  (`persistLocal`, el borrador, los festejos, los trofeos, las series) lo cuida igual; además no se recuerdan el tema
  (`rememberTheme(false)`: dura hasta recargar) ni las capas del mapa, no se registra el service worker y no se pregunta
  por la IA. La cookie `lo_guest` (`lib/guest.ts`) es de sesión; el arranque la mira solo si no hay sesión (también sin
  Supabase, para probarlo en local). Lo que guardaría avisa con «Crear cuenta» en el aviso flotante, que ahora va por
  encima de los paneles (antes quedaba tapado por el panel abierto). El aviso fijo de arriba es el único que va como
  tarjeta, con «Salir» (vuelve a la portada) y «Crear cuenta». Sin Strava, IA ni respaldo: en Ajustes no están
  Conexiones ni el respaldo ni eliminar la cuenta (Cuenta y datos ofrece crearla), y tampoco «Exportar CSV» del
  Registro, Strava del Mapa ni importar y exportar en ⌘K. «Crear cuenta» recarga la página entera: la cuenta nueva
  arranca de cero y la cookie se borra al entrar (en el navegador o en la vuelta de Google). El panel de carga ya no dice
  «Si recargás la página, lo cargado vuelve» con datos de ejemplo, porque no hay borrador.
- **AP-11.** Lo de la cuenta está en `lib/auth/client.ts` (`signIn`, `signUp`, `signInGoogle`, `sendReset`,
  `setPassword`, con los errores de Supabase dichos en castellano en un solo lugar); `LoginForm` es solo la pantalla.
  El botón usa la «G» de Google en colores y «Continuar con Google» sin mayúsculas, como piden sus pautas. Las dos
  vueltas (`/auth/callback` y `/auth/clave`) comparten `lib/supabase/authReturn.ts`. **Google con un mail que ya tiene
  cuenta** (no se pudo probar en local, sin Supabase): según la guía de Supabase y su código (`DetermineAccountLinking`),
  si el mail que da Google está verificado (siempre lo está) se suma a la cuenta que ya existe; no quedan dos. Ojo: con
  *Confirm email* apagado, cualquiera puede crear una cuenta con un mail ajeno, y si el dueño entra después con Google
  cae en esa cuenta, cuya contraseña sigue andando. Es el costo de no mandar mails; con SMTP propio se puede volver a
  prender *Confirm email*.
- **AP-12.** El login tiene tres modos: Entrar, Crear cuenta (`/login?modo=crear`, el link de la portada) y, solo con
  `NEXT_PUBLIC_AUTH_EMAIL=1`, «Olvidé mi contraseña», que manda el link a `/auth/clave` y de ahí a Ajustes con el campo
  de la contraseña abierto (una ruta aparte y no `?next=` para que en Supabase alcance con la dirección exacta). Si
  *Confirm email* quedara prendido, «Crear cuenta» avisa que llegó un mail en vez de fallar. En Ajustes → Cuenta y
  datos, «Poner contraseña» o «Cambiar contraseña» en la misma fila: Supabase no dice si alguien tiene contraseña, así
  que la app guarda `has_password` en los datos de la cuenta al crearla o ponerla (quien entraba con el link por mail
  ve «Poner»). «Borrar todo» en modo local ahora vuelve a `/semana` (en `/` está la portada). La privacidad suma lo que
  pasa Google (mail, nombre y foto) y que probar sin cuenta no guarda nada, y ya no dice que Supabase manda el mail de
  entrada. En el README: Confirm email, la contraseña de 8, Google paso a paso, el SMTP con Resend (necesita un dominio
  propio; 100 mails por día y 3.000 por mes gratis) y la plantilla *Reset Password*; salen las del link mágico. **La guía
  de la mudanza del amigo** (el artifact «Mudanza a My Running App») queda para actualizar con el deploy: si se cambia
  antes, describe un login que todavía no existe.
- **AP-13.** `metadataBase` sale de `SITE_URL` o, si no está, de la URL de producción que pone Vercel
  (`VERCEL_PROJECT_PRODUCTION_URL`). La imagen (`lib/ogImage.tsx`, usada por `app/opengraph-image.tsx` y
  `app/twitter-image.tsx`) es el estadio con los andariveles, la marca, «Corré con plan.» y la bajada; se arma al
  compilar. next/og no lee las letras de next/font: la Archivo angosta e itálica está en `assets/fonts` con su licencia
  OFL, y la Geist sale de next/og. El proxy no pasa por esas dos imágenes (si no, quien no entró vería el login).
- **AP-14.** Según developers.strava.com (consultado el 27 de octubre de 2026): `POST /oauth/revoke` con las
  credenciales de la app en Basic (`client_id:client_secret`), el token en el cuerpo (`token`, y `token_type_hint`
  opcional) como formulario; responde 200 vacío, encuentre o no el token, y revocar el refresh token revoca también sus
  access tokens. `stravaDisconnect` revoca el refresh token (no vence). Los pedidos a la API ya mandaban el token en
  `Authorization: Bearer`; el de `/oauth/token` manda las credenciales en el cuerpo, como pide Strava. La documentación
  no menciona lo del encabezado obligatorio desde 2027. Aparte: el registro de cambios de Strava anuncia una URL nueva
  para la API, `https://api-v3.strava.com`, disponible desde el 4 de enero de 2027 (no dice cuándo deja de andar la de
  ahora); queda para una tanda futura.
- **Para probar después del deploy** (no se puede en local, sin Supabase):
  - con sesión, `/` y `/login` llevan a la semana; sin sesión, `/` muestra la portada y `/semana` va al login;
  - pegar el link en LinkedIn (Post Inspector) y WhatsApp: título, descripción e imagen;
  - «Probar sin cuenta» en el celu: entra, recorre todo, y `/api/strava/status` sigue respondiendo 401;
  - crear una cuenta con mail y contraseña: entra enseguida, sin mail, y arranca de cero (sin los datos de ejemplo);
  - el mismo mail otra vez en «Crear cuenta»: «Ya hay una cuenta con ese mail…»;
  - salir y entrar con esa contraseña; una mal: «Mail o contraseña incorrectos.»;
  - con Google prendido: entrar con Google con un mail nuevo y con el de una cuenta que ya existe (tiene que ser la
    misma cuenta, con sus datos);
  - el corredor (cuenta del link por mail): Ajustes → Cuenta y datos → «Poner contraseña», salir y entrar con ella;
  - con SMTP propio: «Olvidé mi contraseña», el link lleva a Ajustes con el campo abierto, y la contraseña nueva anda;
  - desconectar Strava con una cuenta conectada: en strava.com/settings/apps la app ya no tiene acceso.

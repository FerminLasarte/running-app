# Plan de arreglos: lo que se perdió del original

Después del rediseño «Pista» se comparó la funcionalidad de la app contra el artifact original (`reference/index.html`,
solo en la carpeta principal del repo), botón por botón y cálculo por cálculo. El informe completo es un artifact
privado de claude.ai, «Original contra Pista» (https://claude.ai/artifact/2if4Sy3JdTXUTEYsDb3BAX); este plan tiene
todo lo que hace falta para trabajar sin abrirlo.

Lo que dio el informe, en corto:

- **La lógica está intacta.** Puntaje, estadísticas, carga, deriva, predicción, trofeos, XP, nivel, atributos,
  desafíos y datos de ejemplo dan lo mismo en las dos apps (se corrieron las dos con los mismos datos).
- **El respaldo JSON del original se importa completo.** Los recorridos del mapa no viajan, igual que antes: se traen
  con «Sincronizar» de Strava.
- **Lo que falta son accesos, avisos y algunos detalles** que quedaron en el camino al rehacer las pantallas. Este
  plan los ordena en tandas.

Cada hallazgo tiene un código (`SEM-01`, `SES-02`…) que es el mismo del informe. Las líneas del original son de
`reference/index.html`.

## Cómo trabajar

- **Cada tanda es una rama y un PR**, como las fases del rediseño. Al cerrarla se agrega abajo de la tanda un
  «Hecho. Decisiones al pasarlo…» con lo que se resolvió distinto de lo escrito acá.
- **Las tandas 2 a 6 tocan archivos distintos** y pueden ir en paralelo, cada una en su copia del repo. Si hay que
  elegir, la 2 va primero: es la de uso diario.
- Leer `AGENTS.md` (Next 16: las guías están en `node_modules/next/dist/docs/`) y `docs/PORTING.md` (cómo está armado
  el código y sus reglas: no mutar `S`, piezas `p-`, tokens de color, accesibilidad).
- Las reglas de siempre: no duplicar lógica, cada cambio con un motivo, preguntar cuando la duda cambia el resultado.
  Si hiciera falta una migración de Supabase, no usar `supabase db push`: pasar el SQL para pegarlo en el SQL Editor.
- **Antes de cerrar:**
  - `npx tsc --noEmit` y `npx eslint app components lib proxy.ts`. `npm run lint` también revisa
    `.claude/worktrees` (las copias de otras sesiones) y da errores que no son del cambio.
  - `npm run build`.
  - Probar en el navegador con `next dev` en modo local (sin `.env.local` no hay Supabase), con datos y sin datos.
    Guardar `localStorage.rr1` antes y restaurarlo al terminar.
- **Ojo con el panel del navegador escondido:** la página corre en segundo plano y `requestAnimationFrame` no avanza
  (`afterPaint`, `focusField`, las animaciones). Para probar foco o animaciones con el panel escondido, reemplazar en
  la página `requestAnimationFrame` por `cb => setTimeout(() => cb(performance.now()), 16)`.
- Lo que necesita Strava o la nube no se puede probar en local: dejarlo en el PR como lista para tildar después del
  deploy.

## Tandas

### Tanda 1 · Accesos y avisos de todos los días

Hecha en el PR #17 (falta probarla en la vista previa y mergearla).

- «Otra salida» de Strava vuelve a mostrar la lista (CGA-02).
- El tipo se puede cambiar al editar una sesión sin plan (CGA-01).
- «N de M salidas» debajo de la racha en Semana (SEM-02).
- «Cargar tiempo» abre la carrera en Ajustes con el foco en el tiempo (`editRace`) (CAR-02).
- Deshacer la recalibración desde el aviso y desde ⌘K (CAR-01).
- La celebración espera la primera lectura de la nube (`S.fresh`) (LOG-01).
- Aviso al volver de conectar Strava y «Conectar con Strava» en el Mapa (STR-02, STR-03).

### Tanda 2 · Semana, Strava y el panel de carga

Decidido por el usuario al cerrar el informe: SEM-01 y SEM-03 vuelven a ser como en el original.

- **SEM-01 · Las sesiones «no hecha» cuentan en el plan de la semana.**
  - Original: la pista suma el plan de **todas** las sesiones de la semana, también las no hechas, y una hecha suma
    su km planificado (`planKm = sum(wk.map(planKmOf))`, 2475–2486). «Sesiones» compara contra todas las que tienen
    plan (2328, 2366). Sin nada planificado, la barra mide salidas contra el objetivo semanal (`doneN/weeklyGoal`,
    2477).
  - Hoy: `weekTotalKm` (`lib/domain/week.ts:27-35`) suma lo hecho más lo planificado que falta, sin las no hechas, y
    «Sesiones» compara contra `live` (`components/semana/WeekBoard.tsx:138, 186-187`). Sin plan, la pista se llena
    con cualquier salida (`components/pista/sport.tsx:35`).
  - Hacer: volver a la regla del original en `weekTotalKm` y en «Sesiones». Sin plan, que la pista mida salidas
    contra `weeklyGoal`. `weekTotalKm` también se usa en Análisis → Volumen (`components/analisis/Volumen.tsx:69`):
    revisar que ahí siga teniendo sentido. Cambiar el comentario de `weekTotalKm`.
  - Listo cuando: con un tempo de 11,5 km marcado «no hecho», un regenerativo de 6 y un fondo de 14 sin hacer, la
    pista dice «0 de 31,5 km» y «Sesiones 0 de 3».
- **SEM-03 · Emparejar sola la corrida de Strava con la sesión planificada.**
  - Original: `svGo` y `svType` (2959, 2997–3007). Al cargar una corrida: la planificada pendiente del mismo día, o
    la más cercana (±3 días) del tipo que adivina `svType` por el nombre («6x800» → series, «tempo», «fondo/largo»,
    «suave/regen»). Si no hay, sesión libre con ese tipo. Se borraron en la fase 12 como lógica sin uso.
  - Hoy: desde ⌘K («Traer la salida de Strava») y Registro («Traer de Strava») el panel de carga abre con
    `svLoad` y arranca con la última pendiente (`lib/domain/resultForm.ts:285`).
  - Hacer: recuperar `svType` y la elección de `svGo` en `lib/domain/`, con su nombre, y usarlas al elegir una
    corrida en el panel de carga (`components/panels/ResultPanel.tsx`, `svPick` y `svLoad`): si la sesión elegida en
    el panel no corresponde a la corrida, pasar a la que corresponde (o a libre con el tipo adivinado). Si el
    corredor ya eligió a mano una sesión, no cambiársela.
  - Listo cuando: con una series planificada el martes, traer de Strava una corrida del martes llamada «6x800» deja
    elegida esa series; una corrida del miércoles sin plan llamada «Fondo largo» queda libre como fondo.
- **SEM-05 · Comparación con la semana anterior.**
  - Original: la revisión de la semana mostraba el Δ de km, sesiones, puntaje y tiempo contra la semana anterior
    cerrada, y avisaba una subida fuerte (más de 30 % de km: «cuidá la próxima») (2351–2387).
  - Hoy: la fase 3 sacó la lista de textos y, sin decirlo, también los Δ. Los números al costado de la pista no se
    comparan con nada (`WeekBoard.tsx:182-208`).
  - Hacer: el Δ chico debajo de cada número (con la pieza de Δ que ya existe en `components/pista/controls.tsx`) y el
    aviso de subida fuerte. Sin la lista de textos (decidido en la fase 3).
- **CGA-04 · El plan y sus notas en el panel de carga.**
  - Original: una caja «Plan: tipo · estructura» con las notas del plan, también al editar (5642).
  - Hoy: cada opción muestra la estructura breve, pero las notas del plan no aparecen, y al editar en el modo simple
    no queda ninguna referencia al plan (`ResultPanel.tsx:82-85`).
  - Hacer: mostrar las notas del plan de la sesión elegida (y al editar, el resumen del plan).
- **SEM-06 · «(liviana)» en la semana de descarga.** La fase del plan dice siempre «semana n de N», sin marcar la de
  descarga (`WeekBoard.tsx:46-63`; original 2478). Agregar «· liviana» cuando `blockWeekOf` da una de descarga.

### Tanda 3 · Detalle de sesión

Decidido por el usuario: SES-01 vuelve a las vueltas del reloj.

- **SES-01 · Vueltas del reloj.**
  - Original: «Ver parciales de Strava» traía las vueltas del reloj (`get_activity_performance` → `laps`, hasta
    40) con ritmo, FC y distancia, la mejor resaltada y las de menos de 500 m en gris, y abajo primera mitad contra
    segunda (3030–3061, `dt-laps`).
  - Hoy: parciales de 1 km armados con las series (`lib/domain/streams.ts:119-130`,
    `components/sesion/LapsPanel.tsx:181-195`). En las series mezclan trabajo y pausa, y con etapas cargadas no
    aparecen nunca (`LapsPanel.tsx:173-179`).
  - Hacer: en una sesión de Strava sin etapas, mostrar las vueltas del reloj. Si el reloj no marcó vueltas (una sola,
    o todas de 1 km automáticas), quedan los parciales por km. Pedir las vueltas una vez y guardarlas junto con las
    series (la tabla `streams` ya guarda un JSON por sesión: sumarlas ahí evita otra migración).
  - Listo cuando: una series de 6×800 cargada como total muestra 13 vueltas (calentamiento, 6 repeticiones, 5 pausas
    y enfriamiento) con su ritmo y FC.
- **SES-02 · Plan contra real por etapa.** La tabla perdió la distancia o el tiempo planificado de cada etapa y su
  FC máxima (`LapsPanel.tsx:77-85`; original 5925–5941). Sumar «Plan» (con `stepDesc`) y la FC máxima.
- **SES-03 · Ritmo total.** Con parte principal y objetivo, el ritmo promedio total no aparece
  (`components/sesion/Sesion.tsx:61`; original 5970–5978). Mostrarlo en la nota del número.
- **SES-04 · Deriva que no se pudo medir.** Con `result.dec = {na: 1}` dice «Sin medir: se calcula en Análisis»,
  pero Análisis nunca la recalcula (`Sesion.tsx:53-57`, `lib/domain/dec.ts:101`). Decir «No se pudo medir».
- **SES-05 · Notas del puntaje sin número.** El panel del puntaje solo se dibuja si hay número, y el número dice
  siempre «Sin plan para comparar», aunque haya plan (`Sesion.tsx:74, 186`; original `scoreMini`, 5980–5983). Mostrar
  las notas y el texto que corresponda.
- **SES-06 · Repeticiones sin plan.** El análisis de repeticiones no sale en una serie sin plan ni series de Strava
  (los tiempos en las notas) (`LapsPanel.tsx:197`; original 6021).
- **SES-09 · «0 km» en un plan por duración.** El título de una sesión por hacer planificada solo por minutos dice
  «0 KM» (`Sesion.tsx:34`). Usar los minutos.
- **SES-10 · Color del Δ.** Ir más rápido que el rango sale en verde aunque el puntaje lo penalice
  (`components/pista/controls.tsx:58-61`, usado en `LapsPanel.tsx:31`). Que el Δ fuera de rango no sea «bueno».

### Tanda 4 · Análisis y Registro

Decidido por el usuario: ANA-01 y ANA-02 se arreglan.

- **ANA-01 · Filtros de «Tu corazón» y «Ritmo a N lpm».**
  - Original: `easyHrRuns()` (4237–4246) usaba solo fondos y regenerativos con FC media de 110 o más, 3 km o más,
    ritmo entre 4:00 y 9:30/km, sin «camin» en la nota, y con 6 salidas o más sacaba los valores atípicos (fuera de
    1,5 × el rango intercuartil). El texto lo decía: «Dejo afuera las salidas con caminatas y los valores fuera de lo
    normal» (4275).
  - Hoy: `hrPace()` y `refHr()` salen de `effPoints()` sin filtros (`lib/domain/analysis.ts:148-179`). Se borró en la
    fase 12.
  - Hacer: recuperar `easyHrRuns` con su nombre en `lib/domain/analysis.ts` y usarla en lugar de `effPoints()` en
    esas dos. Sumar el texto al pie.
- **ANA-02 · Mínimo de datos en la preparación.**
  - Hoy: `readyScore` promedia los chequeos con datos (`lib/domain/readiness.ts:23-26`), pero «Molestias» nunca queda
    en gris (115-116): sin datos da 100 y «faltan datos» no aparece nunca (`components/analisis/Forma.tsx:56`).
  - Hacer: puntaje solo con 3 chequeos con datos o más. Con menos, «Faltan datos» y cuántos hay (por ejemplo, «1 de
    7 con datos»).
- **REG-01 · Notas en el Registro.** Cada fila mostraba la nota del resultado, la del plan o el resumen (4057). Hoy se
  calcula (`LgInfo.txt`, `lib/domain/log.ts:70`) y solo va al CSV. Mostrarla en la fila, recortada, sin agregar una
  columna ancha.
- **REG-02 · Ritmo del CSV.** La tabla y el orden usan el ritmo principal y el CSV, el promedio (`log.ts:159` contra
  `components/pista/session.tsx:91`). Que el CSV exporte el mismo ritmo que se ve, o los dos con su nombre.
- **REG-03 · Puntaje viejo al cambiar Ajustes.** Las filas del Registro se memorizan sin mirar la configuración
  (`components/registro/Registro.tsx:86-92`): después de cambiar la FC máxima o las zonas, el puntaje medio y el orden
  pueden quedar viejos. Verificarlo primero en el navegador.
- **ANA-06 · Las frases de la forma.** Volvieron solo los rótulos («Cargado», «Fresco»). Recuperar la frase de cada
  estado (4223: «Venís acumulando más de lo que asimilás…», «Descansado: el estado ideal para competir.»), con el
  nombre nuevo (Forma = frescura).
- **ANA-07 · Línea del ritmo objetivo** en «Evolución del ritmo» (original 2605–2607; `components/analisis/Ritmo.tsx:104-158`).
- **ANA-16 · Zona de FC de cada ritmo.** Está en los datos (`lib/domain/daniels.ts:41-45`) y no se muestra
  (`Ritmo.tsx:231-247`).
- **ANA-15 · «Ver tabla».** Opcional: los gráficos no tienen tabla ni lectura con teclado (`components/pista/charts.tsx`).
  Si va, que sea en la pieza, para todos los gráficos a la vez.

### Tanda 5 · Carreras

- **CAR-03 · Sin hora de largada, avisar** «Cargá la hora de largada en Ajustes y te armo el horario del día», con un
  botón que abra la carrera (`editRace`) (original 3149; `lib/domain/race.ts:291-294`).
- **CAR-04 · Consejo de calor y agua** el día de la carrera (original 3148), en la lista del día o al pie del horario.
- **CAR-05 · Semanas de descarga en el plan por bloques.** `blockPlan` calcula `label` y `deload`
  (`lib/domain/blocks.ts:93-103, 139`) y `components/carreras/BlocksPanel.tsx` no los muestra. Marcar la semana
  liviana y su nombre, y el cuadro «Esta semana (descarga)…» (3408–3411).
- **CAR-06 · Número de semana del plan.** Las columnas dicen la semana del año (`S43`, `BlocksPanel.tsx:99`) y el pie
  habla de la semana del plan. Usar el número del plan y la fecha del lunes.
- **CAR-07 · Predicción.** La explicación de Riegel (exponentes 1,06 y 1,10, tope 3 % por mes) y el aviso de que el
  test es anterior a tus últimas series («ya no refleja cómo estás») no están en ningún lado (original 2754–2786).
  Sumarlos como texto chico al pie de la estrategia, donde está el escenario «Realista».
- **CAR-10 · Referencia escrita a mano en Recalibrar.** Se lee al salir del campo, y con ⌘↵ sin salir puede aplicar
  una recalibración de 0 sesiones y mover la referencia (`components/panels/RecalPanel.tsx:66, 96`). Leerla en cada
  cambio, como el original (6386).
- **CAR-16 · Año en la fecha** del estadio cuando la carrera no es de este año (`components/carreras/Hero.tsx:53`;
  original `raceDateLabel`, 2320).

### Tanda 6 · Sueltos

- **CGA-03 · Errores de la lectura de capturas.** `aiErr` (`lib/domain/planForm.ts:42-50`) no conoce los códigos que
  devuelve el servidor (`bad_image`, `refusal`, `bad_output`, `too_many`, `api_error`; `app/api/ai/json/route.ts`) ni
  `network` (`lib/ai/client.ts:61`): casi todo cae en «No pude leerlo ahora». Agregar cada uno con su mensaje.
- **MA-01 · Período del mapa.** Cambiar el período no reencuadra ni suelta la salida y el barrio elegidos, y la
  tarjeta puede mostrar una salida que el mapa no dibuja (`components/mapa/MapaCanvas.tsx:238-249, 422-425`,
  `components/mapa/Card.tsx:16`; original 6152).
- **MA-02 · Barrio en el celu.** Tocar un barrio en la lista no sube hasta el mapa (`components/mapa/Mapa.tsx:50-66`;
  original 6161-6165).
- **MA-03 · Leyenda de las zonas pintadas.** Falta «1 vez … N veces» (`Card.tsx:86-88`; original 4746).
- **STR-04 · Desconectar Strava.** La barra de arriba sigue diciendo «Strava» hasta recargar
  (`components/shell/useStravaStatus.ts:12-19`). Que el estado sea uno solo para toda la app.
- **LOG-05 · Últimas ganancias.** Se ven 3 en vez de 12 y «XP este mes» se oculta en el celu
  (`components/logros/Hero.tsx:73`, `Road.tsx:30-35`).
- **LOG-07 · Desafíos.** Sin salidas ni desafíos, el panel no aparece y solo se crea desde ⌘K
  (`components/logros/Logros.tsx:28`); el aviso dice «Tocá «Borrar»» y el botón es un tacho (`Challenges.tsx:24`).

## Lo que queda como está

Cambiaron respecto del original, no los decidió ninguna fase, y no vale la pena tocarlos. Si alguno importa, pasa a
una tanda.

- Semana: la próxima sesión arranca mañana y la de hoy va en el estadio (SEM-07); solo la próxima carrera, sin
  saludo, y el chip del día sin FC (SEM-08, SEM-09, SEM-11).
- Análisis: «Si corrieras hoy» usa Daniels y la estrategia usa Riegel (ANA-05); los chequeos de preparación en orden
  fijo (ANA-09); totales del Registro con puntaje en vez de FC (ANA-10); en el celu se ordena por las columnas
  visibles (ANA-13); los filtros no se recuerdan al volver por la barra lateral (ANA-14).
- Logros: el «+XP» de lo que llega de la nube cuenta solo los trofeos (LOG-03); cambiar el objetivo semanal festeja
  con el próximo dato (LOG-04); el desafío de plan muestra sesiones en vez de % (LOG-06); «Nivel A → B» (LOG-12).
- Carreras: la estrategia por tramos sin el texto de salida del maratón (CAR-08); «De dónde sale el ritmo realista»
  solo con «Realista» elegido (CAR-09); el día de la carrera se carga el tiempo recién al día siguiente, igual que
  antes (CAR-17).
- Carga y detalle: la fecha del plan con las flechas de semana (CGA-05); los totales raros de un plan todo por tiempo,
  igual que antes (CGA-08); la línea «Plan: …» (SES-07); las series de Strava se piden solas al abrir (SES-08).
- Strava y Ajustes: «Última sincronización» por navegador (SV-06); permiso parcial de actividades privadas (SV-07);
  la foto ya no reemplaza al logo (AJ-06).

Lo decidido en las fases 3 a 12 de `docs/REDISENO-PLAN.md` (el Top 10 de Logros, los km por mes de Análisis, la lista
de Strava de la Semana, etc.) tampoco se toca.

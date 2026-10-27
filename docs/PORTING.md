# Guía del código: del artifact a la app de hoy

La app nació como port a Next.js del artifact original de claude.ai (un solo `index.html`, que no está en el repo; los
números de línea que aparecen en los comentarios son de ese archivo). La lógica se pasó con los mismos nombres y los
mismos cálculos. La interfaz se rehízo después entera con el rediseño «Pista» (`docs/REDISENO.md` y
`docs/REDISENO-PLAN.md`): de la app vieja no queda ni el CSS ni los componentes.

## Reglas

1. **Mismos nombres en el dominio.** Las funciones que vienen del original conservan su nombre. Las que no dibujan
   nada van a `lib/domain/*.ts` (puras, sin estado ni DOM, salvo leer `S`); las que dibujan son componentes
   `PascalCase` en `components/**`. Lo nuevo sigue el mismo estilo que lo de al lado.
2. **Estado.** `S` (de `@/lib/store`) es un proxy de solo lectura del estado actual: el dominio lee `S.cfg`,
   `S.sessions`, `S.routes`, `S.demo`… **Nunca mutes** `S.x` ni objetos del estado:
   - datos: `saveSession`, `saveSessions`, `deleteSession`, `saveCfg` y `saveRoutes` de `@/lib/data/actions`
     (copiá con `{...s}` o `cleanObj` antes de cambiar; las sesiones son inmutables porque el puntaje se guarda en
     caché por objeto);
   - la semana que se ve (`weekOff`): `setS({...})` o `weekGo(d)`;
   - estado de una vista que tiene que sobrevivir al cambio de página (`map`, `ajEdit`, `chDel`, `recalUndo`…):
     `useUi(key, init)`, `getUi` y `setUi`;
   - lo que se comparte o sobrevive a recargar (filtros, pestañas, períodos): en la URL, con `useParam`
     (`components/shell/useParam.ts`) o como en `components/registro/filters.ts`;
   - lo de un formulario: `useState` adentro del panel.

   Los componentes se suscriben con `useS()` (se redibujan ante cualquier cambio de datos, no ante `saving`, `toast`,
   `sheet`, `failed`, `cloudLost` ni el abrir y cerrar de paneles: quien los muestra usa `useApp(selector)`). Un
   cálculo caro que piden varias piezas va envuelto en `memoData` (`@/lib/domain/memo`).
3. **Sin DOM imperativo sobre nodos de React.** Nada de `innerHTML`, `textContent` ni `classList` sobre lo que dibuja
   React: usá estado. El lienzo del Mapa y las medidas (`getBoundingClientRect`) sí, con `useRef`. La única excepción
   es `weekGo`, que reinicia la animación del cambio de semana (`.sem-slide`).
4. **Estilos.** CSS plano en `app/styles/`, en capas (`tokens.css` define el orden): `tokens`, `base`, `shell`,
   `components` (las piezas, con el prefijo `p-`) y `screens` (una hoja por pantalla, con su prefijo: `sem-`, `reg-`,
   `an-`, `car-`, `mapa-`, `lo-`, `aj-`, `ses-`). Las hojas de las pantallas las importa su componente. `base.css` pone
   `h1`, `h2`, `h3`, `p` y `ul` sin margen (los espacios van con padding o gap) y el cuerpo en 16 px; los paneles y las
   pantallas fijan los 14 px del boceto. Los colores salen siempre de los tokens (`--ink`, `--acc`, `--t-fondo`…), en
   claro y oscuro.
5. **Movimiento.** Con «reducir movimiento», `base.css` corta animaciones y transiciones, y el JS que anima (aviso,
   celebración, cambio de semana, «Repetir» del Mapa, números que suben) pregunta antes `reduceMotion()`.
6. **Accesibilidad.** Todo se usa con teclado y el foco se ve (el borde tartán de `base.css`). Los íconos sueltos van
   con `aria-hidden`; los botones de solo ícono, con `aria-label`; los gráficos, con su lectura en texto (`p-sr`).
7. **TypeScript estricto**, sin `any` salvo al leer datos de afuera (respaldos, Strava). Tipos en
   `lib/domain/types.ts`.
8. **Comentarios** pocos, en castellano rioplatense, explicando el porqué.

## Dónde está cada cosa

- Páginas: `app/(app)/<sección>/page.tsx`, dentro del shell (`components/shell/AppShell.tsx`), que dibuja solo en el
  navegador. Cada pantalla vive en `components/<sección>/` (`semana`, `registro`, `analisis`, `carreras`, `mapa`,
  `logros`, `ajustes`, `sesion`). El login está en `app/login/`.
- Piezas del sistema: `components/pista/` (botones, campos, paneles, estado vacío, medidores, gráficos, pista, dorsal,
  pulsera…). En desarrollo se ven todas juntas en `/sistema`.
- Paneles: `components/panels/`, registrados en `registry.tsx`; se abren con `openSheet(kind, props)`.
- Shell: barra lateral y de abajo (`Rail`), barra de arriba (`TopBar`), avisos (`Banners`), paneles (`PanelHost`),
  paleta ⌘K (`Palette`), aviso flotante (`Toast`), atajos (`useShortcuts`) y la marca (`BrandMark`, que también usan el
  login y los íconos de `lib/appIcon.tsx`).

## APIs principales

- `@/lib/store`: `useApp`, `useS`, `S`, `setS`, `getUi`, `setUi`, `useUi`, tipo `AppState`.
- `@/lib/domain/util`: `pad clamp sum sod ymd pd addDays mondayOf dayDiff isoWeek daysTo todayS cap plural monthOf fmt
  num fmtPace fmtDur newId cleanObj norm nf dateLabel dShort agoTxt kmByMonth DF_WD DF_D DF_M DF_MY DF_LONG WD WEATHER
  REASONS`.
- `@/lib/domain/config`: `TYPES TYPE_KEYS isType ZN zoneRange zoneIdx zoneOf racePaceSec PHASE_KEYS RACE_PRESETS
  normRace normShoe normCfg defaultCfg defaultCfgRaw racesSorted upcomingRaces nextRace pastRaces refRace isLong
  longTarget easyActive activeShoes mainShoe shoeById`.
- `@/lib/domain/stages`: `KINDS REC_PACE expand isRep stepDesc stepTgt stepsBrief planTotals cleanStep cleanSteps
  cleanStage legacySteps stageTotals normSession`.
- `@/lib/domain/score`: `volScore bandOf fadeOf fadePen driftPen driftTxt scoreFlat judge testScore lineScore judgeTxt
  partLabel volTxt lapTxt partText scoreStaged scoreSession keyPace riegel`.
- `@/lib/domain/stats`: `sdate doneList kmBetween kmByType weekSeries monthSeries streakInfo loadInfo deloadInfo
  effPoints stepKm planKmOf hrRangeOf weekStats planSummary`, tipo `DoneSession`.
- `@/lib/data/actions`: los guardados de arriba, `blockDemo()`, `demoOn()`, `demoOff()`, `toast(msg, ms?, action?)`,
  `toastUndo(msg, run)`, `buzz(ms?)`, `weekGo(d)`, `addRace(km?, name?)`, `focusField(id)`, `goLogros(parte?)`,
  `goAjustes(parte?)`, `goRaces()`, `goShoes()`.
- `@/lib/nav`: `navigate(href, then?)` (navega con el router de Next; `then` corre con la página nueva ya dibujada),
  `sessionHref(id)`, `goSession(id)`, `afterPaint(fn)`.
- `@/lib/sheets`: `openSheet(kind, props?)`, `closeSheet()`, `requestClose()` y `useSheetDirty(dirty)` (pregunta antes
  de cerrar si hay cambios sin guardar).
- `@/lib/strava/client`: `svCall(tool, input)` con las herramientas del conector del original (`list_activities`,
  `get_activity_performance`, `get_activity_streams`), `stravaErrMsg(e)` y `runActs(pl)`.
- `@/lib/ai/client`: `aiAvailable()`, `aiStatus()` (con las lecturas del mes y el tope) y `aiJson(prompt, { images? })`.
  Sin `ANTHROPIC_API_KEY` devuelve `null` y la interfaz esconde lo de IA.
- Sin señal: los paneles viajan en su propio archivo de JS (`components/panels/preloadable.tsx`) y se bajan al rato de
  arrancar; `public/sw.js` guarda las páginas para que la app instalada abra sin conexión.

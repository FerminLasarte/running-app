# Guía del port: artifact → Next.js/React

Fuente original (solo lectura): `reference/index.html` (CSS en líneas 4–1445, JS en 1464–6438; los números de línea
de esta guía son de ese archivo). Copia viva del original con datos de ejemplo: `http://localhost:8787/`
(botón «Ver la app con datos de ejemplo»). La app nueva corre con `npm run dev` en `http://localhost:3000`.

## Reglas

1. **Fidelidad.** Mismo texto (es-AR), mismos cálculos, mismos nombres de clases CSS y mismos ids de elementos que
   el original: `app/globals.css` es el CSS original (más el vidrio nuevo), así que si el markup coincide, se ve igual.
2. **Mismos nombres.** Cada función del original conserva su nombre al portarla. Las funciones de dominio (no
   devuelven HTML) van a `lib/domain/*.ts`; las que devuelven HTML pasan a ser componentes `PascalCase` en
   `components/**`. Ejemplo: `readyItems()` → `lib/domain/readiness.ts`, `readyCard()` → `<ReadyCard/>`.
3. **Estado.** `S` (de `@/lib/store`) es un proxy de solo lectura del estado actual: el dominio puede leer
   `S.cfg`, `S.sessions`, `S.routes`, `S.demo`… igual que el original. **Nunca mutes** `S.x` ni objetos del estado:
   - datos: `saveSession`, `deleteSession`, `saveSessions`, `saveCfg`, `saveRoutes` de `@/lib/data/actions`
     (copiá con `{...s}` / `cleanObj` antes de cambiar; las sesiones se tratan como inmutables porque el puntaje se
     cachea por objeto);
   - preferencias de vista del original (`S.paceType=…`, `S.topSort=…`, `S.weekOff`, `S.sumSub`…): `setS({...})`;
   - estado propio de una vista que el original guardaba en `S` (`S.lg`, `S.map`, `S.svw`, `S.dec`, `S.cSub`,
     `S.logSub`, `S.lapsCache`, `S.raceDel`, `S.chDel`, `S.recalUndo`…): `useUi('lg', init)` / `getUi` / `setUi`;
   - estado local de un formulario (lo que era `F`): `useState` dentro de la hoja.
   Los componentes de vista se suscriben con `useS()` (re-render ante cualquier cambio, como `render()`).
4. **Eventos.** El original usa `data-a="accion"` y la tabla `const A={…}` (líneas 6151–6400). Para cada botón que
   portes, buscá su entrada en `A` y convertila en un `onClick`. Podés dejar el atributo `data-a` (algunos estilos
   lo usan), pero la lógica va en el handler.
5. **HTML con strings → JSX.** `esc()` desaparece (React escapa). Donde el original arma texto con `<b>` adentro,
   devolvé JSX. `style="--tc:..."` → `style={{ '--tc': x } as React.CSSProperties}`.
   `innerHTML` solo para los SVG de íconos estáticos si hace falta (`dangerouslySetInnerHTML`).
6. **Sin DOM imperativo sobre nodos de React.** Nada de `$('#x').innerHTML = …`, `textContent`, `classList` sobre
   elementos que dibuja React: usá estado. Canvas (mapa) y medidas (`getBoundingClientRect`) sí, con `useRef`.
7. **Números que cuentan.** `cuN(v,d)` → `<CountUp v={v} d={d}/>` (`@/components/ui/CountUp`).
8. **«Cómo se lee» y tablas.** El original agrupa al final de cada `.card` los `<details class="tv">` contiguos dentro
   de `<div class="tv-row">` (función `groupTv`). En React escribilos ya agrupados: `<div className="tv-row">…</div>`.
9. **Animaciones de entrada.** No hace falta agregar `rise` ni `--i`: el shell las pone al cambiar de pestaña.
10. **TypeScript estricto**, sin `any` salvo al leer datos externos (respaldos, Strava). Tipos en `lib/domain/types.ts`.
11. **Comentarios** como en el original: pocos, en castellano rioplatense, explicando el porqué.
12. No toques archivos fuera de tu porción salvo para importar. Si necesitás algo de otra porción que no existe
    todavía, importalo igual con el nombre del original desde el módulo que indica la tabla; se integra al final.

## APIs disponibles (ya escritas)

- `@/lib/store`: `useApp`, `useS`, `S`, `setS`, `getUi`, `setUi`, `useUi`, tipos `Tab`, `AppState`.
- `@/lib/domain/util`: `pad clamp sum sod ymd pd addDays mondayOf dayDiff todayS cap fmt num fmtPace fmtDur newId
  cleanObj norm nf dateLabel dShort DF_WD DF_D DF_M DF_MY DF_LONG WD WEATHER REASONS`.
- `@/lib/domain/config`: `TYPES TYPE_KEYS isType ZN zoneRange zoneIdx zoneOf racePaceSec PHASE_KEYS RACE_PRESETS
  normRace normShoe normCfg defaultCfg defaultCfgRaw racesSorted upcomingRaces nextRace pastRaces refRace isLong
  longTarget easyActive activeShoes mainShoe shoeById`.
- `@/lib/domain/stages`: `KINDS REC_PACE expand isRep stepDesc stepTgt stepLine stepsBrief planTotals cleanStep
  cleanSteps cleanStage legacySteps stageTotals normSession`, tipo `ExStep`.
- `@/lib/domain/score`: `volScore bandOf fadeOf fadePen driftPen driftTxt scoreFlat judge testScore lineScore
  judgeTxt partLabel volTxt lapTxt partText scoreStaged scoreSession keyPace riegel`, tipos `Score ScorePart Band Judge`.
- `@/lib/domain/stats`: `sdate doneList kmBetween kmByType typeParts typeRead weekSeries monthSeries streakInfo
  loadInfo deloadInfo effPoints planWeek stepKm planKmOf hrRangeOf weekStats planSummary resSummary`, tipo `DoneSession`.
- `@/lib/data/actions`: `saveSession(s)`, `saveSessions(list)`, `deleteSession(id)`, `saveCfg(cfg)` (recibe la
  configuración nueva ya normalizada), `saveRoutes(list)`, `blockDemo()`, `demoOn()`, `demoOff()`, `toast(msg, ms?,
  action?)`, `toastUndo(msg, run)`, `buzz(ms?)`, `goTab(tab)`, `weekGo(d)`, `reduceMotion()`.
- `@/lib/sheets`: `openSheet(kind, props?)`, `closeSheet()`, `requestClose()`. Cada hoja es un componente registrado
  en `components/sheets/registry.tsx` que dibuja `<SheetFrame title=… foot={…}>cuerpo</SheetFrame>`
  (`@/components/sheets/SheetFrame`). Para avisar cambios sin guardar: `useSheetDirty(dirty: boolean)`.
- `@/lib/strava/client`: `svCall(tool, input)` con las mismas herramientas y formas de respuesta que el conector del
  original (`list_activities`, `get_activity_performance`, `get_activity_streams`) y `stravaErrMsg(e)`.
- `@/lib/ai/client`: `aiAvailable(): Promise<{images:boolean, maxCount:number, mediaTypes:string[]} | null>` y
  `aiJson(prompt, {images?: File[]})` (reemplazan a `SAMPLE.limits()` / `SAMPLE.json()`). Hoy devuelve `null`
  (sin clave): la UI tiene que esconder lo de IA como hacía el original cuando `SAMPLE` era `null`.
- `@/components/ui/CountUp`: `<CountUp v d/>`.
- `@/components/ui/glance`: `GL_IC`, `<GlIc k c/>`, `<GlTile …/>`, `<SumTile ic c t v viz sub/>`, `<Spark a c/>`,
  `formState(tsb)` (líneas 2395–2415, 2408).
- `@/components/ui/fields`: `<HmsInput value={seg|null} onChange idPrefix/>`, `<MsInput …/>`, `readHms`… (ver archivo).

## Reparto (módulo → dueño). Importá de acá aunque el archivo todavía no exista.

| Porción | Líneas del original | Dominio (`lib/domain/…`) | Componentes |
|---|---|---|---|
| **A · Semana** | 2286–2316, 2389–2516, 2958–3005, 3290–3339, 4105–4200, 6037–6048 | `week.ts`: `canMove isHard mvShort moveAdvice svType` | `components/views/WeekView.tsx`; `components/week/*` (`Glance RaceBand WeekStrip WeekReview SessChip PendCard LastRaceNote`); hojas `weekPlan`, `move`, `easy` en `components/sheets/` |
| **B · Resumen** | 2517–2773, 4201–4397, 3422–3441, 5709–5790 | `analysis.ts` (`LOAD_BUMP sessLoad formSeries hardKm medOf easyHrRuns efTrend`), `daniels.ts` (`vdotOf paceAtV PZ PLAN_CATS planTitle planPaces`), `dec.ts` (`DEC_WARM DEC_MIN_ACT decCalc decBand decLine decEligible`), `readiness.ts` (`readyItems`), `shoes.ts` (`shoeKm`) | `components/views/SummaryView.tsx`; `components/charts.tsx` (`niceTicks timeTicks BarChart LineChart ChartCard TableTv Legend`); `components/summary/*` (`ReadyCard PredictCard LoadCard FormCard HrPaceCard IntensityCard ZonesCard DanielsCard EstCard DecCard ShoesCard ShoeMeter`) |
| **C · Registro y Logros** | 2775–2832, 3571–3660, 3772–4104 (sin 3660–3771 medallas: también C) | `trophies.ts` (`TIER tierOf ladder bestTimeEvents PR_LADDERS FIN_XP trophies trophyXp CAT_N RARITY rarOf gotIds`), `xp.ts` (`XP_TITLES XP_TIER xpFor levelOf titleOf sessionXp xpState charStats`), `challenges.ts` (`CH_KINDS chProgress chPresets`), `marks.ts` (`MARK_DISTS bestMarks SORTS`), `log.ts` (`LG_* lgRows lgTotals lgCsv`) | `components/views/LogView.tsx`, `components/views/LogrosView.tsx`; `components/logros/*` (`MedalSvg Vitrina Desafios Character TopList MarksCard`); hojas `trophy`, `challenge`; `announceNew announceProgress celebrate` en `lib/domain/trophies.ts` o `components/logros/celebrate.ts` |
| **D · Carrera** | 2840–2957, 3062–3289, 3340–3421, 3457–3570 | `race.ts` (`trainEst raceEst predictRace raceScen raceSplits racePhases rcItems`), `blocks.ts` (`PHASES blockPlan longRace blockWeekOf`), `level.ts` (`LV_* lvBuild …`), `recal.ts` (`RC_F RC_N stepCat rcSources rcRefDefault rcTargets rcDelta rcSteps rcChanges`), `raceTheme.ts` (`RACE_TH raceTheme RACE_PHOTO`) | `components/views/RaceView.tsx` (= `viewTest`); `components/race/*` (`RaceDay Blocks Level PastRacesCard RaceMedalSvg Medallero RecalBox RecalNote`); hojas `raceMedal`, `recal` |
| **E · Mapa** | 4433–4943 | `geo.ts` (`decodePoly mproj CELL MPU routePts mapRoutes mapCells mapFit inRing barrioAt mapBarrios MAP_EXT MAP_PERIODS hexA lumOf`) | `components/views/MapView.tsx`; `components/map/*`; sincronización `stravaSync` |
| **F1 · Planificar y registrar** | 5140–5272, 5272–5418, 5418–5708, 5791–5924 | `planForm.ts` (`template …`), `resultForm.ts` (`rowKey resRows lapEval rowEval matchLaps …`) | hojas `plan`, `result` en `components/sheets/` |
| **F2 · Detalle, Ajustes, respaldo** | 3007–3061, 5925–6036, 6049–6149, 4398–4432, 2834–2838, 3442–3456, 6402–6438 | `csv.ts` (`HDR csvQ toCsv parseCSV rowsToSessions parseImport`), `reps.ts` (`repData`) | hojas `detail`, `score`, `import`, `exportCopy`; `components/views/SettingsView.tsx`; `components/detail/*` (`RepCard DtLaps StagesTable FactHero ScoreHtml ExpandedPlan StageBars DecRow`) |

Hojas: la clave del registro es el nombre corto (`plan`, `result`, `detail`, `score`, `weekPlan`, `move`, `easy`,
`recal`, `challenge`, `trophy`, `raceMedal`, `import`, `exportCopy`). Abrir otra hoja desde una: `openSheet('detail',
{ id })`. Props típicas: `plan {id?, date?}`, `result {id?, free?, sv?}`, `detail {id}`, `score {id, fresh}`,
`move {id, preset?}`, `weekPlan {mon}`, `recal {srcId}`, `trophy {id}`, `raceMedal {id}`.

`<ExpandedPlan p/>` (5960) y `<RecalNote p/>`/`<MovedNote p/>` los usan Semana y Detalle: viven en
`components/detail/ExpandedPlan.tsx` (F2), `components/race/RecalNote.tsx` (D) y `components/week/MovedNote.tsx` (A).

# Plan de implementación del rediseño «Pista»

Este plan lleva los bocetos a la app real. **Todavía no se implementó nada**: está pensado para arrancar en una
conversación nueva, fase por fase.

## Antes de empezar

Leer, en este orden:

1. [`docs/REDISENO.md`](REDISENO.md): qué se decidió y qué tiene cada pantalla.
2. Los bocetos: `design/bocetos/index.html`. Se sirven con la configuración `bocetos` de `.claude/launch.json` en
   http://localhost:4321 y son **la referencia visual**: medidas, colores, textos y comportamiento salen de ahí.
   Links útiles: `?tema=claro` u `?tema=oscuro`, `?abrir=carga`, `?abrir=plan`, `?abrir=festejo`, `?abrir=buscar`,
   `?an=ritmo#analisis`, `#vacio`.
3. `AGENTS.md`: esta es Next 16 y cambia cosas. Las guías están en `node_modules/next/dist/docs/`. Para este trabajo
   importan sobre todo:
   - `01-app/01-getting-started/03-layouts-and-pages.md` y `04-linking-and-navigating.md`.
   - `01-app/03-api-reference/03-file-conventions/route-groups.md`, `layout.md`, `dynamic-routes.md`.
   - `01-app/02-guides/single-page-applications.md`: cómo dibujar solo en el navegador con `use(browser())` de React
     19.3 y cómo cambiar la URL sin recargar (`history.replaceState`, que se sincroniza con `useSearchParams`).
   - `01-app/02-guides/preserving-ui-state.md`: con `cacheComponents: true` (ya está en `next.config.ts`) Next
     **conserva hasta 3 rutas** con `<Activity>` en vez de desmontarlas. Cambia cómo se resetean formularios y
     paneles al volver a una pantalla.
   - `01-app/02-guides/preventing-flash-before-hydration.md`: el tema antes de pintar.
   - `01-app/03-api-reference/02-components/font.md`: `axes` para el ancho variable de Archivo.
4. Las reglas de siempre: no duplicar lógica, cada cambio con un motivo, preguntar cuando la duda cambia el resultado.

Cada fase de abajo es **una rama y un PR**. Al cerrar cada una: `npm run lint`, `npm run build` y la verificación
visual de la fase.

## Punto de partida (cómo está hoy)

- Una sola página (`app/page.tsx` → `ClientApp` → `AppShell`) con pestañas en un store de zustand (`lib/store.ts`:
  `tab`, `lastTab`, `weekOff`, `sumSub`, `topSort`, `ui.logSub`, `ui.cSub`…). `goTab()` en `lib/data/actions.ts`
  cambia de pestaña y guarda el scroll a mano.
- Todo se dibuja en el navegador: `ClientApp` usa `useSyncExternalStore` para no dibujar en el servidor.
- Formularios y detalles son **hojas** (`lib/sheets.ts` + `components/sheets/registry.tsx`, 13 hojas) que suben desde
  abajo; `SheetHost` las muestra una por vez.
- Estilo: `app/globals.css` (1349 líneas) con el vidrio líquido; fuentes Barlow y Barlow Condensed con `next/font`;
  íconos Phosphor pegados como texto SVG (`components/shell/tabs.ts`); la gota de la barra (`components/shell/pill.ts`)
  y el control de transparencia (`GlassControl.tsx`).
- La lógica (`lib/domain/`, `lib/data/`, `lib/strava/`, `lib/ai/`) no depende de la interfaz. **No se toca**, salvo
  las funciones nuevas que se listan más abajo.
- `proxy.ts` manda al login a quien no entró; las rutas nuevas quedan protegidas sin cambiarlo.

## Decisiones técnicas

Las tres marcadas con **(decidido)** se confirmaron al empezar la fase 0.

| Tema | Propuesta | Por qué |
|---|---|---|
| CSS | CSS plano, partido en archivos por área (`app/styles/tokens.css`, `base.css`, `shell.css`, `components/*.css`, `screens/*.css`) con `@layer`. Sin Tailwind | El proyecto ya usa CSS plano y los bocetos están escritos así: se pasan casi tal cual. Agregar Tailwind sería rehacer todo |
| Tokens | Las variables de los bocetos (`--bg`, `--ink`, `--acc`, `--hero`, `--paper`, `--t-*`, `--z*`…) en `tokens.css`, con `[data-theme="dark"]` | Una sola fuente de color para todo |
| Fuentes | `next/font/google`: Archivo (con `axes: ['wdth']` e itálica), Geist y Geist Mono. Salen Barlow y Barlow Condensed | Son las de los bocetos; `next/font` las sirve desde el propio sitio |
| Íconos | Agregar `@phosphor-icons/react` **(decidido)** | Los bocetos usan 62 íconos de Phosphor (normal, negrita y relleno); pegarlos a mano como hoy no escala |
| Rutas | Grupo `app/(app)/` con un `layout.tsx` que tiene el shell; una carpeta por sección | Atrás y adelante del navegador, links compartibles, y Next conserva el estado de las últimas 3 |
| Dibujo en el navegador | `use(browser())` dentro de un `<Suspense>` con el esqueleto, en el layout del grupo | Es lo que recomienda la guía de SPA de esta versión; reemplaza el truco de `ClientApp` |
| Estado en la URL | Semana visible, filtros de Registro y pestaña de Análisis en la URL (`?semana=-1`, `?tipo=fondo&q=`) | Se comparten y sobreviven a recargar |
| Paneles | Siguen siendo estado de la app (no rutas): un `PanelHost` reemplaza a `SheetHost` | Se abren sobre cualquier pantalla y no ensucian el historial |
| Tema | Claro, oscuro o el del sistema; por defecto el del sistema **(decidido)** | El boceto ya lo trae así |
| Planificar | Panel desde Semana, Carreras y ⌘K, sin sección propia **(decidido)** | Así quedó en los bocetos; una sección aparte sumaría un calendario de bloques |

## Rutas

| Ruta | Pantalla | Reemplaza a |
|---|---|---|
| `/` | Redirige a `/semana` | — |
| `/semana` | Semana (con la bienvenida y los estados vacíos si no hay datos) | pestaña `week` |
| `/registro` | Registro | `log` |
| `/analisis`, `/analisis/ritmo`, `/analisis/forma`, `/analisis/zapatillas` | Análisis, con un `layout.tsx` que tiene las pestañas | `sum` y `sumSub` |
| `/carreras` | Carreras | `lv` y `cSub` |
| `/mapa` | Mapa | `map` |
| `/logros` | Logros | `top` y `logSub` |
| `/ajustes` | Ajustes | `set` |
| `/sesion/[id]` | Detalle de sesión | la hoja `detail` |
| `/login` | Igual que hoy, con el estilo nuevo | — |

Atajos: `1`–`6` secciones, `←` `→` semana, `R` registrar, `P` planificar, `/` buscar en Registro, `⌘K` la paleta,
`Esc` cierra. Hoy viven en `AppShell`; pasan a un hook `useShortcuts` que navega con el router.

## De las hojas a los paneles

| Hoja de hoy | Lugar nuevo |
|---|---|
| `result` | Panel de carga (derecha) |
| `plan` | Panel de planificar |
| `weekPlan` | Panel de planificar la semana (mismo patrón, con los 7 días) |
| `detail` | Página `/sesion/[id]` |
| `move` | Arrastrar y soltar en la semana; el panel de mover queda para cuando hay aviso |
| `score` | Sección del detalle de sesión, o panel chico desde el puntaje |
| `easy`, `recal`, `challenge` | Paneles chicos con el mismo patrón |
| `trophy`, `raceMedal` | Panel de detalle de trofeo o medalla (desde Logros y Carreras) |
| `import`, `exportCopy` | Panel desde Ajustes → Cuenta y datos |

En celular, el panel ocupa toda la pantalla. La confirmación «tenés cambios sin guardar» de `lib/sheets.ts`
(`useSheetDirty`) se mantiene.

## Lógica nueva que piden los bocetos

Todo lo demás ya existe en `lib/domain/`. Lo nuevo va en funciones puras, con el mismo estilo que las de al lado:

1. **Cinta de datos:** arma las frases de arriba de Semana con datos que ya existen (km de la semana, días a la
   carrera, racha, estado físico, nivel, próxima sesión, mejor marca).
2. **Puntaje de preparación (0–100):** sale de `readyItems()` (`readiness.ts`), que hoy da chequeos verde, amarillo y
   rojo. Hay que definir el peso de cada uno.
3. **Tendencia de ritmo por tipo:** una recta por tipo de sesión sobre el ritmo principal (Análisis → Ritmo).
4. **Ritmo a 145 lpm:** se deriva de `effPoints()` (metros por minuto por latido).
5. **Proyección de forma hasta la carrera:** estado físico y fatiga (`analysis.ts`) proyectados con la carga de las
   sesiones planificadas que vienen.
6. **Fin de vida útil de las zapatillas:** fecha estimada con su uso de las últimas semanas, y si cae antes o después
   de la próxima carrera.
7. **Plantillas para planificar:** las sesiones anteriores del mismo tipo como punto de partida.
8. **Primera vez:** qué pasos ya están hechos (cuenta, Strava, carrera, FC máxima).
9. **Índice de la paleta ⌘K:** acciones, secciones, sesiones y carreras, con búsqueda sin tildes.

Ojo: la relación de carga de hoy (`loadInfo()`) es por **km** (7 días contra 28). El boceto la muestra igual; no hay
que inventar otra medida de carga.

**Decisión pendiente: los datos del gráfico del detalle de sesión.** El gráfico de ritmo y FC a lo largo de la salida
necesita las series de Strava (`get_activity_streams`). Hoy se piden para calcular la deriva, pero no se guardan.
Opciones:

- **(a)** Guardarlas en una tabla nueva `streams` (migración en `supabase/migrations/`, con RLS como las demás) la
  primera vez que se abre la sesión.
- **(b)** Pedirlas a Strava cada vez que se abre.

Recomendación: (a), porque Strava limita la cantidad de pedidos y así la página abre rápido.

## Fases

Cada fase deja la app funcionando. Hasta que una pantalla se rehace, se ve la vieja adentro del shell nuevo.

### Fase 0 · Base del sistema

- Tokens, `base.css` y las fuentes nuevas; tema con «como el sistema» y el script antes de pintar actualizado
  (hoy lee `rr_theme` y `rr_glass`: `rr_glass` sale).
- Sacar el vidrio: `pill.ts`, `GlassControl.tsx` y su CSS.
- Íconos (según la decisión de arriba).
- **Listo cuando:** la app vieja anda igual con las fuentes y los colores nuevos, sin vidrio, en claro y oscuro.

### Fase 1 · Shell y rutas

- `app/(app)/layout.tsx` con la barra lateral (marca, secciones, nivel, cuenta), la barra superior (contexto,
  búsqueda, Strava, tema, «Registrar») y la barra de abajo en celular.
- Una página por ruta que, por ahora, muestra la vista vieja. `/sesion/[id]` muestra el detalle viejo.
- Sacar `tab`, `lastTab`, `goTab` y el scroll a mano del store; navegar con el router. Atajos en `useShortcuts`.
- **Listo cuando:** se navega por todas las secciones con links, atajos, atrás y adelante; recargar en cualquier ruta
  deja en la misma pantalla; el login sigue protegiendo todo.

### Fase 2 · Piezas del sistema

Componentes reutilizables, cada uno con su CSS, sacados de los bocetos.

Ojo con los nombres: `globals.css` va sin capa y le gana a todo lo que esté en `@layer`, aunque tenga menos
especificidad. Mientras exista, una clase nueva no puede llamarse como una vieja (`.btn`, `.chip`, `.seg`, `.field`,
`.kpi`, `.card`, `.dot`…): la vieja pisaría cada propiedad que declara. El shell ya lo resolvió con nombres propios
(`.tb-btn`, `.pulse`). Hay que elegir una convención para las piezas (por ejemplo, un prefijo) o borrar la regla vieja
cuando su última pantalla se rehace.

- **Formulario y controles:** botón, chip de tipo, etiqueta, Δ contra el objetivo, PR, campos (texto, número con
  unidad, h:m:s, calculado, error), selector segmentado, interruptor, stepper, pestañas.
- **Estructura:** panel con encabezado, fila de números (KPI), título de marca, bloque estadio con los andariveles,
  tabla de datos.
- **Medidores:** marcas de puntaje, contador de vueltas, barra de estructura, barra de zonas.
- **Piezas de deporte:** pista ovalada, dorsal, pulsera de ritmos, escudo de trofeo, medalla, reloj de cuenta
  regresiva, cronógrafo de 60 marcas.
- **Gráficos:** ejes, líneas, barras apiladas, puntos con tooltip, todo en SVG como hoy `components/charts.tsx`.

Y la página del sistema de diseño (la del boceto) solo en desarrollo, para revisar las piezas sueltas.

- **Listo cuando:** cada pieza se ve igual que en el boceto, en claro y oscuro, y es accesible con teclado.

### Fase 3 · Semana

- Cinta de datos, estadio (hoy o la última salida + dorsal), la semana con la pista y los 7 días (arrastrar y soltar
  como hoy), mañana, forma, últimas sesiones.
- La bienvenida y los estados vacíos cuando no hay datos (boceto «Primera vez»).
- **Listo cuando:** coincide con el boceto con los datos reales y con los de ejemplo, y mover una sesión sigue
  avisando como hoy.

### Fase 4 · Paneles y paleta

- `PanelHost`; panel de carga con Strava, validación en el momento y `⌘↵`; panel de planificar con el editor de
  tramos y los avisos de `moveAdvice`; planificar la semana; los paneles chicos de la tabla de arriba.
- Paleta ⌘K con su índice, y el botón de búsqueda de la barra de arriba (en la fase 1 no se puso para no dejar un
  botón que no hace nada).
- **Listo cuando:** se registra y se planifica de punta a punta sin mouse, el borrador se recupera como hoy
  (`lib/data/draft.ts`) y en celular el panel ocupa toda la pantalla.

### Fase 5 · Detalle de sesión

- La página `/sesion/[id]` con los seis números, el gráfico de ritmo y FC con las bandas del objetivo, los tramos
  plan contra real, el recorrido, zonas, sensación, zapatillas y notas.
- La decisión de las series de Strava (y la migración, si va la opción a).
- **Listo cuando:** abre desde Semana, Registro, Mapa, ⌘K y con link directo.

### Fase 6 · Registro

- Totales, filtros con cantidad, búsqueda con `/`, período, tabla agrupada por mes, CSV.
- Los filtros en la URL.
- **Listo cuando:** filtra al instante con el historial completo y la tabla se maneja bien con muchas filas.

### Fase 7 · Análisis

- Layout con pestañas y sus cuatro rutas (Volumen, Ritmo y eficiencia, Forma y carga, Zapatillas), con la lógica nueva
  1 a 6.
- **Listo cuando:** cada número coincide con el de las otras pantallas (por ejemplo, la forma de Semana con la de
  Forma y carga).

### Fase 8 · Carreras

- Estadio con reloj en vivo y pulsera (imprimible), plan por bloques, estrategia, lista para el día, medallero y el
  test de nivel.
- **Listo cuando:** sin carrera muestra el estado vacío con las distancias, y la pulsera se imprime en tamaño real.

### Fase 9 · Mapa

- Ciudad de noche (oscura en los dos temas) con el dibujo actual de `components/map/` adaptado: recorridos, cuadras
  pintadas, salida elegida con marcas de km, barrios con resaltado, capas, período, «Repetir la temporada».
- **Listo cuando:** se mueve fluido con muchos recorridos y la escala es la real.

### Fase 10 · Logros y celebración

- Estadio con título, XP y ficha del jugador; camino de títulos; vitrina con filtros; desafíos; podio; atributos.
- La celebración reemplaza a `CelebrateHost` con el diseño nuevo.
- **Listo cuando:** ganar un trofeo o subir de nivel la dispara una vez, y con «reducir movimiento» no hay confeti.

### Fase 11 · Ajustes

- Índice fijo, filas de ajuste, zonas de FC arrastrables, carreras, zapatillas, conexiones, tema, cuenta y respaldo.
  Cada cambio se guarda solo (como hoy en `SettingsView`).
- **Listo cuando:** todo lo que se puede ajustar hoy se puede ajustar en la nueva, sin perder validaciones.

### Fase 12 · Cierre

- Borrar el CSS y los componentes viejos que quedaron sin uso.
- Repaso de movimiento, accesibilidad (contraste, foco, lectores de pantalla), celular y rendimiento.
- Íconos y colores de la PWA (`app/manifest.ts`, `app/icon.tsx`, `apple-icon.tsx`) con la marca nueva.
- Actualizar `README.md` y `docs/PORTING.md`.
- Decidir si los bocetos quedan en el repo o se borran (y su entrada de `launch.json`).

## Cómo verificar cada fase

- `npm run lint` y `npm run build` sin errores.
- La pantalla al lado de su boceto, a 1440 px de ancho, en claro y oscuro.
- A 375 px de ancho: nada se sale del costado.
- Teclado: se llega a todo con Tab, el foco se ve, y los atajos y `Esc` funcionan.
- Con datos reales y con «datos de ejemplo» (`lib/data/demo.ts`), y sin datos.
- Con «reducir movimiento» activado.

## Para arrancar la próxima conversación

Algo así:

> Leé `docs/REDISENO-PLAN.md` y `docs/REDISENO.md`, y abrí los bocetos. Empezá por la fase 0: confirmame las
> decisiones marcadas antes de tocar código.

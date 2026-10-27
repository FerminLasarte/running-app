# Plan de logros: la vitrina, trofeos nuevos y easter eggs

Lo que se propuso el 27 de octubre de 2026 después de mirar Logros en producción, y el usuario aprobó todo. La app es
para dos personas (el corredor y el responsable): no hay que pensar en muchos usuarios.

Ya hechos (PR #31), para no repetirlos: el modo maratón con **42195** en la portada, la largada **«¡Ya!»** en
«En sus marcas.» y el trofeo secreto **Vuelta olímpica** (categoría `egg`, «Secretos», que no aparece hasta ganarlo).

## Cómo trabajar

- **Cada tanda es una rama y un PR.** Al cerrarla se agrega abajo de la tanda un «Hecho. Decisiones al pasarlo…».
- Leer `AGENTS.md` (Next 16: las guías están en `node_modules/next/dist/docs/`) y `docs/PORTING.md` (cómo está armado
  el código y sus reglas: no mutar `S`, piezas `p-`, tokens de color, accesibilidad). El estilo es el de
  `docs/REDISENO.md`: marca deportiva, pensado primero para la compu, los detalles importan.
- Las reglas de siempre: no duplicar lógica, cada cambio con un motivo, preguntar cuando la duda cambia el resultado.
  Si hace falta una migración de Supabase, va como archivo nuevo y como SQL para pegar (nunca `supabase db push`).
- **Antes de cerrar:** `npx tsc --noEmit`, `npx eslint app components lib proxy.ts`, `npm test` y `npm run build`.
  Probar en el navegador con `next dev` en modo local, con los datos de ejemplo («Probar sin cuenta» o «Ver la app con
  datos de ejemplo»), a 1440 px y a 375 px, claro y oscuro.
- **Los cálculos nuevos llevan tests** en `lib/domain/__tests__/` (Vitest; `fixtures.ts` carga sesiones y configuración
  en el estado y fija «hoy»).

## Tanda 1 · La vitrina como estante

Hoy la vitrina (`components/logros/Vitrina.tsx`, estilos `lo-vit-*` en `app/styles/screens/logros.css`) es una grilla
de celdas dentro de un panel de alto fijo que baja por dentro: está ordenada, pero se lee como una planilla. Son 88
trofeos en 16 categorías más desafíos y secretos, con filtro Todos / Ganados / Por ganar (`?vitrina=` en la URL). Cada
trofeo es un escudo (`Shield` en `components/pista/sport.tsx`) con el ícono de la categoría (`trophyIcon` en
`components/logros/util.ts`) y el metal según la XP (`rarOf`/`trophyTier` en `lib/domain/trophies.ts`); tocarlo abre
`TrophyPanel`.

- **VIT-01 · Boceto primero.** Antes de tocar código, un boceto en `design/bocetos/` (como los del rediseño) con la
  vitrina nueva en compu y en celu, claro y oscuro, para que el usuario lo apruebe. La idea a bocetar:
  - una página propia, `/logros/vitrina`, con un estante por categoría: la repisa, luz de arriba y el nombre de la
    categoría en la placa del estante, con cuántos tenés («2 de 5»);
  - tres tipos de objeto según lo que celebran: **copas** para las marcas (`pr*`), **medallas colgadas** para las
    carreras (`race`; la cinta puede seguir la del medallero de Carreras, `raceTheme`), **escudos** para lo demás;
  - los que faltan, como siluetas apagadas con su progreso («237 de 500 km»); los que están por caer, con un brillo;
  - el estante de **Secretos** siempre a la vista: los ganados y, para los que faltan, cajas cerradas con un candado y
    «quedan N por descubrir», sin decir cuáles;
  - en Logros, la sección Vitrina pasa a ser una vidriera chica (los últimos ganados y los más cercanos) con un
    «Ver la vitrina» que lleva a la página.
- **VIT-02 · Implementar el boceto aprobado.** Reusar lo que hay: `trophies()`, `vitGroups()`, el filtro,
  `openTrophy`, el «Nuevo» (`markTrophiesSeen`). El metal sigue saliendo de la XP. Movimiento sobrio: los objetos
  aparecen al llegar, como la portada (`components/portada/motion.ts`), y nada con «reducir movimiento». Cada objeto es
  un botón con la misma etiqueta accesible que hoy tiene `Tile`.
- Cuidar: la celebración (`components/logros/Celebration.tsx`), la paleta (⌘K) y el panel del trofeo usan el ícono de
  la categoría; si los objetos nuevos cambian de forma, que esos lugares sigan coherentes. En el celu, un estante por
  categoría con desplazamiento lateral.
- Listo cuando: la vitrina se ve como un estante en compu y en celu, con los tres tipos de objeto y el estante de
  secretos, y el filtro y el panel del trofeo andan como antes.

**Hecho.** Decisiones al pasarlo:

- **Boceto aprobado:** `design/bocetos/vitrina.html` (`#vitrina` y `#logros`, `?tema=`) y el tablero con las ocho vistas
  en `design/bocetos/vitrina-tablero.html`.
- **Las piezas** son de `components/pista/sport.tsx`: `Cup`, `HungMedal`, `StandShield` y `SecretBox`, con el metal
  torneado y el pie negro en los dos temas; se ven en `/sistema`. `TrophyPiece` (`components/logros/Piece.tsx`) elige la
  de cada trofeo, y la usan la vitrina, el panel del trofeo y la celebración. La paleta y la escalera del panel siguen
  con el ícono de la categoría.
- **Más valioso, más grande:** el platino mide un 25% más que el bronce. El metal sigue saliendo de la XP.
- **Lo que va grabado:** la placa de la copa dice el tiempo a bajar («25:00») o la distancia («21K») si es terminarla;
  la medalla, cuántas carreras. En el estante de una marca el nombre va sin «en 5K», porque ya lo dice la placa.
- **La cinta de la medalla** es la de la carrera que la ganó (`trophyRace`: la tercera con tiempo para «3 carreras»),
  con el mismo color que el medallero de Carreras (`medalColor`).
- **Secretos:** `EGG_IDS` en `lib/domain/trophies.ts` dice cuántos hay (hoy uno, la Vuelta olímpica). Cada secreto nuevo
  de la tanda 2 se suma ahí. Las cajas cuentan entre las piezas (`vitCount`: «20 de 89») y en «Por ganar». El estante
  de Secretos va siempre al final: en «Ganados» solo están los ganados y en «Por ganar», solo las cajas.
- **El filtro** pasó a `/logros/vitrina?filtro=ganados` (antes `/logros?vitrina=ganados`).
- **Las categorías de hasta cinco** comparten fila en la compu y las de seis o más ocupan todo el ancho; con menos de
  1240 px, una por fila. En el celu cada estante se corre de costado, con la placa quieta a la izquierda.
- **La vidriera de Logros** (`vitShowcase`) muestra los cuatro últimos ganados y los cuatro más cerca de caer.
- **A dónde lleva:** «Ver la vitrina», en el panel del trofeo y en la celebración, va a la página y baja hasta el estante
  de su categoría (`goVitrina`). En ⌘K, «Vitrina» lleva a la página. El atajo `6` y la barra lateral vuelven a Logros
  desde la vitrina.
- **Sin señal:** `public/sw.js` también guarda `/logros/vitrina` con las demás páginas.
- **Movimiento:** cada estante aparece al llegar a él y sus piezas entran de izquierda a derecha. Lo que está por caer
  brilla despacio. Con «reducir movimiento» todo se ve quieto desde el principio.
- **No probado en el navegador:** la celebración, porque no salta con los datos de ejemplo. Queda revisarla al ganar un
  trofeo de verdad.

## Tanda 2 · Trofeos nuevos

Las escaleras se arman con `ladder()` en `calcTrophies` (`lib/domain/trophies.ts`); los secretos van como la Vuelta
olímpica (`cat: 'egg'`, solo cuando se ganan). Cada categoría nueva necesita su nombre en `CAT_N` y su ícono en
`CAT_ICON` (`components/logros/util.ts`).

- **TRO-01 · Barrios.** Correr en 10, 25 y los 48 barrios de la Ciudad. El mapa ya los cuenta (`mapBarrios`,
  `routeBarrios` en `lib/domain/geo.ts`), pero los barrios llegan con el mapa de fondo, que se baja aparte
  (`loadBaseMap`, asíncrono) y `trophies()` es sincrónico: decidir si se calcula cuando el mapa ya está (y se recalcula
  con `onBaseMap`) o si se guarda el conteo. La fecha de cada escalón es la del recorrido que sumó el barrio.
- **TRO-02 · Desnivel acumulado** (por ejemplo 1.000, 5.000 y 8.849 m, el Everest). El desnivel de cada salida está en
  las series (`Series.up`, tabla `streams`), que se cargan de a una al abrir cada sesión: hace falta una forma de tener
  todos (leer solo `up` de la tabla, o guardarlo en el resultado al cargar las series). Con los datos de ejemplo no hay
  series: ver cómo se prueba.
- **TRO-03 · Negative split** (1, 5 y 10 salidas terminando más rápido que como empezaste). Sale de los parciales:
  `halfSplit` en `lib/domain/streams.ts` (series) o las vueltas cargadas en las etapas. Mismo tema que TRO-02 con las
  series.
- **TRO-04 · Fondos sin deriva** (1, 5 y 10 fondos de 90 minutos o más con deriva confiable de menos de 5%). Sale de
  `result.dec` (`p`, `ok`) y `timeSec`.
- **TRO-05 · Zapatillas jubiladas** (1 y 3 pares retirados habiéndolos llevado a su límite de km). Sale de
  `cfg.shoes` (`retired`, `limitKm`) y `shoeKm` (`lib/domain/shoes.ts`).
- **TRO-06 · Secretos nuevos** (como la Vuelta olímpica, solo cuando se ganan):
  - **Bajo la lluvia:** una salida con clima «Lluvia» (`result.weather`; los valores están en `WEATHER`,
    `lib/domain/util.ts`).
  - **Capicúa:** una salida cuya distancia, con dos decimales, se lee igual al revés (10,01 km, 12,21 km).
  - **A pleno sol:** una salida con clima «Mucho calor» a menos de 5:00/km. (Se había propuesto como «Pingüino»; el
    nombre no iba con la condición.)
- Cuidar: los trofeos nuevos suman XP y pueden subir el nivel de quien ya usa la app. Al cargar, `celebNews` festejaría
  de golpe todos los que ya estaban ganados: decidir si los retroactivos se anotan como festejados sin celebración.
  Revisar que la paleta (⌘K) los encuentre.
- Listo cuando: cada trofeo nuevo tiene sus tests y se ve en la vitrina (o en Secretos al ganarlo).

## Tanda 3 · Más easter eggs

- **EGG-01 · «Te saliste del andarivel».** La página 404 (`app/not-found.tsx`, hoy no existe): una pista con un
  corredor que se sale de su andarivel, «Te saliste del andarivel.» y un botón para volver (a la semana con sesión, a
  la portada sin ella). Fuera del shell, como el login. Cuidar: `proxy.ts` manda al login a quien no entró en
  cualquier ruta que no sea pública, así que sin sesión una dirección inexistente hoy no llega al 404; decidir si las
  rutas desconocidas pasan.
- **EGG-02 · Kipchoge.** Escribir «kipchoge» en el buscador (⌘K, `components/shell/Palette.tsx`) cierra la paleta, va a
  Semana y un grupo de luces da la vuelta a la pista (`Oval`) al ritmo del 1:59:40 (2:50/km), con un aviso «1:59:40 ·
  Viena, 2019». Con «reducir movimiento», solo el aviso.

## Tanda 4 · Las actualizaciones, al instante

Hoy el service worker (`public/sw.js`) muestra la página guardada al instante y baja la nueva por detrás: después de
cada deploy, la primera apertura muestra la versión anterior (pasó con el aviso de «Probar sin cuenta», que siguió
ofreciendo «Crear cuenta» en Safari).

- **SW-01 · Páginas primero de la red.** Para las páginas: pedir la nueva y, si no llega en unos segundos o no hay
  señal, mostrar la guardada. Los archivos de `/_next/static` siguen igual (tienen hash). Subir la versión de la caché
  de páginas (`rr-page-v2` → `v3`) para que se borre la vieja.
- Cuidar: que la app instalada siga abriendo sin señal, y que el login y `/api` sigan sin pasar por la caché.
- Listo cuando: después de un deploy, la primera apertura con señal ya muestra lo nuevo, y sin señal abre lo guardado.

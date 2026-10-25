# Rediseño: «Pista»

Estado: **boceto 0.5**, para discutir. Los bocetos navegables están en `design/bocetos/index.html`
(se sirven con la configuración `bocetos` de `.claude/launch.json`, en http://localhost:4321). Pantallas bocetadas:
Semana, Registro, Análisis (pestaña Volumen), Carreras, Mapa, Logros, Ajustes, Detalle de sesión y Sistema de diseño,
más el panel de carga (tecla `R`), el de planificar (tecla `P`), la paleta de búsqueda (`⌘K`), la celebración y la
primera vez con los estados vacíos, en claro y oscuro. Para revisar en un link: `?tema=claro` u `?tema=oscuro`,
`?abrir=carga`, `?abrir=plan`, `?abrir=festejo`, `?abrir=buscar&q=fondo`, `?an=ritmo` (o `forma`, `zapas`) con
`#analisis`, y `#vacio`.

## Qué queda decidido

- **Plataforma principal: web de compu.** El diseño se piensa a 1440 px de ancho. El celular tiene que funcionar
  (misma información, apilada, con barra de pestañas abajo), pero no manda.
- **Se descarta el vidrio líquido.** Sale todo lo que existe solo por eso: la gota de la barra de pestañas
  (`components/shell/pill.ts`), el control de transparencia (`GlassControl`), los fondos difuminados detrás de
  tarjetas y la estética iOS. Lo único translúcido que queda es la barra superior fija, como en cualquier web.
- **Estilo de marca deportiva.** Títulos angostos, itálicos y en mayúsculas, alto contraste, esquinas casi rectas,
  frases cortas («Fondo cumplido.»).
- **Libertad total de ubicación.** La app vieja no es referencia de dónde va cada cosa: cada pantalla se piensa de
  cero según qué necesita ver y hacer el corredor. Se pueden juntar, partir o inventar piezas.
- **Rediseño completo** de estructura y estilo; la lógica de `lib/domain/` y `lib/data/` no se toca.

## Concepto

Una herramienta seria, con los patrones de las plataformas web grandes (barra lateral, barra superior fija,
⌘K, atajos, tablas densas, filtros a la vista, páginas con dirección propia), con voz de marca deportiva y el idioma
del atletismo **en los detalles**, nunca como decoración:

| Pieza | De dónde sale | Dónde se usa |
|---|---|---|
| Bloque estadio (oscuro, andariveles enormes de fondo, título de marca) | La pista de noche | El momento de cada pantalla: lo que hiciste hoy, la próxima carrera |
| Cinta de datos en tartán, en movimiento | El tablero LED del estadio | Arriba de Semana: los números de la semana |
| La pista (óvalo de 4 andariveles, línea de llegada a cuadros, progreso por el andarivel 1 en sentido antihorario) | La pista de 400 m | Volumen de la semana contra el plan |
| El dorsal (papel, cuatro agujeros de alfiler, talón troquelado, apenas torcido) | El número de carrera | Días que faltan, objetivo y ritmo |
| La pulsera de ritmos (tira de papel con parcial y acumulado por km) | La pace band que se pega en la muñeca | Plan de carrera; se imprime |
| Reloj de cuenta regresiva | El reloj de largada | Carreras |
| Barra de estructura (ancho = distancia, alto = intensidad) | Las vistas de entrenamiento de los relojes | Cada sesión, en la semana y en las tablas |
| Planilla de parciales con Δ contra el objetivo | La hoja de tiempos del entrenador | Detalle de sesión |
| Marcas discretas en vez de barras lisas (puntaje, nivel, zapatillas) | Contadores de vueltas | Medidores |
| Medallas con cinta | El medallero | Carreras anteriores, con marca personal (PR) |
| La ciudad de noche con tus recorridos en tartán y las cuadras pintadas | Los mapas de calor de las apps de running | Mapa |
| La ficha del jugador (escudo de papel con media y atributos) | Las cartas de los juegos de fútbol | Logros: tu personaje |
| La recta con banderines de nivel y llegada a cuadros | La pista vista de costado | Logros: camino de títulos |
| Escudos de bronce, plata y oro; los que faltan, punteados con su progreso | Las vitrinas de trofeos | Logros: vitrina |
| El podio (2 · 1 · 3) | La premiación | Logros: tus mejores sesiones |
| Color tartán | El color de la pista de atletismo | Único acento: hoy, la carrera, la acción principal |

### Principios

1. **Un momento por pantalla.** Cada sección abre con lo más importante, grande y con voz de marca. Debajo, las
   herramientas.
2. **El dato manda.** Números en tipografía angosta y tabular; unidades chicas y en gris; decimales con coma.
3. **Deporte en el detalle, no en el ruido.** Cada guiño deportivo tiene que significar un dato.
4. **Un solo acento.** El tartán marca lo que importa ahora. Los colores de tipo de sesión y de zona son datos.
5. **Compu primero.** Atajos de teclado, ⌘K, arrastrar y soltar, información visible sin abrir nada.
6. **Movimiento con propósito.** Las barras crecen, la pista se dibuja al entrar y el reloj corre; nada se mueve sin
   un cambio de dato. Todo se apaga con «reducir movimiento».
7. **Los números cuentan la misma historia en todas las pantallas.** Un dato que aparece en dos lugares sale de la
   misma fuente.

## Sistema

### Tipografía (Google Fonts)

| Uso | Familia | Notas |
|---|---|---|
| Títulos y momentos (voz de marca) | Archivo 900, ancho 62%, itálica, mayúsculas | Con punto final en tartán |
| Números protagonistas | Archivo 800, ancho 70% | Como un dorsal o un tablero de llegada. Siempre tabular |
| Títulos de panel | Archivo 800, ancho 72%, mayúsculas | 17 px |
| Interfaz y texto | Geist 400–600 | |
| Tablas, tiempos, parciales | Geist Mono | Tabular, cero con barra |
| Etiquetas y botones | Geist 600, mayúsculas, +7 a +10% | 10,5–11,5 px |

### Color

Claro (papel y tartán) y oscuro (asfalto), con los mismos nombres de variables. El bloque estadio es oscuro en los
dos temas; el dorsal y la pulsera quedan de papel en los dos.

- Base: `--bg`, `--surface`, `--sunk`, `--line`, `--line-2`, `--ink` … `--ink-4` (grises cálidos, nunca negro puro).
- Estadio: `--hero`, `--hero-ink`, `--hero-mut`, `--hero-line`. Papel: `--paper`, `--paper-ink`.
- Acento: `--acc` (tartán). Estados: `--pos` (mejora / más rápido), `--neg`, `--hr` (frecuencia cardíaca).
- Tipos de sesión, de suave a fuerte: regenerativo (verde gris), fondo (azul), tempo (ámbar), series (tartán),
  test / carrera (tinta).
- Zonas de FC Z1–Z5: escala secuencial de azul frío a rojo.

### Forma y espacio

- Grilla de 12 columnas, 20 px de separación, contenido de hasta 1260 px; barra lateral de 236 px.
- Base de 4 px. Radios casi rectos (3 / 4 / 6 px).
- Paneles con borde de 1 px y sin sombra; la sombra queda para lo que flota (menús, avisos, dorsal, pulsera).
- Los cuadraditos de color van inclinados (−14°), como la tipografía itálica: dan sensación de velocidad.
- Curva única `cubic-bezier(.2, 0, 0, 1)`, 150–550 ms.

## Estructura

### Navegación

| Hoy | Propuesta | Por qué |
|---|---|---|
| Pestañas dentro de una sola página (estado en zustand) | **Rutas reales**: `/semana`, `/registro`, `/analisis`, `/carreras`, `/mapa`, `/logros`, `/ajustes`, `/sesion/[id]` | Atrás/adelante del navegador, links compartibles, abrir en otra pestaña |
| Hojas que suben desde abajo (estilo iOS) | En compu: **páginas** para ver (detalle de sesión) y **panel lateral** para cargar o editar sin perder el contexto. En celu siguen siendo hojas | Patrón de web; en pantalla ancha la hoja tapa todo |
| Barra de pestañas flotante + barra lateral | Barra lateral fija + barra superior con contexto (semana o migas), búsqueda (⌘K), estado de Strava y «Registrar» | Una sola navegación en compu |
| Resumen | **Análisis**, con pestañas Volumen · Ritmo y eficiencia · Forma y carga · Zapatillas | «Resumen» se pisa con Semana; la sección es de gráficos |
| Carrera, con subpestañas | **Carreras**, una sola página que baja: la próxima, el plan por bloques, la estrategia, la lista para el día y el medallero | Todo lo de la carrera se lee de corrido |
| Ajustes como pestaña | Menú de la cuenta (abajo en la barra lateral) | Se usa poco |

### Qué hay en cada pantalla

- **Semana:** cinta de datos → estadio con la sesión de hoy (o la última) y el dorsal de la próxima carrera → la
  semana con la pista y los 7 días (arrastrar para mover) → mañana con su estructura → forma (estado físico, fatiga,
  forma) → últimas sesiones.
- **Registro:** totales de la temporada → filtros por tipo con cantidad, búsqueda (`/`) y período → tabla agrupada
  por mes con totales, estructura, deriva y puntaje; planificadas y no hechas en la misma tabla.
- **Análisis**, en cuatro pestañas:
  - *Volumen:* cuatro números grandes → km por semana apilados por tipo con promedio de 4 semanas → reparto por tipo e
    intensidad (80/20) → predicción de tiempos con la diferencia contra tus objetivos → tus marcas.
  - *Ritmo y eficiencia:* VDOT, 10K estimado, ritmo a 145 lpm y deriva → cada sesión como punto con la tendencia de
    cada tipo (más rápido arriba) → tus ritmos de entrenamiento en una regla de lento a rápido → tu corazón (ritmo a
    igual FC, semana a semana) → deriva de cada fondo con la línea del 5%.
  - *Forma y carga:* preparación para la carrera en un cronógrafo de 60 marcas con sus cuatro factores → relación de
    carga 7/28 días en una escala baja / productiva / alta / riesgo, con la carga de cada día → estado físico, fatiga
    y forma de 26 semanas con las fases del plan y la proyección hasta la largada («+12 el día»).
  - *Zapatillas:* la principal en grande con su vida útil, cuándo llega al límite (antes o después de la carrera) y
    km por mes → las de carrera con las marcas que hiciste con ellas → para qué las usás.
- **Carreras:** estadio con el nombre, reloj de cuenta regresiva, objetivo / predicción / mejor marca y la pulsera de
  ritmos → plan por bloques de 12 semanas (hecho contra planificado) → estrategia por tramos → lista para el día →
  medallero.
- **Mapa:** pantalla completa, sin márgenes. A la izquierda la ciudad de noche (oscura en los dos temas): recorridos
  en tartán que se suman donde pasás más, cuadras de 200 m pintadas, la salida elegida en blanco con marcas cada
  2 km, controles de zoom y escala real. A la derecha: período, cuatro números (recorridos, km, km² explorados,
  barrios de 48), km por mes, ranking de barrios (tocás uno y se resaltan sus recorridos), capas y Strava. «Repetir la
  temporada» dibuja todas las salidas en orden.
- **Logros:** estadio con tu título, XP, el avance al próximo nivel, las últimas ganancias y la ficha del jugador →
  camino de títulos del 1 al 50 → vitrina (filtrable: todos, ganados, por ganar) junto a los desafíos con fecha →
  podio por distancia, puntaje o ritmo → atributos explicados.
- **Ajustes:** índice fijo a la izquierda que marca la sección que estás leyendo; cada fila con la explicación a un
  lado y el control al otro, y todo se guarda solo. Perfil (foto, edad, desde cuándo corrés, salidas por semana),
  frecuencia cardíaca (FC máxima y zonas en una barra con cortes que se arrastran o se mueven con las flechas),
  carreras, zapatillas con su vida útil, conexiones (Strava y lectura de capturas), tema con vista previa (claro,
  oscuro o el del sistema) y cuenta y respaldo. Sale el control de transparencia.
- **Panel de carga:** se abre desde la derecha sobre la pantalla en la que estás (botón «Registrar», tecla `R` o ⌘K) y
  no te saca de contexto. Tres pasos numerados: qué sesión fue (las planificadas sin cargar, con su estructura, o
  sesión libre) → los datos (si Strava tiene la salida, se cargan solos y cada campo lo indica; el ritmo se calcula;
  avisa en el momento si falta un dato y si quedaste dentro del rango del plan) → cómo te sentiste (1 a 10, molestia,
  zapatillas, clima, notas). Se guarda con `⌘↵`; si lo cerrás queda como borrador. En celular ocupa toda la pantalla.
- **Paleta ⌘K:** un solo buscador para acciones (registrar, planificar, Strava, tema, respaldo), secciones, sesiones y
  carreras. Sin texto muestra acciones, secciones y lo reciente; al escribir agrupa los resultados y subraya lo que
  coincide (sin importar tildes). Se maneja entero con el teclado.
- **Panel de planificar:** el mismo patrón que el de carga. Tipo (cinco, con su color y para qué sirve) y día de la
  semana que viene, marcando los días que ya tienen algo; avisa en el momento si quedan dos sesiones fuertes seguidas
  o dos el mismo día. La estructura se arma desde una sesión tuya anterior, en blanco o (si está activa) desde una
  captura; se ve como barra (ancho = distancia, alto = intensidad) y como lista de tramos con bloques de
  repeticiones que se suman y restan. Calcula km y minutos. Se guarda con `⌘↵`.
- **Celebración:** al ganar un trofeo o subir de nivel. El estadio a oscuras con la pista dibujándose, confeti en los
  colores de la app, el escudo con rayos girando, el nombre en grande, la XP que sube contando y la barra del nivel
  que se completa y vuelve a arrancar. «Seguir» o «Ver la vitrina»; `Esc` cierra. Sin confeti con «reducir
  movimiento».
- **Primera vez y estados vacíos:** bienvenida «En sus marcas.» con cuatro pasos (cuenta, Strava, próxima carrera,
  FC máxima) y la opción de ver la app con datos de ejemplo; la semana vacía con la pista en 0 y cada día listo para
  planificar. Cada sección vacía explica qué va a aparecer y cómo empezar (Registro, Análisis con 0 de 3 salidas,
  Carreras con distancias para elegir, Mapa, Logros en nivel 1).
- **Detalle de sesión:** título y datos del lugar → seis números → ritmo y FC sobre la distancia con las bandas del
  objetivo → tramos plan contra real → recorrido, zonas, sensación, zapatillas y notas.

## Preguntas abiertas

1. ¿Tema por defecto: claro, oscuro o el del sistema?
2. ¿«Planificar» merece su propia sección (calendario de semanas y bloques), o sigue dentro de Semana y Carreras?
3. Bocetado todo lo que tiene la app hoy. El paso a código está en [`REDISENO-PLAN.md`](REDISENO-PLAN.md), por fases.

## Referencias

- Sitios deportivos premiados: https://www.awwwards.com/websites/sports/
- Running en Awwwards: https://www.awwwards.com/sites/day-one-r-run, https://www.awwwards.com/inspiration/hero-intro-moment-citius-mag
- Paneles de entrenamiento en Dribbble: https://dribbble.com/Dwinawan, https://dribbble.com/dmitryuxi
- Patrones de producto: Strava, Garmin Connect, TrainingPeaks (curva de estado físico, fatiga y forma), Whoop, y
  herramientas web como Linear y Vercel para la estructura (barra lateral, ⌘K, atajos).

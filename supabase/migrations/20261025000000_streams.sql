-- Series de Strava de cada sesión (ritmo, FC, distancia, altura y recorrido a lo largo de la salida), para el gráfico
-- del detalle. Se piden a Strava la primera vez que se abre la sesión y después se leen de acá: Strava limita la
-- cantidad de pedidos y así la página abre rápido. Van resumidas (unos cientos de puntos), no segundo a segundo.
-- Si se borra la sesión, se borran sus series.
create table public.streams (
  user_id uuid not null,
  session_id text not null,
  -- la actividad de Strava de la que salieron: si el resultado pasa a otra, se vuelven a pedir
  strava_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, session_id),
  foreign key (user_id, session_id) references public.sessions (user_id, id) on delete cascade
);

alter table public.streams enable row level security;

create policy "streams: dueño" on public.streams
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

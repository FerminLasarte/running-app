-- Esquema inicial de My Running App.
-- Cada fila pertenece a un usuario de Supabase Auth; las políticas RLS dejan que cada uno vea y cambie solo lo suyo.
-- Las sesiones y la configuración se guardan como JSON con la misma forma que usaba el artifact original,
-- así los respaldos exportados desde claude.ai se importan tal cual.

-- Configuración del corredor (zonas, carreras, zapatillas, desafíos…): una fila por usuario.
create table public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  cfg jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Sesiones de entrenamiento: plan y/o resultado.
create table public.sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  type text not null,
  -- fecha del resultado si está hecha, si no la del plan (para ordenar y filtrar)
  date date,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index sessions_user_date_idx on public.sessions (user_id, date);

-- Recorridos traídos de Strava (polilínea codificada) para el mapa.
create table public.routes (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  strava_id text not null,
  date date not null,
  name text not null default '',
  km numeric not null default 0,
  tsec integer not null default 0,
  poly text not null,
  primary key (user_id, id)
);

-- Conexión con Strava. Solo la leen las rutas del servidor con la sesión del usuario.
create table public.strava_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  athlete_id bigint not null,
  athlete_name text not null default '',
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;
alter table public.sessions enable row level security;
alter table public.routes enable row level security;
alter table public.strava_tokens enable row level security;

create policy "settings: dueño" on public.settings
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "sessions: dueño" on public.sessions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "routes: dueño" on public.routes
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "strava_tokens: dueño" on public.strava_tokens
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- En vivo: si cargás algo desde otro dispositivo, la app abierta se actualiza sola.
alter publication supabase_realtime add table public.sessions, public.settings;

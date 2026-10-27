-- Tope mensual de la lectura de capturas con Claude: cuántos pedidos hizo cada usuario en cada mes (de Argentina: se
-- renueva el 1 a la medianoche de acá). Cada uno puede ver lo suyo pero no cambiarlo: solo suma ai_take.
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- el primer día del mes
  month date not null,
  count integer not null default 0,
  primary key (user_id, month)
);

alter table public.ai_usage enable row level security;

create policy "ai_usage: dueño lee" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- el mes de hoy, en Argentina
create function public.ai_month()
returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires')::date;
$$;

-- Suma una lectura a quien llama si todavía no llegó al tope `lim`, en un solo paso (dos pedidos a la vez no se pasan).
-- Devuelve cuántas lleva este mes con esta, o null si ya estaba en el tope (y entonces no suma).
create function public.ai_take(lim integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if auth.uid() is null then
    raise exception 'Sin sesión';
  end if;
  insert into public.ai_usage as u (user_id, month, count)
  select auth.uid(), public.ai_month(), 1
  where lim > 0
  on conflict (user_id, month) do update set count = u.count + 1 where u.count < lim
  returning u.count into n;
  return n;
end;
$$;

-- cuántas lleva quien llama este mes
create function public.ai_used()
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce((select count from public.ai_usage where user_id = auth.uid() and month = public.ai_month()), 0);
$$;

revoke execute on function public.ai_take(integer) from public, anon;
grant execute on function public.ai_take(integer) to authenticated;
revoke execute on function public.ai_used() from public, anon;
grant execute on function public.ai_used() to authenticated;

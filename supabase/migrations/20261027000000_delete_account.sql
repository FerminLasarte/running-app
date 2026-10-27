-- Eliminar la cuenta desde la app (Ajustes → Cuenta y datos). La función borra solo a quien la llama: corre con los
-- permisos de su dueño (security definer) para poder borrar en auth.users, pero siempre contra auth.uid().
-- Ajustes, sesiones, recorridos, la conexión con Strava y el uso de la IA se van en cascada con el usuario, y las series
-- con sus sesiones. La conexión con Strava la revoca antes la app (/api/account/delete), que necesita el token.
create function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sin sesión';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

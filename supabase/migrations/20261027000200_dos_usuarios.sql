-- La app queda para dos personas (el corredor y el responsable): se saca lo que se había armado para abrirla al
-- público. El tope mensual de la lectura de capturas (20261027000100_ai_usage.sql) y eliminar la cuenta desde la app
-- (20261027000000_delete_account.sql). Las demás tablas y su RLS quedan como están.
drop function if exists public.ai_take(integer);
drop function if exists public.ai_used();
drop function if exists public.ai_month();
drop table if exists public.ai_usage;
drop function if exists public.delete_account();

-- Soma ou tira faltas numa conta só no banco, para dois toques rápidos não se perderem.
create or replace function public.bump_absences(p_id uuid, p_delta integer)
returns integer
language sql
security invoker
set search_path = public
as $$
  update public.subjects
     set absences = least(500, greatest(0, absences + p_delta))
   where id = p_id
  returning absences;
$$;
grant execute on function public.bump_absences(uuid, integer) to anon, authenticated;

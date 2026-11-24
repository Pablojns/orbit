-- Rodada 10: limite diário de leituras pela IA (Groq, plano grátis), por pessoa.
create table if not exists public.ai_usage (
  user_id uuid not null,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;

create or replace function public.bump_ai_usage(max_per_day int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  who uuid := coalesce(auth.uid(), public.orbit_owner());
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  n int;
begin
  insert into public.ai_usage (user_id, day, count) values (who, today, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into n;
  return n <= max_per_day;
end;
$$;
revoke execute on function public.bump_ai_usage(int) from public;
grant execute on function public.bump_ai_usage(int) to anon, authenticated;

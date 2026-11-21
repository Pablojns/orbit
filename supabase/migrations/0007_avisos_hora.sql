-- Avisos com hora marcada (ex.: 3 horas antes de uma prova).
-- Um registro por aviso enviado, para nunca avisar duas vezes.
create table if not exists public.reminder_log (
  event_id  uuid not null references public.events (id) on delete cascade,
  kind      text not null,
  sent_at   timestamptz not null default now(),
  primary key (event_id, kind)
);
alter table public.reminder_log enable row level security;
-- Só o servidor (rota de aviso) usa esta tabela.
grant select, insert on public.reminder_log to anon, authenticated;
create policy reminder_log_owner on public.reminder_log
  for all using (exists (select 1 from public.events e where e.id = event_id and e.user_id = public.orbit_owner()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.user_id = public.orbit_owner()));

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Agendamento (feito fora do arquivo, porque usa o segredo guardado no Vault com o nome 'reminder_secret'):
-- select cron.schedule('dimeta-avisos-hora', '*/15 * * * *', $$ select net.http_get(
--   url := 'https://orbit-orcin-beta.vercel.app/api/cron/avisos-hora',
--   headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_secret')),
--   timeout_milliseconds := 15000); $$);

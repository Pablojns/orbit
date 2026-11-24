-- Rodada 6: lembretes configuráveis no Perfil.
alter table public.profiles
  add column if not exists notify_daily boolean not null default true,   -- resumo do dia
  add column if not exists notify_hour boolean not null default true,    -- aviso 3 horas antes
  add column if not exists daily_hour smallint not null default 8 check (daily_hour between 5 and 22),
  add column if not exists last_daily_sent date;                         -- evita mandar o resumo duas vezes

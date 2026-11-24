-- Rodada 3: tutorial de primeiro uso (uma vez por conta) e abas que a pessoa escondeu do menu.
alter table public.profiles
  add column if not exists tutorial_done_at timestamptz,
  add column if not exists hide_studies boolean not null default false,
  add column if not exists hide_habits boolean not null default false;

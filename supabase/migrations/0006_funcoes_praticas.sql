-- Funções práticas: repetição e aviso na agenda, sessões de estudo, checklist,
-- conta dividida, assinaturas, código de pagamento, quem deve, notas da faculdade e lixeira (desfazer).

-- Agenda --------------------------------------------------------------
alter type public.event_kind add value if not exists 'study';

alter table public.events
  add column if not exists series_id uuid,          -- itens criados juntos (repetição ou plano de estudo)
  add column if not exists remind_days smallint not null default 0 check (remind_days between 0 and 30);
create index if not exists events_series_idx on public.events (user_id, series_id);

create table if not exists public.checklist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default coalesce(auth.uid(), public.orbit_owner()) references auth.users (id) on delete cascade,
  parent_type text not null check (parent_type in ('event', 'task')),
  parent_id   uuid not null,
  text        text not null check (char_length(text) between 1 and 120),
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists checklist_parent_idx on public.checklist_items (user_id, parent_type, parent_id);

-- Contas fixas -----------------------------------------------------------
alter table public.bills
  add column if not exists split text not null default 'none' check (split in ('none', 'half', 'fixed')),
  add column if not exists my_share_cents bigint check (my_share_cents is null or my_share_cents > 0),
  add column if not exists is_subscription boolean not null default false,
  add column if not exists payment_code text check (payment_code is null or char_length(payment_code) <= 400);

-- Quem me deve / quem eu devo -------------------------------------------
create table if not exists public.debts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default coalesce(auth.uid(), public.orbit_owner()) references auth.users (id) on delete cascade,
  person       text not null check (char_length(person) between 1 and 60),
  direction    text not null check (direction in ('owed_to_me', 'i_owe')),
  amount_cents bigint not null check (amount_cents > 0),
  note         text check (note is null or char_length(note) <= 120),
  occurred_on  date not null default current_date,
  settled_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists debts_user_idx on public.debts (user_id, settled_at);

-- Notas da faculdade ----------------------------------------------------
create table if not exists public.subjects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default coalesce(auth.uid(), public.orbit_owner()) references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  pass_grade  numeric(4,2) not null default 6 check (pass_grade > 0 and pass_grade <= 100),
  max_grade   numeric(5,2) not null default 10 check (max_grade > 0 and max_grade <= 100),
  is_archived boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.grades (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default coalesce(auth.uid(), public.orbit_owner()) references auth.users (id) on delete cascade,
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  label       text not null check (char_length(label) between 1 and 60),
  weight      numeric(5,2) not null default 1 check (weight > 0),
  value       numeric(5,2) check (value is null or value >= 0), -- vazio = ainda não saiu
  created_at  timestamptz not null default now()
);
create index if not exists grades_subject_idx on public.grades (user_id, subject_id);

-- Lixeira para o "Desfazer" (guarda por pouco tempo o que foi apagado) ------
create table if not exists public.trash (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default coalesce(auth.uid(), public.orbit_owner()) references auth.users (id) on delete cascade,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

-- Segurança: dono autenticado + modo de teste sem login (remover junto com a 0004).
do $$
declare t text;
begin
  foreach t in array array['checklist_items', 'debts', 'subjects', 'grades', 'trash'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dono" on public.%1$I for all to authenticated
                    using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s: modo teste" on public.%1$I for all to anon
                    using (user_id = public.orbit_owner()) with check (user_id = public.orbit_owner())', t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end;
$$;

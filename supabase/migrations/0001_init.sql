-- =====================================================================
-- ORBIT — modelo de dados do MVP (Fase 1)
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > Run.
--
-- Regras gerais:
--   * Todo valor em dinheiro é guardado em CENTAVOS (bigint). R$ 12,34 = 1234.
--   * Toda tabela tem user_id e Row Level Security: cada usuário só enxerga
--     e altera os próprios dados.
--   * Relações entre tabelas usam chave composta (id, user_id), então não dá
--     para ligar um registro seu a um cartão/categoria de outra pessoa.
-- =====================================================================

-- ---------- utilidades ------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- tipos -----------------------------------------------------

create type public.category_kind as enum ('expense', 'income');
create type public.transaction_type as enum ('expense', 'income');
create type public.payment_method as enum ('cash', 'debit', 'pix', 'transfer', 'other');
create type public.goal_kind as enum ('emergency', 'custom');
create type public.event_kind as enum ('exam', 'appointment', 'deadline', 'bill', 'other');

-- ---------- perfil ----------------------------------------------------

create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  display_name     text,
  -- Dia em que o "mês financeiro" da pessoa começa (ex.: dia do salário).
  -- Em meses mais curtos, o app usa o último dia do mês.
  cycle_start_day  smallint not null default 1 check (cycle_start_day between 1 and 31),
  onboarded_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- categorias ------------------------------------------------

create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  kind         public.category_kind not null default 'expense',
  icon         text,
  color        text,
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, kind, name)
);

-- ---------- entradas recorrentes (salário, extras) --------------------

create table public.recurring_incomes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  amount_cents  bigint not null check (amount_cents > 0),
  day_of_month  smallint not null check (day_of_month between 1 and 31),
  starts_on     date not null default current_date,
  ends_on       date,                       -- opcional: renda que acaba numa data
  category_id   uuid,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, user_id),
  check (ends_on is null or ends_on >= starts_on),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);

create trigger recurring_incomes_updated_at before update on public.recurring_incomes
  for each row execute function public.set_updated_at();

-- ---------- movimentações (entradas e gastos fora do cartão) ----------

create table public.transactions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type                 public.transaction_type not null,
  amount_cents         bigint not null check (amount_cents > 0),
  occurred_on          date not null default current_date,
  category_id          uuid,
  payment_method       public.payment_method,
  description          text check (char_length(description) <= 120),
  recurring_income_id  uuid,                -- quando a entrada veio de uma renda recorrente
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id),
  foreign key (recurring_income_id, user_id) references public.recurring_incomes (id, user_id) on delete set null (recurring_income_id)
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);

create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------- cartões de crédito ----------------------------------------

create table public.credit_cards (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 40),
  closing_day   smallint not null check (closing_day between 1 and 31),
  due_day       smallint not null check (due_day between 1 and 31),
  limit_cents   bigint check (limit_cents is null or limit_cents >= 0),
  color         text,
  is_archived   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, user_id)
);

create trigger credit_cards_updated_at before update on public.credit_cards
  for each row execute function public.set_updated_at();

-- Uma compra no cartão (à vista = 1 parcela).
create table public.card_purchases (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id             uuid not null,
  description         text not null check (char_length(description) between 1 and 120),
  total_cents         bigint not null check (total_cents > 0),
  installments_count  smallint not null default 1 check (installments_count between 1 and 48),
  purchased_on        date not null default current_date,
  category_id         uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (id, user_id),
  foreign key (card_id, user_id) references public.credit_cards (id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);

create trigger card_purchases_updated_at before update on public.card_purchases
  for each row execute function public.set_updated_at();

-- Cada parcela já aponta para a fatura em que cai.
-- statement_month = primeiro dia do mês de VENCIMENTO da fatura (ex.: 2026-12-01).
create table public.installments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  purchase_id      uuid not null,
  card_id          uuid not null,
  number           smallint not null check (number >= 1),
  amount_cents     bigint not null check (amount_cents > 0),
  statement_month  date not null check (extract(day from statement_month) = 1),
  created_at       timestamptz not null default now(),
  unique (purchase_id, number),
  foreign key (purchase_id, user_id) references public.card_purchases (id, user_id) on delete cascade,
  foreign key (card_id, user_id) references public.credit_cards (id, user_id) on delete cascade
);

create index installments_card_statement_idx on public.installments (user_id, card_id, statement_month);

-- Pagamento de fatura.
create table public.card_statement_payments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id          uuid not null,
  statement_month  date not null check (extract(day from statement_month) = 1),
  amount_cents     bigint not null check (amount_cents > 0),
  paid_on          date not null default current_date,
  created_at       timestamptz not null default now(),
  foreign key (card_id, user_id) references public.credit_cards (id, user_id) on delete cascade
);

create index card_statement_payments_idx on public.card_statement_payments (user_id, card_id, statement_month);

-- ---------- contas fixas ----------------------------------------------

create table public.bills (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  amount_cents  bigint not null check (amount_cents > 0),
  due_day       smallint not null check (due_day between 1 and 31),
  category_id   uuid,
  starts_on     date not null default current_date,
  ends_on       date,                       -- opcional: ex.: parcelamento que termina
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, user_id),
  check (ends_on is null or ends_on >= starts_on),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);

create trigger bills_updated_at before update on public.bills
  for each row execute function public.set_updated_at();

create table public.bill_payments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bill_id          uuid not null,
  reference_month  date not null check (extract(day from reference_month) = 1),
  amount_cents     bigint not null check (amount_cents > 0),
  paid_on          date not null default current_date,
  created_at       timestamptz not null default now(),
  unique (bill_id, reference_month),
  foreign key (bill_id, user_id) references public.bills (id, user_id) on delete cascade
);

-- ---------- metas (inclui reserva de emergência) ----------------------

create table public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  kind          public.goal_kind not null default 'custom',
  target_cents  bigint not null check (target_cents > 0),
  target_date   date,
  is_archived   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, user_id)
);

-- Só pode existir UMA reserva de emergência ativa por pessoa.
create unique index goals_one_emergency_idx on public.goals (user_id)
  where kind = 'emergency' and not is_archived;

create trigger goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

create table public.goal_contributions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id         uuid not null,
  amount_cents    bigint not null check (amount_cents <> 0), -- negativo = retirada
  contributed_on  date not null default current_date,
  note            text check (char_length(note) <= 120),
  created_at      timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade
);

-- ---------- agenda e tarefas ------------------------------------------

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  kind        public.event_kind not null default 'other',
  starts_at   timestamptz not null,
  all_day     boolean not null default true,
  notes       text check (char_length(notes) <= 500),
  done_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index events_user_starts_idx on public.events (user_id, starts_at);

create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  priority    smallint not null default 2 check (priority between 1 and 3), -- 1 alta, 2 média, 3 baixa
  due_on      date,
  done_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------- hábitos ---------------------------------------------------

create table public.habits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 60),
  target_per_week   smallint not null default 7 check (target_per_week between 1 and 7),
  icon              text,
  color             text,
  is_archived       boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, user_id)
);

create trigger habits_updated_at before update on public.habits
  for each row execute function public.set_updated_at();

create table public.habit_checks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id    uuid not null,
  checked_on  date not null default current_date,
  created_at  timestamptz not null default now(),
  unique (habit_id, checked_on),
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);

create index habit_checks_user_date_idx on public.habit_checks (user_id, checked_on);

-- ---------- Row Level Security ----------------------------------------

alter table public.profiles enable row level security;

create policy "profiles: ver o próprio" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: editar o próprio" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Mesma política para todas as tabelas com user_id.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'recurring_incomes', 'transactions', 'credit_cards',
    'card_purchases', 'installments', 'card_statement_payments', 'bills',
    'bill_payments', 'goals', 'goal_contributions', 'events', 'tasks',
    'habits', 'habit_checks'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s: só os próprios dados" on public.%1$I
         for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
    execute format('create index if not exists %1$s_user_idx on public.%1$I (user_id)', t);
  end loop;
end;
$$;

-- ---------- novo usuário: cria perfil e categorias padrão -------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );

  insert into public.categories (user_id, name, kind, icon) values
    (new.id, 'Alimentação',  'expense', 'utensils'),
    (new.id, 'Mercado',      'expense', 'shopping-basket'),
    (new.id, 'Transporte',   'expense', 'bus'),
    (new.id, 'Moradia',      'expense', 'home'),
    (new.id, 'Contas',       'expense', 'receipt'),
    (new.id, 'Lazer',        'expense', 'gamepad-2'),
    (new.id, 'Saúde',        'expense', 'heart-pulse'),
    (new.id, 'Educação',     'expense', 'graduation-cap'),
    (new.id, 'Compras',      'expense', 'shopping-bag'),
    (new.id, 'Assinaturas',  'expense', 'repeat'),
    (new.id, 'Outros',       'expense', 'circle'),
    (new.id, 'Salário',      'income',  'briefcase'),
    (new.id, 'Extra',        'income',  'sparkles'),
    (new.id, 'Outros',       'income',  'circle');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

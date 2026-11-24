-- Rodada 9: assinatura (7 dias grátis, depois R$ 29,90/mês). Só é usada com BILLING_ENABLED.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'trial' check (status in ('trial', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  current_period_end timestamptz,
  provider text not null default 'asaas',
  provider_customer_id text,
  provider_subscription_id text,
  canceled_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "subscriptions: dono lê" on public.subscriptions for select to authenticated using (user_id = auth.uid());
-- A pessoa só consegue criar o próprio teste grátis; o resto muda pelo servidor (webhook com a chave de serviço).
create policy "subscriptions: dono começa o teste" on public.subscriptions for insert to authenticated
  with check (user_id = auth.uid() and status = 'trial' and trial_ends_at <= now() + interval '7 days 1 hour' and provider_subscription_id is null);

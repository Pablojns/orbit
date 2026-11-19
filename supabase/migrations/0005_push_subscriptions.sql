-- Lembretes por notificação (web push). Uma linha por aparelho inscrito.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default coalesce(auth.uid(), public.orbit_owner()) references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push: dono autenticado" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Modo de teste sem login (remover junto com a 0004).
create policy "push: modo teste" on public.push_subscriptions
  for all to anon using (user_id = public.orbit_owner()) with check (user_id = public.orbit_owner());

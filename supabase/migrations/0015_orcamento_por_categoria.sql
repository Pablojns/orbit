alter table public.categories add column if not exists budget_cents bigint check (budget_cents is null or budget_cents > 0);

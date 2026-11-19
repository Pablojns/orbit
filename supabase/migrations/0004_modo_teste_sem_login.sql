-- =====================================================================
-- ORBIT — MODO TESTE SEM LOGIN (temporário)
-- Qualquer pessoa com o link do app lê e altera os dados do dono abaixo.
-- Quando o login voltar, rode o bloco "DESFAZER" no fim deste arquivo.
-- =====================================================================

create or replace function public.orbit_owner()
returns uuid
language sql
immutable
set search_path = ''
as $$ select '15d5e8bf-73ff-4225-aa70-17d72110a331'::uuid $$;

create policy "profiles: modo teste ver" on public.profiles
  for select to anon using (id = public.orbit_owner());
create policy "profiles: modo teste editar" on public.profiles
  for update to anon using (id = public.orbit_owner()) with check (id = public.orbit_owner());

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
    execute format(
      'alter table public.%I alter column user_id set default coalesce(auth.uid(), public.orbit_owner())', t);
    execute format(
      'create policy "%1$s: modo teste" on public.%1$I
         for all to anon
         using (user_id = public.orbit_owner())
         with check (user_id = public.orbit_owner())', t);
  end loop;
end;
$$;

-- DESFAZER (quando o login voltar):
-- drop policy "profiles: modo teste ver" on public.profiles;
-- drop policy "profiles: modo teste editar" on public.profiles;
-- e, para cada tabela da lista acima:
--   drop policy "<tabela>: modo teste" on public.<tabela>;
--   alter table public.<tabela> alter column user_id set default auth.uid();

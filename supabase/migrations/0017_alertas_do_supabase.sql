-- Rodada 10: alertas do Supabase.
-- 1) Função interna não deve ser chamada pela API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- 2) Regras de acesso: auth.uid() avaliado uma vez por consulta, não por linha.
do $$
declare
  p record;
  q text;
  c text;
begin
  for p in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (qual ~ 'auth\.uid\(\)' or with_check ~ 'auth\.uid\(\)')
      and coalesce(qual, '') !~* 'select auth\.uid\(\)'
      and coalesce(with_check, '') !~* 'select auth\.uid\(\)'
  loop
    q := replace(p.qual, 'auth.uid()', '(select auth.uid())');
    c := replace(p.with_check, 'auth.uid()', '(select auth.uid())');
    if q is not null and c is not null then
      execute format('alter policy %I on public.%I using (%s) with check (%s)', p.policyname, p.tablename, q, c);
    elsif q is not null then
      execute format('alter policy %I on public.%I using (%s)', p.policyname, p.tablename, q);
    else
      execute format('alter policy %I on public.%I with check (%s)', p.policyname, p.tablename, c);
    end if;
  end loop;
end;
$$;

-- 3) Índice para cada chave estrangeira sem índice.
do $$
declare
  f record;
  cols text;
begin
  for f in
    select c.conrelid::regclass as tbl, c.conname, c.conkey, c.conrelid
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where c.contype = 'f' and n.nspname = 'public'
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] @> c.conkey
          and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] <@ c.conkey
      )
  loop
    select string_agg(quote_ident(a.attname), ', ' order by k.ord) into cols
    from unnest(f.conkey) with ordinality k(attnum, ord)
    join pg_attribute a on a.attrelid = f.conrelid and a.attnum = k.attnum;
    execute format('create index if not exists %I on %s (%s)', left(f.conname || '_idx', 63), f.tbl, cols);
  end loop;
end;
$$;

-- 4) Duas chaves estrangeiras de cartão com colunas em outra ordem.
create index if not exists card_statement_payments_card_user_idx on public.card_statement_payments (card_id, user_id);
create index if not exists installments_card_user_idx on public.installments (card_id, user_id);

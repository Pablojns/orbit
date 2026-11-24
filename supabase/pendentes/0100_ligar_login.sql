-- =====================================================================
-- DIMETA: LIGAR O LOGIN (rodar só quando AUTH_ENABLED for ligado).
-- NÃO está aplicado na produção. Passo a passo em docs/PENDENCIAS-DO-PABLO.md.
-- Remove todas as regras "modo teste" (acesso anônimo aos dados do dono)
-- e volta o user_id padrão para quem está logado. As regras por usuário
-- ("dono", "dono autenticado") já existem desde as migrações 0001 a 0011.
-- =====================================================================
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and policyname ilike '%modo teste%'
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;

  for p in
    select table_name
    from information_schema.columns
    where table_schema = 'public' and column_name = 'user_id' and column_default ilike '%orbit_owner%'
  loop
    execute format('alter table public.%I alter column user_id set default auth.uid()', p.table_name);
  end loop;
end;
$$;

-- Conferência: deve voltar zero linhas.
select tablename, policyname from pg_policies where schemaname = 'public' and policyname ilike '%modo teste%';

-- Com login ligado, só quem entrou pode usar a IA.
revoke execute on function public.bump_ai_usage(int) from anon;

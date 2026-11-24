-- =====================================================================
-- DIMETA: levar os dados do modo teste para a conta real do Pablo.
-- Rodar DEPOIS de criar a conta (Criar conta em /login com o e-mail do Pablo)
-- e ANTES de 0100_ligar_login.sql. Troque o e-mail na linha marcada.
-- Testado em cópia (tabelas temporárias); veja docs/RELATORIO-RODADA-9.md.
-- =====================================================================
-- As tabelas filhas apontam para (id, user_id) da tabela mãe: as checagens de chave
-- estrangeira ficam pausadas só nesta transação, enquanto o user_id muda em todas.
begin;
set local session_replication_role = replica;

do $$
declare
  dono constant uuid := '15d5e8bf-73ff-4225-aa70-17d72110a331';
  novo uuid;
  t record;
begin
  select id into novo from auth.users where email = 'TROQUE-PELO-SEU-EMAIL@exemplo.com'; -- << troque aqui
  if novo is null then raise exception 'Conta não encontrada: crie a conta em /login primeiro.'; end if;

  -- Perfil: copia nome, dia do salário e preferências para o perfil novo.
  update public.profiles p set
    display_name = o.display_name, cycle_start_day = o.cycle_start_day, onboarded_at = o.onboarded_at,
    tutorial_done_at = coalesce(o.tutorial_done_at, now()), hide_studies = o.hide_studies, hide_habits = o.hide_habits,
    notify_daily = o.notify_daily, notify_hour = o.notify_hour, daily_hour = o.daily_hour
  from public.profiles o where o.id = dono and p.id = novo;

  -- O perfil novo ganha categorias padrão no cadastro: apaga essas antes de trazer as do dono.
  delete from public.categories where user_id = novo;

  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'user_id' and table_name <> 'profiles'
  loop
    execute format('update public.%I set user_id = $1 where user_id = $2', t.table_name) using novo, dono;
  end loop;
end;
$$;

commit;

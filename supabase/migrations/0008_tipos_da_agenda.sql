-- =====================================================================
-- Agenda (21/11): tipos editáveis pela pessoa, com cor, e prioridade opcional
-- em qualquer item. O campo "kind" continua guardando o comportamento
-- (prova tem plano de estudo, estudo vem do plano etc.).
-- =====================================================================

create table if not exists public.event_types (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default coalesce(auth.uid(), public.orbit_owner()) references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  color       text not null default '#94A3B8' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  base_kind   public.event_kind not null default 'other',
  position    smallint not null default 0,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists event_types_user_idx on public.event_types (user_id, position);

alter table public.events add column if not exists type_id uuid references public.event_types (id) on delete set null;
alter table public.events add column if not exists priority smallint check (priority between 1 and 3);

alter table public.event_types enable row level security;
create policy "event_types: dono" on public.event_types for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "event_types: modo teste" on public.event_types for all to anon
  using (user_id = public.orbit_owner()) with check (user_id = public.orbit_owner());
grant select, insert, update, delete on public.event_types to anon, authenticated;

-- Tipos de fábrica para quem já tem perfil (o app cria para contas novas).
insert into public.event_types (user_id, name, color, base_kind, position)
select p.id, t.name, t.color, t.kind::public.event_kind, t.pos
from public.profiles p
cross join (values
  ('Prova',       '#3B82F6', 'exam',        1),
  ('Compromisso', '#F4B740', 'appointment', 2),
  ('Entrega',     '#FF7A93', 'deadline',    3),
  ('Lembrete',    '#94A3B8', 'other',       4),
  ('Estudo',      '#5EEAD4', 'study',       5)
) as t(name, color, kind, pos)
where not exists (select 1 from public.event_types e where e.user_id = p.id);

-- Itens que já existem ganham o tipo equivalente.
update public.events e
set type_id = t.id
from public.event_types t
where e.type_id is null and t.user_id = e.user_id and t.base_kind = e.kind;

-- =====================================================================
-- Estudos (21/11): faltas por matéria, provas e trabalhos ligados à matéria,
-- horário de aulas e datas do semestre.
-- =====================================================================

alter table public.subjects add column if not exists max_absences smallint check (max_absences is null or max_absences between 0 and 500);
alter table public.subjects add column if not exists absences smallint not null default 0 check (absences between 0 and 500);

alter table public.events add column if not exists subject_id uuid references public.subjects (id) on delete set null;
create index if not exists events_subject_idx on public.events (user_id, subject_id);

create table if not exists public.class_slots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default coalesce(auth.uid(), public.orbit_owner()) references auth.users (id) on delete cascade,
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6), -- 0 domingo ... 6 sábado
  starts_at   time not null,
  ends_at     time,
  room        text check (room is null or char_length(room) <= 60),
  created_at  timestamptz not null default now()
);
create index if not exists class_slots_user_idx on public.class_slots (user_id, weekday);

create table if not exists public.study_terms (
  user_id     uuid primary key default coalesce(auth.uid(), public.orbit_owner()) references auth.users (id) on delete cascade,
  starts_on   date not null,
  ends_on     date not null,
  check (ends_on >= starts_on)
);

do $$
declare t text;
begin
  foreach t in array array['class_slots', 'study_terms'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dono" on public.%1$I for all to authenticated
                    using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s: modo teste" on public.%1$I for all to anon
                    using (user_id = public.orbit_owner()) with check (user_id = public.orbit_owner())', t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end;
$$;

-- =====================================================================
-- ORBIT — lista de espera do site (rode depois do 0001_init.sql)
-- Qualquer visitante pode SE INSCREVER, mas ninguém consegue LER a lista
-- pelo site. Você vê os e-mails no Supabase: Table Editor > waitlist.
-- =====================================================================

create table public.waitlist (
  id                uuid primary key default gen_random_uuid(),
  email             text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  marketing_consent boolean not null default false, -- aceitou receber novidades e ofertas
  source            text check (char_length(source) <= 80),  -- de onde veio (ex.: tiktok, instagram)
  created_at        timestamptz not null default now()
);

create unique index waitlist_email_unique on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

create policy "waitlist: qualquer um pode se inscrever" on public.waitlist
  for insert to anon, authenticated
  with check (true);

-- Sem política de select/update/delete: a lista não pode ser lida pelo site.

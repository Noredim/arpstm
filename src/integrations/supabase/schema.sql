-- App settings (1 row)
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Gestão de ARP',
  description text not null default 'Controle de saldo e adesões',
  image_url text,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Anyone authenticated can read
drop policy if exists app_settings_select_authenticated on public.app_settings;
create policy app_settings_select_authenticated
on public.app_settings
for select
to authenticated
using (true);

-- Only ADMIN can write (uses existing has_role function)
drop policy if exists app_settings_write_admin on public.app_settings;
create policy app_settings_write_admin
on public.app_settings
for all
to authenticated
using (public.has_role(array['ADMIN']))
with check (public.has_role(array['ADMIN']));

-- Ensure there is at least one row (optional seed suggestion)
-- insert into public.app_settings (name, description)
-- values ('Gestão de ARP', 'Controle de saldo e adesões')
-- on conflict do nothing;
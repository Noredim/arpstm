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

-- Storage policies for bucket app-assets
-- IMPORTANT: create the bucket "app-assets" in Supabase Storage (recommended as public).
-- RLS on storage.objects is enabled by default and needs explicit policies.

drop policy if exists "app_assets_read_authenticated" on storage.objects;
create policy "app_assets_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'app-assets');

drop policy if exists "app_assets_insert_admin" on storage.objects;
create policy "app_assets_insert_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'app-assets'
  and public.has_role(array['ADMIN'])
);

drop policy if exists "app_assets_update_admin" on storage.objects;
create policy "app_assets_update_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'app-assets'
  and public.has_role(array['ADMIN'])
)
with check (
  bucket_id = 'app-assets'
  and public.has_role(array['ADMIN'])
);

drop policy if exists "app_assets_delete_admin" on storage.objects;
create policy "app_assets_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'app-assets'
  and public.has_role(array['ADMIN'])
);
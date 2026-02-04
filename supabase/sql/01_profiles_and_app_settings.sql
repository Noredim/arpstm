-- =========================
-- PASSO 1: PROFILES + RLS
-- =========================

create table if not exists public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'COMERCIAL',
  first_name text,
  last_name text,
  avatar_url text,
  updated_at timestamp with time zone default now(),
  primary key (id)
);

alter table public.profiles enable row level security;

drop policy if exists profiles_select_policy on public.profiles;
create policy profiles_select_policy
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists profiles_insert_policy on public.profiles;
create policy profiles_insert_policy
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists profiles_update_policy on public.profiles;
create policy profiles_update_policy
on public.profiles
for update
to authenticated
using (auth.uid() = id);

drop policy if exists profiles_delete_policy on public.profiles;
create policy profiles_delete_policy
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

-- Trigger: cria profile automaticamente no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================
-- PASSO 2: APP_SETTINGS + RLS
-- =========================

create table if not exists public.app_settings (
  id text primary key,
  app_name text not null,
  logo_url text,
  updated_at timestamp with time zone default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row
execute function public.set_updated_at();

insert into public.app_settings (id, app_name, logo_url)
values ('default', 'Gestão de ARP', null)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select
on public.app_settings
for select
to authenticated
using (true);

drop policy if exists app_settings_upsert_admin on public.app_settings;
create policy app_settings_upsert_admin
on public.app_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
);

drop policy if exists app_settings_update_admin on public.app_settings;
create policy app_settings_update_admin
on public.app_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
);
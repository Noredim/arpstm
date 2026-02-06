-- RBAC for profiles: add role column and basic policies

alter table public.profiles
  add column if not exists role text default 'COMERCIAL';

alter table public.profiles enable row level security;

create policy if not exists "profiles_select_self" on public.profiles
for select to authenticated
using (auth.uid() = id);

create policy if not exists "profiles_update_self" on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

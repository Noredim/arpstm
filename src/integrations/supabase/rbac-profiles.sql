alter table public.profiles
  add column if not exists role text default 'COMERCIAL';

alter table public.profiles enable row level security;

create policy "profiles_select_self" on public.profiles
for select to authenticated
using (auth.uid() = id);

create policy "profiles_update_self" on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
-- =========================
-- USUÁRIOS: profiles + roles
-- =========================

-- 1) Tabela profiles (1:1 com auth.users)
create table if not exists public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'COMERCIAL' check (role in ('ADMIN','GESTOR','COMERCIAL')),
  first_name text,
  last_name text,
  avatar_url text,
  updated_at timestamp with time zone default now(),
  primary key (id)
);

-- 2) RLS (obrigatório)
alter table public.profiles enable row level security;

-- 3) Policies: cada usuário só vê/edita o próprio profile
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

-- 4) Trigger: cria profile automaticamente quando um usuário é criado no Auth
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

-- 5) Helper: promover um usuário a ADMIN pelo email (para usar no SQL Editor).
-- Observação: isso roda com seus privilégios no banco via SQL Editor.
create or replace function public.promote_user_to_admin(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  select au.id into uid
  from auth.users au
  where lower(au.email) = lower(target_email)
  limit 1;

  if uid is null then
    raise exception 'Usuário não encontrado no auth.users: %', target_email;
  end if;

  insert into public.profiles (id, role)
  values (uid, 'ADMIN')
  on conflict (id) do update set role = 'ADMIN', updated_at = now();
end;
$$;
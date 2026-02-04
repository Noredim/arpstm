-- Shared company database schema for ARP management
-- IMPORTANT: Run this in Supabase SQL Editor.
-- Assumes public.profiles exists with column: role text (ADMIN/GESTOR/COMERCIAL) and RLS already enabled.

-- Extensions
create extension if not exists "pgcrypto";

-- Helper: check role from profiles
create or replace function public.has_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = any(roles)
  );
$$;

grant execute on function public.has_role(text[]) to authenticated;

-- =========================
-- Estados / Cidades
-- =========================
create table if not exists public.estados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sigla text not null,
  ibge_id int,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint estados_sigla_unique unique (sigla),
  constraint estados_ibge_unique unique (ibge_id)
);

create table if not exists public.cidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  estado_id uuid not null references public.estados(id) on delete restrict,
  ibge_id int,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint cidades_ibge_unique unique (ibge_id),
  constraint cidades_nome_estado_unique unique (estado_id, nome)
);

alter table public.estados enable row level security;
alter table public.cidades enable row level security;

-- Read for all authenticated
create policy "estados_select_authenticated" on public.estados
for select to authenticated
using (true);

create policy "cidades_select_authenticated" on public.cidades
for select to authenticated
using (true);

-- Write: ADMIN or GESTOR
create policy "estados_insert_admin_gestor" on public.estados
for insert to authenticated
with check (public.has_role(array['ADMIN','GESTOR']));

create policy "estados_update_admin_gestor" on public.estados
for update to authenticated
using (public.has_role(array['ADMIN','GESTOR']))
with check (public.has_role(array['ADMIN','GESTOR']));

create policy "estados_delete_admin" on public.estados
for delete to authenticated
using (public.has_role(array['ADMIN']));

create policy "cidades_insert_admin_gestor" on public.cidades
for insert to authenticated
with check (public.has_role(array['ADMIN','GESTOR']));

create policy "cidades_update_admin_gestor" on public.cidades
for update to authenticated
using (public.has_role(array['ADMIN','GESTOR']))
with check (public.has_role(array['ADMIN','GESTOR']));

create policy "cidades_delete_admin" on public.cidades
for delete to authenticated
using (public.has_role(array['ADMIN']));

-- =========================
-- Clientes
-- =========================
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text not null,
  cidade text not null,
  esfera text not null check (esfera in ('MUNICIPAL','ESTADUAL','FEDERAL')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint clientes_cnpj_unique unique (cnpj)
);

alter table public.clientes enable row level security;

create policy "clientes_select_authenticated" on public.clientes
for select to authenticated
using (true);

-- Write: any authenticated role from app (ADMIN/GESTOR/COMERCIAL)
create policy "clientes_insert_roles" on public.clientes
for insert to authenticated
with check (public.has_role(array['ADMIN','GESTOR','COMERCIAL']));

create policy "clientes_update_roles" on public.clientes
for update to authenticated
using (public.has_role(array['ADMIN','GESTOR','COMERCIAL']))
with check (public.has_role(array['ADMIN','GESTOR','COMERCIAL']));

-- Delete: ADMIN or GESTOR (match app behavior)
create policy "clientes_delete_admin_gestor" on public.clientes
for delete to authenticated
using (public.has_role(array['ADMIN','GESTOR']));

-- =========================
-- ARPs / Lotes / Itens / Equipamentos
-- =========================
create table if not exists public.arps (
  id uuid primary key default gen_random_uuid(),
  nome_ata text not null,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  is_consorcio boolean not null default false,
  data_assinatura date not null,
  data_vencimento date not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.arp_participantes (
  arp_id uuid not null references public.arps(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (arp_id, cliente_id)
);

create table if not exists public.arp_lotes (
  id uuid primary key default gen_random_uuid(),
  arp_id uuid not null references public.arps(id) on delete cascade,
  nome_lote text not null,
  tipo_fornecimento text not null check (tipo_fornecimento in ('FORNECIMENTO','INSTALACAO','MANUTENCAO','COMODATO')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.arp_itens (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.arp_lotes(id) on delete cascade,
  kind text not null check (kind in ('FORNECIMENTO','INSTALACAO','MANUTENCAO','COMODATO')),
  numero_item text not null,
  nome_comercial text,
  descricao_interna text not null,
  descricao text not null,
  unidade text not null,
  total numeric not null default 0,
  valor_unitario numeric,
  valor_unitario_mensal numeric,
  tipo_item text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint arp_itens_unique_per_lote unique (lote_id, numero_item)
);

create table if not exists public.arp_item_equipamentos (
  id uuid primary key default gen_random_uuid(),
  arp_item_id uuid not null references public.arp_itens(id) on delete cascade,
  nome_equipamento text not null,
  quantidade numeric not null default 0,
  custo_unitario numeric not null default 0,
  fornecedor text,
  fabricante text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.arps enable row level security;
alter table public.arp_participantes enable row level security;
alter table public.arp_lotes enable row level security;
alter table public.arp_itens enable row level security;
alter table public.arp_item_equipamentos enable row level security;

-- Select: all authenticated
create policy "arps_select_authenticated" on public.arps
for select to authenticated using (true);

create policy "arp_participantes_select_authenticated" on public.arp_participantes
for select to authenticated using (true);

create policy "arp_lotes_select_authenticated" on public.arp_lotes
for select to authenticated using (true);

create policy "arp_itens_select_authenticated" on public.arp_itens
for select to authenticated using (true);

create policy "arp_item_equipamentos_select_authenticated" on public.arp_item_equipamentos
for select to authenticated using (true);

-- Write: ADMIN/GESTOR/COMERCIAL for ARP structure (match app)
create policy "arps_write_roles" on public.arps
for all to authenticated
using (public.has_role(array['ADMIN','GESTOR','COMERCIAL']))
with check (public.has_role(array['ADMIN','GESTOR','COMERCIAL']));

create policy "arp_participantes_write_roles" on public.arp_participantes
for all to authenticated
using (public.has_role(array['ADMIN','GESTOR','COMERCIAL']))
with check (public.has_role(array['ADMIN','GESTOR','COMERCIAL']));

create policy "arp_lotes_write_roles" on public.arp_lotes
for all to authenticated
using (public.has_role(array['ADMIN','GESTOR','COMERCIAL']))
with check (public.has_role(array['ADMIN','GESTOR','COMERCIAL']));

create policy "arp_itens_write_roles" on public.arp_itens
for all to authenticated
using (public.has_role(array['ADMIN','GESTOR','COMERCIAL']))
with check (public.has_role(array['ADMIN','GESTOR','COMERCIAL']));

create policy "arp_item_equipamentos_write_roles" on public.arp_item_equipamentos
for all to authenticated
using (public.has_role(array['ADMIN','GESTOR','COMERCIAL']))
with check (public.has_role(array['ADMIN','GESTOR','COMERCIAL']));

-- =========================
-- Kits
-- =========================
create table if not exists public.kits (
  id uuid primary key default gen_random_uuid(),
  nome_kit text not null,
  ata_id uuid not null references public.arps(id) on delete cascade,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.kit_itens (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.kits(id) on delete cascade,
  lote_id uuid not null references public.arp_lotes(id) on delete cascade,
  arp_item_id uuid not null references public.arp_itens(id) on delete cascade,
  quantidade numeric not null default 1,
  created_at timestamptz not null default now()
);

alter table public.kits enable row level security;
alter table public.kit_itens enable row level security;

create policy "kits_select_authenticated" on public.kits
for select to authenticated using (true);

create policy "kit_itens_select_authenticated" on public.kit_itens
for select to authenticated using (true);

create policy "kits_write_roles" on public.kits
for all to authenticated
using (public.has_role(array['ADMIN','GESTOR','COMERCIAL']))
with check (public.has_role(array['ADMIN','GESTOR','COMERCIAL']));

create policy "kit_itens_write_roles" on public.kit_itens
for all to authenticated
using (public.has_role(array['ADMIN','GESTOR','COMERCIAL']))
with check (public.has_role(array['ADMIN','GESTOR','COMERCIAL']));

-- =========================
-- Oportunidades
-- =========================
create table if not exists public.oportunidades (
  id uuid primary key default gen_random_uuid(),
  codigo int not null,
  titulo text not null,
  descricao text,
  temperatura text not null check (temperatura in ('FRIA','MORNA','QUENTE')),
  data_abertura date not null,
  prazo_fechamento date not null,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  arp_id uuid not null references public.arps(id) on delete restrict,
  status text not null check (status in ('ABERTA','GANHAMOS','PERDEMOS')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint oportunidades_codigo_unique unique (codigo)
);

create table if not exists public.oportunidade_itens (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references public.oportunidades(id) on delete cascade,
  lote_id uuid not null references public.arp_lotes(id) on delete restrict,
  arp_item_id uuid not null references public.arp_itens(id) on delete restrict,
  quantidade numeric not null default 1
);

create table if not exists public.oportunidade_kits (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references public.oportunidades(id) on delete cascade,
  kit_id uuid not null references public.kits(id) on delete restrict,
  quantidade_kits numeric not null default 1
);

create table if not exists public.oportunidade_kit_itens (
  id text primary key,
  oportunidade_id uuid not null references public.oportunidades(id) on delete cascade,
  oportunidade_kit_id uuid not null references public.oportunidade_kits(id) on delete cascade,
  lote_id uuid not null references public.arp_lotes(id) on delete restrict,
  arp_item_id uuid not null references public.arp_itens(id) on delete restrict,
  quantidade_total numeric not null default 0
);

alter table public.oportunidades enable row level security;
alter table public.oportunidade_itens enable row level security;
alter table public.oportunidade_kits enable row level security;
alter table public.oportunidade_kit_itens enable row level security;

create policy "oportunidades_select_authenticated" on public.oportunidades
for select to authenticated using (true);

create policy "oportunidade_itens_select_authenticated" on public.oportunidade_itens
for select to authenticated using (true);

create policy "oportunidade_kits_select_authenticated" on public.oportunidade_kits
for select to authenticated using (true);

create policy "oportunidade_kit_itens_select_authenticated" on public.oportunidade_kit_itens
for select to authenticated using (true);

create policy "oportunidades_write_roles" on public.oportunidades
for all to authenticated
using (public.has_role(array['ADMIN','GESTOR','COMERCIAL']))
with check (public.has_role(array['ADMIN','GESTOR','COMERCIAL']));

create policy "oportunidade_itens_write_roles" on public.oportunidade_itens
for all to authenticated
using (public.has_role(array['ADMIN','GESTOR','COMERCIAL']))
with check (public.has_role(array['ADMIN','GESTOR','COMERCIAL']));

create policy "oportunidade_kits_write_roles" on public.oportunidade_kits
for all to authenticated
using (public.has_role(array['ADMIN','GESTOR','COMERCIAL']))
with check (public.has_role(array['ADMIN','GESTOR','COMERCIAL']));

create policy "oportunidade_kit_itens_write_roles" on public.oportunidade_kit_itens
for all to authenticated
using (public.has_role(array['ADMIN','GESTOR','COMERCIAL']))
with check (public.has_role(array['ADMIN','GESTOR','COMERCIAL']));

-- =========================
-- Logs de Integração
-- =========================
create table if not exists public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('IBGE_SYNC')),
  inicio_em timestamptz not null,
  fim_em timestamptz,
  status text not null check (status in ('SUCESSO','ERRO')),
  mensagem text,
  total_estados int not null default 0,
  total_cidades_inseridas int not null default 0,
  total_cidades_atualizadas int not null default 0,
  total_erros int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.integration_logs enable row level security;

create policy "integration_logs_select_authenticated" on public.integration_logs
for select to authenticated using (true);

create policy "integration_logs_write_admin" on public.integration_logs
for insert to authenticated
with check (public.has_role(array['ADMIN']));

-- Notes:
-- - Updated_at triggers are not included to keep the schema minimal; you can manage updated_at in app code.
-- - All tables have RLS enabled.
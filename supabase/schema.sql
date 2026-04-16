create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  address text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  base_price numeric(10,2) not null default 0,
  icon text not null default 'leaf',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  status text not null default 'pendente' check (status in ('pendente', 'em andamento', 'concluido')),
  notes text,
  source text not null default 'site',
  total_amount numeric(10,2) not null default 0,
  requested_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name_snapshot text not null,
  price_snapshot numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  notes text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  subtotal_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name_snapshot text not null,
  price_snapshot numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.order_items alter column service_id drop not null;
alter table public.order_items drop constraint if exists order_items_service_id_fkey;
alter table public.order_items
  add constraint order_items_service_id_fkey
  foreign key (service_id)
  references public.services(id)
  on delete set null;

create index if not exists orders_client_id_idx on public.orders(client_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_service_id_idx on public.order_items(service_id);
create index if not exists budgets_client_id_idx on public.budgets(client_id);
create index if not exists budget_items_budget_id_idx on public.budget_items(budget_id);
create index if not exists admin_users_user_id_idx on public.admin_users(user_id);

insert into public.services (slug, name, description, base_price, icon, sort_order)
values
  ('corte-de-grama', 'Corte de grama', 'Corte uniforme, acabamento e organizacao do gramado.', 160, 'grass', 1),
  ('limpeza-de-terreno', 'Limpeza de terreno', 'Remocao de mato, folhas, galhos e limpeza geral do terreno.', 220, 'terrain', 2),
  ('poda-de-arvores', 'Poda de arvores', 'Poda cuidadosa para melhorar seguranca, visual e saude das plantas.', 280, 'shears', 3),
  ('manutencao-de-jardim', 'Manutencao de jardim', 'Manutencao periodica com capricho para manter o jardim sempre bonito.', 190, 'leaf', 4)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  base_price = excluded.base_price,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = check_user_id
  );
$$;

create or replace function public.create_public_order(
  customer_name text,
  customer_phone text,
  customer_address text,
  customer_notes text,
  selected_service_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_client_id uuid;
  created_order_id uuid;
  total_value numeric(10,2);
begin
  insert into public.clients (name, phone, address)
  values (customer_name, customer_phone, customer_address)
  on conflict (phone) do update
  set
    name = excluded.name,
    address = excluded.address
  returning id into target_client_id;

  insert into public.orders (client_id, notes, source, status, total_amount)
  values (target_client_id, customer_notes, 'site', 'pendente', 0)
  returning id into created_order_id;

  insert into public.order_items (order_id, service_id, service_name_snapshot, price_snapshot)
  select
    created_order_id,
    services.id,
    services.name,
    services.base_price
  from public.services
  where services.id = any(selected_service_ids)
    and services.is_active = true;

  select coalesce(sum(price_snapshot), 0)
  into total_value
  from public.order_items
  where order_id = created_order_id;

  update public.orders
  set total_amount = total_value
  where id = created_order_id;

  return created_order_id;
end;
$$;

grant execute on function public.create_public_order(text, text, text, text, uuid[]) to anon, authenticated;
grant execute on function public.is_admin(uuid) to authenticated;

alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_items enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "public can read active services" on public.services;
create policy "public can read active services"
on public.services
for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "admins can manage services" on public.services;
create policy "admins can manage services"
on public.services
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can read clients" on public.clients;
create policy "admins can read clients"
on public.clients
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can insert clients" on public.clients;
create policy "admins can insert clients"
on public.clients
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admins can update clients" on public.clients;
create policy "admins can update clients"
on public.clients
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can read orders" on public.orders;
create policy "admins can read orders"
on public.orders
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can update orders" on public.orders;
create policy "admins can update orders"
on public.orders
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can read order items" on public.order_items;
create policy "admins can read order items"
on public.order_items
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can manage budgets" on public.budgets;
create policy "admins can manage budgets"
on public.budgets
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can manage budget_items" on public.budget_items;
create policy "admins can manage budget_items"
on public.budget_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can manage admin_users" on public.admin_users;
create policy "admins can manage admin_users"
on public.admin_users
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

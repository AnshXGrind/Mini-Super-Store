-- Mini Super Store initial schema
-- Apply this file once in Supabase SQL Editor, after creating a new Supabase project.
-- Public-facing data is protected by Row Level Security (RLS).

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.store_role as enum ('customer', 'staff', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_stock_status as enum ('available', 'limited', 'out_of_stock');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.store_order_status as enum (
    'pending', 'confirmed', 'preparing', 'ready_for_pickup',
    'out_for_delivery', 'completed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.store_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_hi text,
  description text,
  description_hi text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  sku text unique,
  name text not null,
  name_hi text,
  description text,
  description_hi text,
  price numeric(12,2) check (price is null or price >= 0),
  stock_status public.product_stock_status not null default 'available',
  image_url text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  assigned_staff_id uuid references auth.users(id) on delete set null,
  status public.store_order_status not null default 'pending',
  customer_name text not null,
  customer_phone text not null,
  fulfilment_type text not null default 'pickup' check (fulfilment_type in ('pickup', 'delivery')),
  delivery_address text,
  customer_note text,
  staff_note text,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  sku_snapshot text,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 100),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists products_category_active_idx on public.products(category_id, is_published, sort_order);
create index if not exists orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index if not exists orders_staff_status_idx on public.orders(assigned_staff_id, status, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.current_store_role()
returns public.store_role
language sql
stable
security definer
set search_path = ''
as $$
  select ur.role from public.user_roles as ur where ur.user_id = (select auth.uid()) limit 1;
$$;

create or replace function public.is_store_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_store_role() = 'admin'::public.store_role, false);
$$;

create or replace function public.is_store_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_store_role() = 'staff'::public.store_role, false);
$$;

revoke all on function public.current_store_role() from public, anon;
revoke all on function public.is_store_admin() from public, anon;
revoke all on function public.is_store_staff() from public, anon;
grant execute on function public.current_store_role() to authenticated;
grant execute on function public.is_store_admin() to authenticated;
grant execute on function public.is_store_staff() to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, preferred_language)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
    case when new.raw_user_meta_data ->> 'preferred_language' = 'hi' then 'hi' else 'en' end
  )
  on conflict (id) do nothing;

  -- Public registration can create customers only. Admin/staff roles are assigned separately.
  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.set_store_user_role(p_user_id uuid, p_role public.store_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_store_role() is distinct from 'admin'::public.store_role then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_user_id is null then raise exception 'USER_ID_REQUIRED'; end if;
  insert into public.user_roles (user_id, role)
  values (p_user_id, p_role)
  on conflict (user_id) do update set role = excluded.role;
end;
$$;
revoke all on function public.set_store_user_role(uuid, public.store_role) from public, anon;
grant execute on function public.set_store_user_role(uuid, public.store_role) to authenticated;

-- Order creation always reads the current server-side product price and stock status.
-- The browser cannot submit trusted prices or totals.
create or replace function public.place_customer_order(
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb,
  p_fulfilment_type text default 'pickup',
  p_delivery_address text default null,
  p_customer_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_order_id uuid := gen_random_uuid();
  v_item jsonb;
  v_product public.products%rowtype;
  v_product_id uuid;
  v_quantity integer;
  v_total numeric(12,2) := 0;
begin
  if v_customer_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(btrim(p_customer_name), '') is null then raise exception 'CUSTOMER_NAME_REQUIRED'; end if;
  if nullif(btrim(p_customer_phone), '') is null then raise exception 'CUSTOMER_PHONE_REQUIRED'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'ITEMS_MUST_BE_AN_ARRAY'; end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'INVALID_ITEM_COUNT'; end if;
  if p_fulfilment_type not in ('pickup', 'delivery') then raise exception 'INVALID_FULFILMENT_TYPE'; end if;
  if p_fulfilment_type = 'delivery' and nullif(btrim(p_delivery_address), '') is null then
    raise exception 'DELIVERY_ADDRESS_REQUIRED';
  end if;

  insert into public.orders (
    id, customer_id, status, customer_name, customer_phone,
    fulfilment_type, delivery_address, customer_note, total_amount
  ) values (
    v_order_id, v_customer_id, 'pending', btrim(p_customer_name), btrim(p_customer_phone),
    p_fulfilment_type, nullif(btrim(p_delivery_address), ''), nullif(btrim(p_customer_note), ''), 0
  );

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item ->> 'product_id')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;
    exception when others then
      raise exception 'INVALID_ORDER_ITEM';
    end;

    if v_quantity is null or v_quantity < 1 or v_quantity > 100 then
      raise exception 'INVALID_ITEM_QUANTITY';
    end if;

    select * into v_product
    from public.products as p
    where p.id = v_product_id and p.is_published = true
    for share;

    if not found then raise exception 'PRODUCT_NOT_AVAILABLE'; end if;
    if v_product.stock_status = 'out_of_stock' then raise exception 'PRODUCT_OUT_OF_STOCK'; end if;
    if v_product.price is null then raise exception 'PRODUCT_PRICE_NOT_SET'; end if;

    insert into public.order_items (
      order_id, product_id, product_name_snapshot, sku_snapshot,
      unit_price, quantity, line_total
    ) values (
      v_order_id, v_product.id, v_product.name, v_product.sku,
      v_product.price, v_quantity, v_product.price * v_quantity
    );
    v_total := v_total + (v_product.price * v_quantity);
  end loop;

  update public.orders set total_amount = v_total where id = v_order_id;
  return v_order_id;
end;
$$;
revoke all on function public.place_customer_order(text, text, jsonb, text, text, text) from public, anon;
grant execute on function public.place_customer_order(text, text, jsonb, text, text, text) to authenticated;

create or replace function public.update_store_order_status(
  p_order_id uuid,
  p_status public.store_order_status,
  p_staff_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.store_role := public.current_store_role();
  v_order public.orders%rowtype;
begin
  if v_role not in ('admin', 'staff') then raise exception 'STAFF_OR_ADMIN_REQUIRED'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_role = 'staff' then
    if v_order.assigned_staff_id is distinct from auth.uid() then raise exception 'ORDER_NOT_ASSIGNED_TO_YOU'; end if;
    if not (
      (v_order.status = 'confirmed' and p_status = 'preparing') or
      (v_order.status = 'preparing' and p_status in ('ready_for_pickup', 'out_for_delivery')) or
      (v_order.status in ('ready_for_pickup', 'out_for_delivery') and p_status = 'completed')
    ) then raise exception 'INVALID_STAFF_STATUS_TRANSITION'; end if;
  end if;
  update public.orders
  set status = p_status,
      staff_note = coalesce(nullif(btrim(p_staff_note), ''), staff_note)
  where id = p_order_id;
end;
$$;
revoke all on function public.update_store_order_status(uuid, public.store_order_status, text) from public, anon;
grant execute on function public.update_store_order_status(uuid, public.store_order_status, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products to anon, authenticated;
grant insert, update, delete on public.categories, public.products to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.orders, public.order_items to authenticated;

-- Profiles: users can read and update their own contact details; admins can read all.
drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_store_admin());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all to authenticated
using (public.is_store_admin()) with check (public.is_store_admin());

-- Roles can be read by the owner and admins. Role changes go through the admin-only function.
drop policy if exists user_roles_read_self_or_admin on public.user_roles;
create policy user_roles_read_self_or_admin on public.user_roles for select to authenticated
using (user_id = (select auth.uid()) or public.is_store_admin());

-- Published catalogue is public. Only admins can manage categories and products.
drop policy if exists categories_public_read_active on public.categories;
create policy categories_public_read_active on public.categories for select to anon
using (is_active = true);
drop policy if exists categories_authenticated_read on public.categories;
create policy categories_authenticated_read on public.categories for select to authenticated
using (is_active = true or public.is_store_admin());
drop policy if exists categories_admin_manage on public.categories;
create policy categories_admin_manage on public.categories for all to authenticated
using (public.is_store_admin()) with check (public.is_store_admin());
drop policy if exists products_public_read_published on public.products;
create policy products_public_read_published on public.products for select to anon
using (is_published = true);
drop policy if exists products_authenticated_read on public.products;
create policy products_authenticated_read on public.products for select to authenticated
using (is_published = true or public.is_store_admin());
drop policy if exists products_admin_manage on public.products;
create policy products_admin_manage on public.products for all to authenticated
using (public.is_store_admin()) with check (public.is_store_admin());

-- A customer sees only their own orders; staff see only orders assigned to them; admins see all.
drop policy if exists orders_read_customer_staff_admin on public.orders;
create policy orders_read_customer_staff_admin on public.orders for select to authenticated
using (
  customer_id = (select auth.uid()) or
  (public.is_store_staff() and assigned_staff_id = (select auth.uid())) or
  public.is_store_admin()
);
drop policy if exists orders_admin_manage on public.orders;
create policy orders_admin_manage on public.orders for all to authenticated
using (public.is_store_admin()) with check (public.is_store_admin());
drop policy if exists order_items_read_related_order on public.order_items;
create policy order_items_read_related_order on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders as o
    where o.id = order_items.order_id
      and (
        o.customer_id = (select auth.uid()) or
        (public.is_store_staff() and o.assigned_staff_id = (select auth.uid())) or
        public.is_store_admin()
      )
  )
);
drop policy if exists order_items_admin_manage on public.order_items;
create policy order_items_admin_manage on public.order_items for all to authenticated
using (public.is_store_admin()) with check (public.is_store_admin());

-- Product images are publicly readable; only admins may upload or alter files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects for select to public
using (bucket_id = 'product-images');
drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_store_admin());
drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_store_admin())
with check (bucket_id = 'product-images' and public.is_store_admin());
drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.is_store_admin());

-- Seed only the five real store departments; no invented products or prices.
insert into public.categories (slug, name, name_hi, description, description_hi, sort_order)
values
  ('groceries', 'Groceries', 'किराना', 'Everyday pantry and kitchen essentials.', 'रोज़मर्रा का राशन और रसोई की ज़रूरी चीज़ें।', 1),
  ('household', 'Household', 'घरेलू सामान', 'Useful products for everyday home needs.', 'घर की रोज़मर्रा की ज़रूरतों का सामान।', 2),
  ('crockery', 'Crockery', 'क्रॉकरी', 'Dining and serving essentials.', 'खाने और परोसने के लिए ज़रूरी सामान।', 3),
  ('hosiery', 'Hosiery', 'होज़री', 'Everyday clothing and comfort essentials.', 'रोज़मर्रा के कपड़े और आरामदायक सामान।', 4),
  ('festive', 'Festive', 'त्योहारों का सामान', 'Seasonal and celebration essentials.', 'त्योहारों और खास मौकों का सामान।', 5)
on conflict (slug) do update set
  name = excluded.name,
  name_hi = excluded.name_hi,
  description = excluded.description,
  description_hi = excluded.description_hi,
  sort_order = excluded.sort_order;

-- ADMIN BOOTSTRAP (run manually after creating your owner account):
-- 1. Open Supabase Dashboard > Authentication > Users and copy your owner's UUID.
-- 2. Run this in SQL Editor, replacing the placeholder with that UUID:
-- update public.user_roles set role = 'admin' where user_id = 'YOUR-AUTH-USER-UUID';
-- Never let public registration choose admin or staff roles.
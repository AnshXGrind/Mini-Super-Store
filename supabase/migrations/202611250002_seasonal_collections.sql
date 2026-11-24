create table if not exists public.seasonal_collections (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 160),
  title_hi text,
  description text,
  description_hi text,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default false,
  manual_override boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasonal_collections_valid_dates check (ends_on >= starts_on)
);

create table if not exists public.seasonal_collection_products (
  collection_id uuid not null references public.seasonal_collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, product_id)
);

create index if not exists seasonal_collection_products_product_idx
  on public.seasonal_collection_products(product_id, collection_id);

alter table public.seasonal_collections enable row level security;
alter table public.seasonal_collection_products enable row level security;

grant select on public.seasonal_collections, public.seasonal_collection_products to anon, authenticated;
grant insert, update, delete on public.seasonal_collections, public.seasonal_collection_products to authenticated;

drop policy if exists seasonal_collections_public_read_active on public.seasonal_collections;
create policy seasonal_collections_public_read_active
  on public.seasonal_collections for select to anon
  using (
    is_active
    and (
      manual_override
      or (
        starts_on <= (now() at time zone 'Asia/Kolkata')::date
        and ends_on >= (now() at time zone 'Asia/Kolkata')::date
      )
    )
  );

drop policy if exists seasonal_collections_authenticated_read on public.seasonal_collections;
create policy seasonal_collections_authenticated_read
  on public.seasonal_collections for select to authenticated
  using (
    public.is_store_admin()
    or (
      is_active
      and (
        manual_override
        or (
          starts_on <= (now() at time zone 'Asia/Kolkata')::date
          and ends_on >= (now() at time zone 'Asia/Kolkata')::date
        )
      )
    )
  );

drop policy if exists seasonal_collections_admin_manage on public.seasonal_collections;
create policy seasonal_collections_admin_manage
  on public.seasonal_collections for all to authenticated
  using (public.is_store_admin())
  with check (public.is_store_admin());

drop policy if exists seasonal_collection_products_public_read on public.seasonal_collection_products;
create policy seasonal_collection_products_public_read
  on public.seasonal_collection_products for select to anon, authenticated
  using (
    exists (
      select 1
      from public.seasonal_collections collection
      where collection.id = collection_id
        and collection.is_active
        and (
          collection.manual_override
          or (
            collection.starts_on <= (now() at time zone 'Asia/Kolkata')::date
            and collection.ends_on >= (now() at time zone 'Asia/Kolkata')::date
          )
        )
    )
    and exists (
      select 1
      from public.products product
      where product.id = product_id
        and product.is_published
    )
  );

drop policy if exists seasonal_collection_products_admin_manage on public.seasonal_collection_products;
create policy seasonal_collection_products_admin_manage
  on public.seasonal_collection_products for all to authenticated
  using (public.is_store_admin())
  with check (public.is_store_admin());

create or replace function public.set_seasonal_collection_products(
  p_collection_id uuid,
  p_product_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(public.is_store_admin(), false) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if not exists (
    select 1 from public.seasonal_collections where id = p_collection_id
  ) then
    raise exception 'SEASONAL_COLLECTION_NOT_FOUND';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_product_ids, '{}'::uuid[])) as selected(product_id)
    left join public.products product on product.id = selected.product_id
    where product.id is null or not product.is_published
  ) then
    raise exception 'SEASONAL_PRODUCTS_MUST_BE_PUBLISHED';
  end if;

  delete from public.seasonal_collection_products
  where collection_id = p_collection_id;

  insert into public.seasonal_collection_products (collection_id, product_id)
  select p_collection_id, selected.product_id
  from (
    select distinct product_id
    from unnest(coalesce(p_product_ids, '{}'::uuid[])) as ids(product_id)
  ) selected;
end;
$$;

revoke all on function public.set_seasonal_collection_products(uuid, uuid[]) from public, anon;
grant execute on function public.set_seasonal_collection_products(uuid, uuid[]) to authenticated;

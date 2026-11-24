alter table public.products
  add column if not exists external_id text,
  add column if not exists subcategory text,
  add column if not exists brand text,
  add column if not exists mrp numeric(12, 2),
  add column if not exists quantity integer,
  add column if not exists unit text,
  add column if not exists barcode text;

alter table public.products drop constraint if exists products_mrp_nonnegative;
alter table public.products
  add constraint products_mrp_nonnegative check (mrp is null or mrp >= 0);
alter table public.products drop constraint if exists products_quantity_nonnegative;
alter table public.products
  add constraint products_quantity_nonnegative check (quantity is null or quantity >= 0);

create unique index if not exists products_external_id_unique_idx
  on public.products (lower(external_id))
  where external_id is not null;
create index if not exists products_sku_lower_idx
  on public.products (lower(sku))
  where sku is not null;

create table if not exists public.product_import_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'staging'
    check (status in ('staging', 'queued', 'processing', 'completed', 'failed')),
  total_rows integer not null check (total_rows > 0),
  processed_rows integer not null default 0 check (processed_rows >= 0),
  added_rows integer not null default 0 check (added_rows >= 0),
  updated_rows integer not null default 0 check (updated_rows >= 0),
  skipped_rows integer not null default 0 check (skipped_rows >= 0),
  failed_rows integer not null default 0 check (failed_rows >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_import_rows (
  job_id uuid not null references public.product_import_jobs(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  payload jsonb not null default '{}'::jsonb,
  validation_error text,
  skip_reason text,
  status text not null default 'queued'
    check (status in ('queued', 'added', 'updated', 'skipped', 'failed')),
  error text,
  primary key (job_id, row_number)
);

create index if not exists product_import_rows_queue_idx
  on public.product_import_rows (job_id, status, row_number);

drop trigger if exists product_import_jobs_set_updated_at on public.product_import_jobs;
create trigger product_import_jobs_set_updated_at
  before update on public.product_import_jobs
  for each row execute function public.set_updated_at();

alter table public.product_import_jobs enable row level security;
alter table public.product_import_rows enable row level security;

drop policy if exists product_import_jobs_admin_read on public.product_import_jobs;
create policy product_import_jobs_admin_read on public.product_import_jobs
  for select to authenticated
  using (public.is_store_admin() and created_by = (select auth.uid()));
drop policy if exists product_import_rows_admin_read on public.product_import_rows;
create policy product_import_rows_admin_read on public.product_import_rows
  for select to authenticated
  using (
    public.is_store_admin()
    and exists (
      select 1 from public.product_import_jobs as job
      where job.id = product_import_rows.job_id
        and job.created_by = (select auth.uid())
    )
  );

revoke all on public.product_import_jobs, public.product_import_rows from anon, authenticated;
grant select on public.product_import_jobs, public.product_import_rows to authenticated;

create or replace function public.create_product_import_job(p_total_rows integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id uuid;
begin
  if not coalesce(public.is_store_admin(), false) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_total_rows is null or p_total_rows < 1 then
    raise exception 'IMPORT_ROWS_REQUIRED';
  end if;

  insert into public.product_import_jobs (created_by, total_rows)
  values ((select auth.uid()), p_total_rows)
  returning id into v_job_id;
  return v_job_id;
end;
$$;

create or replace function public.stage_product_import_rows(p_job_id uuid, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.product_import_jobs%rowtype;
  v_inserted integer;
begin
  if not coalesce(public.is_store_admin(), false) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array'
    or jsonb_array_length(p_rows) not between 1 and 500 then
    raise exception 'IMPORT_BATCH_SIZE_INVALID';
  end if;

  select * into v_job
  from public.product_import_jobs
  where id = p_job_id and created_by = (select auth.uid())
  for update;
  if not found or v_job.status <> 'staging' then
    raise exception 'IMPORT_JOB_NOT_STAGING';
  end if;

  insert into public.product_import_rows (
    job_id, row_number, payload, validation_error, skip_reason
  )
  select
    p_job_id,
    item.row_number,
    coalesce(item.payload, '{}'::jsonb),
    item.validation_error,
    item.skip_reason
  from jsonb_to_recordset(p_rows) as item(
    row_number integer,
    payload jsonb,
    validation_error text,
    skip_reason text
  )
  on conflict (job_id, row_number) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted <> jsonb_array_length(p_rows) then
    raise exception 'IMPORT_ROW_NUMBER_INVALID_OR_DUPLICATED';
  end if;
  return v_inserted;
end;
$$;

create or replace function public.finalize_product_import_job(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.product_import_jobs%rowtype;
  v_staged_rows integer;
begin
  if not coalesce(public.is_store_admin(), false) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  select * into v_job
  from public.product_import_jobs
  where id = p_job_id and created_by = (select auth.uid())
  for update;
  if not found or v_job.status <> 'staging' then
    raise exception 'IMPORT_JOB_NOT_STAGING';
  end if;

  select count(*) into v_staged_rows
  from public.product_import_rows
  where job_id = p_job_id;
  if v_staged_rows <> v_job.total_rows then
    raise exception 'IMPORT_STAGING_INCOMPLETE';
  end if;

  update public.product_import_jobs set status = 'queued' where id = p_job_id;
end;
$$;

create or replace function public.process_product_import_batch(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.product_import_jobs%rowtype;
  v_item public.product_import_rows%rowtype;
  v_identifier text;
  v_external_id text;
  v_product_uuid uuid;
  v_identifier_uuid uuid;
  v_insert_external_id text;
  v_insert_sku text;
  v_sku text;
  v_name text;
  v_category_name text;
  v_subcategory text;
  v_brand text;
  v_mrp numeric;
  v_price numeric;
  v_quantity integer;
  v_unit text;
  v_image_url text;
  v_barcode text;
  v_description text;
  v_is_published boolean;
  v_stock_status public.product_stock_status;
  v_category_id uuid;
  v_product_id uuid;
  v_matches uuid[];
  v_existing public.products%rowtype;
  v_final_mrp numeric;
  v_final_price numeric;
  v_slug text;
  v_processed integer := 0;
  v_added integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
  v_failed integer := 0;
begin
  if not coalesce(public.is_store_admin(), false) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  perform pg_advisory_xact_lock(71420831);

  select * into v_job
  from public.product_import_jobs
  where id = p_job_id and created_by = (select auth.uid())
  for update;
  if not found then
    raise exception 'IMPORT_JOB_NOT_FOUND';
  end if;
  if v_job.status = 'completed' or v_job.status = 'failed' then
    return jsonb_build_object(
      'id', v_job.id, 'status', v_job.status, 'total_rows', v_job.total_rows,
      'processed_rows', v_job.processed_rows, 'added_rows', v_job.added_rows,
      'updated_rows', v_job.updated_rows, 'skipped_rows', v_job.skipped_rows,
      'failed_rows', v_job.failed_rows, 'last_error', v_job.last_error
    );
  end if;
  if v_job.status = 'staging' then
    raise exception 'IMPORT_JOB_NOT_READY';
  end if;

  update public.product_import_jobs set status = 'processing' where id = p_job_id;

  for v_item in
    select * from public.product_import_rows
    where job_id = p_job_id and status = 'queued'
    order by row_number
    limit 500
    for update
  loop
    v_processed := v_processed + 1;
    if v_item.validation_error is not null then
      update public.product_import_rows
      set status = 'failed', error = left(v_item.validation_error, 1000)
      where job_id = p_job_id and row_number = v_item.row_number;
      v_failed := v_failed + 1;
      continue;
    end if;
    if v_item.skip_reason is not null then
      update public.product_import_rows
      set status = 'skipped', error = left(v_item.skip_reason, 1000)
      where job_id = p_job_id and row_number = v_item.row_number;
      v_skipped := v_skipped + 1;
      continue;
    end if;

    begin
      v_identifier := nullif(btrim(v_item.payload ->> 'identifier'), '');
      v_external_id := nullif(btrim(v_item.payload ->> 'external_id'), '');
      v_sku := nullif(btrim(v_item.payload ->> 'sku'), '');
      v_name := nullif(btrim(v_item.payload ->> 'name'), '');
      v_category_name := nullif(btrim(v_item.payload ->> 'category'), '');
      v_subcategory := nullif(btrim(v_item.payload ->> 'subcategory'), '');
      v_brand := nullif(btrim(v_item.payload ->> 'brand'), '');
      v_unit := nullif(btrim(v_item.payload ->> 'unit'), '');
      v_barcode := nullif(btrim(v_item.payload ->> 'barcode'), '');
      v_description := nullif(btrim(v_item.payload ->> 'description'), '');
      v_image_url := nullif(btrim(v_item.payload ->> 'image_url'), '');
      v_product_uuid := null;
      v_identifier_uuid := null;

      if v_identifier is null and v_external_id is null and v_sku is null then
        raise exception 'Product ID or SKU is required.';
      end if;
      if v_name is null then
        raise exception 'Product Name is required.';
      end if;
      if length(v_identifier) > 120 or length(v_external_id) > 120
        or length(v_sku) > 100 or length(v_name) > 160
        or length(v_category_name) > 160 or length(v_subcategory) > 160
        or length(v_brand) > 160 or length(v_unit) > 80
        or length(v_barcode) > 100 or length(v_description) > 2000 then
        raise exception 'One or more product fields exceed the allowed length.';
      end if;
      if v_identifier is not null
        and length(v_identifier) > 100
        and v_identifier !~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' then
        raise exception 'Product ID / SKU must be 100 characters or fewer when used as a SKU.';
      end if;
      if v_item.payload ? 'mrp' then
        v_mrp := nullif(btrim(v_item.payload ->> 'mrp'), '')::numeric;
        if v_mrp < 0 then raise exception 'MRP cannot be negative.'; end if;
      else
        v_mrp := null;
      end if;
      if v_item.payload ? 'price' then
        v_price := nullif(btrim(v_item.payload ->> 'price'), '')::numeric;
        if v_price < 0 then raise exception 'Selling Price cannot be negative.'; end if;
      else
        v_price := null;
      end if;
      if v_item.payload ? 'quantity' then
        if btrim(v_item.payload ->> 'quantity') !~ '^[0-9]+$' then
          raise exception 'Quantity must be a non-negative whole number.';
        end if;
        v_quantity := nullif(btrim(v_item.payload ->> 'quantity'), '')::integer;
        if v_quantity < 0 then raise exception 'Quantity cannot be negative.'; end if;
      else
        v_quantity := null;
      end if;
      if v_item.payload ? 'is_published' then
        v_is_published := (v_item.payload ->> 'is_published')::boolean;
      else
        v_is_published := null;
      end if;
      if v_image_url is not null and (length(v_image_url) > 2000 or v_image_url !~* '^https?://') then
        raise exception 'Product Image URL must use HTTP or HTTPS.';
      end if;
      v_stock_status := case
        when v_quantity is null then null
        when v_quantity = 0 then 'out_of_stock'::public.product_stock_status
        else 'available'::public.product_stock_status
      end;
      if v_external_id ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' then
        v_product_uuid := v_external_id::uuid;
      end if;
      if v_identifier ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' then
        v_identifier_uuid := v_identifier::uuid;
      end if;

      select array_agg(distinct product.id) into v_matches
      from public.products as product
      where
        (
          v_external_id is not null
          and (
            lower(product.external_id) = lower(v_external_id)
            or product.id = v_product_uuid
          )
        )
        or (
          v_identifier is not null
          and (
            lower(product.external_id) = lower(v_identifier)
            or product.id = v_identifier_uuid
            or lower(product.sku) = lower(v_identifier)
          )
        )
        or (v_sku is not null and lower(product.sku) = lower(v_sku));
      if coalesce(cardinality(v_matches), 0) > 1 then
        raise exception 'Product ID and SKU match different existing products.';
      end if;
      v_product_id := v_matches[1];

      v_category_id := null;
      if v_category_name is not null then
        select id into v_category_id from public.categories
        where lower(name) = lower(v_category_name)
        order by is_active desc
        limit 1;
        if v_category_id is null then
          v_slug := trim(both '-' from regexp_replace(lower(v_category_name), '[^a-z0-9]+', '-', 'g'));
          if v_slug = '' then
            v_slug := 'category-' || substr(md5(lower(v_category_name)), 1, 10);
          end if;
          if exists (
            select 1 from public.categories
            where slug = v_slug and lower(name) <> lower(v_category_name)
          ) then
            v_slug := v_slug || '-' || substr(md5(lower(v_category_name)), 1, 8);
          end if;
          insert into public.categories (slug, name, is_active)
          values (v_slug, v_category_name, true)
          on conflict (slug) do nothing;
          select id into v_category_id from public.categories
          where lower(name) = lower(v_category_name)
          limit 1;
          if v_category_id is null then
            raise exception 'Product category could not be created.';
          end if;
        end if;
      end if;

      if v_product_id is null then
        if v_mrp is not null and v_price is not null and v_price > v_mrp then
          raise exception 'Selling Price cannot be greater than MRP.';
        end if;
        v_insert_external_id := v_external_id;
        v_insert_sku := v_sku;
        if v_identifier is not null and v_external_id is null and v_sku is null then
          if v_identifier_uuid is not null then
            v_insert_external_id := v_identifier;
          else
            v_insert_sku := v_identifier;
          end if;
        end if;
        insert into public.products (
          external_id, sku, name, category_id, subcategory, brand, mrp,
          price, quantity, unit, image_url, barcode, description,
          stock_status, is_published
        ) values (
          v_insert_external_id, v_insert_sku, v_name, v_category_id, v_subcategory, v_brand, v_mrp,
          v_price, v_quantity, v_unit, v_image_url, v_barcode, v_description,
          coalesce(v_stock_status, 'available'::public.product_stock_status),
          coalesce(v_is_published, true)
        )
        returning id into v_product_id;
        update public.product_import_rows
        set status = 'added'
        where job_id = p_job_id and row_number = v_item.row_number;
        v_added := v_added + 1;
      else
        select * into v_existing from public.products where id = v_product_id for update;
        v_final_mrp := coalesce(v_mrp, v_existing.mrp);
        v_final_price := coalesce(v_price, v_existing.price);
        if v_final_mrp is not null and v_final_price is not null and v_final_price > v_final_mrp then
          raise exception 'Selling Price cannot be greater than MRP.';
        end if;
        update public.products set
          external_id = coalesce(v_external_id, v_existing.external_id),
          sku = coalesce(v_sku, v_existing.sku),
          name = v_name,
          category_id = coalesce(v_category_id, v_existing.category_id),
          subcategory = coalesce(v_subcategory, v_existing.subcategory),
          brand = coalesce(v_brand, v_existing.brand),
          mrp = v_final_mrp,
          price = v_final_price,
          quantity = coalesce(v_quantity, v_existing.quantity),
          unit = coalesce(v_unit, v_existing.unit),
          image_url = coalesce(v_image_url, v_existing.image_url),
          barcode = coalesce(v_barcode, v_existing.barcode),
          description = coalesce(v_description, v_existing.description),
          stock_status = coalesce(v_stock_status, v_existing.stock_status),
          is_published = coalesce(v_is_published, v_existing.is_published)
        where id = v_product_id;
        update public.product_import_rows
        set status = 'updated'
        where job_id = p_job_id and row_number = v_item.row_number;
        v_updated := v_updated + 1;
      end if;
    exception when others then
      update public.product_import_rows
      set status = 'failed', error = left(sqlerrm, 1000)
      where job_id = p_job_id and row_number = v_item.row_number;
      v_failed := v_failed + 1;
    end;
  end loop;

  update public.product_import_jobs set
    processed_rows = processed_rows + v_processed,
    added_rows = added_rows + v_added,
    updated_rows = updated_rows + v_updated,
    skipped_rows = skipped_rows + v_skipped,
    failed_rows = failed_rows + v_failed,
    status = case
      when processed_rows + v_processed >= total_rows then 'completed'
      else 'processing'
    end,
    last_error = null
  where id = p_job_id
  returning * into v_job;

  return jsonb_build_object(
    'id', v_job.id, 'status', v_job.status, 'total_rows', v_job.total_rows,
    'processed_rows', v_job.processed_rows, 'added_rows', v_job.added_rows,
    'updated_rows', v_job.updated_rows, 'skipped_rows', v_job.skipped_rows,
    'failed_rows', v_job.failed_rows, 'last_error', v_job.last_error
  );
end;
$$;

create or replace function public.fail_product_import_job(p_job_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce(public.is_store_admin(), false) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  update public.product_import_jobs set
    status = 'failed',
    last_error = left(coalesce(p_error, 'Product import worker failed.'), 1000)
  where id = p_job_id
    and created_by = (select auth.uid())
    and status in ('staging', 'queued', 'processing');
  if not found then
    raise exception 'IMPORT_JOB_NOT_FOUND_OR_ACTIVE';
  end if;
end;
$$;

revoke all on function public.create_product_import_job(integer) from public, anon;
revoke all on function public.stage_product_import_rows(uuid, jsonb) from public, anon;
revoke all on function public.finalize_product_import_job(uuid) from public, anon;
revoke all on function public.process_product_import_batch(uuid) from public, anon;
revoke all on function public.fail_product_import_job(uuid, text) from public, anon;

grant execute on function public.create_product_import_job(integer) to authenticated;
grant execute on function public.stage_product_import_rows(uuid, jsonb) to authenticated;
grant execute on function public.finalize_product_import_job(uuid) to authenticated;
grant execute on function public.process_product_import_batch(uuid) to authenticated;
grant execute on function public.fail_product_import_job(uuid, text) to authenticated;

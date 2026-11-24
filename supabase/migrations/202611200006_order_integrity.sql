-- Mini Super Store order integrity.
-- This is a new migration; previously-applied migrations remain unchanged.
--
-- Fixes:
--   1. Duplicate product lines in one order could bypass the 100-per-product cap
--      (e.g. 50 lines x 100 units of the same product). Lines are now aggregated
--      by product before quantities are validated.
--   2. Customer name, phone, delivery address and note had no server-side limits.
--   3. Admins could move an order to any status in any direction, skipping the
--      workflow. The same transition rules now apply to admins, with a cancel
--      path from every active status and a no-op path for note-only updates.
--   4. Customers had no way to cancel their own order.

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
  v_items jsonb;
  v_product public.products%rowtype;
  v_product_id uuid;
  v_quantity integer;
  v_total numeric(12,2) := 0;
  v_phone_digits text;
begin
  if v_customer_id is null then raise exception 'AUTH_REQUIRED'; end if;

  if nullif(btrim(p_customer_name), '') is null then raise exception 'CUSTOMER_NAME_REQUIRED'; end if;
  if length(btrim(p_customer_name)) > 120 then raise exception 'CUSTOMER_NAME_TOO_LONG'; end if;

  if nullif(btrim(p_customer_phone), '') is null then raise exception 'CUSTOMER_PHONE_REQUIRED'; end if;
  v_phone_digits := regexp_replace(p_customer_phone, '[^0-9]', '', 'g');
  if length(v_phone_digits) < 7 or length(v_phone_digits) > 15 then
    raise exception 'INVALID_CUSTOMER_PHONE';
  end if;

  if p_customer_note is not null and length(btrim(p_customer_note)) > 500 then
    raise exception 'CUSTOMER_NOTE_TOO_LONG';
  end if;
  if p_delivery_address is not null and length(btrim(p_delivery_address)) > 500 then
    raise exception 'DELIVERY_ADDRESS_TOO_LONG';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'ITEMS_MUST_BE_AN_ARRAY'; end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'INVALID_ITEM_COUNT'; end if;
  if p_fulfilment_type not in ('pickup', 'delivery') then raise exception 'INVALID_FULFILMENT_TYPE'; end if;
  if p_fulfilment_type = 'delivery' and nullif(btrim(p_delivery_address), '') is null then
    raise exception 'DELIVERY_ADDRESS_REQUIRED';
  end if;

  -- Aggregate duplicate product ids so the per-product limit cannot be bypassed.
  begin
    select jsonb_agg(jsonb_build_object('product_id', aggregated.product_id, 'quantity', aggregated.quantity))
      into v_items
    from (
      select (entry.item ->> 'product_id')::uuid as product_id,
             sum((entry.item ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) as entry(item)
      group by 1
    ) as aggregated;
  exception when others then
    raise exception 'INVALID_ORDER_ITEM';
  end;

  if v_items is null then raise exception 'INVALID_ITEM_COUNT'; end if;
  if jsonb_array_length(v_items) > 50 then raise exception 'INVALID_ITEM_COUNT'; end if;

  insert into public.orders (
    id, customer_id, status, customer_name, customer_phone,
    fulfilment_type, delivery_address, customer_note, total_amount
  ) values (
    v_order_id, v_customer_id, 'pending', btrim(p_customer_name), btrim(p_customer_phone),
    p_fulfilment_type, nullif(btrim(p_delivery_address), ''), nullif(btrim(p_customer_note), ''), 0
  );

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_product_id is null then raise exception 'INVALID_ORDER_ITEM'; end if;
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
  v_expected_next public.store_order_status;
begin
  -- Explicit NULL rejection is required: NULL NOT IN (...) evaluates to NULL, not TRUE.
  if v_role is null or v_role not in ('admin', 'staff') then
    raise exception 'STAFF_OR_ADMIN_REQUIRED';
  end if;
  if p_order_id is null then raise exception 'ORDER_ID_REQUIRED'; end if;
  if p_status is null then raise exception 'ORDER_STATUS_REQUIRED'; end if;
  if p_staff_note is not null and length(p_staff_note) > 500 then
    raise exception 'STAFF_NOTE_TOO_LONG';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  v_expected_next := case
    when v_order.fulfilment_type = 'delivery' then 'out_for_delivery'::public.store_order_status
    else 'ready_for_pickup'::public.store_order_status
  end;

  if v_role = 'staff' then
    if v_order.assigned_staff_id is distinct from auth.uid() then
      raise exception 'ORDER_NOT_ASSIGNED_TO_YOU';
    end if;
    if not (
      p_status = v_order.status or
      (v_order.status = 'confirmed' and p_status = 'preparing') or
      (v_order.status = 'preparing' and p_status = v_expected_next) or
      (v_order.status in ('ready_for_pickup', 'out_for_delivery') and p_status = 'completed')
    ) then
      raise exception 'INVALID_STAFF_STATUS_TRANSITION';
    end if;
  else
    if v_order.status in ('completed', 'cancelled') and p_status <> v_order.status then
      raise exception 'ORDER_ALREADY_FINAL';
    end if;
    if not (
      p_status = v_order.status or
      p_status = 'cancelled' or
      (v_order.status = 'pending' and p_status = 'confirmed') or
      (v_order.status = 'confirmed' and p_status = 'preparing') or
      (v_order.status = 'preparing' and p_status = v_expected_next) or
      (v_order.status in ('ready_for_pickup', 'out_for_delivery') and p_status = 'completed')
    ) then
      raise exception 'INVALID_ADMIN_STATUS_TRANSITION';
    end if;
  end if;

  update public.orders
  set status = p_status,
      staff_note = coalesce(nullif(btrim(p_staff_note), ''), staff_note)
  where id = p_order_id;
end;
$$;
revoke all on function public.update_store_order_status(uuid, public.store_order_status, text) from public, anon;
grant execute on function public.update_store_order_status(uuid, public.store_order_status, text) to authenticated;

create or replace function public.cancel_own_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if v_customer_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_order_id is null then raise exception 'ORDER_ID_REQUIRED'; end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.customer_id <> v_customer_id then raise exception 'ORDER_NOT_YOURS'; end if;
  if v_order.status not in ('pending', 'confirmed') then
    raise exception 'ORDER_CANNOT_BE_CANCELLED';
  end if;

  update public.orders
  set status = 'cancelled'
  where id = p_order_id;
end;
$$;
revoke all on function public.cancel_own_order(uuid) from public, anon;
grant execute on function public.cancel_own_order(uuid) to authenticated;

-- Apply the same transition rules to every update path, including direct table
-- updates from the admin dashboard (which bypass the RPC).
create or replace function public.enforce_order_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_role public.store_role := public.current_store_role();
  v_expected_next public.store_order_status;
begin
  if new.status = old.status then
    return new;
  end if;

  if v_role = 'admin' then
    if old.status in ('completed', 'cancelled') then
      raise exception 'ORDER_ALREADY_FINAL';
    end if;

    v_expected_next := case
      when old.fulfilment_type = 'delivery' then 'out_for_delivery'::public.store_order_status
      else 'ready_for_pickup'::public.store_order_status
    end;

    if not (
      new.status = 'cancelled' or
      (old.status = 'pending' and new.status = 'confirmed') or
      (old.status = 'confirmed' and new.status = 'preparing') or
      (old.status = 'preparing' and new.status = v_expected_next) or
      (old.status in ('ready_for_pickup', 'out_for_delivery') and new.status = 'completed')
    ) then
      raise exception 'INVALID_ADMIN_STATUS_TRANSITION';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_enforce_status_transition on public.orders;
create trigger orders_enforce_status_transition
before update of status on public.orders
for each row execute function public.enforce_order_status_transition();

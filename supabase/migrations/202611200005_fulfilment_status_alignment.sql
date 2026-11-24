-- Mini Super Store workflow alignment.
-- This is a new migration; previously-applied migrations remain unchanged.
--
-- The client (lib/order-status.ts) only offers pickup orders the
-- `ready_for_pickup` step and delivery orders the `out_for_delivery` step.
-- The original RPC accepted either transition for both fulfilment types, so a
-- delivery order could be marked `ready_for_pickup` through the API and become
-- impossible to complete from the UI. Mirror the client rules on the server.

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

  if v_role = 'staff' then
    if v_order.assigned_staff_id is distinct from auth.uid() then
      raise exception 'ORDER_NOT_ASSIGNED_TO_YOU';
    end if;
    if not (
      (v_order.status = 'confirmed' and p_status = 'preparing') or
      (
        v_order.status = 'preparing'
        and p_status = case
          when v_order.fulfilment_type = 'delivery' then 'out_for_delivery'::public.store_order_status
          else 'ready_for_pickup'::public.store_order_status
        end
      ) or
      (v_order.status in ('ready_for_pickup', 'out_for_delivery') and p_status = 'completed')
    ) then
      raise exception 'INVALID_STAFF_STATUS_TRANSITION';
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

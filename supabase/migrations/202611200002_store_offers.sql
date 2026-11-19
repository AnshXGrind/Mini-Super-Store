-- Store offers and campaign banners
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_hi text,
  description text,
  description_hi text,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.offers enable row level security;

grant select on public.offers to anon, authenticated;
grant insert, update, delete on public.offers to authenticated;

drop trigger if exists offers_set_updated_at on public.offers;
create trigger offers_set_updated_at before update on public.offers
for each row execute function public.set_updated_at();

drop policy if exists offers_public_read_active on public.offers;
create policy offers_public_read_active on public.offers for select to anon
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

drop policy if exists offers_authenticated_read on public.offers;
create policy offers_authenticated_read on public.offers for select to authenticated
using (
  public.is_store_admin()
  or (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  )
);

drop policy if exists offers_admin_manage on public.offers;
create policy offers_admin_manage on public.offers for all to authenticated
using (public.is_store_admin())
with check (public.is_store_admin());

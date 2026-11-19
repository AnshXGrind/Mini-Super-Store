-- Push subscription storage and notification preferences.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  order_updates boolean not null default true,
  new_offers boolean not null default true,
  staff_alerts boolean not null default true,
  whatsapp_updates boolean not null default false,
  sms_updates boolean not null default false,
  email_updates boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
for each row execute function public.set_updated_at();
drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at before update on public.notification_preferences
for each row execute function public.set_updated_at();

drop policy if exists push_subscriptions_owner_only on public.push_subscriptions;
create policy push_subscriptions_owner_only on public.push_subscriptions for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists notification_preferences_owner_only on public.notification_preferences;
create policy notification_preferences_owner_only on public.notification_preferences for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

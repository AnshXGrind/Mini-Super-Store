# Mini Super Store database setup

1. Create a Supabase project.
2. Open SQL Editor in the Supabase dashboard.
3. Open `migrations/20261120000100_initial_schema.sql` from this repository, copy the complete file, paste it into SQL Editor, and run it once.
4. The migration creates profiles, customer/staff/admin roles, categories, products, orders, order items, the product-images storage bucket, and row-level security policies.
5. It seeds only the five store departments. It does not add fake product names, stock or prices.
6. Register the owner's account on the website, then open Authentication > Users and copy that account's UUID. In SQL Editor run:

```sql
update public.user_roles
set role = 'admin'
where user_id = 'YOUR-AUTH-USER-UUID';
```

Replace the placeholder with the actual UUID. Do not let public registration select the admin or staff role.

7. Apply `migrations/202611200002_store_offers.sql` after the initial migration to enable store offers.
8. Apply `migrations/202611200003_notifications.sql` to enable device push subscriptions.
9. Generate VAPID keys and set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. A server-side private key and a trusted notification worker are still required to send push messages.
10. WhatsApp, SMS, email, monitoring and backups require provider credentials and an operational deployment policy; the application does not send fabricated success responses for these services.

The order RPC (`place_customer_order`) reads product prices and stock on the database side. Never accept a price or total supplied by the browser as authoritative.
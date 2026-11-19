-- Run in Supabase SQL Editor with separate authenticated test users.
-- This is a verification checklist, not an automatic migration.

-- 1. Public catalogue:
--   SELECT * FROM public.categories WHERE is_active = true;
--   SELECT * FROM public.products WHERE is_published = true;
-- Both should succeed as anon and show only active/published rows.

-- 2. Customer isolation:
--   SET LOCAL role = 'authenticated';
--   SELECT * FROM public.orders;
-- A customer should receive only their own order rows.

-- 3. Staff assignment:
--   A staff user should receive only orders assigned to their auth.uid().

-- 4. Admin management:
--   An admin should be able to insert, update and delete products/offers.
--   A customer or staff user should not bypass the is_store_admin() check.

-- 5. Order state:
--   A staff user must not update an unassigned order or an invalid transition.
--   The update_store_order_status RPC should enforce the transition checks.

-- 6. Storage:
--   An admin can upload/delete product-images.
--   Public users can read product-images.
--   Non-admin users cannot upload/delete product-images.

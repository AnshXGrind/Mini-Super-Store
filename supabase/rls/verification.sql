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
-- 7. NULL-role RPC hardening:
--   Use a test authenticated account with no user_roles row and call
--   update_store_order_status. It must raise STAFF_OR_ADMIN_REQUIRED.
--   A customer must receive the same error; a staff member may update only
--   an order assigned to auth.uid() and only through valid staff transitions.
-- 8. Route authorization:
--   A customer visiting /admin or /staff must be redirected to /account.
--   A staff user visiting /admin must be redirected to /staff.
--   An admin visiting /admin is allowed; /staff remains staff-only.
-- 9. Admin assignment workflow:
--   An admin can confirm a pending order and assign it to a staff user.
--   The assigned staff user can then see and process that order.

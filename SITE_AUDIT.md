# Mini Super Store website audit

This audit records the repository state before the requested cleanup and redesign.

## Customer-facing routes

- `/` and `/order` share `Storefront`; `/departments` and `/products` redirect to `/order`.
- The shared announcement bar currently shows all six announcements at once. Its language switch is outside the announcement list and remains accessible.
- The homepage has an oversized illustrated shopping bag, hard-coded brand claims in category descriptions, item counts derived from catalogue rows, repeated promotional sections, and repeated store details.
- The bulk-order page repeats its enquiry CTA and makes unverified claims about wholesale pricing, packing, and delivery while naming specific brands and products.
- The Visit page repeats introductory copy and includes a postcode, landmark, and “Open daily” statement that are not in the supplied store details.
- Product search, category/subcategory/brand filters, weighted-item selection, cart quantity controls, and WhatsApp checkout are already implemented and must be preserved. The customer storefront and cart omit prices, while the static fallback still contains unverified price values; those values should not be treated as verified store pricing.

## Catalogue and admin

- The fallback catalogue contains 532 product records. Its records have blank brand and Hindi-name fields, generated descriptions, repeated generic product imagery, and prices that have not been verified against store data.
- The catalogue seed migration inserts similar generated records, despite the database setup guide saying the initial schema seeds departments only and does not add fake products. The setup documentation and later seed migration therefore conflict.
- CSV/XLSX import is resumable and already checks duplicate rows; the admin export endpoint requires the admin role.
- The admin product form does not expose all catalogue fields supported by import/export (including brand, subcategory, pack size, MRP, and quantity), and it has no category editor or duplicate/incomplete-record overview.
- Existing category/product and import policies rely on Supabase RLS and `is_store_admin()`. Authentication, order workflows, role checks, and RLS are out of scope for visual cleanup and must remain intact.
- There is no separate seasonal-collection schema or admin workflow.

## Brand, contact, and PWA

- `StoreLogo` already uses `/icon.svg` on the storefront, Visit, and Bulk Order pages. Authentication, account, admin, and staff headers use a text-only wordmark.
- Favicon, Apple icon, manifest, and service-worker notification icons already use `/icon.svg`; Open Graph already identifies Mini Super Store.
- `lib/store-contact.ts` centralizes the supplied Maps URL and normalizes the configured local phone number `9896330279` for `tel:` and `wa.me` links. `.env.example` uses the same local number.
- The current source contains no verified inventory/pricing source from which new commercial product records can safely be created.

## Safe implementation constraints

- Simplify customer-facing copy and remove unsupported store claims without removing ordering, imports, authentication, or staff/admin workflows.
- Preserve existing catalogue rows and never add or correct product/price data without owner-verified source data.
- Implement seasonal collections as admin-managed metadata linked only to existing published products, with date-based public visibility and RLS.

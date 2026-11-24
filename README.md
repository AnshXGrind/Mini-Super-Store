# Mini Super Store

A bilingual (English / Hindi) storefront and order-management app for a neighbourhood
super store in Ladwa, Haryana. Built with Next.js 16 (App Router), React 19 and Supabase.

## What's included

- Public storefront: departments, live catalogue, offers, bulk-enquiry and store details.
- Cart with local persistence and server-side price/stock validation.
- Customer accounts with order history (`/account`).
- Staff dashboard for assigned orders (`/staff`).
- Admin dashboard for products, offers, staff assignment and order workflow (`/admin`).
- Supabase Auth, row-level security, a `product-images` storage bucket and optional
  device push subscriptions.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project and apply the SQL migrations in order. See
   [`supabase/README.md`](supabase/README.md) for the exact steps, role bootstrap and
   the storage bucket.

3. Copy the environment template and fill in your project values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Purpose |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe publishable key (RLS still applies) |
   | `NEXT_PUBLIC_SITE_URL` | Canonical origin used for metadata, sitemap and robots; set to the deployed HTTPS origin for production |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web-push public key (optional) |
   | `NEXT_PUBLIC_WHOLESALE_WHATSAPP_NUMBER` | WhatsApp click-to-chat number, digits only |

   `NEXT_PUBLIC_*` values are inlined at build time. Set them in the build environment
   (for example Vercel Project Settings), not only at runtime. Set
   `NEXT_PUBLIC_SITE_URL` to the real deployed HTTPS origin before production builds;
   canonical metadata and sitemap entries are omitted when it is unset.

4. Run the development server:

   ```bash
   npm run dev
   ```

## Checks

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint (flat config)
npm test            # Vitest
npm run test:e2e    # Playwright browser tests (Chromium)
npm run build       # Production build
```

The browser suite always checks the login and callback-error experience. To exercise
real customer, staff and admin sign-in, configure the corresponding `E2E_*_EMAIL`
and `E2E_*_PASSWORD` environment variables along with the Supabase URL and publishable
key. GitHub Actions reads these from repository secrets; role-specific sign-in tests
are skipped when the matching credentials are not configured.

## Structure

```
app/                 Routes, metadata, sitemap, robots, service worker registration
components/store/    Storefront, cart and product UI
components/auth/     Sign-in, registration and logout
components/dashboard/ Admin and staff dashboards
components/account/  Customer account extras
lib/                 Supabase clients, auth guards, cart and order-status helpers
supabase/migrations/ Database schema, RPCs and RLS policies
public/              Static assets, offline page and service worker
```

## Security notes

- Order totals and prices are always computed inside `place_customer_order`; the
  browser cannot spoof them.
- RLS policies guard every table and the `product-images` bucket.
- Admins and staff are provisioned only through the Supabase SQL Editor, never through
  public registration.

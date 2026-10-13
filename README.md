# Sinte's Hub online store

A mobile-first fashion store for Sinte's Hub: customers browse and order clothing, shoes, bags and Ankara fabrics; orders are saved first and then sent to the owner on WhatsApp; the owner manages everything from a private dashboard.

**Start here:** [docs/SETUP.md](docs/SETUP.md) (step-by-step setup in plain language)

| Guide | What it covers |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Supabase, Netlify, owner login, store settings, launch steps, **what to do if Supabase pauses your project** |
| [docs/BACKUP-AND-RESTORE.md](docs/BACKUP-AND-RESTORE.md) | Weekly backups, the export script, restoring, and a **practice run with sample data** |
| [docs/MOVING-HOSTS.md](docs/MOVING-HOSTS.md) | Moving to paid plans, Vercel or your own server without code changes |

## What is included

**Shop:** home page (featured, new arrivals, bestsellers, categories), shop with search, filters (category, price, size, colour, in stock) and sorting, product pages with photo gallery and zoom, size/colour options with live stock, cart, checkout with pickup or delivery, WhatsApp hand-off, and About, Contact, FAQ, Size guide, Delivery, Returns, Privacy and Terms pages.

**Dashboard (`/admin`, owner only):** overview (orders, verified revenue, stock levels, low-stock alerts, recent stock changes), products with sizes/colours/stock, photos (auto-shrunk on upload, reorder, main photo, replace, delete), duplicate/archive/delete, categories, orders (status changes, agreed delivery fee, verified payments and refunds, private notes, WhatsApp the customer, CSV export), store settings and policy texts, password change, and the **Download backup** button.

**Safety:**
- Owner login through Supabase Auth; only accounts listed in `admin_users` can open the dashboard or change anything. Public sign-up is switched off.
- Row Level Security on every table. Visitors can read only the public catalogue; they cannot read any order, including their own. The only way to create an order is the `place_order` database function.
- `place_order` re-checks every price, stock level and minimum quantity on the server, locks stock rows so two people cannot buy the last item, reserves stock, and stores price snapshots so later price changes never alter past orders.
- Cancelling an order puts stock back exactly once. Orders cannot skip steps, delivery orders need an agreed fee before confirmation, and an order can only be marked paid after a verified payment is recorded.
- Security headers (Content Security Policy, no framing, HTTPS only), input limits, an anti-spam honeypot and per-phone order limits.
- Photos limited to JPEG/PNG/WebP up to 5 MB, uploaded only by the admin.

**Backups:** dashboard button (all tables as JSON + CSV), `npm run backup` (everything plus photos), `npm run restore` (dry run, add-missing or exact replace, automatic safety backup, all-or-nothing).

## For developers

- Next.js 16 (App Router) + TypeScript, Supabase (Postgres, Auth, Storage). No host-specific code.
- `src/app/(shop)`: storefront. `src/app/admin`: dashboard. `src/lib`: shared code. `supabase/migrations`: database. `scripts`: backup/restore.
- Local run: copy `.env.example` to `.env.local`, fill in the Supabase values, then `npm install` and `npm run dev`.
- Checks: `npm run lint` (TypeScript) and `npm run test:db` (database rules, checkout race and backup/restore round trip on a local PostgreSQL).
- Payments are kept separate (`payments` table, `admin_record_payment`), ready for Paystack later: initialise and verify on the server, verify webhook signatures, and record verified payments the same way.

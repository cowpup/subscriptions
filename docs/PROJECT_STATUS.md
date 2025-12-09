# Project Status

**Last Updated:** 2025-12-08
**Updated By:** Agent

---

## Current State

**Vendor management features complete.** Full order management, shipment tracking, and subscriber management for vendors. Subscription tier upgrades/downgrades functional. Live at subr.net.

## In Progress

- Basic analytics for vendors (subscriber count, revenue charts)

## Recently Completed

### Foundation (Priority 1)
- Next.js 14 with TypeScript and App Router
- Folder structure per CLAUDE.md standards
- Tailwind CSS v3 integration
- ESLint + Prettier with strict rules
- Prisma with Vercel Postgres (Neon) connection
- Database schema (12 models) designed and deployed

### Authentication (Priority 2)
- Clerk authentication with social login support (Discord, Google, etc.)
- Protected routes via middleware
- User sync to database via webhooks

### Vendor System
- Vendor registration flow with approval workflow
- Vendor dashboard (pending/approved/rejected states)
- Admin dashboard at /admin
- Admin vendor review at /admin/vendors
- Vendor tier management (create/edit/delete tiers)
- Vendor storefront settings (logo, banner, accent color, description)
- Product management (create/edit/delete with Stripe sync)

### Stripe Integration (Priority 3)
- Stripe SDK configured (API version 2025-11-17.clover)
- Subscription tier creation with Stripe Product/Price sync
- Checkout session creation for subscriptions
- Stripe webhook handler for:
  - checkout.session.completed
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_failed
- 31-day access logic (accessExpiresAt field)
- Public vendor storefront pages (/{slug})
- Subscriber dashboard with active subscriptions view
- Subscription cancellation (cancel at period end)

### Subscriber Experience
- Browse vendor storefronts
- View active subscriptions
- Cancel subscriptions (maintains 31-day access)
- View and purchase products (subscription-gated)
- Tier-based product access

### Orders System
- Order and OrderItem models
- Product checkout with Stripe
- Webhook handling for purchase completion
- Stock management for limited products

### Vendor Management (NEW)
- Orders page with sorting/filtering by date, total, customer, status
- Shipments page with Awaiting/Shipped tabs
- Subscribers page with management actions
- Vendor can cancel subscriber subscriptions
- Vendor can report abusive users
- Subscription tier changes (upgrade/downgrade)
- Verified vendor badge on storefronts

### UI/UX Improvements
- Product card images now fit uncropped (object-contain)
- Vendor Hub button in header for approved vendors
- Header component with conditional vendor link

## Upcoming Priorities

1. Basic analytics for vendors (subscriber count, revenue charts)
2. Order history for subscribers
3. Giveaway system
4. Email notifications

## Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/sign-in`, `/sign-up` | Authentication |
| `/dashboard` | User dashboard |
| `/dashboard/subscriptions` | Active subscriptions with cancel |
| `/dashboard/orders` | Subscriber order history |
| `/dashboard/become-creator` | Vendor application |
| `/vendor` | Vendor dashboard |
| `/vendor/tiers` | Manage subscription tiers |
| `/vendor/tiers/new` | Create new tier |
| `/vendor/tiers/[id]` | Edit existing tier |
| `/vendor/products` | Manage products |
| `/vendor/products/new` | Create new product |
| `/vendor/products/[id]` | Edit existing product |
| `/vendor/orders` | Order management with filters |
| `/vendor/shipments` | Shipment tracking (awaiting/shipped) |
| `/vendor/subscribers` | Subscriber management |
| `/vendor/settings` | Storefront customization |
| `/admin` | Admin dashboard |
| `/admin/vendors` | Review vendor applications |
| `/{slug}` | Public vendor storefront |
| `/{slug}/products/[id]` | Product detail page (subscriber-only) |

## Environment Setup

All environment variables configured in Vercel:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- DATABASE_URL (Neon/Vercel Postgres)
- Clerk keys

Webhook endpoint: `https://www.subr.net/api/webhooks/stripe`

## Notes

- Project builds successfully with `npm run build`
- Live at subr.net (Vercel deployment)
- Rebranded from SubscribeX to subr.net

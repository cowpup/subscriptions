# Project Status

**Last Updated:** 2025-12-08
**Updated By:** Agent

---

## Current State

**Vendor dashboard feature-complete.** Vendors can manage subscription tiers, products, and storefront settings. Subscribers can view and cancel subscriptions. Live at subr.net.

## In Progress

- Product purchase flow for subscribers
- Subscriber view of vendor inventory

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

## Upcoming Priorities

1. Product purchase flow (one-time purchases)
2. Subscriber view of vendor inventory (gated by subscription)
3. Basic analytics for vendors
4. Giveaway system

## Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/sign-in`, `/sign-up` | Authentication |
| `/dashboard` | User dashboard |
| `/dashboard/subscriptions` | Active subscriptions with cancel |
| `/dashboard/become-creator` | Vendor application |
| `/vendor` | Vendor dashboard |
| `/vendor/tiers` | Manage subscription tiers |
| `/vendor/tiers/new` | Create new tier |
| `/vendor/tiers/[id]` | Edit existing tier |
| `/vendor/products` | Manage products |
| `/vendor/products/new` | Create new product |
| `/vendor/products/[id]` | Edit existing product |
| `/vendor/settings` | Storefront customization |
| `/admin` | Admin dashboard |
| `/admin/vendors` | Review vendor applications |
| `/{slug}` | Public vendor storefront |

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

# Project Status

**Last Updated:** 2025-12-09
**Updated By:** Agent

---

## Current State

**Vendor analytics dashboard complete.** Interactive charts for subscriber growth, revenue trends, and tier distribution. Analytics snippet on vendor dashboard serves as teaser. Multiple bug fixes for subscription handling and product purchase webhook. Live at subr.net.

## In Progress

- Testing product purchase flow end-to-end
- Improving product purchase UX (success page redirect)

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
- Vendor storefront settings (logo, banner, accent color, description, **return address**)
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
- **Order history page** with tracking numbers, pre-order badges, shipping addresses
- **Notification preferences** page for email and push notification settings

### Orders System
- Order and OrderItem models
- Product checkout with Stripe
- Webhook handling for purchase completion
- Stock management for limited products
- **Subscription tier tracking on orders** (audit trail)

### Vendor Management
- Orders page with sorting/filtering by date, total, customer, status
- **Subscription tier display on orders**
- Shipments page with Awaiting/Shipped tabs
- Subscribers page with management actions
- Vendor can cancel subscriber subscriptions
- Vendor can report abusive users
- Subscription tier changes (upgrade/downgrade)
- Verified vendor badge on storefronts

### Shipping & Fulfillment
- **Shippo SDK integration** for multi-carrier shipping labels
- Package dimension entry (weight, length, width, height)
- Rate comparison from USPS, UPS, FedEx, DHL
- Label purchase with tracking number and downloadable PDF
- Vendor return address configuration in settings
- Tracking number display and label download links
- **User shipping address management** (`/dashboard/addresses`)
- **Stripe Checkout shipping collection** with pre-fill from saved addresses
- **Shipping profiles** for vendors (save common package dimensions)
- **Bulk label printing** - select multiple orders, get rates, purchase all at once
- **Manual address entry** for orders missing shipping addresses

### Pre-Order System (NEW)
- Products can be marked as pre-orders
- Expected ship date field on products
- Pre-orders hidden from "Awaiting Shipment" until ship date passes
- Pre-order badge on orders

### Security Hardening (NEW)
- HTTP security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)
- Removed X-Powered-By header from API routes
- Double-verification of subscription access in Stripe webhook
- Subscription tier stored on orders for audit trail

### UI/UX Improvements
- Product card images now fit uncropped (object-contain)
- Vendor Hub button in header for approved vendors
- Header component with conditional vendor link
- **Tier cards equal height** with buttons aligned at bottom

### Vendor Analytics (NEW)
- **Analytics dashboard** at `/vendor/analytics`
- Interactive subscriber growth chart (6-month trend)
- Interactive revenue chart (6-month trend)
- Subscriber distribution pie chart by tier
- Revenue by tier horizontal bar chart
- **Analytics snippet** on vendor dashboard as teaser
- Real data populating all vendor dashboard stats
- Time-based metrics (this month vs last month comparisons)

### Bug Fixes (2025-12-10)
- Fixed `getSubscriptionForVendor()` returning cancelled subscriptions
- Fixed stale Stripe subscription ID handling in tier change
- Fixed `shipping_details` expand error in product purchase webhook
- Cleaned up orphaned subscription records

## Upcoming Priorities

1. Order history for subscribers
2. Giveaway system
3. Email notifications
4. Product purchase flow improvements

## Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/sign-in`, `/sign-up` | Authentication |
| `/dashboard` | User dashboard |
| `/dashboard/subscriptions` | Active subscriptions with cancel |
| `/dashboard/addresses` | Shipping address management |
| `/dashboard/orders` | Subscriber order history |
| `/dashboard/notifications` | Notification preferences |
| `/dashboard/become-creator` | Vendor application |
| `/vendor` | Vendor dashboard |
| `/vendor/tiers` | Manage subscription tiers |
| `/vendor/tiers/new` | Create new tier |
| `/vendor/tiers/[id]` | Edit existing tier |
| `/vendor/products` | Manage products |
| `/vendor/products/new` | Create new product |
| `/vendor/products/[id]` | Edit existing product (with pre-order settings) |
| `/vendor/orders` | Order management with filters |
| `/vendor/shipments` | Shipment tracking with Shippo labels |
| `/vendor/subscribers` | Subscriber management |
| `/vendor/analytics` | Interactive analytics dashboard |
| `/vendor/settings` | Storefront customization + return address |
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
- **SHIPPO_API_KEY** (for shipping labels)

Webhook endpoint: `https://www.subr.net/api/webhooks/stripe`

## Notes

- Project builds successfully with `npm run build`
- Live at subr.net (Vercel deployment)
- Rebranded from SubscribeX to subr.net
- Shippo integration requires API key from https://apps.goshippo.com/settings/api

# TODO

Tasks ordered by priority. Work top-down unless blocked.

---

## Priority 1: Foundation

- [x] Initialize Next.js 14 project with TypeScript and App Router
- [x] Configure ESLint + Prettier with strict rules
- [x] Set up folder structure per CLAUDE.md organization standards
- [x] Initialize Prisma with PostgreSQL connection
- [x] Design initial database schema (Users, Vendors, Subscriptions, Products)
- [x] Document schema decisions in ARCHITECTURE.md

## Priority 2: Authentication

- [x] Evaluate auth solutions (Clerk vs Auth0 vs custom)
- [x] Implement chosen auth solution (Clerk)
- [x] Create user registration flow
- [x] Create vendor registration flow (with approval workflow)
- [x] Protected route middleware
- [x] Admin dashboard for vendor approvals

## Priority 3: Stripe Integration

- [x] Set up Stripe account and API keys
- [x] Implement subscription checkout flow
- [x] Create subscription tier management for vendors
- [x] Handle webhook events (subscription created, updated, cancelled, payment failed)
- [x] Implement 31-day access logic post-cancellation
- [x] Create public vendor storefront pages
- [x] Create subscriber dashboard with subscriptions view
- [x] Configure STRIPE_WEBHOOK_SECRET in production
- [x] Test complete checkout flow end-to-end
- [x] Add subscription cancellation UI for subscribers
- [x] One-time product purchase flow

## Priority 4: Vendor Dashboard

- [x] Subscription tier management (create tiers)
- [x] Edit existing tiers
- [x] Vendor profile/storefront customization (logo, banner, colors)
- [x] Product management (CRUD)
- [x] Order management for vendors (with filtering/sorting)
- [x] Shipments management (awaiting/shipped tabs)
- [x] Subscriber management (view, cancel, report)
- [x] Shippo integration for shipping labels
- [x] Pre-order system with ship dates
- [x] Vendor return address settings
- [x] Basic analytics (subscriber count, revenue charts)

## Priority 5: Subscriber Experience

- [x] Browse vendor storefronts
- [x] View subscriptions dashboard
- [x] View vendor inventory (gated by subscription)
- [x] Purchase products
- [x] Upgrade/downgrade subscription tiers
- [x] Order history page
- [x] Notification preferences

## Priority 6: Advanced Features

- [ ] Promo code system (scoped by tier, user segment)
- [ ] User interest-based recommendations
- [ ] Drop notification system

## Backlog (Future Consideration)

- Mobile app
- Creator payouts dashboard
- Affiliate/referral system
- Community features (comments, posts)

## UX Improvements (User Feedback 2025-12-10)

### Address Management
- [ ] Move "Manage Addresses" to profile menu dropdown, not prominent page link
- [ ] Show current address at top, expandable "Add New Address" carrot below
- [ ] Consider Stripe Checkout in modal overlay instead of full redirect

### Shipping Flow Overhaul (High Priority)
- [ ] Attach shipping profiles to products (not entered per-order)
- [ ] Default shipping method per profile (USPS Priority, Ground Advantage, UPS Ground, etc.)
- [ ] Streamline flow: current is too long for high-volume sellers
- [ ] One-click label generation using product's attached profile + default method
- [ ] Label format options: 8.5x11 OR 4x6 thermal (Shippo API setting)
- [ ] Consider shipment size/weight limits before requiring split shipment

### Subscriber Dashboard
- [ ] Separate tabs for Active vs Inactive subscriptions

# Architecture

System design decisions and rationale. This is the technical source of truth.

---

## Overview

SubscribeX is a subscription-gated marketplace. Users subscribe to vendors, gaining time-limited access to purchase from their inventory.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Subscriber │────▶│  Platform   │◀────│   Vendor    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │    Stripe         │                   │
       └──────────────────▶│◀──────────────────┘
                     (Payments)
```

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 14 (App Router) | SSR, API routes, React ecosystem |
| Styling | Tailwind CSS | Utility-first, customizable, no bloat |
| Backend | Next.js API Routes | Unified codebase, serverless-ready |
| Database | PostgreSQL | Relational data, proven reliability |
| ORM | Prisma | Type safety, migrations, good DX |
| Payments | Stripe | Industry standard, subscription support |
| Auth | TBD | Evaluating Clerk, Auth0, custom |
| Hosting | Vercel | Next.js optimization, easy deployment |

---

## Database Schema

Schema implemented in `prisma/schema.prisma`. See below for entity overview and design rationale.

### Entity Relationship Diagram

```
User ─────────────────┬────────────────────────────────────────────┐
  │                   │                                            │
  │ 1:1               │ 1:N                                        │ 1:N
  ▼                   ▼                                            ▼
Vendor            Subscription                              GiveawayEntry
  │                   │                                            │
  │ 1:N               │ N:1                                        │ N:1
  ▼                   ▼                                            ▼
SubscriptionTier ◀────┘                                       Giveaway
  │                                                               │
  │ N:M (via ProductTierAccess)                                   │
  ▼                                                               │
Product ◀─────────────────────────────────────────────────────────┘
  │
  │ N:M
  ▼
ProductTierAccess
```

### Core Entities

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| **User** | All platform users | email, stripeCustomerId |
| **Vendor** | Storefront for creators | storeName, slug, stripeAccountId |
| **SubscriptionTier** | Pricing tiers per vendor | priceInCents, benefits[], stripePriceId |
| **Subscription** | User subscribed to a tier | status, accessExpiresAt, stripeSubscriptionId |
| **Product** | Inventory items | priceInCents, stockQuantity, isDrop, dropDate |
| **ProductTierAccess** | Tier-gated products | Links products to required tiers |
| **Giveaway** | Vendor-run giveaways | prize, startsAt, endsAt, restrictedToTierId |
| **GiveawayEntry** | User entries | Unique per user/giveaway |
| **PromoCode** | Discount codes | discountType, discountValue, maxUses |
| **Address** | Shipping addresses | Multiple per user, one default |
| **UserInterest** | For recommendations | Interest tags per user |
| **NotificationPreference** | Notification settings | Email/push toggles per notification type |

### Design Decisions

**Single User table (no separate Subscriber/Vendor tables):**
- Users can be both subscribers AND vendors
- Vendor data lives in separate `Vendor` table with 1:1 relationship
- Simpler auth, avoids data duplication

**31-day access via `accessExpiresAt`:**
- Stored explicitly rather than calculated
- Set to `currentPeriodEnd` on subscription creation
- Allows access even after `CANCELLED` status
- Index on this field for efficient access checks

**Tier-gated products via junction table:**
- `ProductTierAccess` links products to tiers
- Empty = all tiers can access
- Flexible N:M relationship

**Prices in cents:**
- All monetary values stored as integers (cents)
- Avoids floating-point precision issues
- Stripe uses cents natively

**Stripe IDs stored locally:**
- `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, etc.
- Enables webhook handling and reconciliation
- Single source of truth remains Stripe

---

## Key Design Decisions

### Decision Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| 2025-12-08 | Single User table with Vendor relation | Users can be both; simpler auth | Separate User/Vendor tables |
| 2025-12-08 | Explicit `accessExpiresAt` field | Efficient queries, clear logic | Calculate from dates on read |
| 2025-12-08 | Prices in cents as Int | Avoid float issues, Stripe native | Decimal type |
| 2025-12-08 | Prisma 5.x over 7.x | Stability, Next.js 14 compat | Prisma 7 (breaking changes) |
| 2025-12-08 | Vercel Postgres (Neon) | Vercel integration, generous free tier | Railway, Supabase |

---

## Access Control Logic

```
canViewInventory(user, vendor):
  - User has active subscription to vendor
  - OR subscription ended within 31 days
  - OR user is the vendor themselves

canPurchase(user, product):
  - canViewInventory(user, product.vendor)
  - AND user's tier is in product.requiredTierIds
  - AND product.inventory > 0
```

---

## API Structure (Planned)

```
/api
├── auth/
│   ├── register
│   ├── login
│   └── logout
├── users/
│   └── [id]/
│       ├── subscriptions
│       └── orders
├── vendors/
│   └── [id]/
│       ├── products
│       ├── tiers
│       └── giveaways
├── subscriptions/
│   ├── create
│   └── cancel
├── products/
│   └── [id]/purchase
└── webhooks/
    └── stripe
```

---

## Notes

_Add architectural notes, concerns, or future considerations here._

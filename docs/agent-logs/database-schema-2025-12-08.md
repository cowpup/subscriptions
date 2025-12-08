# Agent Log: Database Schema Design

**Task:** Design initial database schema (Users, Vendors, Subscriptions, Products)
**Date:** 2025-12-08
**Status:** Complete

---

## Requirements Analysis (from CLAUDE.md)

**Subscribers (Buyers):**
- Subscribe to multiple vendors independently
- Access granted for 31 days from purchase (even if cancelled)
- View inventory from subscribed vendors only
- Receive drop notifications (configurable)
- Enter vendor giveaways
- Manage payment info, shipping addresses, and interests

**Creators (Vendors):**
- Create subscription tiers with custom pricing
- Manage product inventory
- Run giveaways (can restrict by tier)
- Create promo codes (scoped to tiers, user segments)
- Customize storefront (logo, branding)
- View subscriber analytics

## Schema Design Decisions

1. **Single User table** - Users can be both subscribers and vendors
2. **Vendor as separate 1:1 entity** - Linked to User, contains storefront customization
3. **Subscription tiers per vendor** - Users subscribe to specific tiers
4. **31-day access logic** - Explicit `accessExpiresAt` field on subscription
5. **Tier-gated products** - Via `ProductTierAccess` junction table
6. **Stripe IDs stored** - Customer, subscription, price, product IDs for reconciliation

## Models Created

| Model | Purpose |
|-------|---------|
| User | All platform users |
| Address | Shipping addresses (1:N from User) |
| UserInterest | Interest tags for recommendations |
| NotificationPreference | Email/push notification settings |
| Vendor | Storefront (1:1 from User) |
| SubscriptionTier | Pricing tiers per vendor |
| Subscription | User-to-tier relationships |
| Product | Inventory items |
| ProductTierAccess | Tier restrictions for products |
| Giveaway | Vendor-run giveaways |
| GiveawayEntry | User entries to giveaways |
| PromoCode | Discount codes |

## Enums

- `SubscriptionStatus`: ACTIVE, CANCELLED, PAST_DUE, PAUSED
- `DiscountType`: PERCENTAGE, FIXED_AMOUNT

## Indexes Added

- User lookups by email, stripeCustomerId
- Vendor lookups by slug
- Subscription lookups by userId, tierId, accessExpiresAt
- Product lookups by vendorId, dropDate, isActive/isDrop
- Giveaway lookups by vendorId, endsAt, active status

## Result

Schema validated and pushed to database. 12 models created with proper relations and indexes.

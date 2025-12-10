# Shipping Address Management & Bulk Labels

**Date:** 2025-12-09
**Task:** Fix shipping address issues, add shipping profiles, implement bulk label printing

---

## Summary

This session addressed multiple shipping-related issues and added significant features for vendors to efficiently create shipping labels.

## Issues Fixed

### 1. Shipping Address Not Linking to Orders
- **Problem:** Orders were being created without shipping addresses, preventing label creation
- **Root Cause:** Stripe Checkout wasn't configured to collect shipping addresses; webhook wasn't extracting address from session
- **Solution:**
  - Added `shipping_address_collection` to Stripe Checkout session
  - Pre-fill shipping from user's saved default address
  - Webhook now extracts `shipping_details` from Stripe session and saves to database
  - Address normalization (uppercase state/country) for consistent matching

### 2. React Hydration Errors (#418, #423, #425)
- **Problem:** Console errors about hydration mismatches on shipments page
- **Root Cause:** Date formatting used `toLocaleDateString()` which varies between server and client
- **Solution:** Created consistent date formatters with explicit locale and UTC timezone

### 3. Orders Without Shipping Addresses
- **Problem:** Existing orders had no addresses; "Create Shipping Label" button errored
- **Solution:**
  - Added warning UI when order has no shipping address
  - Show customer email for contact
  - Disabled label button for orders without addresses
  - Added "Add address manually" option for vendors to enter customer's address

## Features Added

### 1. User Shipping Address Management
- New page: `/dashboard/addresses`
- CRUD operations for user addresses
- Default address selection
- Auto-populated in Stripe Checkout

### 2. Shipping Profiles for Vendors
- **Database:** New `ShippingProfile` model with vendor relationship
- **Settings UI:** Manage profiles in `/vendor/settings`
- **Fields:** name, weightOz, lengthIn, widthIn, heightIn, isDefault
- **Integration:** Quick-fill dropdown when creating shipping labels

### 3. Bulk Shipment Selection & Label Printing
- **Selection:** Checkboxes on each order in shipments page
- **Select All:** Quick select all eligible orders (have address, no tracking)
- **Bulk Actions Bar:** Sticky bar with profile selector and dimension inputs
- **Bulk Rates API:** Get rates for multiple orders at once
- **Rate Selection Modal:** Review rates per order, auto-selects cheapest
- **Bulk Purchase:** Purchase all labels with one click
- **Multi-Tab Labels:** Opens each label in new browser tab for printing

## Files Created

- `src/app/dashboard/addresses/page.tsx` - Address management page
- `src/app/dashboard/addresses/address-form.tsx` - Add address form
- `src/app/dashboard/addresses/address-card.tsx` - Address display/actions
- `src/app/api/user/addresses/route.ts` - GET/POST addresses
- `src/app/api/user/addresses/[id]/route.ts` - PATCH/DELETE address
- `src/app/api/vendor/orders/[id]/address/route.ts` - Manual address entry
- `src/app/api/vendor/shipping-profiles/route.ts` - GET/POST profiles
- `src/app/api/vendor/shipping-profiles/[id]/route.ts` - PATCH/DELETE profile
- `src/app/api/vendor/orders/bulk-shipping/route.ts` - Bulk rates and labels
- `src/app/vendor/settings/shipping-profiles.tsx` - Profile management UI
- `src/app/vendor/shipments/bulk-actions.tsx` - Bulk selection actions
- `src/app/vendor/shipments/shipments-list.tsx` - List with checkboxes

## Files Modified

- `prisma/schema.prisma` - Added ShippingProfile model
- `src/app/api/products/checkout/route.ts` - Stripe shipping address collection
- `src/app/api/webhooks/stripe/route.ts` - Extract shipping from Stripe session
- `src/app/vendor/shipments/page.tsx` - Integrated bulk selection
- `src/app/vendor/shipments/shipment-card.tsx` - Profile selector, date formatting
- `src/app/vendor/settings/page.tsx` - Added shipping profiles section
- `src/app/dashboard/page.tsx` - Added addresses link

## Database Changes

```prisma
model ShippingProfile {
  id       String @id @default(cuid())
  vendorId String
  vendor   Vendor @relation(...)

  name     String
  weightOz Float
  lengthIn Float
  widthIn  Float
  heightIn Float

  isDefault Boolean @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([vendorId, name])
  @@index([vendorId])
}
```

## Git Configuration

Fixed git author from `noahdrip` to `cowpup` with `nlorsung@gmail.com` for proper commit attribution.

## Commits

1. `5112c59` - Add shipping address management and checkout integration
2. `ca5cb23` - Move shipping address collection to Stripe Checkout
3. `68a2f28` - Fix shipping address handling and add manual address entry
4. `131ee69` - Add shipping profiles and fix hydration errors
5. `a0fe786` - Add bulk shipment selection and label printing

## Testing Notes

- Test bulk label purchase with multiple orders
- Verify labels open in new tabs
- Confirm profiles save and populate correctly
- Test manual address entry for legacy orders

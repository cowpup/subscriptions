# Shippo Integration & Pre-Order System

**Date:** 2025-12-08
**Task:** Integrate Shippo for shipping labels, implement pre-order system with ship dates, security hardening

---

## Work Completed

### 1. Security Hardening

#### Security Headers (next.config.mjs)
Added comprehensive security headers to prevent common attacks:
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - Enables XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `Permissions-Policy` - Disables camera, microphone, geolocation
- Removed `X-Powered-By` header from API routes

#### Double-Verification in Webhook
Updated `src/app/api/webhooks/stripe/route.ts` to double-verify subscription access before creating orders:
- Checks subscription is still valid at time of order fulfillment
- Stores subscription tier info on order creation for audit trail

### 2. Pre-Order System

#### Schema Changes (prisma/schema.prisma)

**Product Model:**
```prisma
isPreOrder       Boolean   @default(false)
preOrderShipDate DateTime?
```

**Order Model:**
```prisma
// Track subscription tier at time of purchase for security audit
subscriptionTierId   String?
subscriptionTierName String?

// Pre-order support
isPreOrder     Boolean   @default(false)
preOrderShipDate DateTime?
```

#### Pre-Order UI (edit-product-form.tsx)
- Added checkbox to enable pre-order mode
- Added date picker for expected ship date
- Validation requires ship date when pre-order is enabled
- Blue-themed styling to distinguish from regular products

#### Pre-Order Logic (shipments page)
- Pre-orders don't appear in "Awaiting Shipment" tab until their ship date has passed
- Uses Prisma query filter: `{ isPreOrder: true, preOrderShipDate: { lte: now } }`

### 3. Shippo Integration

#### Library (src/lib/shippo.ts)
Created a lazy-initialized Shippo client with helper functions:
- `createShipment()` - Creates shipment with from/to addresses and parcel, returns available rates
- `purchaseLabel()` - Purchases a label from a selected rate, returns tracking number and label URL
- `getRates()` - Gets rates for an existing shipment
- `getTransaction()` - Gets transaction details

Type definitions:
- `ShippoAddress` - Address structure for shipping
- `ShippoParcel` - Package dimensions and weight
- `ShippoRate` - Rate information from carriers

#### API Routes (src/app/api/vendor/orders/[id]/shipping/route.ts)

**POST** - Get shipping rates:
- Validates package dimensions
- Creates Shippo shipment with vendor's return address and customer's shipping address
- Returns list of available rates from multiple carriers
- Saves dimensions and shipment ID to order

**PUT** - Purchase shipping label:
- Validates rate selection
- Purchases label through Shippo
- Saves tracking number and label URL to order
- Updates order status to PROCESSING

#### Shipment Card UI (src/app/vendor/shipments/shipment-card.tsx)
Complete rewrite with shipping label workflow:

1. **Package Dimensions Form**
   - Weight (oz), Length (in), Width (in), Height (in)
   - Get Shipping Rates button

2. **Rate Selection**
   - Displays available rates from multiple carriers (USPS, UPS, FedEx, etc.)
   - Shows carrier, service level, estimated days, price
   - Radio button selection

3. **Purchase Label**
   - Purchases selected rate
   - Displays tracking number
   - Provides "Download Label" link

4. **Status Updates**
   - Start Processing button
   - Mark as Shipped button (after label purchased)
   - Mark as Delivered button

#### Vendor Settings - Return Address
Added shipping return address fields to vendor settings:
- Street 1, Street 2, City, State, Postal Code, Country
- Used as the "from" address when creating shipping labels

**Schema:**
```prisma
model Vendor {
  // Shipping return address
  street1    String?
  street2    String?
  city       String?
  state      String?
  postalCode String?
  country    String?  @default("US")
}
```

### 4. Schema Updates

**Address Model:**
Added `name` field for recipient name:
```prisma
name String @default("")  // Recipient name
```

**Order Model:**
Added shipping-related fields for Shippo:
```prisma
// Shipping details (for Shippo integration)
weightOz         Float?
lengthIn         Float?
widthIn          Float?
heightIn         Float?
trackingNumber   String?
shippingLabelUrl String?
shippoShipmentId String?
```

### 5. Vendor Orders Page Enhancement
- Added subscription tier badge showing tier at time of purchase
- Purple badge for tier name, or red "No Tier Recorded" for legacy orders
- Blue "Pre-Order" badge for pre-order items

---

## Files Modified/Created

### New Files
- `src/lib/shippo.ts` - Shippo SDK wrapper with helper functions
- `src/app/api/vendor/orders/[id]/shipping/route.ts` - Shipping API endpoints

### Modified Files
- `prisma/schema.prisma` - Added pre-order, shipping, and address fields
- `next.config.mjs` - Added security headers
- `src/app/api/webhooks/stripe/route.ts` - Added double-verification
- `src/app/vendor/shipments/page.tsx` - Updated to handle shipping fields
- `src/app/vendor/shipments/shipment-card.tsx` - Complete rewrite with Shippo integration
- `src/app/vendor/orders/page.tsx` - Added subscription tier display
- `src/app/vendor/products/[id]/edit-product-form.tsx` - Added pre-order UI
- `src/app/api/vendor/products/[id]/route.ts` - Added pre-order field handling
- `src/app/vendor/settings/page.tsx` - Pass address fields to form
- `src/app/vendor/settings/settings-form.tsx` - Added shipping address section
- `src/app/api/vendor/settings/route.ts` - Handle address field updates

---

## Environment Variables Required

Add to `.env`:
```
SHIPPO_API_KEY=your_shippo_api_key
```

Get API key from https://apps.goshippo.com/settings/api

---

## Dependencies Added

```bash
npm install shippo
```

---

## Testing Notes

1. **Pre-Orders:**
   - Create a product, enable pre-order, set future ship date
   - Purchase product
   - Verify order doesn't appear in shipments until ship date passes

2. **Shipping Labels:**
   - Set up vendor return address in Settings
   - Go to Shipments page
   - Click "Create Shipping Label" on an order
   - Enter package dimensions
   - Select a rate and purchase
   - Download and print label

3. **Security:**
   - Verify security headers in browser dev tools
   - Check that subscription tier is recorded on orders

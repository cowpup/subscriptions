# Session Checkpoint - 2025-12-08

**Purpose:** Ensure continuity after auto-compact or new session.

---

## Current State

Project is fully scaffolded with auth and admin systems. Ready for Stripe integration.

## What's Complete

### Priority 1: Foundation
- [x] Next.js 14 with TypeScript, App Router, Tailwind CSS v3
- [x] ESLint 8 + Prettier configured
- [x] Prisma 5.22 with Vercel Postgres (Neon)
- [x] Database schema: 12 models + 3 enums
- [x] Folder structure per CLAUDE.md

### Priority 2: Authentication
- [x] Clerk authentication (social logins enabled including Discord)
- [x] Sign in/up pages at `/sign-in`, `/sign-up`
- [x] Protected routes via middleware
- [x] Webhook sync users to database (`/api/webhooks/clerk`)
- [x] Vendor registration with approval workflow
- [x] Admin dashboard at `/admin` and `/admin/vendors`
- [x] Admin emails: nlorsung@gmail.com, sugarman.brandon@gmail.com

### Priority 3: Stripe (IN PROGRESS)
- [x] Stripe API keys configured in .env
- [ ] Install Stripe SDK (next step)
- [ ] Create Stripe utility
- [ ] Subscription tier management for vendors
- [ ] Checkout flow for subscribers
- [ ] Stripe webhooks for subscription lifecycle
- [ ] 31-day access logic post-cancellation

## Key Files

| Purpose | Path |
|---------|------|
| Prisma schema | `prisma/schema.prisma` |
| Prisma client | `src/lib/prisma.ts` |
| Auth utilities | `src/lib/auth.ts` |
| Admin utilities | `src/lib/admin.ts` |
| Vendor utilities | `src/lib/vendor.ts` |
| Clerk middleware | `src/middleware.ts` |
| Env variables | `.env` |

## Environment Variables Required

```
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
ADMIN_EMAILS=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET= (not yet created)
```

## Next Steps (in order)

1. `npm install stripe @stripe/stripe-js`
2. Create `src/lib/stripe.ts` utility
3. Create subscription tier CRUD for vendors
4. Create checkout session API
5. Create Stripe webhook handler
6. Implement 31-day access logic

## Commands

- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run lint` - ESLint check
- `npx prisma studio` - Database GUI
- `npx prisma db push` - Push schema changes

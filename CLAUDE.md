# Project: SubscribeX (Working Title)

## Platform Vision

A creator-centric subscription marketplace that combines Patreon's membership model with full e-commerce transaction capabilities. Creators and vendors host gated communities where subscribers gain access to exclusive inventory, drops, and giveaways.

**Core Differentiator:** Unlike Patreon, subscribers can purchase products directly through the platform once subscribed. Subscriptions unlock access; transactions happen seamlessly within.

---

## Product Requirements

### User Roles

**Subscribers (Buyers)**
- Subscribe to multiple vendors independently
- Access granted for 31 days from purchase (even if cancelled)
- View inventory from subscribed vendors only
- Receive drop notifications (configurable)
- Enter vendor giveaways
- Manage payment info, shipping addresses, and interests
- Personalized discovery based on interests over time

**Creators (Vendors)**
- Create subscription tiers with custom pricing
- Manage product inventory
- Run giveaways (can restrict by tier)
- Create promo codes (scoped to tiers, user segments, etc.)
- Customize storefront (logo, branding)
- View subscriber analytics

### Technical Stack

- **Payments:** Stripe (subscriptions + one-time purchases)
- **Auth:** TBD (likely Clerk, Auth0, or custom)
- **Frontend:** React/Next.js (clean, Patreon-inspired UI)
- **Backend:** Node.js/Express or Next.js API routes
- **Database:** PostgreSQL with Prisma ORM
- **Hosting:** Vercel or AWS

### Design Philosophy

The UI must feel polished, intentional, and human-designed. No generic gradients, no overuse of rounded cards with shadows, no cookie-cutter component libraries used without customization. Study Patreon's simplicity: clear hierarchy, generous whitespace, purposeful color use, and intuitive navigation.

---

## Agent Operating Protocol

### Session Startup Sequence

Every session begins with this exact sequence:

```
1. Read docs/PROJECT_STATUS.md
2. Read docs/TODO.md
3. Read docs/BLOCKERS.md
4. Summarize:
   - What's complete
   - What's in progress
   - Any blockers requiring human input
5. Propose the next highest priority task from TODO.md
6. Wait for confirmation before proceeding
```

Do not skip this sequence. Do not assume state from previous sessions.

### Documentation Protocol

**Before starting ANY task:**
- Verify task exists in docs/TODO.md
- Check docs/BLOCKERS.md for related issues
- Create agent log: `docs/agent-logs/[TASK-NAME]-[YYYY-MM-DD].md`

**During task execution:**
- Log decisions, approaches tried, and reasoning in the agent log
- Note any unexpected challenges or discoveries

**After completing ANY task:**
- Update agent log with final results
- Move task from docs/TODO.md to docs/COMPLETED.md with timestamp
- Update docs/PROJECT_STATUS.md with current state
- If blocked, add detailed entry to docs/BLOCKERS.md

### Core Documentation Files

Maintain exactly these files (no day summaries, no redundant logs):

| File | Purpose |
|------|---------|
| `docs/PROJECT_STATUS.md` | Single source of truth for project state |
| `docs/TODO.md` | Outstanding tasks, ordered by priority |
| `docs/COMPLETED.md` | Completed tasks with timestamps |
| `docs/BLOCKERS.md` | Issues requiring human input |
| `docs/ARCHITECTURE.md` | System design decisions and rationale |
| `docs/agent-logs/` | Per-task detailed logs |

---

## Code Quality Standards

### DRY Principle (Non-Negotiable)

Before writing any new function, search the codebase for existing utilities that could be extended or reused. If functionality exists, use it. If it almost exists, extend it. Only create new functions when truly necessary.

### File Organization

```
src/
├── components/
│   ├── ui/           # Reusable primitives (Button, Input, Card)
│   ├── layout/       # Page structure (Header, Footer, Sidebar)
│   └── features/     # Domain-specific (SubscriptionCard, ProductGrid)
├── utils/
│   ├── api.ts        # API helpers
│   ├── formatting.ts # Date, currency, string formatting
│   ├── validation.ts # Form and data validation
│   └── stripe.ts     # Stripe-specific utilities
├── hooks/            # Reusable React hooks
├── services/         # Business logic layer
├── types/            # TypeScript definitions
└── styles/           # Global styles, theme config
```

### Commenting Standards

Comment **why**, not **what**. The code should be readable enough to explain what it does.

```typescript
// Bad: Loop through users
users.forEach(user => ...)

// Good: Process in batches to avoid Stripe rate limits
users.forEach(user => ...)
```

### Code Readability

Write code that an engineer unfamiliar with the project could understand within minutes. This means:
- Descriptive variable and function names
- Small, focused functions (one responsibility)
- Logical file organization
- Consistent patterns throughout

---

## Development Workflow

### Build-Test-Fix Cycle

```
Build feature → STOP → Human tests → Fix issues → Next feature
```

Never stack multiple untested features. Each feature must be verified working before proceeding.

### Agent Coordination

When tasks can be parallelized, delegate to specialized sub-agents:
- Frontend development
- Backend/API development
- Database schema and migrations
- DevOps and deployment
- Documentation

Coordinate through the shared docs/ folder. Each agent logs to their own file but updates shared status documents.

### Git Practices

- Meaningful commit messages that explain the change
- One logical change per commit
- Branch naming: `feature/[short-description]` or `fix/[short-description]`
- **NEVER include "Generated with Claude Code", "Co-Authored-By: Claude", or any AI attribution in commits**

---

## Quality Checklist

Before marking any task complete, verify:

- [ ] Code follows DRY principle (no duplicated logic)
- [ ] Functions are reusable where applicable
- [ ] Comments explain reasoning, not obvious operations
- [ ] No hardcoded values that should be configurable
- [ ] Error handling is in place
- [ ] TypeScript types are properly defined
- [ ] Agent log is complete with decisions and outcomes
- [ ] PROJECT_STATUS.md reflects current state
- [ ] TODO.md is updated

---

## Constraints

- **No evidence of AI generation in code or comments.** No "as an AI" phrasing, no generic placeholder text, no comments that explain obvious code. Write like a senior engineer would.
- **No feature creep.** Build exactly what's specified, nothing more. Suggest enhancements in TODO.md for future consideration.
- **No assumptions about completion.** If something wasn't tested, it's not done.

---

## Initial Setup Tasks

When starting a fresh project, initialize in this order:

1. Create docs/ folder structure with all required files
2. Initialize PROJECT_STATUS.md with "Project initialized, no features built"
3. Populate TODO.md with prioritized initial tasks
4. Set up basic Next.js project with TypeScript
5. Configure Prettier and ESLint
6. Create initial folder structure per organization standards
7. Set up database schema planning document

---

## Communication Style

When reporting status or asking questions:
- Be concise and specific
- Lead with the most important information
- Clearly separate "done," "in progress," and "blocked"
- When asking for input, provide options with tradeoffs when possible

---

## Remember

This project should feel like it was built by a focused, experienced team—not generated. Every line of code, every design decision, every file should have clear purpose. When in doubt, simplify.

# CYCO Web

**Vision:** CYCO is a clean, modern web interface that connects waste generators with waste collectors so recyclable material can move from small and medium enterprises to the right collection partners with less friction.
**For:** Small and medium enterprises that generate recyclable waste, and waste collectors that collect and process those materials.
**Solves:** Collection coordination is often manual, opaque, and hard to track. CYCO gives generators a simple way to request collections and collectors a clear way to see and handle upcoming work.

## Goals

- Enable a generator to create a collection request with location, materials, weight, and images.
- Enable a waste collector to register accepted materials and see upcoming collection opportunities.
- Provide a role-aware dashboard so each user sees the most relevant collection activity.
- Keep the interface easy to scan, mobile-friendly, and visually consistent with the CYCO brand.

## Tech Stack

**Core:**

- Framework: Next.js 16.0.1, App Router
- Language: TypeScript 5, React 19.2.0
- Runtime: Node.js 25.1.0 as declared in `package.json`
- Package manager: npm, inferred from `package-lock.json`

**Key dependencies:**

- Authentication: `next-auth` with credentials provider
- Forms: `react-hook-form`
- Validation: `zod`, `@hookform/resolvers`
- Styling: Tailwind CSS 4 through PostCSS
- UI helpers: `lucide-react`, `class-variance-authority`, `clsx`, `framer-motion`

## Scope

**v1 includes:**

- User registration and login for both user types.
- Generator flow to create collection requests.
- Waste collector onboarding with accepted materials.
- Role-aware dashboard cards for current, recent, and upcoming collections.
- Integration with the existing backend API through Next.js route handlers.

**Explicitly out of scope for the current draft:**

- Payments, invoices, or financial settlement.
- Real-time routing, maps, and vehicle tracking.
- Complex marketplace matching or bidding.
- Native mobile apps.
- Administrative back-office workflows.

## Constraints

- Backend contracts are consumed through environment-configured API URLs and need to remain aligned with the backend service.
- The current frontend has no automated tests yet, so new behavior should add test infrastructure before relying on test gates.
- Some current UI data is static/mock data and needs backend integration before production use.

## Open Questions

- What is the exact v1 success metric: number of collection requests created, completed collections, active collectors, or something else?
- Should small/medium enterprises be the only generator audience, or can individual users also create requests?
- What collection lifecycle statuses should v1 support?
- Should collectors claim available requests, receive assigned requests, or both?
- What material taxonomy, weights, and reward rules should drive CyCoins?

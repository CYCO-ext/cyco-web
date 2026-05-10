# Tech Stack

**Analyzed:** 2026-05-09

## Core

- Framework: Next.js 16.0.1 using the App Router under `src/app`.
- Language: TypeScript 5 with `strict: true` in `tsconfig.json`.
- UI runtime: React 19.2.0 and React DOM 19.2.0.
- Runtime: Node.js 25.1.0 declared in `package.json`.
- Package manager: npm, inferred from `package-lock.json`.

## Frontend

- UI framework: React with Next.js App Router.
- Styling: Tailwind CSS 4 via `@tailwindcss/postcss` and `@import "tailwindcss"` in `src/app/globals.css`.
- Design tokens: CYCO colors defined through Tailwind `@theme` variables in `globals.css`.
- Forms: `react-hook-form`.
- Validation: `zod` with `@hookform/resolvers`.
- Icons: `lucide-react`.
- Animation: `framer-motion`, used in the collection material dropdown.
- Component helpers: `class-variance-authority` and `clsx` in `src/app/components/ui.tsx`.

## Backend Access

- API style: Next.js route handlers proxy calls to an external backend API.
- Authentication: `next-auth` credentials provider, JWT session strategy.
- Backend base URL: `BASE_API_URL` from `.env`.
- Additional configured API URL keys observed: `AUTH_API_URL`, `REGISTER_API_URL`, `COLLECTIONS_API_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.

## Testing

- Unit: no test framework dependency detected.
- Integration: no test framework dependency detected.
- E2E: no Playwright/Cypress dependency detected.
- Static checks: ESLint 9 with `eslint-config-next` and TypeScript-aware Next config.

## External Services

- Backend API: user session, registration, and materials endpoints through environment-configured URLs.
- NextAuth: local authentication session management.

## Development Tools

- Build: `next build`
- Dev server: `next dev`
- Production server: `next start`
- Lint: `eslint`
- TypeScript: configured by `tsconfig.json`; no standalone `typecheck` script currently exists.

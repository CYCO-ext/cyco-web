# Architecture

**Pattern:** Small Next.js frontend monolith with App Router pages, client components, and route-handler API proxy endpoints.

## High-Level Structure

The application lives under `src/app`. Pages, route handlers, shared UI components, and form schemas are colocated inside the App Router tree.

```text
Browser UI
  -> Next.js pages and client components
  -> NextAuth session provider
  -> Next.js route handlers under /api
  -> External backend API configured by environment variables
```

## Identified Patterns

### Client-first pages

**Location:** `src/app/page.tsx`, `src/app/auth/login/page.tsx`, `src/app/auth/register/page.tsx`, `src/app/collections/new/page.tsx`
**Purpose:** Most current screens use browser state, form hooks, router navigation, or session hooks.
**Implementation:** Files start with `"use client"` and call hooks such as `useSession`, `useRouter`, `useForm`, `useState`, and `useEffect`.
**Example:** `src/app/page.tsx` redirects unauthenticated users to `/auth/login` and renders a role-aware dashboard.

### NextAuth credentials authentication

**Location:** `src/app/api/auth/[...nextauth]/route.ts`
**Purpose:** Authenticate users against the backend and store user identity, role, and access token in a JWT session.
**Implementation:** Credentials provider posts to `/api/login`, which proxies to the external backend session endpoint.
**Example:** The `jwt` callback copies `role` and `token` from the authorized user into the token; the `session` callback exposes them on the session object.

### API proxy route handlers

**Location:** `src/app/api/login/route.ts`, `src/app/api/register/route.ts`, `src/app/api/materials/route.ts`
**Purpose:** Keep backend URLs server-side and provide frontend-relative API endpoints.
**Implementation:** Route handlers read request bodies, call `BASE_API_URL`, and return `NextResponse.json`.
**Example:** Registration selects `/generator` or `/waste-collectors` based on the submitted role.

### Shared form primitives

**Location:** `src/app/components/ui.tsx`
**Purpose:** Provide reusable input and selection controls with CYCO styling.
**Implementation:** Uses `cva` for button variants, `forwardRef` for `Input` and `MultiSelect`, and local state for `MaterialDropdown`.
**Example:** Register page reuses `Input`, `button`, and `MaterialDropdown`.

### Dashboard card composition

**Location:** `src/app/components/home/MainContent.tsx` and `src/app/components/home/cards/*`
**Purpose:** Compose a dashboard from small card components.
**Implementation:** `MainContent` passes static data to cards and switches between recent collections and next collections based on user type.
**Example:** Waste collectors see `NextCollectionsCard`; generators see `LastCollectionsCard`.

## Data Flow

### Login

1. User submits the login form in `src/app/auth/login/page.tsx`.
2. `signIn("credentials", { redirect: false })` calls NextAuth.
3. NextAuth credentials provider posts to `${NEXTAUTH_URL}/api/login`.
4. `/api/login` posts to `${BASE_API_URL}/session`.
5. On success, NextAuth stores user fields, role, and access token in the JWT session.
6. The page navigates to `/`.

### Registration

1. User completes the two-step registration page.
2. Zod validates shared and role-specific fields.
3. The page builds a role-specific payload.
4. `/api/register` chooses `${BASE_API_URL}/generator` for `GERADOR` or `${BASE_API_URL}/waste-collectors` for `CATADOR`.
5. On success, the page navigates to `/auth/login`.

### Dashboard

1. Root layout wraps all pages in `SessionProvider`.
2. Home page reads the session with `useSession`.
3. Unauthenticated users are redirected to `/auth/login`.
4. Authenticated users see `Header`, `Sidebar`, and `MainContent`.
5. `MainContent` uses the session role to choose generator or collector dashboard content.

## Code Organization

**Approach:** App Router colocated organization with light component reuse.

**Structure:**

- `src/app/page.tsx`: authenticated home dashboard.
- `src/app/layout.tsx`: font setup and NextAuth session provider.
- `src/app/auth/*`: login and registration pages.
- `src/app/collections/new/page.tsx`: collection request form UI.
- `src/app/api/*`: frontend API route handlers.
- `src/app/components/*`: shared layout and UI components.
- `src/app/components/home/cards/*`: dashboard cards.
- `src/app/lib/schemas.ts`: form validation schemas and shared material list.

**Module boundaries:** Boundaries are currently practical rather than formal. Auth, collections, dashboard cards, shared components, and API route handlers are separated by folders, but there is no feature module abstraction yet.

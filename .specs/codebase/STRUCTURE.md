# Project Structure

**Root:** `/Users/lidiagaldino/progs/cyco/cyco-web`

## Directory Tree

```text
.
├── public
├── src
│   └── app
│       ├── api
│       ├── auth
│       ├── collections
│       ├── components
│       └── lib
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
└── postcss.config.mjs
```

## Module Organization

### App Shell

**Purpose:** Global layout, fonts, session provider, and authenticated home dashboard.
**Location:** `src/app`
**Key files:** `layout.tsx`, `page.tsx`, `globals.css`

### Authentication UI

**Purpose:** Login and two-step registration flows.
**Location:** `src/app/auth`
**Key files:** `auth/login/page.tsx`, `auth/register/page.tsx`

### Collection UI

**Purpose:** Generator-facing form for creating a new collection request.
**Location:** `src/app/collections/new`
**Key files:** `collections/new/page.tsx`

### API Route Handlers

**Purpose:** Proxy frontend API calls to the backend and host NextAuth.
**Location:** `src/app/api`
**Key files:** `api/login/route.ts`, `api/register/route.ts`, `api/materials/route.ts`, `api/auth/[...nextauth]/route.ts`

### Shared Components

**Purpose:** Header, sidebar, auth layout, reusable inputs, role card, and dashboard cards.
**Location:** `src/app/components`
**Key files:** `Header.tsx`, `Sidebar.tsx`, `authLayout.tsx`, `roleCard.tsx`, `ui.tsx`, `home/MainContent.tsx`

### Validation

**Purpose:** Zod schemas for login and registration forms.
**Location:** `src/app/lib`
**Key files:** `schemas.ts`

### Static Assets

**Purpose:** Logo, profile image, banner, recycling image, and default SVG assets.
**Location:** `public`
**Key files:** `Logo.png`, `Profile.png`, `Banner.png`, `Recycling.png`

## Where Things Live

**Login:**

- UI/Interface: `src/app/auth/login/page.tsx`
- Business Logic: form submit handler in the page
- Data Access: `signIn("credentials")` through NextAuth
- Configuration: `src/app/api/auth/[...nextauth]/route.ts`, `.env`

**Registration:**

- UI/Interface: `src/app/auth/register/page.tsx`
- Business Logic: role-specific payload building in the page
- Data Access: `src/app/api/register/route.ts`
- Validation: `src/app/lib/schemas.ts`

**Dashboard:**

- UI/Interface: `src/app/page.tsx`
- Composition: `src/app/components/home/MainContent.tsx`
- Cards: `src/app/components/home/cards/*`
- Data Access: currently static card data in `MainContent`

**New collection request:**

- UI/Interface: `src/app/collections/new/page.tsx`
- Business Logic: local state for images and selected materials
- Data Access: no submit API integration observed yet

**Materials:**

- Registration data access: `src/app/api/materials/route.ts`
- Static fallback/list: `src/app/lib/schemas.ts`, `src/app/collections/new/page.tsx`

# External Integrations

## Backend API

**Service:** CYCO backend API
**Purpose:** Provides user sessions, registration, materials, and eventually collection data.
**Implementation:** Next.js route handlers under `src/app/api/*`.
**Configuration:** `BASE_API_URL` in `.env`.
**Authentication:** Login posts credentials to the backend session endpoint; NextAuth stores returned token in the JWT session.

### Session API

**Purpose:** Authenticate email/password credentials.
**Location:** `src/app/api/login/route.ts`
**Backend endpoint:** `${BASE_API_URL}/session`
**Authentication:** Accepts credentials and returns user/token data.

### Generator Registration API

**Purpose:** Register generator users.
**Location:** `src/app/api/register/route.ts`
**Backend endpoint:** `${BASE_API_URL}/generator`
**Authentication:** None observed in frontend route handler.

### Waste Collector Registration API

**Purpose:** Register waste collector users.
**Location:** `src/app/api/register/route.ts`
**Backend endpoint:** `${BASE_API_URL}/waste-collectors`
**Authentication:** None observed in frontend route handler.

### Materials API

**Purpose:** Load material options for collector registration.
**Location:** `src/app/api/materials/route.ts`
**Backend endpoint:** `${BASE_API_URL}/materials`
**Authentication:** None observed in frontend route handler.

## NextAuth

**Service:** NextAuth credentials provider
**Purpose:** Manages frontend authentication state and protected page access.
**Implementation:** `src/app/api/auth/[...nextauth]/route.ts` and `SessionProvider` in `src/app/layout.tsx`.
**Configuration:** `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.
**Authentication:** JWT session strategy.

## Static Assets

**Service:** Local Next.js public assets.
**Purpose:** Brand and UI imagery.
**Implementation:** Assets under `public`, consumed through `next/image` in components such as `Header`.

## Webhooks

No webhook handlers were observed.

## Background Jobs

No background job infrastructure was observed.

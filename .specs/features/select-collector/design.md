# Select Collector Design

**Spec**: `.specs/features/select-collector/spec.md`
**Status**: Implemented

---

## Architecture Overview

Add a generator-only selection page after create collection succeeds. The frontend continues using local Next.js route handlers as backend proxies so `COLLECTIONS_API_URL` remains server-side.

Flow:

1. Create collection succeeds and returns a request ID.
2. `/collections/new` navigates to `/collections/[id]/collectors`.
3. The selection page loads nearby collectors through `/api/collections/requests/[id]/collectors`.
4. The route handler calls `GET ${COLLECTIONS_API_URL}/generators/requests/[id]/collectors`.
5. The user selects one collector.
6. The page posts to `/api/collections/requests/[id]/select-collector`.
7. The route handler calls `POST ${COLLECTIONS_API_URL}/collectors/requests/[id]/select` with `{ collectorId }`.
8. The page shows success and lets the user return to dashboard.

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --- | --- | --- |
| `Header` | `src/app/components/Header.tsx` | Keep authenticated page shell consistent. |
| `Sidebar` | `src/app/components/Sidebar.tsx` | Keep dashboard navigation. |
| `button` | `src/app/components/ui.tsx` | Reuse CYCO button styling for confirm/retry/back actions. |
| `getSessionMeta` | `src/app/lib/createCollection.ts` | Reuse current session role/token/id helper. |
| Create collection submit flow | `src/app/collections/new/page.tsx` | Reuse success-navigation pattern after request ID extraction. |
| API proxy style | `src/app/api/*/route.ts` | Add collector list/select routes using same error behavior. |

### Integration Points

| System | Integration Method |
| --- | --- |
| Create collection API | Extract created request ID from `/api/collections/request` response. |
| Nearby collectors API | `GET /api/collections/requests/[id]/collectors` -> `GET ${COLLECTIONS_API_URL}/generators/requests/[id]/collectors` |
| Select collector API | `POST /api/collections/requests/[id]/select-collector` -> `POST ${COLLECTIONS_API_URL}/collectors/requests/[id]/select` |
| NextAuth session | Ensure authenticated generator access and forward token if backend requires auth. |

## Components and Interfaces

### Select Collector Page

- **Purpose**: Let a generator select a collector for a created request.
- **Location**: `src/app/collections/[id]/collectors/page.tsx`
- **Interfaces**:
  - `loadCollectors(): Promise<void>` - fetches nearby collectors for the route request ID.
  - `handleSelectCollector(collectorId: string): void` - stores selected collector ID.
  - `handleSubmit(): Promise<void>` - posts selected collector.
- **Dependencies**: route param `id`, NextAuth session, collector list route, collector select route.
- **Reuses**: `Header`, `Sidebar`, `button`, `getSessionMeta`.

### Collector Option Card

- **Purpose**: Display one collector enterprise and expose selection state.
- **Location**: Prefer colocated in `src/app/collections/[id]/collectors/page.tsx` initially.
- **Interfaces**:
  - `collector: CollectorOption`
  - `selected: boolean`
  - `onSelect(id: string): void`
- **Dependencies**: normalized collector data.
- **Reuses**: Tailwind patterns from existing cards.

### Nearby Collectors API Route

- **Purpose**: Fetch nearby collectors for a collection request.
- **Location**: `src/app/api/collections/requests/[id]/collectors/route.ts`
- **Interfaces**:
  - `GET(req, { params: { id } }): Promise<NextResponse<CollectorOption[]>>`
- **Dependencies**: `COLLECTIONS_API_URL`, optional `Authorization` forwarding.
- **Reuses**: API proxy style from existing route handlers.

### Select Collector API Route

- **Purpose**: Submit selected collector for a collection request.
- **Location**: `src/app/api/collections/requests/[id]/select-collector/route.ts`
- **Interfaces**:
  - `POST(req, { params: { id } }): Promise<NextResponse>`
- **Dependencies**: `COLLECTIONS_API_URL`, optional `Authorization` forwarding.
- **Reuses**: Validation style from `src/app/api/collections/request/route.ts`.

## Data Models

### Created Request Response

```typescript
interface CreatedCollectionResponse {
  id?: string;
  requestId?: string;
  collectionRequestId?: string;
}
```

**Relationships:** The create flow must extract one of these fields, or another confirmed backend field, as the route ID for selection.

### Collector Option

```typescript
interface CollectorOption {
  id: string;
  name: string;
  enterpriseName?: string;
  distance?: number;
  materials?: string[];
  rating?: number;
  raw?: unknown;
}
```

**Relationships:** `id` maps to `collectorId` in the select API body.

### Select Collector Request

```typescript
interface SelectCollectorRequest {
  collectorId: string;
}
```

**Relationships:** This is the exact backend POST body for `POST ${COLLECTIONS_API_URL}/collectors/requests/[id]/select`.

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Create response has no request ID | Show error on create page and do not navigate | User can retry or report backend response issue. |
| Unauthenticated user | Redirect to `/auth/login` | User must log in. |
| Non-generator user | Show access message or redirect home | Collector cannot select collector for generator request. |
| Collectors fail to load | Show error with retry | User can retry without leaving page. |
| No nearby collectors | Show empty state | User knows no selection is currently possible. |
| Submit without selection | Inline validation | Prevents invalid POST. |
| Selection submit fails | Preserve selection and show error | User can retry. |
| Selection submit succeeds | Show success feedback | User can return to dashboard. |

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Page route | `/collections/[id]/collectors` | Keeps collector selection scoped to the created request. |
| Backend calls | Local App Router route handlers | Matches existing codebase and keeps env vars server-side. |
| API base env | `COLLECTIONS_API_URL` | User specified this variable for both collector APIs. |
| Collector shape | Normalize defensively | Backend response shape was not provided. |
| Tests | Lint/build gates for now | Project has no automated test framework configured. |

## Open Questions

- What exact field does `POST /generator/request` return for the created request ID?
- What exact fields are returned by `GET /generators/requests/[id]/collectors`?
- Should token authorization be forwarded to both collector endpoints?

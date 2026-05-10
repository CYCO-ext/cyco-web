# Collections Page Design

**Spec**: `.specs/features/collections-page/spec.md`
**Status**: Implemented

---

## Architecture Overview

Add a role-aware `/collections` page backed by a local search route handler. The page reads the authenticated session, derives the correct user filter from role, sends query params to the local API route, and renders a scan-friendly list of collection requests.

Flow:

1. User opens `/collections`.
2. Page checks NextAuth session.
3. Page derives `generatorId=session.user.id` for generators or `collectorId=session.user.id` for collectors.
4. Page calls `/api/collections/search` with role-specific ID and optional `status`.
5. Route handler calls `GET ${COLLECTIONS_API_URL}/collections/search` with the same query params.
6. Page enriches visible cards with opposite-party profile information:
   - Generator users fetch waste collector profiles by `selectedCollectorId`.
   - Collector users fetch generator profiles by `generatorId`.
7. Collector users can quick accept an eligible collection through `/api/collections/requests/[id]/accept`.
8. Page renders collections with loading, empty, error, retry, profile fallback, and accept feedback states.

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --- | --- | --- |
| `Header` | `src/app/components/Header.tsx` | Keep authenticated page shell consistent. |
| `Sidebar` | `src/app/components/Sidebar.tsx` | Existing `/collections` navigation already points here. |
| `button` | `src/app/components/ui.tsx` | Reuse for retry and actions. |
| `getSessionMeta` | `src/app/lib/createCollection.ts` | Reuse session ID, role, and token extraction. |
| Generator profile route | `src/app/api/generator/[id]/route.ts` | Reuse to fetch counterpart generator details for collector users. |
| API proxy style | `src/app/api/collections/*/route.ts` | Follow current route-handler error and env patterns. |

### Integration Points

| System | Integration Method |
| --- | --- |
| Collections search API | `GET /api/collections/search` -> `GET ${COLLECTIONS_API_URL}/collections/search` |
| Generator profile API | `GET /api/generator/[id]` -> `GET ${BASE_API_URL}/generator/[id]` |
| Waste collector profile API | `GET /api/waste-collector/[id]` -> `GET ${BASE_API_URL}/waste-collector/[id]` |
| Collector accept API | `POST /api/collections/requests/[id]/accept` -> `POST ${COLLECTIONS_API_URL}/collections/requests/[id]/accept` |
| Generator finish API | `POST /api/collections/requests/[id]/confirm-generator` -> `POST ${COLLECTIONS_API_URL}/requests/[id]/confirm-generator` |
| Collector finish API | `POST /api/collections/requests/[id]/confirm-collector` -> `POST ${COLLECTIONS_API_URL}/requests/[id]/confirm-collector` |
| NextAuth session | Determines `generatorId` or `collectorId` query param. |
| Sidebar | Existing `Coletas` icon routes to `/collections`. |

## Components and Interfaces

### Collections Page

- **Purpose**: Display searchable role-specific collections.
- **Location**: `src/app/collections/page.tsx`
- **Interfaces**:
  - `loadCollections(status?: CollectionStatus): Promise<void>` - fetches filtered collections.
  - `handleStatusChange(status: CollectionStatus | "ALL"): void` - updates filter and reloads.
- **Dependencies**: NextAuth session, collections search route, `Header`, `Sidebar`.
- **Reuses**: Existing authenticated page layout patterns.

### Collection Card

- **Purpose**: Render one collection result.
- **Location**: Prefer colocated in `src/app/collections/page.tsx` initially.
- **Interfaces**:
  - `collection: CollectionSummary`
  - `counterpart?: CounterpartProfile`
  - `viewerRole: "GENERATOR" | "WASTE_COLLECTOR"`
  - `onAccept?(collectionId: string): Promise<void>`
- **Dependencies**: normalized collection data.
- **Reuses**: Tailwind card patterns already used in dashboard and select-collector.
- **Behavior**:
  - For generator users, hide generator profile details and render selected collector details when `selectedCollectorId` exists.
  - For collector users, hide collector profile details and render generator details.
  - For collector users, render quick accept only when the collection status is `PENDING`.
  - For both roles, render finish when the collection status is `IN_PROGRESS`.
  - Disable finish for generators when `generatorConfirmed` is true and for collectors when `collectorConfirmed` is true.

### Collections Search API Route

- **Purpose**: Proxy collection search requests to the backend.
- **Location**: `src/app/api/collections/search/route.ts`
- **Interfaces**:
  - `GET(req): Promise<NextResponse<CollectionSummary[]>>`
- **Dependencies**: `COLLECTIONS_API_URL`, optional Authorization forwarding.
- **Reuses**: API proxy style from existing collection routes.

### Waste Collector Profile API Route

- **Purpose**: Proxy waste collector profile lookup for generator users.
- **Location**: `src/app/api/waste-collector/[id]/route.ts`
- **Interfaces**:
  - `GET(req, { params }): Promise<NextResponse<CounterpartProfile>>`
- **Dependencies**: `BASE_API_URL`, optional Authorization forwarding.
- **Reuses**: `src/app/api/generator/[id]/route.ts` route-handler pattern.

### Collection Accept API Route

- **Purpose**: Proxy collector quick accept action.
- **Location**: `src/app/api/collections/requests/[id]/accept/route.ts`
- **Interfaces**:
  - `POST(req, { params }): Promise<NextResponse>`
- **Dependencies**: `COLLECTIONS_API_URL`, optional Authorization forwarding.
- **Reuses**: Collection route-handler patterns from select-collector.

### Collection Finish API Routes

- **Purpose**: Proxy role-specific finish confirmation actions.
- **Location**:
  - `src/app/api/collections/requests/[id]/confirm-generator/route.ts`
  - `src/app/api/collections/requests/[id]/confirm-collector/route.ts`
- **Interfaces**:
  - `POST(req, { params }): Promise<NextResponse>`
- **Dependencies**: `COLLECTIONS_API_URL`, optional Authorization forwarding.
- **Reuses**: Collection route-handler patterns from accept/select-collector.

## Data Models

### Collection Status

```typescript
type CollectionStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED"
  | string;
```

**Relationships:** Sent as `status` query param when selected. UI should not crash on unknown statuses.

### Collection Summary

```typescript
interface CollectionSummary {
  id: string;
  generatorId: string;
  addressId?: string;
  materialIds: string[];
  weight: number;
  status: CollectionStatus;
  selectedCollectorId?: string;
  generatorConfirmed: boolean;
  collectorConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Relationships:** Matches the backend `GET /collections/search` result shape.

### Counterpart Profile

```typescript
interface CounterpartProfile {
  id: string;
  name?: string;
  email?: string;
  document?: string;
  phone?: {
    ddi?: number;
    ddd?: number;
    number?: string;
  };
  address?: Array<{
    zipCode?: string;
    number?: string;
    complement?: string;
  }>;
}
```

**Relationships:** Normalized from either `GET /generator/[id]` or `GET /waste-collector/[id]`. The page only displays profile fields that exist.

### Counterpart Lookup Query

```typescript
interface CounterpartLookup {
  role: "GENERATOR" | "WASTE_COLLECTOR";
  collection: CollectionSummary;
}
```

**Relationships:** If `role` is `GENERATOR`, lookup `collection.selectedCollectorId` through waste collector profile API. If `role` is `WASTE_COLLECTOR`, lookup `collection.generatorId` through generator profile API.

### Collection Search Query

```typescript
interface CollectionSearchQuery {
  status?: CollectionStatus;
  generatorId?: string;
  collectorId?: string;
}
```

**Relationships:** The page sends exactly one role-specific ID filter plus optional status.

## Query Params

### Generator Query

```text
GET /api/collections/search?generatorId=<session.user.id>&status=PENDING
```

### Collector Query

```text
GET /api/collections/search?collectorId=<session.user.id>&status=PENDING
```

### Backend Proxy Target

```text
GET ${COLLECTIONS_API_URL}/collections/search?[same query params]
```

### Profile Lookup Targets

```text
GET /api/waste-collector/<selectedCollectorId>
GET /api/generator/<generatorId>
```

### Collector Accept Target

```text
POST /api/collections/requests/<collectionId>/accept
```

### Finish Targets

```text
POST /api/collections/requests/<collectionId>/confirm-generator
POST /api/collections/requests/<collectionId>/confirm-collector
```

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Unauthenticated user | Redirect to `/auth/login` | User must log in. |
| Missing session user ID | Show configuration error | Avoids invalid backend query. |
| Unknown role | Show access/configuration error | Avoids sending wrong filter. |
| Search backend error | Show error with retry | User can retry without leaving page. |
| Empty results | Show empty state | User understands no collections match filters. |
| Malformed collection item | Filter invalid item out | Page remains usable. |
| Missing selected collector for generator | Show "collector not selected" state | Generator understands the request is waiting. |
| Profile lookup error | Keep card visible with fallback ID | Collection list remains usable. |
| Accept backend error | Show inline error and keep action available | Collector can retry or refresh. |
| Duplicate accept click | Disable button while pending | Prevents duplicate backend submissions. |
| Finish backend error | Show inline error and keep action available | User can retry or refresh. |
| Duplicate finish click | Disable button while pending | Prevents duplicate backend submissions. |
| Already confirmed by current user | Keep finish visible but disabled | Makes completion state clear and prevents duplicate confirmation. |

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Page route | `/collections` | Matches existing sidebar navigation. |
| Backend calls | Local App Router route handler | Keeps backend URL server-side and matches existing patterns. |
| Role filters | Derived from NextAuth role | Prevents users from manually choosing another user ID in UI. |
| Status filter | Client state plus query params to API route | Simple for current no-pagination scope. |
| Own-party information | Hidden from cards | Avoids redundant generator info for generators and collector info for collectors. |
| Counterpart profile lookup | Fetch by collection IDs after search | Keeps `/collections/search` contract unchanged. |
| Collector quick accept | Pending-only local route handler proxy | Keeps `COLLECTIONS_API_URL` server-side and avoids accepting already in-progress requests. |
| Finish confirmation | Role-specific local route handler proxies | Matches backend's generator/collector confirmation endpoints. |
| Tests | Lint/build gates for now | Project has no automated test framework configured. |

## Open Questions

- What are the complete allowed status values?
- Should collectors see `PENDING` requests before they are selected, or only requests where `selectedCollectorId` equals their ID?
- Should this page link to future collection detail/confirmation actions?
- What is the exact response shape of `GET ${BASE_API_URL}/waste-collector/[id]`?
- Which statuses are eligible for collector quick accept?

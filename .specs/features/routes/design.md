# Routes Design

**Spec**: `.specs/features/routes/spec.md`
**Status**: Implemented

---

## Architecture Overview

Add a collector-only route suggestion workflow. The home dashboard swaps the generator-focused create-collection card for a route suggestion card when `userType === "WASTE_COLLECTOR"`. The route suggestion page lets the collector select candidate collection requests, provide vehicle inputs, choose current or registered start location, and submit the route suggestion request through a local API route handler.

Flow:

1. Collector opens home.
2. `MainContent` renders `CreateRouteSuggestionCard` instead of `CreateCollectionCard`.
3. Collector clicks the card and opens `/routes/suggest`.
4. Page verifies authenticated collector session.
5. Page loads candidate collections with `/api/collections/search?collectorId=<session.user.id>&status=IN_PROGRESS`.
6. Collector selects candidate requests, fills vehicle inputs, and chooses current or registered start location.
7. Page posts to `/api/collectors/routes/suggest`.
8. Route handler calls `POST ${COLLECTIONS_API_URL}/collectors/routes/suggest`.
9. Page renders solver summary, routes, stops, and unassigned collections.

## Code Reuse Analysis

### Existing Components to Leverage

| Component/Helper | Location | How to Use |
| --- | --- | --- |
| `Header` | `src/app/components/Header.tsx` | Keep page shell consistent. |
| `Sidebar` | `src/app/components/Sidebar.tsx` | Use authenticated layout pattern. |
| `button`, `Input` | `src/app/components/ui.tsx` | Reuse base form controls where practical. |
| `getSessionMeta` | `src/app/lib/createCollection.ts` | Read collector ID, role, and token. |
| `isCollectorRole` | `src/app/lib/collectionsPage.ts` | Gate collector-only access. |
| `normalizeCollections`, `formatWeight`, `formatDate`, `statusLabel` | `src/app/lib/collectionsPage.ts` | Candidate list display and normalization. |
| Collection API proxy pattern | `src/app/api/collections/*/route.ts` | Match local route-handler style and error handling. |
| Home cards | `src/app/components/home/cards/*` | Match card proportions and interaction style. |

### Integration Points

| System | Integration Method |
| --- | --- |
| Home dashboard | Collector users see `CreateRouteSuggestionCard`; generators keep `CreateCollectionCard`. |
| Candidate collections | `GET /api/collections/search?collectorId=<id>&status=IN_PROGRESS` with auth header. |
| Registered collector location | `GET /api/collectors/[collectorId]/address` -> `GET ${COLLECTIONS_API_URL}/collectors/[collectorId]/address` and extract coordinates from address/location fields. |
| Route suggestion proxy | `POST /api/collectors/routes/suggest` -> `POST ${COLLECTIONS_API_URL}/collectors/routes/suggest`. |
| NextAuth session | Supplies collector ID and token. |

## Components and Interfaces

### Create Route Suggestion Card

- **Purpose**: Collector-only home card that links to the route suggestion page.
- **Location**: `src/app/components/home/cards/CreateRouteSuggestionCard.tsx`
- **Interfaces**:
  - No required props for MVP.
- **Behavior**:
  - Links to `/routes/suggest`.
  - Uses dashboard card styling consistent with `CreateCollectionCard`.
  - Appears only when `userType === "WASTE_COLLECTOR"`.

### Home Main Content Update

- **Purpose**: Swap the first card based on authenticated role.
- **Location**: `src/app/components/home/MainContent.tsx`
- **Behavior**:
  - If collector, render `CreateRouteSuggestionCard`.
  - Otherwise, render `CreateCollectionCard`.
  - Leave active/impact/coins/collection cards unchanged.

### Route Suggestion Page

- **Purpose**: Collector-facing form and result view for route suggestions.
- **Location**: `src/app/routes/suggest/page.tsx`
- **Interfaces**:
  - `loadCandidates(): Promise<void>`
  - `toggleCandidate(id: string): void`
  - `submitSuggestion(): Promise<void>`
- **Dependencies**: NextAuth session, candidate collection route, route suggestion local API route.
- **Behavior**:
  - Redirect unauthenticated users to `/auth/login`.
  - Block non-collector users with a clear access message or redirect.
  - Load only `IN_PROGRESS` candidate collections for the collector.
  - Let the collector choose candidate requests with checkboxes.
  - Validate vehicle count, vehicle capacity, selected start-location coordinates, and selected candidates.
  - Render route suggestion result after successful submit.

### Route Suggestion API Route

- **Purpose**: Proxy route suggestion requests to the backend.
- **Location**: `src/app/api/collectors/routes/suggest/route.ts`
- **Interfaces**:
  - `POST(req): Promise<NextResponse<RouteSuggestionResponse>>`
- **Dependencies**: `COLLECTIONS_API_URL`, optional Authorization forwarding.
- **Behavior**:
  - Validate required request body shape enough to avoid empty submits.
  - Forward backend response and status.
  - Return a config error when `COLLECTIONS_API_URL` is missing.

## Data Models

### Route Suggestion Request

```typescript
interface RouteSuggestionRequest {
  collectorId: string;
  vehicleCount: number;
  vehicleCapacity: number;
  start: {
    type: "COORDINATES";
    latitude: number;
    longitude: number;
  };
  candidateRequestIds: string[];
  options: {
    timeLimitSeconds: number;
    allowDroppingStops: boolean;
  };
}
```

### Route Suggestion Response

```typescript
interface RouteSuggestionResponse {
  status: string;
  solver: {
    engine: string;
    elapsedMs: number;
    objectiveDistanceMeters: number;
    droppedStops: number;
  };
  routes: SuggestedRoute[];
  unassigned: string[];
}

interface SuggestedRoute {
  vehicleIndex: number;
  capacity: number;
  totalLoad: number;
  totalDistanceMeters: number;
  stops: SuggestedRouteStop[];
}

interface SuggestedRouteStop {
  sequence: number;
  collectionRequestId: string;
  addressId: string;
  latitude: number;
  longitude: number;
  demand: number;
  accumulatedLoad: number;
  distanceFromPreviousMeters: number;
}
```

### Route Suggestion Form State

```typescript
interface RouteSuggestionFormState {
  selectedRequestIds: string[];
  vehicleCount: string;
  vehicleCapacity: string;
  startLocationSource: "current" | "registered";
  // Filled from browser geolocation or registered address coordinates, not editable fields.
  latitude: string;
  longitude: string;
  timeLimitSeconds: string;
  allowDroppingStops: boolean;
}
```

## API Contract

### Local Route

```text
POST /api/collectors/routes/suggest
```

### Backend Target

```text
POST ${COLLECTIONS_API_URL}/collectors/routes/suggest
```

### Candidate Query

```text
GET /api/collections/search?collectorId=<session.user.id>&status=IN_PROGRESS
```

## Validation Strategy

| Field | Validation |
| --- | --- |
| `collectorId` | Required from session. |
| `vehicleCount` | Integer greater than or equal to 1. |
| `vehicleCapacity` | Number greater than 0. |
| `latitude` | Number between -90 and 90, filled from selected start source. |
| `longitude` | Number between -180 and 180, filled from selected start source. |
| `candidateRequestIds` | At least one selected collection request ID. |
| `timeLimitSeconds` | Number greater than 0; default `5`. |
| `allowDroppingStops` | Boolean; default `true`. |

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Unauthenticated user | Redirect to `/auth/login` | User must log in. |
| Non-collector user | Show access error or redirect home | Prevents generators from using collector route planning. |
| Missing collector ID | Show session/configuration error | Avoids invalid backend submit. |
| Candidate search error | Show retry option | Collector can retry without losing form defaults. |
| No candidates | Show empty candidate state and disable submit | Collector understands there is nothing to route. |
| Validation error | Show inline form error | Collector can fix input before submit. |
| Geolocation unsupported/denied | Show location error and retry action | Collector can allow permission or retry later. |
| Registered location missing coordinates | Show registered location error and retry action | Collector can switch to current location or retry profile lookup. |
| Suggestion backend error | Show error and keep selected candidates/form data | Collector can adjust and retry. |
| Malformed response | Show fallback result error | Avoids rendering broken route data. |

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Page route | `/routes/suggest` | Clear route-planning URL and avoids overloading `/collections`. |
| Backend access | Local App Router proxy | Keeps `COLLECTIONS_API_URL` server-side and matches existing API patterns. |
| Candidate source | Existing collections search route | Reuses current collection normalization and role filtering. |
| Start location | Current geolocation or registered collection address coordinates | User requested a choice between current and registered location without editable lat/long fields. |
| Options defaults | `timeLimitSeconds=5`, `allowDroppingStops=true` | Matches provided sample request. |
| Result rendering | Text/list route summary cards | Avoids map dependency while still exposing all solver/stops data. |
| Tests | Lint/build gates for now | Project has no automated test framework configured. |

## Open Questions

- Should route suggestions be persisted once generated?
- Should suggested stops link to a future collection detail page?

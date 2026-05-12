# Save Route Design

**Spec**: `.specs/features/save-route/spec.md`
**Status**: Implemented

---

## Architecture Overview

Extend the collector route workflow with persistence. After a collector generates a suggestion on `/routes/suggest`, the result area shows a save button. Saving posts the normalized suggestion through a local API route. A new saved routes page lets collectors review persisted routes and inspect vehicle-level route details.

Flow:

1. Collector generates a route suggestion on `/routes/suggest`.
2. Page renders `RouteResult` with a save action.
3. Collector clicks save.
4. Page posts to `/api/collectors/routes/save`.
5. Route handler calls `POST ${COLLECTIONS_API_URL}/collectors/routes/save`.
6. Page shows saved confirmation and disables duplicate save for the same result.
7. Collector opens `/routes/saved`.
8. Page loads `/api/collectors/routes/saved`.
9. Page renders saved route cards with expandable vehicle details.

## Code Reuse Analysis

### Existing Components to Leverage

| Component/Helper | Location | How to Use |
| --- | --- | --- |
| `Header` | `src/app/components/Header.tsx` | Saved routes page shell. |
| `Sidebar` | `src/app/components/Sidebar.tsx` | Authenticated layout consistency. |
| `button`, `Input` | `src/app/components/ui.tsx` | Buttons and shared control styling. |
| `getSessionMeta` | `src/app/lib/createCollection.ts` | Read collector ID, token, and role. |
| `isCollectorRole` | `src/app/lib/collectionsPage.ts` | Collector-only access guard. |
| `RouteSuggestionResponse`, `normalizeRouteSuggestionResponse` | `src/app/lib/routes.ts` | Save payload and saved route suggestion summary. |
| `formatDistanceMeters`, `formatRouteLoad` | `src/app/lib/routes.ts` | Saved route summary display. |
| Collector route proxy pattern | `src/app/api/collectors/routes/suggest/route.ts` | Match proxy style and authorization forwarding. |

### Integration Points

| System | Integration Method |
| --- | --- |
| Route suggestion result | Add save state and save button to `/routes/suggest`. |
| Save route proxy | `POST /api/collectors/routes/save` -> `POST ${COLLECTIONS_API_URL}/collectors/routes/save`. |
| Saved routes page | `GET /api/collectors/routes/saved` -> `GET ${COLLECTIONS_API_URL}/collectors/routes/saved`. |
| Saved route navigation | Sidebar includes a direct `/routes/saved` shortcut. |
| Collection detail modal | `GET /api/collections/[id]` -> `GET ${COLLECTIONS_API_URL}/collections/[id]`. |
| NextAuth session | Supplies collector ID and token. |

## Components and Interfaces

### Route Suggestion Save Action

- **Purpose**: Save the currently displayed route suggestion.
- **Location**: `src/app/routes/suggest/page.tsx`
- **Interfaces**:
  - `saveSuggestion(result: RouteSuggestionResponse): Promise<void>`
  - `saveState: "idle" | "saving" | "saved" | "error"`
- **Behavior**:
  - Show save button only when a normalized suggestion result exists.
  - Disable while saving.
  - Disable or mark as saved after successful save.
  - Reset saved state when a new suggestion is generated.
  - Show saved route ID on success.

### Saved Routes Page

- **Purpose**: Collector-facing list of saved routes.
- **Location**: `src/app/routes/saved/page.tsx`
- **Interfaces**:
  - `loadSavedRoutes(): Promise<void>`
- **Behavior**:
  - Redirect unauthenticated users to `/auth/login`.
  - Block non-collector users.
  - Load saved routes on authenticated collector session.
  - Render loading, empty, error, and retry states.
  - Render one card per saved route.
  - Render compact route metadata and solver summary.
  - Render vehicle routes in expandable details sections.
  - Show stop address street and number when the route stop includes those fields.
  - Open a collection detail modal from each stop action.

### Save Route API Route

- **Purpose**: Proxy save requests to the backend.
- **Location**: `src/app/api/collectors/routes/save/route.ts`
- **Interfaces**:
  - `POST(req): Promise<NextResponse<SavedRoute>>`
- **Behavior**:
  - Validate `collectorId`, `source`, and `suggestion`.
  - Force no client-side backend URL exposure.
  - Forward authorization header when present.
  - Preserve backend status codes, including `201`.

### Saved Routes API Route

- **Purpose**: Proxy saved route listing to the backend.
- **Location**: `src/app/api/collectors/routes/saved/route.ts`
- **Interfaces**:
  - `GET(req): Promise<NextResponse<SavedRoute[]>>`
- **Behavior**:
  - Forward authorization header when present.
  - Normalize route arrays for UI safety.
  - Return backend errors consistently.

### Collection Detail API Route

- **Purpose**: Proxy collection request detail lookups for the saved route modal.
- **Location**: `src/app/api/collections/[id]/route.ts`
- **Interfaces**:
  - `GET(req): Promise<NextResponse<CollectionSummary>>`
- **Behavior**:
  - Validate collection ID.
  - Forward authorization header when present.
  - Normalize the provided collection response shape.

## Data Models

### Save Route Request

```typescript
interface SaveRouteRequest {
  collectorId: string;
  source: "ROUTE_SUGGESTION";
  suggestion: RouteSuggestionResponse;
}
```

### Saved Route

```typescript
interface SavedRoute {
  id: string;
  collectorId: string;
  status: "OPEN" | "CLOSED" | string;
  fingerprint?: string;
  assignedCollectionRequestIds: string[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  suggestion?: RouteSuggestionResponse;
}
```

### Save Route UI State

```typescript
type SaveRouteState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; routeId: string }
  | { status: "error"; message: string };
```

## API Contract

### Local Save Route

```text
POST /api/collectors/routes/save
Content-Type: application/json
```

```json
{
  "collectorId": "coll-001",
  "source": "ROUTE_SUGGESTION",
  "suggestion": {
    "status": "FEASIBLE",
    "solver": {
      "engine": "OR_TOOLS",
      "elapsedMs": 42,
      "objectiveDistanceMeters": 18450,
      "droppedStops": 0
    },
    "routes": []
  }
}
```

### Backend Save Target

```text
POST ${COLLECTIONS_API_URL}/collectors/routes/save
```

### Local Saved Routes

```text
GET /api/collectors/routes/saved
```

### Backend Saved Routes Target

```text
GET ${COLLECTIONS_API_URL}/collectors/routes/saved
```

## Validation Strategy

| Field | Validation |
| --- | --- |
| `collectorId` | Required from session. |
| `source` | Must be `ROUTE_SUGGESTION`. |
| `suggestion` | Required object; normalized before submit. |
| `savedRoute.id` | Required for rendered saved route cards. |
| `assignedCollectionRequestIds` | Array; fallback to empty array. |
| `status` | String; fallback to `UNKNOWN`. |
| `createdAt`, `updatedAt`, `closedAt` | Render defensively with fallbacks. |
| Stop address | Prefer street and number from stop/address fields; do not show raw address ID as the display address. |

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Unauthenticated user | Redirect to `/auth/login` | User must log in. |
| Non-collector user | Show access error or redirect home | Prevents generators from managing collector routes. |
| Missing collector ID | Show session/configuration error | Avoids invalid save payloads. |
| Missing `COLLECTIONS_API_URL` | Local route returns `500` config error | Failure is explicit. |
| Save backend error | Show inline error near save action | Suggestion remains visible. |
| Duplicate route/fingerprint | Show backend message or duplicate fallback | Collector understands route may already be saved. |
| Saved routes fetch error | Show page error and retry | Collector can retry without navigating away. |
| Empty/malformed suggestion in saved route | Render metadata only | Page remains usable. |
| Collection detail fetch error | Show modal error | Collector understands the detail could not be loaded. |

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Page route | `/routes/saved` | Pairs naturally with `/routes/suggest`. |
| Backend access | Local App Router proxies | Keeps backend URL server-side and matches existing API patterns. |
| Save source | Literal `ROUTE_SUGGESTION` | Matches provided contract and leaves room for future sources. |
| Saved after success | Disable save for current result | Prevents accidental duplicate save requests. |
| Vehicle details | Native `details` disclosure | Keeps the card scannable while preserving stop-level detail. |
| Tests | Lint and TypeScript gates | Project has no automated test framework configured. |

## Open Questions

- Should `GET /api/collectors/routes/saved` return only the authenticated collector's routes, or should the frontend include `collectorId` as a query param?

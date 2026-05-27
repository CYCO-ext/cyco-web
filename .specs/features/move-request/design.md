# Move Request Design

**Spec**: `.specs/features/move-request/spec.md`
**Status**: Implemented

---

## Architecture Overview

Add request-moving support to the saved routes workflow. The implementation follows the existing local API proxy pattern and updates the `/routes/saved` page in place after the backend returns the updated saved route.

Flow:

1. Collector opens `/routes/saved`.
2. Saved route cards render vehicle sections from `route.suggestion.routes`.
3. For an `OPEN` route, each stop can be moved to a different vehicle.
4. UI builds a move payload with:
   - `collectionRequestId`
   - `sourceVehicleIndex`
   - `targetVehicleIndex`
5. UI calls `POST /api/collectors/routes/saved/{savedRouteId}/move-request`.
6. Local proxy validates body and forwards to backend.
7. UI normalizes the updated saved route response.
8. UI replaces the matching route in local state and shows feedback.

## Code Reuse Analysis

| Existing Code | Location | Reuse |
| --- | --- | --- |
| Saved routes page | `src/app/routes/saved/page.tsx` | Route cards, vehicle sections, feedback pattern, auth/session handling. |
| Saved route normalization | `src/app/lib/routes.ts` | Existing `SavedRoute`, `normalizeSavedRoute`, `normalizeSavedRoutes`. |
| Delete saved route proxy | `src/app/api/collectors/routes/saved/[savedRouteId]/route.ts` | Proxy structure, parameter handling, backend error parsing. |
| Session metadata | `src/app/lib/createCollection.ts` | Token extraction for client fetch calls. |
| UI button helper | `src/app/components/ui.tsx` | Existing action button styling. |
| Icons | `lucide-react` | Drag/move/loading icons. |

## Components and Interfaces

### Move Request API Route

**Location**: `src/app/api/collectors/routes/saved/[savedRouteId]/move-request/route.ts`

Responsibilities:

- Read `savedRouteId` from route params.
- Parse and validate JSON body.
- Require:
  - non-empty `collectionRequestId`
  - integer `sourceVehicleIndex >= 0`
  - integer `targetVehicleIndex >= 0`
- Forward authorization header when present.
- POST to `${COLLECTIONS_API_URL}/collectors/routes/saved/${savedRouteId}/move-request`.
- Return backend JSON response on success.
- Return readable local/backend errors on failure.

### Move Helpers

**Location**: `src/app/lib/routes.ts`

Suggested additions:

```typescript
export interface MoveSavedRouteRequestPayload {
  collectionRequestId: string;
  sourceVehicleIndex: number;
  targetVehicleIndex: number;
}

export function buildMoveSavedRouteRequest(
  collectionRequestId: string,
  sourceVehicleIndex: number,
  targetVehicleIndex: number,
): { payload?: MoveSavedRouteRequestPayload; error?: string };
```

Responsibilities:

- Keep move payload construction consistent.
- Avoid requests where source and target are the same.
- Keep validation messages close to route domain logic.

### Saved Route Card Move UI

**Location**: `src/app/routes/saved/page.tsx`

Suggested state:

```typescript
type MoveRouteFeedback = {
  type: "success" | "error";
  message: string;
};

type DraggedStop = {
  savedRouteId: string;
  collectionRequestId: string;
  sourceVehicleIndex: number;
};
```

Suggested component props:

```typescript
onMoveRequest: (
  savedRouteId: string,
  collectionRequestId: string,
  sourceVehicleIndex: number,
  targetVehicleIndex: number,
) => void;
movePendingRouteId?: string;
```

Responsibilities:

- Mark stops draggable only when `route.status === "OPEN"` and no move/delete is pending.
- Track dragged stop at page or card level.
- Allow vehicle sections to receive drops.
- Highlight valid target vehicle areas.
- Disable delete and other move actions while a move is pending for that route.

## Drag-And-Drop Interaction

Use native browser drag events first, since the current app has no drag-and-drop library:

- `draggable` on stop cards.
- `onDragStart` stores route ID, collection request ID, and source vehicle index.
- `onDragOver` calls `event.preventDefault()` for valid drop targets.
- `onDragEnter`/`onDragLeave` toggles target highlighting.
- `onDrop` calls move handler when target vehicle differs from source.
- `onDragEnd` clears drag state.

Accessible fallback:

- Add a compact target-vehicle selector per movable stop.
- Options include every other vehicle in the same saved route.
- Selecting a target triggers the same move handler.
- Keep labels explicit, for example `Mover para veículo 2`.

## State Update Strategy

On move submit:

1. Validate source and target.
2. Set `movePendingRouteId` and clear previous move feedback.
3. POST to local route with JSON body.
4. Parse response JSON.
5. Normalize with `normalizeSavedRoute(data)[0]`.
6. If invalid, throw a readable error.
7. Replace the route in `routes` state:

```typescript
setRoutes((current) =>
  current.map((route) => route.id === updatedRoute.id ? updatedRoute : route)
);
```

8. Show success feedback.
9. Clear pending state in `finally`.

Important behavior:

- Preserve current route state on failure.
- Do not optimistically mutate route structure before backend success.
- If backend returns an updated route without `suggestion`, render the existing "Resumo da sugestão indisponível" fallback already present.

## UI Layout

- Keep saved route cards as the main layout.
- Add move affordances inside each vehicle `details` section near each stop.
- Use a small drag handle icon button/label and cursor styling for draggable stops.
- Drop target styling should be visible but restrained:
  - dashed border
  - light green background
  - "Soltar no veículo X" text only during drag hover
- Avoid turning the saved route page into a board layout; the current information-dense card layout should remain.

## Error Handling Strategy

| Scenario | Handling |
| --- | --- |
| Same source and target vehicle | Ignore move and clear drag state. |
| Missing saved route ID | Local API returns `400`. |
| Invalid request body | Local API returns `400`. |
| Backend rejects move | Show backend error when available. |
| Backend returns malformed updated route | Show error and keep existing route state. |
| Route is closed | Hide/disable move controls. |
| Move pending | Disable move/delete controls for that route. |

## Validation Strategy

- `npm run lint`
- `npm run build`
- Manual check moving a stop from vehicle 1 to vehicle 2.
- Manual check dropping onto the same vehicle does not call backend.
- Manual check moving into an empty vehicle section.
- Manual check closed routes do not expose move controls.
- Manual check failed backend response preserves current UI state.
- Manual keyboard/accessibility check using fallback selector.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Native drag-and-drop can be awkward on mobile | Provide the target-vehicle selector fallback. |
| Backend response may omit full suggestion details | Normalize defensively and keep existing missing-summary fallback. |
| Users may trigger delete while move is pending | Disable delete for the pending route. |
| Vehicle route array order may differ from vehicle indexes | Use `vehicleIndex` from each route, not array position. |
| Current saved route page is already large | Keep implementation localized and avoid broad refactors. |

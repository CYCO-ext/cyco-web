# Move Request Specification

## Problem Statement

Collectors can view saved route suggestions split by vehicle, but they cannot adjust which vehicle is responsible for a collection request after a route has been saved. They need a direct drag-and-drop style interaction to move a collection request between vehicles in an open saved route.

## Goals

- [x] Add a collector-only way to move a saved route collection request between vehicles.
- [x] Use the backend move endpoint for persisted route changes.
- [x] Present the interaction as drag-and-drop style inside saved route vehicle sections.
- [x] Keep saved route UI in sync with the backend response after a move.
- [x] Provide clear loading, error, and success feedback.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Reordering stops within the same vehicle | The endpoint only accepts source and target vehicle indexes. |
| Moving requests between different saved routes | The endpoint is scoped to one `savedRouteId`. |
| Editing vehicle count or capacity | This belongs to route planning, not saved route adjustment. |
| Route map visualization | Existing saved route page is list/detail based. |
| Generator access | Saved routes are collector-only in the current UI. |

---

## Assumptions

- The feature applies to collector users only.
- The move action is available only for saved routes with status `OPEN`.
- Vehicle indexes come from `suggestion.routes[].vehicleIndex`.
- A collection request can be moved by dragging a stop onto another vehicle area or by an accessible fallback control.
- The frontend should call a local proxy route:
  - `POST /api/collectors/routes/saved/{savedRouteId}/move-request`
- The local proxy forwards to the backend endpoint with JSON body:

```json
{
  "collectionRequestId": "req-001",
  "sourceVehicleIndex": 0,
  "targetVehicleIndex": 1
}
```

- The backend returns the updated saved route:

```json
{
  "id": "saved-route-001",
  "collectorId": "coll-001",
  "status": "OPEN",
  "assignedCollectionRequestIds": ["req-002", "req-001"],
  "updatedAt": "2026-05-15T14:30:00",
  "suggestion": {}
}
```

---

## Requirements

### MR-01: Move Saved Route Request Proxy

**User Story**: As the frontend, I want a local route handler for moving a saved route request so that the UI can call the backend through the existing proxy pattern.

**Acceptance Criteria**:

1. WHEN the client posts to `/api/collectors/routes/saved/{savedRouteId}/move-request` THEN the system SHALL forward the request to `${COLLECTIONS_API_URL}/collectors/routes/saved/{savedRouteId}/move-request`.
2. WHEN the request body is missing `collectionRequestId` THEN the system SHALL return a `400` error.
3. WHEN `sourceVehicleIndex` or `targetVehicleIndex` is missing or invalid THEN the system SHALL return a `400` error.
4. WHEN the backend returns success THEN the system SHALL return the updated saved route JSON.
5. WHEN the backend returns an error THEN the system SHALL preserve the status and return a readable error.

### MR-02: Move Request Payload and Response Normalization

**User Story**: As the saved routes page, I want typed helpers for move payloads and updated saved route responses so that route state updates are defensive.

**Acceptance Criteria**:

1. WHEN a move is requested THEN the payload SHALL include `collectionRequestId`, `sourceVehicleIndex`, and `targetVehicleIndex`.
2. WHEN source and target vehicle indexes are equal THEN the UI SHALL avoid making a backend request.
3. WHEN the backend returns a single updated saved route THEN the frontend SHALL normalize it with the existing saved route shape.
4. WHEN the normalized response is invalid THEN the UI SHALL show an error and preserve current state.

### MR-03: Drag-And-Drop Style Vehicle Move UI

**User Story**: As a collector, I want to drag a collection stop from one vehicle to another so that I can rebalance a saved route.

**Acceptance Criteria**:

1. WHEN a saved route is `OPEN` and has vehicle routes THEN each stop SHALL expose a drag affordance.
2. WHEN a stop is dragged over a different vehicle section THEN the target vehicle SHALL show a visible drop state.
3. WHEN a stop is dropped on a different vehicle THEN the UI SHALL call the move endpoint with the source and target vehicle indexes.
4. WHEN a route is not `OPEN` THEN move controls SHALL be disabled or hidden.
5. WHEN a vehicle has no stops THEN it SHALL still be a valid drop target.
6. WHEN the user cannot use drag-and-drop THEN an accessible fallback control SHALL allow selecting a target vehicle.

### MR-04: Move Feedback and State Sync

**User Story**: As a collector, I want immediate feedback when a move is saved so that I know whether the route was updated.

**Acceptance Criteria**:

1. WHEN a move request is pending THEN the moved stop or route card SHALL show a loading state.
2. WHEN the move succeeds THEN the saved route list SHALL replace the moved route with the normalized backend response.
3. WHEN the move succeeds THEN the page SHALL show success feedback.
4. WHEN the move fails THEN the page SHALL show error feedback and leave existing route state intact.
5. WHEN a move is pending THEN conflicting move/delete actions for that route SHALL be disabled.

---

## Edge Cases

- Route has no `suggestion`.
- Route has `suggestion.routes` but a vehicle has no stops.
- Source stop is dropped onto the same vehicle.
- Backend returns an updated route without full `suggestion` details.
- Backend returns `200 OK` with malformed JSON.
- A route is deleted while a move is pending.
- Collector session token is missing.
- Non-collector opens `/routes/saved`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MR-01 | Move Saved Route Request Proxy | Execute | Verified |
| MR-02 | Move Request Payload and Response Normalization | Execute | Verified |
| MR-03 | Drag-And-Drop Style Vehicle Move UI | Execute | Verified |
| MR-04 | Move Feedback and State Sync | Execute | Verified |

**Coverage:** 4 total, 4 implemented and verified.

---

## Success Criteria

- [x] Collectors can move a collection request between vehicles from `/routes/saved`.
- [x] The move action calls `POST /api/collectors/routes/saved/{savedRouteId}/move-request`.
- [x] The payload includes request ID, source vehicle index, and target vehicle index.
- [x] The saved route card updates from the backend response after success.
- [x] Failed moves show readable errors without corrupting route state.
- [x] `npm run lint` passes.
- [x] `npm run build` passes or blockers are documented.

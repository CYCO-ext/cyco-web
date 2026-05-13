# Delete Suggestion Specification

## Problem Statement

Collectors can save route suggestions and review them later, but they cannot delete saved suggestions from the saved routes page. This leaves outdated or unwanted route suggestions in the list and makes route management harder over time.

## Goals

- [x] Add a delete action for saved route suggestions.
- [x] Call `DELETE /api/collectors/routes/saved/{savedRouteId}`.
- [x] Handle `204 No Content` as a successful deletion.
- [x] Show delete loading, success, and error feedback.
- [x] Remove the deleted route from the saved routes list or reload the list after success.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Bulk deletion | This feature only deletes one saved route at a time. |
| Undo after delete | Backend restore semantics are not specified. |
| Deleting route suggestions before saving | This feature targets saved route suggestions only. |
| Route lifecycle close/reopen | Saved route lifecycle management is separate from deletion. |

---

## Assumptions

- `DELETE /api/collectors/routes/saved/{savedRouteId}` returns `204 No Content` on success.
- The local frontend route should live under `src/app/api/collectors/routes/saved/[savedRouteId]/route.ts`.
- The local route proxies to `${COLLECTIONS_API_URL}/collectors/routes/saved/${savedRouteId}`.
- The route handler forwards the optional `Authorization` header.
- Only collectors can access `/routes/saved`, so the delete action is collector-only by page access.
- A successful delete should remove the route from local state immediately; reloading the list is also acceptable if implementation prefers consistency.

---

## Requirements

### DS-01: Saved Route Delete Action

**User Story**: As a collector, I want to delete a saved route suggestion so that I can remove suggestions I no longer need.

**Acceptance Criteria**:

1. WHEN a collector views `/routes/saved` and a saved route card is rendered THEN the card SHALL show a delete button.
2. WHEN the delete action is in progress for a route THEN the delete button SHALL be disabled and show a pending state such as `Excluindo...`.
3. WHEN another saved route exists THEN only the route being deleted SHALL show the pending state.
4. WHEN the user is not a collector THEN the existing collector-only access behavior SHALL remain unchanged.

### DS-02: Delete Saved Route API Route

**User Story**: As the frontend, I want a local delete route so that saved route deletion can be proxied consistently with token forwarding.

**Acceptance Criteria**:

1. WHEN `DELETE /api/collectors/routes/saved/{savedRouteId}` is called THEN the route SHALL validate that `savedRouteId` exists.
2. WHEN `COLLECTIONS_API_URL` is missing THEN the route SHALL return a `500` JSON error.
3. WHEN authorization is present on the incoming request THEN the route SHALL forward it.
4. WHEN the backend returns `204 No Content` THEN the route SHALL return `204 No Content`.
5. WHEN the backend returns another successful status THEN the route SHALL return success without requiring a response body.
6. WHEN the backend returns an error THEN the route SHALL forward the backend status and payload when available.

### DS-03: Delete Feedback and List Update

**User Story**: As a collector, I want clear feedback after deleting a saved route so that I know whether the action worked.

**Acceptance Criteria**:

1. WHEN delete succeeds THEN the deleted route SHALL no longer appear in the list.
2. WHEN delete succeeds THEN the page SHALL show success feedback.
3. WHEN delete fails THEN the page SHALL show an error message and keep the route visible.
4. WHEN deleting the last route succeeds THEN the existing empty state SHALL render.
5. WHEN refresh is triggered after delete THEN existing loading and error states SHALL remain coherent.

---

## Edge Cases

- Missing `savedRouteId` in the API route.
- Backend returns `204 No Content` with no body.
- Backend returns `200 OK` with or without a body.
- Backend returns an error with an empty body.
- User clicks delete twice quickly.
- Delete succeeds but a subsequent list reload fails.
- Deleted route is currently expanded in a `<details>` section.
- Collection details modal is open while a saved route is deleted.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DS-01 | Saved Route Delete Action | Execute | Verified |
| DS-02 | Delete Saved Route API Route | Execute | Verified |
| DS-03 | Delete Feedback and List Update | Execute | Verified |

**Coverage:** 3 total, 3 implemented and verified.

---

## Success Criteria

- [x] Saved route cards show a delete button.
- [x] Clicking delete calls `DELETE /api/collectors/routes/saved/{savedRouteId}`.
- [x] `204 No Content` is treated as success.
- [x] Deleted routes are removed from the list.
- [x] Failed delete shows a recoverable error.
- [x] Deleting the last route shows the empty state.
- [x] `npm run lint` passes.
- [x] `npm run build` passes or blockers are documented.

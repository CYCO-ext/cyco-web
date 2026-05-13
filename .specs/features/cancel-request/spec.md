# Cancel Request Specification

## Problem Statement

Users can accept, reject, and finish collection requests, but they cannot cancel an active request from the collection list. Generators and collectors both need a controlled way to cancel collection requests that are still pending or in progress.

## Goals

- [x] Add a cancel action for generators and collectors on pending collections.
- [x] Add a cancel action for generators and collectors on in-progress collections.
- [x] Call the role-specific collector cancel endpoint with `collectorId`.
- [x] Call the role-specific generator cancel endpoint with `generatorId`.
- [x] Show cancel loading, success, and error feedback.
- [x] Refresh the collection list after successful cancellation.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Cancellation reason input | The requested endpoint body only includes actor ID. |
| Cancellation confirmation modal | Not required by the request; can be added later if product needs extra friction. |
| Canceled status filter changes | Existing status filters already include canceled states. |
| Bulk cancellation | This feature is card-level only. |

---

## Assumptions

- `POST /api/collectors/requests/{requestId}/cancel` returns `200 OK` on success.
- `POST /api/generators/requests/{requestId}/cancel` returns `200 OK` on success.
- Collector cancellation payload is JSON: `{ "collectorId": "<collector id>" }`.
- Generator cancellation payload is JSON: `{ "generatorId": "<generator id>" }`.
- The current authenticated user ID is available through `getSessionMeta(session).generatorId`, as existing collection logic uses that field for both generator and collector role queries.
- The local frontend routes should live under:
  - `src/app/api/collectors/requests/[requestId]/cancel/route.ts`
  - `src/app/api/generators/requests/[requestId]/cancel/route.ts`
- The route handlers forward the optional `Authorization` header.
- The backend base URL for these collection actions remains `COLLECTIONS_API_URL`.

---

## Requirements

### CR-01: Role-Based Pending and In-Progress Cancel Action

**User Story**: As a generator or collector, I want to cancel pending or in-progress collection requests so that I can stop a request that should no longer proceed.

**Acceptance Criteria**:

1. WHEN a generator views a collection with `status === "PENDING"` or `status === "IN_PROGRESS"` THEN the collection card SHALL show a cancel button.
2. WHEN a collector views a collection with `status === "PENDING"` or `status === "IN_PROGRESS"` THEN the collection card SHALL show a cancel button.
3. WHEN a collection is `COMPLETED`, `CANCELED`, `CANCELLED`, or an unknown status THEN the cancel button SHALL NOT be shown.
4. WHEN any card action is in progress THEN cancel SHALL be disabled for that collection.
5. WHEN cancel is in progress THEN the button SHALL show a pending label such as `Cancelando...`.

### CR-02: Collector Cancel API Route

**User Story**: As the frontend, I want a local collector cancel route so that collector cancellation can be proxied consistently with auth forwarding.

**Acceptance Criteria**:

1. WHEN `POST /api/collectors/requests/{requestId}/cancel` is called THEN the route SHALL validate `requestId`.
2. WHEN the JSON body is missing `collectorId` THEN the route SHALL return a `400` JSON error.
3. WHEN `COLLECTIONS_API_URL` is missing THEN the route SHALL return a `500` JSON error.
4. WHEN authorization is present on the incoming request THEN the route SHALL forward it.
5. WHEN the backend is called THEN the route SHALL send `Content-Type: application/json` and body `{ "collectorId": "<collector id>" }`.
6. WHEN the backend returns success THEN the route SHALL return `200 OK`.
7. WHEN the backend returns an error THEN the route SHALL forward the backend status and payload when available.

### CR-03: Generator Cancel API Route

**User Story**: As the frontend, I want a local generator cancel route so that generator cancellation can be proxied consistently with auth forwarding.

**Acceptance Criteria**:

1. WHEN `POST /api/generators/requests/{requestId}/cancel` is called THEN the route SHALL validate `requestId`.
2. WHEN the JSON body is missing `generatorId` THEN the route SHALL return a `400` JSON error.
3. WHEN `COLLECTIONS_API_URL` is missing THEN the route SHALL return a `500` JSON error.
4. WHEN authorization is present on the incoming request THEN the route SHALL forward it.
5. WHEN the backend is called THEN the route SHALL send `Content-Type: application/json` and body `{ "generatorId": "<generator id>" }`.
6. WHEN the backend returns success THEN the route SHALL return `200 OK`.
7. WHEN the backend returns an error THEN the route SHALL forward the backend status and payload when available.

### CR-04: Cancel Feedback and Refresh

**User Story**: As a user, I want clear feedback after canceling a request so that I know whether the cancellation worked.

**Acceptance Criteria**:

1. WHEN a user clicks cancel THEN the card SHALL show a pending state.
2. WHEN cancel succeeds THEN the page SHALL show success feedback and reload the collection list.
3. WHEN cancel fails THEN the page SHALL show an error message and keep the collection visible.
4. WHEN reload after success returns no matching collections THEN the existing empty state SHALL render.
5. WHEN accept, reject, finish, and cancel actions are available in different states THEN they SHALL share the same per-collection pending guard.

---

## Edge Cases

- Missing `requestId` in either local route.
- Missing actor ID in either local route body.
- Backend returns `204 No Content` even though documented success is `200 OK`.
- User clicks cancel while another action is pending.
- Collection status changes between render and click.
- Cancellation succeeds but list reload fails.
- Session role exists but actor ID is unavailable.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CR-01 | Role-Based Pending and In-Progress Cancel Action | Execute | Verified |
| CR-02 | Collector Cancel API Route | Execute | Verified |
| CR-03 | Generator Cancel API Route | Execute | Verified |
| CR-04 | Cancel Feedback and Refresh | Execute | Verified |

**Coverage:** 4 total, 4 implemented and verified.

---

## Success Criteria

- [x] Generators see cancel on pending and in-progress collection cards.
- [x] Collectors see cancel on pending and in-progress collection cards.
- [x] Cancel is hidden for completed, canceled, and unknown statuses.
- [x] Collector cancel posts `{ collectorId }` to `/api/collectors/requests/{requestId}/cancel`.
- [x] Generator cancel posts `{ generatorId }` to `/api/generators/requests/{requestId}/cancel`.
- [x] Successful cancel shows feedback and reloads collections.
- [x] Failed cancel shows a recoverable error.
- [x] `npm run lint` passes.
- [x] `npm run build` passes or blockers are documented.

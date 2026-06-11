# Collector On Way Specification

## Problem Statement

Collectors can accept, reject, cancel, and finish collection requests from `/collections`, but they do not have a clear action to tell the generator that they are on the way. This leaves the collection lifecycle without an explicit "collector is heading to the pickup" status, and it prevents generator-facing notifications from being triggered at the right moment.

## Goals

- [x] Add a collector-only action to mark a collection request as "on the way".
- [x] Show the action only for eligible collector collections.
- [x] Call `POST /collectors/requests/{requestId}/on-the-way` with `{ collectorId }`.
- [x] Add a local Next.js API route that proxies the action to `COLLECTIONS_API_URL`.
- [x] Show loading, success, and error feedback in `/collections`.
- [x] Refresh the collection list after success.
- [x] Preserve existing accept, reject, cancel, and finish behavior.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Sending push notifications directly from the frontend | The backend status transition should trigger notifications. |
| Changing route optimization or saved routes | This feature only marks collection status. |
| Generator-side on-way action | Only collectors can mark themselves on the way. |
| Map navigation or live tracking | This feature only updates status. |
| Bulk status updates | This feature is card-level only. |

---

## Assumptions

- The UI entry point is `src/app/collections/page.tsx`.
- Authenticated collector ID is available from `getSessionMeta(session).generatorId`, matching existing collector action patterns.
- Existing collection action state uses `actionPendingId`, `actionPendingKind`, and `actionFeedback`.
- Existing local API routes live under `src/app/api/collectors/requests/[requestId]/*`.
- The backend endpoint is `POST ${COLLECTIONS_API_URL}/collectors/requests/{requestId}/on-the-way`.
- The backend request body is JSON: `{ "collectorId": "<collector id>" }`.
- The action is expected to transition a collection from `IN_PROGRESS` to a backend status representing "collector on the way".
- If the backend reuses `IN_PROGRESS` and only records an event, the frontend should still refresh after success and show backend-returned status if present.
- This action is likely what should trigger the generator push notification feature for "Coletor está a caminho".

---

## User Stories

### P1: Collector Marks Collection as On the Way

**User Story**: As a collector, I want to mark an in-progress collection as on the way so that the generator knows I am heading to the pickup.

**Why P1**: This is the core requested behavior and the lifecycle trigger for generator notification.

**Acceptance Criteria**:

1. WHEN the authenticated user role is `WASTE_COLLECTOR` and a collection is eligible THEN the collection card SHALL show an "Estou a caminho" action.
2. WHEN the authenticated user role is `GENERATOR` THEN the action SHALL NOT be shown.
3. WHEN a collection is not eligible THEN the action SHALL NOT be shown.
4. WHEN any card action is already in progress for that collection THEN the on-way action SHALL be disabled.
5. WHEN the collector clicks the action THEN the button SHALL show a pending label such as `Avisando...`.
6. WHEN the action succeeds THEN the page SHALL show success feedback and refresh the collection list.
7. WHEN the action fails THEN the page SHALL show an error and keep the collection visible.

**Independent Test**: Mock a collector session with an eligible collection, click "Estou a caminho", and verify the local route is called with `{ collectorId }`.

---

### P1: Local API Route Proxy

**User Story**: As the frontend, I want a local API route for on-way updates so that token forwarding and backend URL handling stay consistent with other collector actions.

**Why P1**: Existing frontend APIs keep backend base URLs and auth forwarding server-side.

**Acceptance Criteria**:

1. WHEN `POST /api/collectors/requests/{requestId}/on-the-way` is called THEN the route SHALL validate `requestId`.
2. WHEN the JSON body is missing `collectorId` THEN the route SHALL return a `400` JSON error.
3. WHEN `COLLECTIONS_API_URL` is missing THEN the route SHALL return a `500` JSON error.
4. WHEN an `Authorization` header is present THEN the route SHALL forward it to the backend.
5. WHEN the backend is called THEN the route SHALL send `Content-Type: application/json` and body `{ "collectorId": "<collector id>" }`.
6. WHEN the backend returns success with JSON THEN the route SHALL return that JSON and status.
7. WHEN the backend returns `204` THEN the route SHALL return an empty `204` response.
8. WHEN the backend returns an error THEN the route SHALL preserve the backend status and readable error payload.

**Independent Test**: Call the local route with a request ID and collector ID and verify it proxies to the backend endpoint.

---

### P2: Status and Notification Alignment

**User Story**: As a generator, I want the "collector on the way" action to map to a readable status so that I can understand the collection state and receive the right notification.

**Why P2**: This feature connects directly to the push notification workflow.

**Acceptance Criteria**:

1. WHEN a collection is returned with the backend on-way status THEN the UI SHALL render a readable label such as `Coletor a caminho`.
2. WHEN a collection is already in the backend on-way status THEN the collector action SHALL NOT be shown again.
3. WHEN the backend status enum is not finalized THEN implementation SHALL add the known value and keep a defensive fallback label.
4. WHEN the backend status change triggers push notification delivery THEN the notification feature SHOULD use body text `Coletor está a caminho`.

**Independent Test**: Render a collection with the on-way status and verify the readable label appears and the action is hidden.

---

## Edge Cases

- WHEN the user is unauthenticated THEN existing page auth handling SHALL apply.
- WHEN the session has no collector ID THEN clicking the action SHALL show an error and not call the backend.
- WHEN a generator views the same collection THEN no on-way action SHALL be visible.
- WHEN the collection is `PENDING`, `COMPLETED`, `CANCELED`, `CANCELLED`, or unknown status THEN no on-way action SHALL be visible unless product explicitly changes eligibility.
- WHEN backend returns `204 No Content` THEN the local route SHALL not attempt to return a JSON body.
- WHEN another action is pending on the same card THEN the on-way action SHALL be disabled.
- WHEN the backend rejects a stale status transition THEN the UI SHALL show the backend error and allow refresh.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| COW-01 | P1: Collector Marks Collection as On the Way | Execute | Verified by lint/typecheck |
| COW-02 | P1: Local API Route Proxy | Execute | Verified by lint/typecheck |
| COW-03 | P2: Status and Notification Alignment | Execute | Verified by lint/typecheck |
| COW-04 | Edge cases and graceful error handling | Execute | Verified by lint/typecheck |

**Coverage:** 4 total, 4 implemented and verified by lint/typecheck. Manual browser/API verification remains recommended.

---

## Success Criteria

- [x] Eligible collector collection cards show an "Estou a caminho" action.
- [x] Generator users never see the collector on-way action.
- [x] Clicking the action posts `{ collectorId }` through a local API route.
- [x] The local route proxies to `POST ${COLLECTIONS_API_URL}/collectors/requests/{requestId}/on-the-way`.
- [x] Success feedback appears and the collection list refreshes.
- [x] Backend `204` success responses do not cause a frontend `500`.
- [x] Existing accept, reject, cancel, and finish actions still work.
- [x] `npm run lint` and `npx tsc --noEmit` pass after implementation.

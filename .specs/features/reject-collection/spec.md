# Reject Collection Specification

## Problem Statement

Collectors can accept pending collection requests from `/collections`, but they cannot explicitly reject requests that are not suitable for them. This leaves pending opportunities without a clear negative action and forces collectors to ignore requests instead of removing or declining them through the backend workflow.

## Goals

- [x] Add a reject action for collectors on pending collection cards.
- [x] Call `POST /api/collectors/requests/{requestId}/reject`.
- [x] Show reject loading, success, and error feedback.
- [x] Refresh the collections list after a successful rejection.
- [x] Keep the action hidden for generators and non-pending collections.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Reject reason input | The requested endpoint has no body contract. |
| Bulk rejection | This feature only adds card-level rejection. |
| Rejected status filter | Backend status behavior after rejection is not specified. |
| Confirmation modal | Not required by the request; can be added later if product wants friction. |

---

## Assumptions

- `POST /api/collectors/requests/{requestId}/reject` returns `200 OK` on success.
- The local frontend route should live under `src/app/api/collectors/requests/[requestId]/reject/route.ts`.
- The route handler forwards the optional `Authorization` header.
- The backend base URL for collection/collector request actions remains `COLLECTIONS_API_URL`.
- A successful rejection may remove the collection from the current search results or change its status; the page should reload after success.
- A collector can reject only requests with `status === "PENDING"`.

---

## Requirements

### RC-01: Collector-Only Pending Reject Action

**User Story**: As a collector, I want to reject pending collection requests so that I can decline work I do not want to accept.

**Acceptance Criteria**:

1. WHEN the authenticated user role is `WASTE_COLLECTOR` and a collection has `status === "PENDING"` THEN the collection card SHALL show a reject button.
2. WHEN the authenticated user role is `GENERATOR` THEN the reject button SHALL NOT be shown.
3. WHEN a collection status is not `PENDING` THEN the reject button SHALL NOT be shown.
4. WHEN a reject action is in progress THEN the reject and accept actions for that collection SHALL prevent duplicate submissions.

### RC-02: Reject API Route

**User Story**: As the frontend, I want a local API route for rejection so that token forwarding and backend URL handling stay consistent with other collection actions.

**Acceptance Criteria**:

1. WHEN `POST /api/collectors/requests/{requestId}/reject` is called THEN the route SHALL validate that `requestId` exists.
2. WHEN `COLLECTIONS_API_URL` is missing THEN the route SHALL return a `500` JSON error.
3. WHEN authorization is present on the incoming request THEN the route SHALL forward it.
4. WHEN the backend returns `200 OK` THEN the route SHALL return `200 OK`.
5. WHEN the backend returns an error THEN the route SHALL forward the backend error status and payload when available.

### RC-03: Reject Feedback and Refresh

**User Story**: As a collector, I want clear feedback after rejecting a request so that I know whether the action worked.

**Acceptance Criteria**:

1. WHEN a collector clicks reject THEN the card SHALL show a pending state such as `Rejeitando...`.
2. WHEN reject succeeds THEN the page SHALL show success feedback and reload the collection list.
3. WHEN reject fails THEN the page SHALL show an error message and keep the collection visible.
4. WHEN the reload after success returns no results THEN the existing empty state SHALL render.
5. WHEN accept and reject are both available THEN they SHALL share the same per-collection pending guard.

---

## Edge Cases

- Missing `requestId` in the API route.
- Backend returns `204 No Content` even though the documented success is `200 OK`.
- Backend returns a text or empty body on error.
- User clicks reject while accept is already pending.
- Rejection succeeds but list reload fails.
- Collection becomes non-pending between render and click.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RC-01 | Collector-Only Pending Reject Action | Execute | Verified |
| RC-02 | Reject API Route | Execute | Verified |
| RC-03 | Reject Feedback and Refresh | Execute | Verified |

**Coverage:** 3 total, 3 implemented and verified.

---

## Success Criteria

- [x] Pending collection cards show reject only for collectors.
- [x] Reject is hidden for generators and non-pending collections.
- [x] Clicking reject calls `POST /api/collectors/requests/{requestId}/reject`.
- [x] Successful reject shows feedback and reloads collections.
- [x] Failed reject shows a recoverable error.
- [x] `npm run lint` passes.
- [x] `npm run build` passes or blockers are documented.

# Reject Collection Tasks

**Spec**: `.specs/features/reject-collection/spec.md`
**Design**: `.specs/features/reject-collection/design.md`
**Status**: Done
**Created:** 2026-05-13
**Completed:** 2026-05-13

**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npm run build` initially failed in the sandbox because Next.js could not fetch Google Fonts, then passed after network access was allowed.

**Implementation notes:**

- Added `/api/collectors/requests/[requestId]/reject`, which proxies to `POST ${COLLECTIONS_API_URL}/collectors/requests/[requestId]/reject`.
- Added collector-only reject behavior to pending `/collections` cards.
- Reused the collection card feedback model and added action kind tracking so accept, reject, and finish labels stay accurate while pending.

## Execution Plan

```text
T1 -> T2 -> T3 -> T4
```

This is a medium feature: one route handler, one page action, one card UI update, and final verification.

---

## Task Breakdown

### T1: Add Collector Reject API Route

**What**: Create the local route handler that proxies collector request rejection to the backend.
**Where**: `src/app/api/collectors/requests/[requestId]/reject/route.ts`
**Depends on**: None
**Reuses**: `src/app/api/collections/requests/[id]/accept/route.ts` route-handler structure.
**Requirement**: RC-02

**Done when**:

- [x] `POST /api/collectors/requests/[requestId]/reject` exists.
- [x] Missing `COLLECTIONS_API_URL` returns a `500` JSON error.
- [x] Missing `requestId` returns a `400` JSON error.
- [x] The route forwards `Authorization` when present.
- [x] The route calls `${COLLECTIONS_API_URL}/collectors/requests/${requestId}/reject`.
- [x] `200 OK` succeeds even when the backend returns no body.
- [x] Backend errors are forwarded with status and payload when available.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual route behavior or future route-handler test when test infrastructure exists.
**Gate**: quick

---

### T2: Add Reject Action State and Handler

**What**: Add the reject click handler to `/collections` using the existing action pending and feedback patterns.
**Where**: `src/app/collections/page.tsx`
**Depends on**: T1
**Reuses**: Existing `handleAccept`, `actionPendingId`, `actionFeedback`, `loadCollections`, and auth header logic.
**Requirement**: RC-03

**Done when**:

- [x] `handleReject(collectionId)` posts to `/api/collectors/requests/${collectionId}/reject`.
- [x] The request forwards bearer authorization when available.
- [x] Pending state is stored in `actionPendingId`.
- [x] Success feedback says the collection was rejected.
- [x] The list reloads after success.
- [x] Error feedback uses backend `error` text when available and falls back to `Erro ao rejeitar coleta.`
- [x] Pending state clears in `finally`.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual click flow with mocked or real pending collection.
**Gate**: quick

---

### T3: Render Collector-Only Pending Reject Button

**What**: Show a reject button on pending collection cards for collectors only.
**Where**: `src/app/collections/page.tsx`
**Depends on**: T2
**Reuses**: Existing `isAcceptEligible`, `showAccept`, `actionPending`, and `button()` styling.
**Requirement**: RC-01, RC-03

**Done when**:

- [x] Reject button appears only when `viewerRole === "WASTE_COLLECTOR"` and `collection.status === "PENDING"`.
- [x] Reject button does not appear for generators.
- [x] Reject button does not appear for `IN_PROGRESS`, `COMPLETED`, `CANCELED`, or unknown statuses.
- [x] Accept and reject are both disabled while one action is pending for the collection.
- [x] Reject button label changes to `Rejeitando...` while pending.
- [x] Existing accept and finish behavior remains unchanged.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual role/status matrix on `/collections`.
**Gate**: quick

---

### T4: Verify Build and Update TLC State

**What**: Run final verification and update feature tracking after implementation.
**Where**:

- `.specs/features/reject-collection/spec.md`
- `.specs/features/reject-collection/tasks.md`
- `.specs/project/STATE.md`

**Depends on**: T1, T2, T3
**Reuses**: Gate guidance from `.specs/codebase/TESTING.md`.
**Requirement**: RC-01, RC-02, RC-03

**Done when**:

- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npm run build` passes or blockers are documented.
- [x] Requirement traceability in `spec.md` is updated as tasks complete.
- [x] `STATE.md` records endpoint/path decisions and any blockers.
- [x] Manual verification notes cover collector pending visibility, generator hidden state, success refresh, and failure feedback.

**Tests**: Lint, build, manual UI verification.
**Gate**: build

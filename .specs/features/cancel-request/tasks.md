# Cancel Request Tasks

**Spec**: `.specs/features/cancel-request/spec.md`
**Design**: `.specs/features/cancel-request/design.md`
**Status**: Done
**Created:** 2026-05-13
**Completed:** 2026-05-13

**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npm run build` initially failed in the sandbox because Next.js could not fetch Google Fonts, then passed after network access was allowed.

**Implementation notes:**

- Added collector cancel proxy route at `/api/collectors/requests/[requestId]/cancel`.
- Added generator cancel proxy route at `/api/generators/requests/[requestId]/cancel`.
- Added role-aware cancel handling on `/collections`, sending `{ collectorId }` or `{ generatorId }` from the authenticated session.
- Added cancel button for `PENDING` and `IN_PROGRESS` cards for both supported viewer roles.

## Execution Plan

```text
T1 -> T2 -> T3 -> T4 -> T5
```

This is a medium feature: two route handlers, one role-aware page action, one card UI update, and final verification.

---

## Task Breakdown

### T1: Add Collector Cancel API Route

**What**: Create the local route handler that proxies collector cancellation to the backend.
**Where**: `src/app/api/collectors/requests/[requestId]/cancel/route.ts`
**Depends on**: None
**Reuses**: `src/app/api/collectors/requests/[requestId]/reject/route.ts`
**Requirement**: CR-02

**Done when**:

- [x] `POST /api/collectors/requests/[requestId]/cancel` exists.
- [x] Missing `COLLECTIONS_API_URL` returns a `500` JSON error.
- [x] Missing `requestId` returns a `400` JSON error.
- [x] Missing `collectorId` returns a `400` JSON error.
- [x] The route forwards `Authorization` when present.
- [x] The route calls `${COLLECTIONS_API_URL}/collectors/requests/${requestId}/cancel`.
- [x] The route sends JSON body `{ collectorId }`.
- [x] Success works even when the backend returns no body.
- [x] Backend errors are forwarded with status and payload when available.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual route behavior or future route-handler test when test infrastructure exists.
**Gate**: quick

---

### T2: Add Generator Cancel API Route

**What**: Create the local route handler that proxies generator cancellation to the backend.
**Where**: `src/app/api/generators/requests/[requestId]/cancel/route.ts`
**Depends on**: None
**Reuses**: Collector cancel route from T1.
**Requirement**: CR-03

**Done when**:

- [x] `POST /api/generators/requests/[requestId]/cancel` exists.
- [x] Missing `COLLECTIONS_API_URL` returns a `500` JSON error.
- [x] Missing `requestId` returns a `400` JSON error.
- [x] Missing `generatorId` returns a `400` JSON error.
- [x] The route forwards `Authorization` when present.
- [x] The route calls `${COLLECTIONS_API_URL}/generators/requests/${requestId}/cancel`.
- [x] The route sends JSON body `{ generatorId }`.
- [x] Success works even when the backend returns no body.
- [x] Backend errors are forwarded with status and payload when available.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual route behavior or future route-handler test when test infrastructure exists.
**Gate**: quick

---

### T3: Add Role-Aware Cancel Handler

**What**: Add the cancel click handler to `/collections` using the existing action pending and feedback patterns.
**Where**: `src/app/collections/page.tsx`
**Depends on**: T1, T2
**Reuses**: Existing `handleReject`, `handleFinish`, `actionPendingId`, `actionFeedback`, `loadCollections`, and auth header logic.
**Requirement**: CR-04

**Done when**:

- [x] `handleCancel(collectionId)` selects the collector endpoint when `viewerRole === "WASTE_COLLECTOR"`.
- [x] `handleCancel(collectionId)` selects the generator endpoint when `viewerRole === "GENERATOR"`.
- [x] Collector requests send `{ collectorId: sessionMeta.generatorId }`.
- [x] Generator requests send `{ generatorId: sessionMeta.generatorId }`.
- [x] The request forwards bearer authorization when available.
- [x] Pending state is stored with action kind `cancel`.
- [x] Success feedback says the collection was canceled.
- [x] The list reloads after success.
- [x] Error feedback uses backend `error` text when available and falls back to `Erro ao cancelar coleta.`
- [x] Pending state clears in `finally`.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual click flow for generator and collector roles.
**Gate**: quick

---

### T4: Render Cancel Button for Eligible Statuses

**What**: Show a cancel button on pending and in-progress collection cards for generators and collectors.
**Where**: `src/app/collections/page.tsx`
**Depends on**: T3
**Reuses**: Existing card action layout and action pending guard.
**Requirement**: CR-01, CR-04

**Done when**:

- [x] Cancel appears when `viewerRole === "GENERATOR"` and status is `PENDING` or `IN_PROGRESS`.
- [x] Cancel appears when `viewerRole === "WASTE_COLLECTOR"` and status is `PENDING` or `IN_PROGRESS`.
- [x] Cancel does not appear for `COMPLETED`, `CANCELED`, `CANCELLED`, or unknown statuses.
- [x] Cancel is disabled while any action is pending for the collection.
- [x] Cancel button label changes to `Cancelando...` while pending.
- [x] Existing accept, reject, and finish behavior remains unchanged.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual role/status matrix on `/collections`.
**Gate**: quick

---

### T5: Verify Build and Update TLC State

**What**: Run final verification and update feature tracking after implementation.
**Where**:

- `.specs/features/cancel-request/spec.md`
- `.specs/features/cancel-request/tasks.md`
- `.specs/project/STATE.md`

**Depends on**: T1, T2, T3, T4
**Reuses**: Gate guidance from `.specs/codebase/TESTING.md`.
**Requirement**: CR-01, CR-02, CR-03, CR-04

**Done when**:

- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npm run build` passes or blockers are documented.
- [x] Requirement traceability in `spec.md` is updated as tasks complete.
- [x] `STATE.md` records endpoint/path/body decisions and any blockers.
- [x] Manual verification notes cover generator cancel, collector cancel, hidden states, success refresh, and failure feedback.

**Tests**: Lint, build, manual UI verification.
**Gate**: build

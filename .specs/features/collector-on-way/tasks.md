# Collector On Way Tasks

**Spec**: `.specs/features/collector-on-way/spec.md`
**Design**: `.specs/features/collector-on-way/design.md`
**Status**: Done
**Completed:** 2026-06-11

**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npx tsc --noEmit` passed.
- Manual browser/API verification was not run in this turn.

---

## Execution Plan

### Phase 1: API Proxy

```text
T1
```

### Phase 2: UI Integration

```text
T1 -> T2 -> T3
```

### Phase 3: Status Alignment and Verification

```text
T2 + T3 -> T4 -> T5
```

---

## Task Breakdown

### T1: Add Collector On-Way API Route

**What**: Create the local route handler that proxies collector on-way status updates to the backend.
**Where**: `src/app/api/collectors/requests/[requestId]/on-the-way/route.ts`
**Depends on**: Backend endpoint `POST /collectors/requests/{requestId}/on-the-way`.
**Reuses**: `src/app/api/collectors/requests/[requestId]/cancel/route.ts`, `src/app/api/collectors/requests/[requestId]/reject/route.ts`.
**Requirement**: COW-02, COW-04

**Done when**:

- [x] `POST /api/collectors/requests/[requestId]/on-the-way` exists.
- [x] The route validates `COLLECTIONS_API_URL`.
- [x] The route validates `requestId`.
- [x] The route validates a non-empty `collectorId` body field.
- [x] The route forwards `Authorization` when present.
- [x] The route calls `${COLLECTIONS_API_URL}/collectors/requests/${requestId}/on-the-way`.
- [x] The route sends exactly `{ collectorId }` in the backend body.
- [x] Backend `204` success returns local `204` with no JSON body.
- [x] Backend JSON success is preserved.
- [x] Backend errors preserve status and readable payload.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual or route-level test for success, missing collector ID, missing request ID, backend error, and backend `204`.
**Gate**: quick

---

### T2: Add On-Way Action Handler to Collections Page

**What**: Add collector on-way submission logic to `/collections` using the existing action pending and feedback patterns.
**Where**: `src/app/collections/page.tsx`
**Depends on**: T1
**Reuses**: `handleReject`, `handleCancel`, `handleFinish`, `actionPendingId`, `actionPendingKind`, `actionFeedback`, `loadCollections`, `getApiError`.
**Requirement**: COW-01, COW-04

**Done when**:

- [x] `CollectionActionKind` includes `on-way`.
- [x] `handleMarkOnWay(collectionId)` posts to `/api/collectors/requests/${collectionId}/on-the-way`.
- [x] Request body is `{ collectorId: sessionMeta.generatorId }`.
- [x] Authorization header is sent when `sessionMeta.token` exists.
- [x] Missing collector ID shows a recoverable error and does not call the route.
- [x] Pending state prevents duplicate submissions for the card.
- [x] Success feedback says the generator was notified or the collector is on the way.
- [x] Success refreshes the collection list.
- [x] Failure feedback shows backend error or fallback message.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual click test with eligible collector collection.
**Gate**: quick

---

### T3: Render Collector On-Way Button

**What**: Show the "Estou a caminho" action only for eligible collector collection cards.
**Where**: `src/app/collections/page.tsx`
**Depends on**: T2
**Reuses**: Existing `CollectionCard` action layout and `isFinishEligible`/`isCancelEligible` helper style.
**Requirement**: COW-01, COW-04

**Done when**:

- [x] Add `isOnWayEligible(collection)` helper.
- [x] Button appears only when `viewerRole === "WASTE_COLLECTOR"` and the collection is eligible.
- [x] Button does not appear for generator users.
- [x] Button does not appear for pending, completed, canceled, already-on-way, or unknown statuses.
- [x] Button is disabled while any action is pending for the collection.
- [x] Pending label is `Avisando...`.
- [x] Idle label is `Estou a caminho`.
- [x] Existing accept, reject, cancel, and finish buttons remain available under their current rules.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual render check for collector and generator roles across statuses.
**Gate**: quick

---

### T4: Add On-Way Status Label and Eligibility Guard

**What**: Add readable labels and guard behavior for the backend on-way status.
**Where**: `src/app/lib/collectionsPage.ts`, `src/app/collections/page.tsx`
**Depends on**: T3
**Reuses**: Existing `statusLabel` mapping and status helper patterns.
**Requirement**: COW-03, COW-04

**Done when**:

- [ ] Confirm backend status enum for on-way.
- [x] Support candidate on-way status values `COLLECTOR_ON_THE_WAY` and `ON_THE_WAY`.
- [x] Add readable status label such as `Coletor a caminho`.
- [x] `isOnWayEligible` excludes already-on-way status.
- [x] Unknown statuses continue to render with fallback behavior.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual render check with backend on-way status payload.
**Gate**: quick

---

### T5: Final Verification and Spec Update

**What**: Verify implementation and update traceability after execution.
**Where**: `.specs/features/collector-on-way/spec.md`, `.specs/features/collector-on-way/tasks.md`, optionally `.specs/project/STATE.md`
**Depends on**: T1, T2, T3, T4
**Reuses**: Existing TLC completion pattern from collection action feature specs.
**Requirement**: COW-01, COW-02, COW-03, COW-04

**Done when**:

- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npx tsc --noEmit` passes or blockers are documented.
- [ ] Manual check verifies collector-only visibility.
- [ ] Manual check verifies body `{ collectorId }`.
- [ ] Manual check verifies backend `204` success does not return local `500`.
- [ ] Manual check verifies success feedback and collection refresh.
- [ ] Manual check verifies existing accept/reject/cancel/finish actions still work.
- [x] Requirement traceability moves from Planned to Verified after implementation.
- [x] Tasks status is updated from Draft to Done after implementation.

**Tests**: Lint, typecheck, route behavior, and manual UI action checks.
**Gate**: full

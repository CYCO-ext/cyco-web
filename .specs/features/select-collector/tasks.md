# Select Collector Tasks

**Design**: `.specs/features/select-collector/design.md`
**Status**: Done

**Completed:** 2026-05-09

**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npm run build` passed after network access was allowed for `next/font` Google font fetching.

**Implementation notes:**

- Create collection now extracts the created request ID and navigates to `/collections/[id]/collectors`.
- Nearby collectors are loaded through `/api/collections/requests/[id]/collectors`.
- Collector selection is submitted through `/api/collections/requests/[id]/select-collector` with exactly `{ collectorId }`.
- Collector response normalization is defensive because the backend response shape was not provided.

---

## Execution Plan

### Phase 1: Foundation

```text
T1 -> T2
```

### Phase 2: API Routes

```text
T2 -> T3
T2 -> T4
```

### Phase 3: UI Flow

```text
T3 + T4 -> T5 -> T6 -> T7
```

### Phase 4: Verification

```text
T7 -> T8
```

---

## Task Breakdown

### T1: Add Select Collector Types and Helpers

**What**: Define request ID extraction, collector normalization, and selection payload helpers.
**Where**: `src/app/lib/selectCollector.ts`
**Depends on**: None
**Reuses**: Type helper style from `src/app/lib/createCollection.ts`
**Requirement**: SC-01, SC-02, SC-03, SC-05

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] `CreatedCollectionResponse`, `CollectorOption`, and `SelectCollectorRequest` types are exported.
- [ ] `extractCollectionRequestId(response)` returns the created request ID from known response fields.
- [ ] `normalizeCollectors(response)` returns `CollectorOption[]` with stable IDs.
- [ ] Invalid or missing collector IDs are filtered out.
- [ ] Gate check passes: `npm run lint`.
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; manually inspect helper signatures and fallback fields.

---

### T2: Navigate From Create Collection Success

**What**: Update create collection success handling to navigate to collector selection using the created request ID.
**Where**: `src/app/collections/new/page.tsx`
**Depends on**: T1
**Reuses**: Existing create collection submit flow and success modal state.
**Requirement**: SC-01, SC-05

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] Successful create request extracts request ID from API response.
- [ ] Missing request ID shows an actionable error and does not navigate.
- [ ] Valid request ID navigates to `/collections/[id]/collectors`.
- [ ] Existing create request validation remains intact.
- [ ] Gate check passes: `npm run lint`.
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; manually submit with a mocked response containing an ID and verify navigation target.

---

### T3: Add Nearby Collectors API Route

**What**: Create the route handler that fetches nearby collectors for a request.
**Where**: `src/app/api/collections/requests/[id]/collectors/route.ts`
**Depends on**: T2
**Reuses**: API proxy patterns from `src/app/api/collections/request/route.ts`
**Requirement**: SC-02, SC-05

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] `GET /api/collections/requests/:id/collectors` validates the request ID.
- [ ] Route calls `GET ${COLLECTIONS_API_URL}/generators/requests/:id/collectors`.
- [ ] Route normalizes the backend response into collector options.
- [ ] Backend errors return useful JSON and status.
- [ ] Authorization header is forwarded when present.
- [ ] Gate check passes: `npm run lint`.
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; optionally call the route against the configured backend.

---

### T4: Add Select Collector API Route

**What**: Create the route handler that submits the selected collector.
**Where**: `src/app/api/collections/requests/[id]/select-collector/route.ts`
**Depends on**: T2
**Reuses**: API proxy patterns from `src/app/api/collections/request/route.ts`
**Requirement**: SC-03, SC-05

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] `POST /api/collections/requests/:id/select-collector` validates request ID and `collectorId`.
- [ ] Route calls `POST ${COLLECTIONS_API_URL}/collectors/requests/:id/select`.
- [ ] Route sends exactly `{ collectorId }` in the backend request body.
- [ ] Backend errors return useful JSON and status.
- [ ] Authorization header is forwarded when present.
- [ ] Gate check passes: `npm run lint`.
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; optionally post a sample body against the configured backend.

---

### T5: Create Select Collector Page Shell

**What**: Add the generator-only page shell with loading, empty, error, and retry states.
**Where**: `src/app/collections/[id]/collectors/page.tsx`
**Depends on**: T3, T4
**Reuses**: `Header`, `Sidebar`, `button`, `getSessionMeta`
**Requirement**: SC-02, SC-04, SC-05

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] Page reads request ID from route params.
- [ ] Page redirects unauthenticated users to `/auth/login`.
- [ ] Page blocks non-generator users.
- [ ] Page fetches nearby collectors from the local API route.
- [ ] Loading, empty, error, and retry states render without overlap.
- [ ] Gate check passes: `npm run lint`.
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; manually open `/collections/sample-id/collectors`.

---

### T6: Implement Collector Selection UI

**What**: Render selectable collector cards and store the selected collector ID.
**Where**: `src/app/collections/[id]/collectors/page.tsx`
**Depends on**: T5
**Reuses**: Existing dashboard/card Tailwind patterns.
**Requirement**: SC-02, SC-03, SC-04

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] Collector cards render best available label and optional details.
- [ ] Selecting a collector visually distinguishes it.
- [ ] Selection stores backend collector ID.
- [ ] Partial collector data does not break rendering.
- [ ] Mobile and desktop layouts remain usable.
- [ ] Gate check passes: `npm run lint`.
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; inspect page with mocked/real collectors.

---

### T7: Implement Select Submit and Success State

**What**: Submit selected collector and show success/failure feedback.
**Where**: `src/app/collections/[id]/collectors/page.tsx`
**Depends on**: T6
**Reuses**: Select collector API route from T4 and `button` styles.
**Requirement**: SC-03, SC-05

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] Confirm button blocks submit when no collector is selected.
- [ ] Submit posts `{ collectorId }` to local select route.
- [ ] Pending state disables duplicate submits.
- [ ] Success state confirms collector selection and offers dashboard navigation.
- [ ] Failure state preserves selected collector and shows an actionable error.
- [ ] Gate check passes: `npm run lint`.
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; submit a selected collector with mocked/real backend response.

---

### T8: Build Verification and TLC State Update

**What**: Run final verification and update TLC feature/project state.
**Where**: `.specs/features/select-collector/tasks.md`, `.specs/project/STATE.md`, `.specs/project/ROADMAP.md`
**Depends on**: T7
**Reuses**: Gate guidance from `.specs/codebase/TESTING.md`
**Requirement**: SC-01, SC-02, SC-03, SC-04, SC-05

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [ ] `npm run lint` passes or existing warnings are documented.
- [ ] `npm run build` passes or blockers are documented.
- [ ] Manual verification covers navigation, collector list, selection, submit, success, and error states.
- [ ] Tasks and STATE are updated with completion/blockers.
- [ ] Test count: 0 automated tests exist currently unless a test stack is added.

**Tests**: none
**Gate**: build

**Verify**:
Run `npm run lint` and `npm run build`; expected result is both pass before marking the feature done.

---

## Parallel Execution Map

```text
Phase 1:
  T1 -> T2

Phase 2:
  T2 complete, then:
    T3
    T4

Phase 3:
  T3 + T4 -> T5 -> T6 -> T7

Phase 4:
  T7 -> T8
```

No tasks are marked `[P]` in this draft because implementation touches a small shared workflow and the user has not requested sub-agent execution. T3 and T4 are the best candidates for parallel implementation later because they touch separate route files.

## Pre-Approval Checks

### Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Add Select Collector Types and Helpers | One helper module | OK |
| T2: Navigate From Create Collection Success | One page flow update | OK |
| T3: Add Nearby Collectors API Route | One endpoint | OK |
| T4: Add Select Collector API Route | One endpoint | OK |
| T5: Create Select Collector Page Shell | One page shell | OK |
| T6: Implement Collector Selection UI | One page UI slice | OK |
| T7: Implement Select Submit and Success State | One submit/success slice | OK |
| T8: Build Verification and State Update | Verification/docs | OK |

### Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | None | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T2 | T2 -> T4 | Match |
| T5 | T3, T4 | T3 + T4 -> T5 | Match |
| T6 | T5 | T5 -> T6 | Match |
| T7 | T6 | T6 -> T7 | Match |
| T8 | T7 | T7 -> T8 | Match |

### Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Utility/types | none currently established | none | OK |
| T2 | Page/component | E2E recommended, no framework configured | none | OK for current matrix |
| T3 | API route handler | integration recommended, no framework configured | none | OK for current matrix |
| T4 | API route handler | integration recommended, no framework configured | none | OK for current matrix |
| T5 | Page/component | E2E recommended, no framework configured | none | OK for current matrix |
| T6 | Page/component | component/E2E recommended, no framework configured | none | OK for current matrix |
| T7 | Page/component + submit flow | E2E recommended, no framework configured | none | OK for current matrix |
| T8 | Verification/docs | none | none | OK |

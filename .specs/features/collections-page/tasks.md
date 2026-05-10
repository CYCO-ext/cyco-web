# Collections Page Tasks

**Design**: `.specs/features/collections-page/design.md`
**Status**: Done

**Completed:** 2026-05-09

**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npm run build` passed after network access was allowed for `next/font` Google font fetching.

**Implementation notes:**

- Added `/api/collections/search`, which proxies to `GET ${COLLECTIONS_API_URL}/collections/search`.
- Added `/collections`, which derives `generatorId` or `collectorId` from the authenticated session.
- Added status filter controls and collection cards for the provided response shape.
- Implemented role-based opposite-party profile details and collector quick accept.
- Added `/api/waste-collector/[id]`, which proxies to `GET ${BASE_API_URL}/waste-collector/[id]`.
- Added `/api/collections/requests/[id]/accept`, which proxies to `POST ${COLLECTIONS_API_URL}/collections/requests/[id]/accept`.
- Updated `/collections` to enrich cards with counterpart profiles and hide own-party profile information.
- Added collector-only quick accept button with pending, success, error, and refresh behavior.
- Restricted quick accept to pending collections only.
- Added generator and collector finish confirmation routes for in-progress collections.
- Added finish button for in-progress collections for both roles.
- Disabled finish button when the current user's confirmation flag is already true.

---

## Execution Plan

### Phase 1: Foundation

```text
T1 -> T2
```

### Phase 2: Page

```text
T2 -> T3 -> T4
```

### Phase 3: Verification

```text
T4 -> T5
```

---

## Task Breakdown

### T1: Add Collection Search Types and Helpers

**What**: Define collection summary, query, status, and normalization helpers.
**Where**: `src/app/lib/collectionsPage.ts`
**Depends on**: None
**Reuses**: Helper style from `src/app/lib/createCollection.ts` and `src/app/lib/selectCollector.ts`
**Requirement**: CP-01, CP-02, CP-03, CP-04

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] `CollectionSummary`, `CollectionSearchQuery`, and `CollectionStatus` are exported.
- [ ] `normalizeCollections(response)` returns valid collection summaries.
- [ ] Malformed collection items are filtered out.
- [ ] Formatting helpers exist for weight, date, and status label.
- [ ] Gate check passes: `npm run lint`.
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

---

### T2: Add Collections Search API Route

**What**: Create the route handler that proxies collection search to the backend.
**Where**: `src/app/api/collections/search/route.ts`
**Depends on**: T1
**Reuses**: Existing collection API route patterns.
**Requirement**: CP-01, CP-02, CP-04

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] `GET /api/collections/search` accepts `status`, `generatorId`, and `collectorId` query params.
- [ ] Route requires either `generatorId` or `collectorId`.
- [ ] Route calls `GET ${COLLECTIONS_API_URL}/collections/search` with query params.
- [ ] Route forwards authorization header when present.
- [ ] Route returns normalized collection summaries.
- [ ] Gate check passes: `npm run lint`.
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

---

### T3: Add Collections Page Shell

**What**: Create `/collections` with auth, role-aware query derivation, loading, empty, error, and retry states.
**Where**: `src/app/collections/page.tsx`
**Depends on**: T2
**Reuses**: `Header`, `Sidebar`, `button`, `getSessionMeta`
**Requirement**: CP-01, CP-04

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] Page redirects unauthenticated users to `/auth/login`.
- [ ] Generator role queries with `generatorId`.
- [ ] Collector role queries with `collectorId`.
- [ ] Unknown or missing role/user ID shows an error.
- [ ] Loading, empty, error, and retry states render clearly.
- [ ] Gate check passes: `npm run lint`.
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

---

### T4: Add Status Filter and Collection Cards

**What**: Render status filter controls and collection result cards.
**Where**: `src/app/collections/page.tsx`
**Depends on**: T3
**Reuses**: Existing Tailwind card patterns.
**Requirement**: CP-02, CP-03

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] Status filter includes "Todos" and backend status options.
- [ ] Changing status refreshes the search query.
- [ ] Cards show ID, materials, weight, status, created date, selected collector state, and confirmation flags.
- [ ] Partial values render gracefully.
- [ ] Mobile and desktop layouts remain usable.
- [ ] Gate check passes: `npm run lint`.
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

---

### T5: Build Verification and TLC State Update

**What**: Run final verification and update TLC feature/project state.
**Where**: `.specs/features/collections-page/tasks.md`, `.specs/project/STATE.md`, `.specs/project/ROADMAP.md`
**Depends on**: T4
**Reuses**: Gate guidance from `.specs/codebase/TESTING.md`
**Requirement**: CP-01, CP-02, CP-03, CP-04

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [ ] `npm run lint` passes or existing warnings are documented.
- [ ] `npm run build` passes or blockers are documented.
- [ ] Manual verification covers generator query, collector query, status filtering, empty state, error state, and sample result rendering.
- [ ] Tasks and STATE are updated with completion/blockers.
- [ ] Test count: 0 automated tests exist currently unless a test stack is added.

**Tests**: none
**Gate**: build

---

## Change Request: Pending Accept and In-Progress Finish

**Requested:** 2026-05-09
**Status:** Done
**Completed:** 2026-05-09
**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npm run build` passed after network access was allowed for `next/font` Google font fetching.

**Requirements:** CP-06, CP-07

### T11: Restrict Collector Accept to Pending

**What**: Show the collector accept button only for `PENDING` collections.
**Where**: `src/app/collections/page.tsx`
**Depends on**: T10
**Requirement**: CP-06

**Done when**:

- [x] Collector accept appears only when `status === "PENDING"`.
- [x] Collector accept does not appear for `IN_PROGRESS`, `COMPLETED`, `CANCELED`, or unknown statuses.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T12: Add Finish Confirmation API Routes

**What**: Add local route handlers for generator and collector finish confirmation.
**Where**:

- `src/app/api/collections/requests/[id]/confirm-generator/route.ts`
- `src/app/api/collections/requests/[id]/confirm-collector/route.ts`

**Depends on**: Existing collection action route patterns
**Requirement**: CP-07

**Done when**:

- [x] Generator route proxies to `POST ${COLLECTIONS_API_URL}/requests/[id]/confirm-generator`.
- [x] Collector route proxies to `POST ${COLLECTIONS_API_URL}/requests/[id]/confirm-collector`.
- [x] Routes validate missing IDs.
- [x] Routes forward authorization header when present.
- [x] Routes return backend success and error responses consistently.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T13: Add In-Progress Finish UI

**What**: Add a finish button for both roles on `IN_PROGRESS` collections.
**Where**: `src/app/collections/page.tsx`
**Depends on**: T12
**Requirement**: CP-07

**Done when**:

- [x] Generator users see finish on `IN_PROGRESS` collections.
- [x] Collector users see finish on `IN_PROGRESS` collections.
- [x] Generator finish posts to the generator confirmation route.
- [x] Collector finish posts to the collector confirmation route.
- [x] Pending, success, error, and refresh behavior work like accept.
- [x] Finish is disabled when the current user has already confirmed.
- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npm run build` passes or blockers are documented.

**Tests**: none
**Gate**: build

---

## Parallel Execution Map

```text
Phase 1:
  T1 -> T2

Phase 2:
  T2 -> T3 -> T4

Phase 3:
  T4 -> T5
```

No tasks are marked `[P]` because the page work depends on the route/helper contract and the user did not request sub-agent execution.

---

## Change Request: Counterpart Profiles and Collector Quick Accept

**Requested:** 2026-05-09
**Status:** Done
**Completed:** 2026-05-09
**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npm run build` passed after network access was allowed for `next/font` Google font fetching.

**Requirements:** CP-05, CP-06

### Change Execution Plan

```text
T6 -> T7
T6 -> T8
T7 + T8 -> T9 -> T10
```

### T6: Add Counterpart Profile Types and Helpers

**What**: Add profile normalization, profile lookup planning, duplicate ID collection, and card display helpers.
**Where**: `src/app/lib/collectionsPage.ts`
**Depends on**: Existing T1
**Reuses**: Current collection normalization and formatting helpers.
**Requirement**: CP-05

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `CounterpartProfile` is exported.
- [x] A helper maps viewer role plus collection data to the correct counterpart profile ID and endpoint kind.
- [x] Duplicate counterpart IDs can be deduplicated before fetching.
- [x] Malformed profile responses become safe fallback profile data.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T7: Add Waste Collector Profile API Route

**What**: Create a local route handler for waste collector profile lookup.
**Where**: `src/app/api/waste-collector/[id]/route.ts`
**Depends on**: T6
**Reuses**: `src/app/api/generator/[id]/route.ts`
**Requirement**: CP-05

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `GET /api/waste-collector/[id]` proxies to `GET ${BASE_API_URL}/waste-collector/[id]`.
- [x] Route validates missing IDs.
- [x] Route forwards authorization header when present.
- [x] Route returns backend errors consistently with existing API routes.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T8: Add Collection Accept API Route

**What**: Create a local route handler for collector quick accept.
**Where**: `src/app/api/collections/requests/[id]/accept/route.ts`
**Depends on**: Existing collection route patterns
**Reuses**: `src/app/api/collections/requests/[id]/select-collector/route.ts`
**Requirement**: CP-06

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `POST /api/collections/requests/[id]/accept` proxies to `POST ${COLLECTIONS_API_URL}/collections/requests/[id]/accept`.
- [x] Route validates missing IDs.
- [x] Route forwards authorization header when present.
- [x] Route returns backend success and error responses consistently.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T9: Update Collections Page Role-Specific Cards

**What**: Fetch and render opposite-party profiles while hiding current user's own-party information.
**Where**: `src/app/collections/page.tsx`
**Depends on**: T6, T7
**Reuses**: Existing `/collections` page loading, retry, and card states.
**Requirement**: CP-05

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Generator users do not see generator profile information.
- [x] Generator users see selected collector information when `selectedCollectorId` exists.
- [x] Generator users see a waiting state when no collector is selected.
- [x] Collector users do not see collector profile information.
- [x] Collector users see generator information for each collection.
- [x] Profile lookup failures keep cards visible with fallback IDs.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T10: Add Collector Quick Accept UI and Verification

**What**: Add collector-only accept button, pending/error/success states, refresh behavior, and final verification docs.
**Where**: `src/app/collections/page.tsx`, `.specs/features/collections-page/tasks.md`, `.specs/project/STATE.md`
**Depends on**: T8, T9
**Reuses**: Existing button styles and route-handler fetch patterns.
**Requirement**: CP-06

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Collector users see an accept button for eligible collections.
- [x] Generator users never see the accept button.
- [x] Clicking accept disables duplicate submissions for that card.
- [x] Success feedback appears and the collection list refreshes or updates.
- [x] Error feedback appears when accept fails.
- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npm run build` passes or blockers are documented.
- [x] STATE is updated with completion/blockers.

**Tests**: none
**Gate**: build

## Pre-Approval Checks

### Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Add Collection Search Types and Helpers | One helper module | OK |
| T2: Add Collections Search API Route | One endpoint | OK |
| T3: Add Collections Page Shell | One page shell | OK |
| T4: Add Status Filter and Collection Cards | One UI behavior slice | OK |
| T5: Build Verification and State Update | Verification/docs | OK |

### Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | None | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T3 | T3 -> T4 | Match |
| T5 | T4 | T4 -> T5 | Match |

### Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Utility/types | none currently established | none | OK |
| T2 | API route handler | integration recommended, no framework configured | none | OK for current matrix |
| T3 | Page/component | E2E recommended, no framework configured | none | OK for current matrix |
| T4 | Page/component | component/E2E recommended, no framework configured | none | OK for current matrix |
| T5 | Verification/docs | none | none | OK |

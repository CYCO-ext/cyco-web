# Routes Tasks

**Design**: `.specs/features/routes/design.md`
**Status**: Done
**Completed:** 2026-05-12

**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npx tsc --noEmit` passed.
- `npm run build` passed after network access was allowed for `next/font` Google font fetching.
- Manual browser verification was not run in this turn.

---

## Execution Plan

### Phase 1: Contracts and Proxy

```text
T1 -> T2
```

### Phase 2: Home Entry Point

```text
T1 -> T3 -> T4
```

### Phase 3: Route Suggestion Page

```text
T2 -> T5 -> T6 -> T7
```

### Phase 4: Verification

```text
T4 + T7 -> T8
```

---

## Task Breakdown

### T1: Add Route Suggestion Types and Helpers

**What**: Define request/response/form types, validation, payload builder, and formatting helpers.
**Where**: `src/app/lib/routes.ts`
**Depends on**: Existing collection helper patterns.
**Reuses**: `CollectionSummary`, `formatWeight`, date/status helpers where useful.
**Requirement**: RT-02, RT-03, RT-04, RT-05, RT-06

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `RouteSuggestionRequest` and `RouteSuggestionResponse` are exported.
- [x] Form state and validation helpers are exported.
- [x] Payload builder emits the exact backend request contract.
- [x] Numeric validation covers vehicle count, capacity, latitude, longitude, and time limit.
- [x] Response normalization keeps route/stops arrays safe.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T2: Add Route Suggestion API Proxy

**What**: Create the local route handler that submits route suggestion requests to the backend.
**Where**: `src/app/api/collectors/routes/suggest/route.ts`
**Depends on**: T1
**Reuses**: Existing collection route-handler style.
**Requirement**: RT-04, RT-06

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `POST /api/collectors/routes/suggest` accepts route suggestion payloads.
- [x] Route validates missing or empty required fields.
- [x] Route calls `POST ${COLLECTIONS_API_URL}/collectors/routes/suggest`.
- [x] Route forwards authorization header when present.
- [x] Route returns backend success/error responses consistently.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T3: Add Collector Route Suggestion Home Card

**What**: Create a home dashboard card that redirects collectors to the route suggestion page.
**Where**: `src/app/components/home/cards/CreateRouteSuggestionCard.tsx`
**Depends on**: T1
**Reuses**: `CreateCollectionCard` layout language and dashboard card styles.
**Requirement**: RT-01

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Card links to `/routes/suggest`.
- [x] Card text is collector-focused.
- [x] Card uses existing dashboard visual style.
- [x] Card is accessible as a link and does not nest interactive controls incorrectly.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T4: Swap Home Card by Role

**What**: Render route suggestion card for collectors and create collection card for generators.
**Where**: `src/app/components/home/MainContent.tsx`
**Depends on**: T3
**Reuses**: Existing `userType` prop.
**Requirement**: RT-01

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Collector home renders `CreateRouteSuggestionCard`.
- [x] Generator home renders `CreateCollectionCard`.
- [x] Other home cards remain unchanged.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T5: Add Route Suggestion Page Shell and Candidate Loading

**What**: Create the authenticated collector-only page shell and load candidate collection requests.
**Where**: `src/app/routes/suggest/page.tsx`
**Depends on**: T2
**Reuses**: `Header`, `Sidebar`, `getSessionMeta`, `isCollectorRole`, `/api/collections/search`.
**Requirement**: RT-02, RT-06

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Unauthenticated users redirect to `/auth/login`.
- [x] Non-collector users see an access error or redirect.
- [x] Page fetches candidates using `collectorId=session.user.id` and `status=IN_PROGRESS`.
- [x] Page only displays/selects `IN_PROGRESS` candidate collections.
- [x] Candidate list shows ID, materials, weight, status, and date.
- [x] Loading, empty, error, and retry states render.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T6: Add Form Inputs and Payload Submit

**What**: Add candidate selection, vehicle/options inputs, browser location capture, validation, and submit behavior.
**Where**: `src/app/routes/suggest/page.tsx`
**Depends on**: T5
**Reuses**: Helpers from `src/app/lib/routes.ts` and UI controls.
**Requirement**: RT-02, RT-03, RT-04, RT-06

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Collector can select one or more candidate requests.
- [x] Vehicle count and capacity inputs are present and validated.
- [x] Collector can choose current location or registered location.
- [x] Latitude and longitude are captured from browser geolocation or registered collection address coordinates and validated.
- [x] Registered address uses `GET ${COLLECTIONS_API_URL}/collectors/[collectorId]/address` through a local API route.
- [x] Latitude and longitude are not editable fields.
- [x] Geolocation errors show a retry/error state.
- [x] Registered location errors show a retry/error state.
- [x] Default options are `timeLimitSeconds=5` and `allowDroppingStops=true`.
- [x] Submit posts to `/api/collectors/routes/suggest`.
- [x] Submit forwards the session token when present.
- [x] Submit keeps form data on backend error.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T7: Render Route Suggestion Results

**What**: Render solver summary, route cards, stops, and unassigned request IDs.
**Where**: `src/app/routes/suggest/page.tsx`
**Depends on**: T6
**Reuses**: Route response normalization and Tailwind card patterns.
**Requirement**: RT-05, RT-06

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Status, solver engine, elapsed time, objective distance, and dropped stops render.
- [x] Each vehicle route renders vehicle index, capacity, total load, and total distance.
- [x] Stops render sequence, request ID, address ID, demand, accumulated load, distance, and coordinates.
- [x] Unassigned request IDs render when present.
- [x] Empty/no-route result state is handled.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T8: Build Verification and TLC State Update

**What**: Run final verification and update feature/project state.
**Where**: `.specs/features/routes/tasks.md`, `.specs/features/routes/spec.md`, `.specs/project/STATE.md`
**Depends on**: T4, T7
**Reuses**: `.specs/codebase/TESTING.md`
**Requirement**: RT-01, RT-02, RT-03, RT-04, RT-05, RT-06

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npm run build` passes or blockers are documented.
- [ ] Manual verification covers collector home card, generator home card, candidate loading, validation errors, successful submit, backend error, and provided response rendering.
- [x] Spec traceability moves from Draft to Verified after implementation.
- [x] STATE records completion/blockers.

**Tests**: none
**Gate**: build

---

## Parallel Execution Map

```text
Phase 1:
  T1 -> T2

Phase 2:
  T1 -> T3 -> T4

Phase 3:
  T2 -> T5 -> T6 -> T7

Phase 4:
  T4 + T7 -> T8
```

T3 and T2 may proceed in parallel after T1 because the home card and API proxy touch disjoint files.

## Pre-Approval Checks

### Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Add Route Suggestion Types and Helpers | One helper module | OK |
| T2: Add Route Suggestion API Proxy | One route handler | OK |
| T3: Add Collector Route Suggestion Home Card | One component | OK |
| T4: Swap Home Card by Role | One composition edit | OK |
| T5: Add Page Shell and Candidate Loading | One page shell/data load | OK |
| T6: Add Form Inputs and Submit | One form behavior slice | OK |
| T7: Render Results | One result rendering slice | OK |
| T8: Verification and State Update | Verification/docs | OK |

### Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | Existing patterns | T1 first | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T1 | T1 -> T3 | Match |
| T4 | T3 | T3 -> T4 | Match |
| T5 | T2 | T2 -> T5 | Match |
| T6 | T5 | T5 -> T6 | Match |
| T7 | T6 | T6 -> T7 | Match |
| T8 | T4, T7 | T4 + T7 -> T8 | Match |

### Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Utility/types | none currently established | none | OK |
| T2 | API route handler | integration recommended, no framework configured | none | OK for current matrix |
| T3 | Component | component recommended, no framework configured | none | OK for current matrix |
| T4 | Component composition | component/E2E recommended, no framework configured | none | OK for current matrix |
| T5 | Page/data fetch | E2E recommended, no framework configured | none | OK for current matrix |
| T6 | Page/form submit | E2E recommended, no framework configured | none | OK for current matrix |
| T7 | Page/result rendering | component/E2E recommended, no framework configured | none | OK for current matrix |
| T8 | Verification/docs | none | none | OK |

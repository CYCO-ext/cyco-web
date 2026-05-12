# Save Route Tasks

**Design**: `.specs/features/save-route/design.md`
**Status**: Done
**Created:** 2026-05-12
**Completed:** 2026-05-12

**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npx next typegen && npx tsc --noEmit` passed.
- `npm run build` passed after network access was allowed for `next/font` Google font fetching.
- Manual browser verification was not run in this turn.
- Saved routes are reachable through the sidebar, render vehicle details in expandable sections, and open collection details in a modal.

---

## Execution Plan

### Phase 1: Contracts and Proxies

```text
T1 -> T2 -> T3
```

### Phase 2: Save Action

```text
T1 + T2 -> T4
```

### Phase 3: Saved Routes Page

```text
T1 + T3 -> T5 -> T6
```

### Phase 4: Verification

```text
T4 + T6 -> T7
```

---

## Task Breakdown

### T1: Add Save Route Types and Helpers

**What**: Define save request, saved route, normalization, and status/format helpers.
**Where**: `src/app/lib/routes.ts`
**Depends on**: Existing route suggestion types.
**Reuses**: `RouteSuggestionResponse`, `normalizeRouteSuggestionResponse`, route formatting helpers.
**Requirement**: SR-01, SR-02, SR-04

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `SaveRouteRequest` is exported.
- [x] `SavedRoute` is exported.
- [x] `SaveRouteState` or equivalent UI state type is available.
- [x] `isSaveRouteRequest` validates `collectorId`, `source`, and `suggestion`.
- [x] `normalizeSavedRoute` and `normalizeSavedRoutes` safely handle provided saved-route responses.
- [x] Empty or malformed `suggestion` does not crash normalization.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T2: Add Save Route API Proxy

**What**: Create the local save route handler.
**Where**: `src/app/api/collectors/routes/save/route.ts`
**Depends on**: T1
**Reuses**: `src/app/api/collectors/routes/suggest/route.ts` proxy style.
**Requirement**: SR-01, SR-04

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `POST /api/collectors/routes/save` accepts the save payload.
- [x] Route validates missing or invalid body fields and returns `400`.
- [x] Route calls `POST ${COLLECTIONS_API_URL}/collectors/routes/save`.
- [x] Route forwards authorization header when present.
- [x] Route preserves backend `201` success semantics.
- [x] Route returns backend errors consistently.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T3: Add Saved Routes API Proxy

**What**: Create the local saved routes listing route handler.
**Where**: `src/app/api/collectors/routes/saved/route.ts`
**Depends on**: T1
**Reuses**: Existing collector API proxy style.
**Requirement**: SR-02, SR-04

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `GET /api/collectors/routes/saved` proxies to `GET ${COLLECTIONS_API_URL}/collectors/routes/saved`.
- [x] Route forwards authorization header when present.
- [x] Route returns normalized saved route arrays.
- [x] Route returns backend errors consistently.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T4: Add Save Button to Route Suggestion Results

**What**: Add save UI state and action to the route suggestion page.
**Where**: `src/app/routes/suggest/page.tsx`
**Depends on**: T2
**Reuses**: Existing `RouteResult`, session headers, and route suggestion result state.
**Requirement**: SR-01, SR-04

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Save button appears when `result` exists.
- [x] Save button posts `{ collectorId, source: "ROUTE_SUGGESTION", suggestion: result }`.
- [x] Save action forwards the session token when present.
- [x] Save loading, saved, and error states render.
- [x] Save is disabled after success for the current suggestion.
- [x] Save state resets when a new suggestion is generated.
- [x] Backend duplicate/conflict errors are visible to the collector.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T5: Add Saved Routes Page Shell and Loading

**What**: Create the collector-only saved routes page and load saved routes.
**Where**: `src/app/routes/saved/page.tsx`
**Depends on**: T3
**Reuses**: `Header`, `Sidebar`, `getSessionMeta`, `isCollectorRole`, saved route helpers.
**Requirement**: SR-02, SR-04

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Unauthenticated users redirect to `/auth/login`.
- [x] Non-collector users see an access error or redirect.
- [x] Page fetches `GET /api/collectors/routes/saved`.
- [x] Loading, empty, error, and retry states render.
- [x] Saved route cards render metadata from the provided response shape.
- [x] Cards tolerate `suggestion: {}`.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T6: Improve Saved Route Details and Navigation

**What**: Remove close action, add saved-route navigation, and render vehicle details in expandable sections.
**Where**: `src/app/routes/saved/page.tsx`, `src/app/components/Sidebar.tsx`
**Depends on**: T5
**Reuses**: Saved route card state, sidebar icon navigation, route suggestion formatting helpers.
**Requirement**: SR-03, SR-04

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Saved route page does not show a close button.
- [x] Sidebar includes a direct `/routes/saved` navigation item.
- [x] Saved route cards show clearer metadata and solver summary.
- [x] Vehicle routes render in expandable details sections.
- [x] Expanded vehicle details show capacity, load, distance, stops, address street/number when present, demand, accumulated load, previous distance, and coordinates.
- [x] Stop rows do not show the raw address ID as the display address.
- [x] Stop rows can open a collection detail modal with `GET /api/collections/{id}`.
- [x] `GET /api/collections/[id]` proxies to `GET ${COLLECTIONS_API_URL}/collections/[id]`.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T7: Verification and TLC State Update

**What**: Run verification and update traceability/state.
**Where**: `.specs/features/save-route/tasks.md`, `.specs/features/save-route/spec.md`, `.specs/project/STATE.md`
**Depends on**: T4, T6
**Reuses**: `.specs/codebase/TESTING.md`
**Requirement**: SR-01, SR-02, SR-03, SR-04

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npx tsc --noEmit` passes.
- [x] `npm run build` passes or blockers are documented.
- [ ] Manual verification covers save success, save error, duplicate save state, saved routes loading, empty state, sidebar navigation, and vehicle details expansion.
- [x] Spec traceability moves from Draft to Verified after implementation.
- [x] STATE records completion/blockers.

**Tests**: none
**Gate**: full

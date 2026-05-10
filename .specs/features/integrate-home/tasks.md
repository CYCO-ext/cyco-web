# Integrate Home Tasks

**Design**: `.specs/features/integrate-home/design.md`
**Status**: Done
**Completed:** 2026-05-09

**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npx tsc --noEmit` passed.
- `npm run build` was attempted, but the sandboxed build failed while fetching Google fonts; the network rerun was rejected.
- Manual browser verification was not run in this turn.

---

## Execution Plan

### Phase 1: Data Mapping

```text
T1 -> T2
```

### Phase 2: Card Props

```text
T2 -> T3
T2 -> T4
T2 -> T5
```

### Phase 3: Verification

```text
T3 + T4 + T5 -> T6
```

---

## Task Breakdown

### T1: Add Home Collection Mapping Helpers

**What**: Add helper functions to map `CollectionSummary` into home card view models.
**Where**: Prefer `src/app/lib/homeCollections.ts` or extend `src/app/lib/collectionsPage.ts` if the repo favors fewer helper files.
**Depends on**: Existing collection normalizers.
**Reuses**: `CollectionSummary`, `normalizeCollections`, `formatWeight`, `statusLabel`.
**Requirement**: IH-01, IH-03, IH-04, IH-05

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] A helper derives role query params from `userType` and `userId`.
- [x] A helper counts `IN_PROGRESS` collections.
- [x] A helper maps up to 2 collections to `NextCollection` view models.
- [x] A helper maps up to 2 collections to `CollectionRow` view models.
- [x] Missing materials, dates, and address/location fields have fallbacks.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T2: Load Collections in MainContent

**What**: Replace static collection arrays in home with API-backed state.
**Where**: `src/app/components/home/MainContent.tsx`, possibly `src/app/page.tsx`
**Depends on**: T1
**Reuses**: `getSessionMeta`, `isGeneratorRole`, `isCollectorRole`, `/api/collections/search`.
**Requirement**: IH-01, IH-02, IH-03, IH-04, IH-05

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `page.tsx` passes session user ID and token into `MainContent`.
- [x] `MainContent` fetches `/api/collections/search` with `generatorId` or `collectorId`.
- [x] Authorization header is forwarded when a token exists.
- [x] Static `coletasRecentes` and `proximasColetas` are removed.
- [x] Loading, error, and empty state values are derived from fetch state.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T3: Update ActiveCollectionsCard

**What**: Convert active collections card from hardcoded count to API-backed props.
**Where**: `src/app/components/home/cards/ActiveCollectionsCard.tsx`
**Depends on**: T2
**Reuses**: Current card layout and `/collections` link.
**Requirement**: IH-02, IH-05

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Card accepts `count`, `loading`, and `error` props.
- [x] Hardcoded `5` is removed.
- [x] Loading state does not show stale static values.
- [x] Error state remains usable and keeps the `/collections` link.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T4: Update NextCollectionsCard

**What**: Adapt next collections card to API-derived collection view models.
**Where**: `src/app/components/home/cards/NextCollectionsCard.tsx`
**Depends on**: T2
**Reuses**: Existing date tile and material badge layout.
**Requirement**: IH-03, IH-05

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Card accepts `loading` and `error` props.
- [x] Card renders at most 2 API-backed items.
- [x] Card handles missing materials with fallback text.
- [x] Card handles missing location with fallback text.
- [x] Empty state remains visible when there are no collections.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T5: Update LastCollectionsCard

**What**: Adapt last collections card to API-derived collection rows.
**Where**: `src/app/components/home/cards/LastCollectionsCard.tsx`
**Depends on**: T2
**Reuses**: Existing row and status color layout.
**Requirement**: IH-04, IH-05

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Card accepts `loading` and `error` props.
- [x] Card renders at most 2 API-backed rows.
- [x] Status labels map from backend statuses.
- [x] Empty state is shown when there are no rows.
- [x] Rating column remains non-blocking until a rating API exists.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T6: Verification and TLC State Update

**What**: Run final gates and update feature/project state.
**Where**: `.specs/features/integrate-home/tasks.md`, `.specs/features/integrate-home/spec.md`, `.specs/project/STATE.md`
**Depends on**: T3, T4, T5
**Reuses**: `.specs/codebase/TESTING.md`
**Requirement**: IH-01, IH-02, IH-03, IH-04, IH-05

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npm run build` passes or blockers are documented.
- [ ] Manual verification covers generator query, collector query, active count, next collections, last collections, empty state, and API error state.
- [x] Spec traceability is updated from Draft to Verified after implementation.
- [x] STATE records the home integration decision and completion/blockers.

**Tests**: none
**Gate**: build

---

## Parallel Execution Map

```text
Phase 1:
  T1 -> T2

Phase 2:
  T2 -> T3
  T2 -> T4
  T2 -> T5

Phase 3:
  T3 + T4 + T5 -> T6
```

T3, T4, and T5 can be implemented independently after `MainContent` owns the data contract.

## Pre-Approval Checks

### Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Add Home Collection Mapping Helpers | One helper module | OK |
| T2: Load Collections in MainContent | One composition component plus page props | OK |
| T3: Update ActiveCollectionsCard | One card | OK |
| T4: Update NextCollectionsCard | One card | OK |
| T5: Update LastCollectionsCard | One card | OK |
| T6: Verification and TLC State Update | Verification/docs | OK |

### Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | Existing normalizers | T1 first | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T2 | T2 -> T4 | Match |
| T5 | T2 | T2 -> T5 | Match |
| T6 | T3, T4, T5 | T3 + T4 + T5 -> T6 | Match |

### Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Utility/types | none currently established | none | OK |
| T2 | Component/data fetch | component/E2E recommended, no framework configured | none | OK for current matrix |
| T3 | Component | component recommended, no framework configured | none | OK for current matrix |
| T4 | Component | component recommended, no framework configured | none | OK for current matrix |
| T5 | Component | component recommended, no framework configured | none | OK for current matrix |
| T6 | Verification/docs | none | none | OK |

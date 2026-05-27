# Move Request Tasks

**Spec**: `.specs/features/move-request/spec.md`
**Design**: `.specs/features/move-request/design.md`
**Status**: Done
**Created:** 2026-05-15
**Completed:** 2026-05-15

**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npm run build` passed after network access was allowed for Next.js Google font fetching.
- Manual browser UAT was not run in this session; drag/drop, fallback selector, same-vehicle no-op, closed route hiding, failure preservation, and empty vehicle targets were verified by code-path review and production build.

**Implementation notes:**

- Added the move request route under the existing saved route proxy namespace.
- Kept the saved routes page card layout intact.
- Implemented native drag-and-drop with a selector fallback for accessibility and mobile usability.
- Preserved existing route state on move failure and merged partial move responses with the existing route before normalization.

## Execution Plan

```text
T1 -> T2 -> T3 -> T4 -> T5
```

This is a large UI feature because it touches an API proxy, route domain helpers, saved-route state management, drag/drop interaction, and final verification.

---

## Task Breakdown

### T1: Add Move Request API Proxy

**What**: Create a route handler that validates and forwards saved route move requests.
**Where**: `src/app/api/collectors/routes/saved/[savedRouteId]/move-request/route.ts`
**Depends on**: None
**Reuses**: Delete route proxy pattern in `src/app/api/collectors/routes/saved/[savedRouteId]/route.ts`.
**Requirement**: MR-01

**Done when**:

- [x] `POST /api/collectors/routes/saved/[savedRouteId]/move-request` exists.
- [x] Missing `savedRouteId` returns `400`.
- [x] Missing or empty `collectionRequestId` returns `400`.
- [x] Invalid `sourceVehicleIndex` or `targetVehicleIndex` returns `400`.
- [x] Authorization header is forwarded when present.
- [x] Backend success response is returned as JSON.
- [x] Backend errors preserve status and readable error text.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual route-handler checks through UI or fetch; no automated route-handler test framework currently configured.
**Gate**: quick

---

### T2: Add Move Payload Helpers

**What**: Add typed move request payload helpers and reuse saved route normalization for updated responses.
**Where**: `src/app/lib/routes.ts`
**Depends on**: T1
**Reuses**: `SavedRoute`, `normalizeSavedRoute`, existing validation helper style.
**Requirement**: MR-02

**Done when**:

- [x] `MoveSavedRouteRequestPayload` is exported.
- [x] A helper builds or validates move payloads.
- [x] Same source and target vehicle indexes return a no-op error/result.
- [x] Non-empty collection request ID is required.
- [x] Source and target indexes must be integers greater than or equal to zero.
- [x] Existing saved route normalization handles the endpoint response.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual helper exercise through saved routes UI.
**Gate**: quick

---

### T3: Add Saved Route Move State and Submit Flow

**What**: Wire move request state, API submit, response normalization, and feedback into the saved routes page.
**Where**: `src/app/routes/saved/page.tsx`
**Depends on**: T1, T2
**Reuses**: Existing delete feedback, page error handling, `headers`, and route state replacement patterns.
**Requirement**: MR-02, MR-04

**Done when**:

- [x] Page tracks move pending route/request state.
- [x] Page tracks move success/error feedback.
- [x] Move submit posts to `/api/collectors/routes/saved/{savedRouteId}/move-request`.
- [x] Request body includes `collectionRequestId`, `sourceVehicleIndex`, and `targetVehicleIndex`.
- [x] Successful response replaces the matching saved route in local state.
- [x] Malformed updated route response shows an error and keeps current route state.
- [x] Move/delete actions for the pending route are disabled.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual move success and failure checks.
**Gate**: quick

---

### T4: Add Drag-And-Drop and Accessible Fallback Controls

**What**: Add native drag/drop movement and target-vehicle fallback controls to saved route vehicle sections.
**Where**: `src/app/routes/saved/page.tsx`
**Depends on**: T3
**Reuses**: Existing vehicle `details` sections and stop cards.
**Requirement**: MR-03, MR-04

**Done when**:

- [x] OPEN saved routes show draggable stop affordances.
- [x] Non-OPEN saved routes hide or disable move controls.
- [x] Dragging over a different vehicle shows a visible drop state.
- [x] Dropping on a different vehicle triggers the shared move submit flow.
- [x] Dropping on the same vehicle is ignored without backend call.
- [x] Empty vehicle sections can receive dropped stops.
- [x] Each movable stop has a fallback control to move to another vehicle.
- [x] Fallback controls are disabled while the route has a pending move/delete action.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual drag/drop checks and fallback selector checks on desktop/mobile widths.
**Gate**: quick

---

### T5: Verify Build and Update TLC State

**What**: Run final verification and update feature tracking after implementation.
**Where**:

- `.specs/features/move-request/spec.md`
- `.specs/features/move-request/design.md`
- `.specs/features/move-request/tasks.md`
- `.specs/project/STATE.md`

**Depends on**: T1, T2, T3, T4
**Reuses**: Gate guidance from `.specs/codebase/TESTING.md`.
**Requirement**: MR-01, MR-02, MR-03, MR-04

**Done when**:

- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npm run build` passes or blockers are documented.
- [x] Requirement traceability in `spec.md` is updated.
- [x] `design.md` status reflects implementation.
- [x] `tasks.md` checkboxes and verification notes are updated.
- [x] `STATE.md` records the move endpoint and UI decision.
- [x] Verification notes cover successful move, same-vehicle no-op, empty vehicle target, closed route behavior, failed backend response, and fallback selector.

**Tests**: Lint, build, manual UI verification.
**Gate**: build

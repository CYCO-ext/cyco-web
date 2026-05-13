# Delete Suggestion Tasks

**Spec**: `.specs/features/delete-suggestion/spec.md`
**Design**: `.specs/features/delete-suggestion/design.md`
**Status**: Done
**Created:** 2026-05-13
**Completed:** 2026-05-13

**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npm run build` initially failed in the sandbox because Next.js could not fetch Google Fonts, then passed after network access was allowed.

**Implementation notes:**

- Added `/api/collectors/routes/saved/[savedRouteId]`, which proxies `DELETE` to `${COLLECTIONS_API_URL}/collectors/routes/saved/[savedRouteId]`.
- Added per-route delete pending state and delete success/error feedback on `/routes/saved`.
- Added a high-contrast delete button to each saved route card.
- Successful delete removes the route from local state, so deleting the last route shows the existing empty state.

## Execution Plan

```text
T1 -> T2 -> T3 -> T4
```

This is a medium feature: one API route, one saved-route page action, one card UI update, and final verification.

---

## Task Breakdown

### T1: Add Delete Saved Route API Route

**What**: Create the local route handler that proxies saved route deletion to the backend.
**Where**: `src/app/api/collectors/routes/saved/[savedRouteId]/route.ts`
**Depends on**: None
**Reuses**: `src/app/api/collectors/routes/saved/route.ts` proxy style.
**Requirement**: DS-02

**Done when**:

- [x] `DELETE /api/collectors/routes/saved/[savedRouteId]` exists.
- [x] Missing `COLLECTIONS_API_URL` returns a `500` JSON error.
- [x] Missing `savedRouteId` returns a `400` JSON error.
- [x] The route forwards `Authorization` when present.
- [x] The route calls `${COLLECTIONS_API_URL}/collectors/routes/saved/${savedRouteId}` with method `DELETE`.
- [x] Backend `204 No Content` returns local `204 No Content`.
- [x] Other backend success statuses work even when the backend returns no body.
- [x] Backend errors are forwarded with status and payload when available.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual route behavior or future route-handler test when test infrastructure exists.
**Gate**: quick

---

### T2: Add Delete State and Handler

**What**: Add saved-route deletion state and action handler to `/routes/saved`.
**Where**: `src/app/routes/saved/page.tsx`
**Depends on**: T1
**Reuses**: Existing `routes` state, `headers`, `getApiError`, and `loadSavedRoutes`.
**Requirement**: DS-03

**Done when**:

- [x] Page tracks the currently deleting saved route ID.
- [x] Page tracks delete success/error feedback.
- [x] `deleteSavedRoute(savedRouteId)` calls `/api/collectors/routes/saved/${savedRouteId}` with method `DELETE`.
- [x] The request forwards bearer authorization when available.
- [x] Success removes the deleted route from `routes`.
- [x] Failure keeps the route visible and shows error feedback.
- [x] Pending state clears in `finally`.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual delete flow with a saved route.
**Gate**: quick

---

### T3: Render Delete Button on Saved Route Cards

**What**: Add the delete button to saved route cards.
**Where**: `src/app/routes/saved/page.tsx`
**Depends on**: T2
**Reuses**: Existing card header and button styling.
**Requirement**: DS-01, DS-03

**Done when**:

- [x] Every saved route card shows an `Excluir` button.
- [x] Only the route being deleted shows `Excluindo...`.
- [x] Delete button is disabled while that route is being deleted.
- [x] Delete button uses readable destructive styling.
- [x] Delete success/error feedback appears on the page.
- [x] Existing collection detail modal and expandable route details still work.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual card action and layout check.
**Gate**: quick

---

### T4: Verify Build and Update TLC State

**What**: Run final verification and update feature tracking after implementation.
**Where**:

- `.specs/features/delete-suggestion/spec.md`
- `.specs/features/delete-suggestion/tasks.md`
- `.specs/project/STATE.md`

**Depends on**: T1, T2, T3
**Reuses**: Gate guidance from `.specs/codebase/TESTING.md`.
**Requirement**: DS-01, DS-02, DS-03

**Done when**:

- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npm run build` passes or blockers are documented.
- [x] Requirement traceability in `spec.md` is updated as tasks complete.
- [x] `STATE.md` records endpoint/path decisions and any blockers.
- [x] Manual verification notes cover successful delete, failed delete, and last-route empty state.

**Tests**: Lint, build, manual UI verification.
**Gate**: build

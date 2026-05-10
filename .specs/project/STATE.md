# State

**Last Updated:** 2026-05-09T00:00:00-03:00
**Current Work:** integrate-home - implemented

---

## Recent Decisions (Last 60 days)

### AD-001: Use TLC spec-driven project memory (2026-05-09)

**Decision:** Store project vision, roadmap, codebase map, decisions, blockers, and todos under `.specs/`.
**Reason:** The product is early and has two role-specific workflows, so persistent context will prevent repeated rediscovery.
**Trade-off:** Adds lightweight documentation maintenance to the project.
**Impact:** Future features should start from `.specs/project/PROJECT.md`, `.specs/project/ROADMAP.md`, and the relevant `.specs/codebase/` files.

### AD-002: Treat current v1 scope as an MVP draft (2026-05-09)

**Decision:** Document v1 around registration/login, generator collection requests, collector onboarding, dashboards, and backend API integration.
**Reason:** These are the flows already present or implied by the current codebase and product goal.
**Trade-off:** Some business rules remain open until the product owner confirms them.
**Impact:** Feature specs should explicitly resolve lifecycle, matching, material taxonomy, and CyCoins rules before implementation.

### AD-003: Route create collection backend calls through Next.js API routes (2026-05-09)

**Decision:** The create-collection feature should call local `/api/*` route handlers from the page, and those handlers should call `BASE_API_URL` or `COLLECT_API_URL`.
**Reason:** This matches the existing codebase pattern and keeps environment-specific backend URLs server-side.
**Trade-off:** Adds small route-handler wrappers instead of calling backend APIs directly from the browser.
**Impact:** Implementation tasks include route handlers for generator profile and collection request submission.

### AD-004: Use material names as create-collection material values (2026-05-09)

**Decision:** Treat materials from `GET /materials` as value objects and use `name` as the selected value sent in `materialIds`.
**Reason:** The backend returns materials as `[{ "name": "Glass" }]` without an ID.
**Trade-off:** The request field remains named `materialIds`, but its values are material names until the backend contract changes.
**Impact:** Material normalization falls back to `id = name`, and feature docs describe name-based material values.

### AD-005: Use NextAuth session user ID as generator ID (2026-05-09)

**Decision:** The create-collection flow reads `generatorId` from `session.user.id`, following the backend JWT contract `{ user: { id, name, email }, role, token }`.
**Reason:** The session contract now explicitly provides the authenticated user ID.
**Trade-off:** This assumes generator users have the same ID needed by `GET /generator/:id` and `POST /generator/request`.
**Impact:** NextAuth stores `id`, `role`, and `token` from the credentials response, and create collection uses those values through `getSessionMeta`.

### AD-006: Treat generator addresses as value objects (2026-05-09)

**Decision:** Do not validate or require address IDs in create-collection.
**Reason:** `GET /generator/:id` returns address value objects without IDs.
**Trade-off:** The request may omit `addressId` unless a future backend response provides one.
**Impact:** Registered-address mode fills CEP, number, and complement from the profile and enriches street, city, and neighborhood through ViaCEP.

### AD-007: Select collector after request creation (2026-05-09)

**Decision:** Add a generator-only collector selection page at `/collections/[id]/collectors`.
**Reason:** After creating a collection request, the generator must choose which nearby collector enterprise will collect the material.
**Trade-off:** The create flow now depends on the backend returning the created request ID.
**Impact:** Implementation must extract the created request ID, list nearby collectors, and submit `{ collectorId }`.

### AD-008: Collections page derives search identity from role (2026-05-09)

**Decision:** `/collections` should derive `generatorId` or `collectorId` from the authenticated session instead of asking the user for an ID.
**Reason:** Users should only see collections relevant to their authenticated role.
**Trade-off:** The page depends on the backend role and user ID matching the search API identifiers.
**Impact:** Implementation will query `GET /collections/search` with either `generatorId=session.user.id` or `collectorId=session.user.id`, plus optional status.

### AD-009: Collections page shows counterpart profiles and collector quick accept (2026-05-09)

**Decision:** Collection cards should hide the current user's own-party profile information and show only the opposite party: generators see selected collector information from `GET ${BASE_API_URL}/waste-collector/[id]`, while collectors see generator information from `GET ${BASE_API_URL}/generator/[id]`. Collector users also get a quick accept action through `POST ${COLLECTIONS_API_URL}/collections/requests/[id]/accept`.
**Reason:** The page should be role-focused and operational, avoiding redundant own-profile details while giving collectors a direct path to accept work.
**Trade-off:** The page now needs profile enrichment calls after collection search, plus role-gated action state.
**Impact:** Collections-page implementation needs a waste collector profile route, an accept route, profile enrichment helpers, and role-specific card rendering.

### AD-010: Collections page action buttons follow collection lifecycle (2026-05-09)

**Decision:** Collector quick accept should appear only for `PENDING` collections. `IN_PROGRESS` collections should show a finish action for both roles: generators post to `POST ${COLLECTIONS_API_URL}/requests/[id]/confirm-generator`, and collectors post to `POST ${COLLECTIONS_API_URL}/requests/[id]/confirm-collector`.
**Reason:** Accept and finish are different lifecycle actions and should not be available in the wrong status.
**Trade-off:** The collections page now has multiple role/status action paths.
**Impact:** Implementation added role-specific finish proxy routes and shared per-card action state.

### AD-011: Home collection cards should reuse collections search (2026-05-09)

**Decision:** The home dashboard collection cards should use the existing local `GET /api/collections/search` route with role-scoped query params instead of static data or new backend endpoints.
**Reason:** This keeps home consistent with `/collections` and avoids exposing backend URLs in the browser.
**Trade-off:** Cards derive active counts and first-item previews client-side until the backend exposes dedicated dashboard/count endpoints.
**Impact:** Implementation should move static home collection arrays into API-backed state in `MainContent`, then pass mapped props to the active, next, and last collection cards.

---

## Active Blockers

### B-001: Backend API contract details are incomplete

**Discovered:** 2026-05-09
**Impact:** Medium. Registration and auth routes exist, but collection creation, status lifecycle, and dashboard data contracts are not fully documented in the frontend.
**Workaround:** Keep API access behind Next.js route handlers and document expected payloads in feature specs before implementation.
**Resolution:** Obtain backend OpenAPI/spec examples or inspect backend routes before building collection submission and dashboard integrations.

---

## Lessons Learned

### L-001: The current app is a small App Router frontend with route-handler API proxies

**Context:** Initial codebase mapping.
**Problem:** Product and backend behavior are not yet documented in the repo.
**Solution:** Capture stack, architecture, and concerns under `.specs/codebase/`.
**Prevents:** Re-learning the same project structure before every feature.

### L-002: Next.js build needs network access for Google fonts

**Context:** Verifying create-collection with `npm run build`.
**Problem:** The sandboxed build failed while fetching Geist fonts from Google Fonts.
**Solution:** Rerun the build with network access.
**Prevents:** Misdiagnosing font fetch failures as application compile errors.

---

## Quick Tasks Completed

| # | Description | Date | Commit | Status |
| --- | --- | --- | --- | --- |
| 001 | Initialized TLC project specs and brownfield docs | 2026-05-09 | pending | Done |
| 002 | Implemented create-collection feature | 2026-05-09 | pending | Done |
| 003 | Implemented select-collector feature | 2026-05-09 | pending | Done |
| 004 | Implemented collections-page feature | 2026-05-09 | pending | Done |
| 005 | Updated collections-page spec for counterpart profiles and collector quick accept | 2026-05-09 | pending | Done |
| 006 | Implemented collections-page counterpart profiles and collector quick accept | 2026-05-09 | pending | Done |
| 007 | Implemented pending-only accept and in-progress finish actions | 2026-05-09 | pending | Done |
| 008 | Disabled finish action after current user confirmation | 2026-05-09 | pending | Done |
| 009 | Drafted integrate-home feature spec/design/tasks | 2026-05-09 | pending | Done |
| 010 | Implemented integrate-home collection cards | 2026-05-09 | pending | Done |

---

## Deferred Ideas

- [ ] Add route maps and lifecycle diagrams once collection status rules are confirmed.
- [ ] Add visual QA checklist for mobile and desktop dashboards.
- [ ] Add automated tests after the first feature spec defines the preferred test stack.

---

## Todos

- [ ] Confirm whether generators are only enterprises or may also be individual users.
- [ ] Confirm whether collectors claim requests, receive assigned requests, or both.
- [ ] Confirm material taxonomy, weight units, photo requirements, and CyCoins rules.
- [ ] Confirm backend API contract for creating and listing collection requests.
- [ ] Confirm whether `COLLECT_API_URL` or `COLLECTIONS_API_URL` is the canonical env var.
- [ ] Confirm the exact ID field returned by `POST /generator/request`.
- [ ] Confirm collector response shape from `GET /generators/requests/[id]/collectors`.
- [ ] Confirm complete collection status enum values.
- [ ] Confirm whether collectors search by `collectorId` should include only selected requests or also pending opportunities.
- [ ] Confirm exact response shape from `GET /waste-collector/[id]`.
- [ ] Confirm which collection statuses are eligible for collector quick accept.

## Preferences

**Model Guidance Shown:** never

# Create Collection Tasks

**Design**: `.specs/features/create-collection/design.md`
**Status**: Done

**Completed:** 2026-05-09

**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npm run build` passed after network access was allowed for `next/font` Google font fetching.

**Implementation notes:**

- `COLLECT_API_URL` was added as an alias for `COLLECTIONS_API_URL`.
- `/api/collections/request` also falls back to `COLLECTIONS_API_URL` if `COLLECT_API_URL` is absent.
- Address handling now treats registered addresses as value objects without IDs. The UI fills registered address fields and enriches them with ViaCEP without validating `addressId`.
- Updated materials handling because `GET /materials` returns value objects like `{ "name": "Glass" }`; the frontend now uses material names as selectable values and sends those names in `materialIds`.
- Updated auth handling to follow the JWT/session contract `{ user: { id, name, email }, role, token }`; create collection now uses `session.user.id` as `generatorId`.

---

## Execution Plan

### Phase 1: Foundation

```text
T1 -> T2
```

### Phase 2: API and Utilities

```text
T2 -> T3
T2 -> T4
T2 -> T5
```

### Phase 3: Page Behavior

```text
T3 + T4 + T5 -> T6 -> T7 -> T8 -> T9
```

### Phase 4: Verification

```text
T9 -> T10
```

---

## Task Breakdown

### T1: Align Environment Contract

**What**: Add or document `COLLECT_API_URL` as the collection request API base URL without exposing secret values.
**Where**: `.env` if needed, and optionally README/spec notes.
**Depends on**: None
**Reuses**: Existing env usage patterns in `src/app/api/*/route.ts`
**Requirement**: CC-04

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [ ] `COLLECT_API_URL` is available to server-side route handlers.
- [ ] Existing `BASE_API_URL` remains the source for materials and generator profile.
- [ ] No secret values are committed in documentation.
- [ ] Gate check passes: `npm run lint`
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; expected result is lint passes or only pre-existing unrelated lint issues are documented.

---

### T2: Add Create Collection Types and Helpers

**What**: Define typed models and helpers for materials, generator profile/address, CEP enrichment result, form state, and create request payload.
**Where**: `src/app/lib/collections.ts` or `src/app/lib/createCollection.ts`
**Depends on**: T1
**Reuses**: TypeScript strict mode and existing `src/app/lib/schemas.ts` style
**Requirement**: CC-01, CC-02, CC-03, CC-04, CC-06

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] `Material`, `GeneratorProfile`, `GeneratorAddress`, `CepAddress`, and `CreateCollectionRequest` types are exported.
- [ ] A helper normalizes material API responses from `{ name }[]` to `{ id: name, name }[]`.
- [ ] A helper validates/builds `CreateCollectionRequest` from page state.
- [ ] Missing `generatorId`, empty `materialIds`, and invalid `weight` produce explicit errors.
- [ ] Gate check passes: `npm run lint`
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; expected result is lint passes. Manually inspect exported helper signatures.

---

### T3: Harden Materials API Route

**What**: Ensure `/api/materials` returns normalized material data with usable selectable values and names.
**Where**: `src/app/api/materials/route.ts`
**Depends on**: T2
**Reuses**: Existing materials route proxy to `BASE_API_URL`
**Requirement**: CC-01, CC-06

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] Route calls `GET ${BASE_API_URL}/materials`.
- [ ] Route returns material objects containing stable `id` and `name`, using `name` as `id` when the backend returns value objects.
- [ ] Backend errors return useful JSON and HTTP status.
- [ ] Empty or malformed backend responses are handled predictably.
- [ ] Gate check passes: `npm run lint`
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; optionally run the dev server and request `/api/materials` with a configured backend.

---

### T4: Add Generator Profile API Route

**What**: Create a route handler that fetches one generator profile by ID.
**Where**: `src/app/api/generator/[id]/route.ts`
**Depends on**: T2
**Reuses**: API proxy patterns from `src/app/api/register/route.ts`
**Requirement**: CC-02, CC-06

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] `GET /api/generator/:id` calls `GET ${BASE_API_URL}/generator/:id`.
- [ ] Route returns the generator profile JSON on success.
- [ ] Route handles missing ID and backend failure with clear JSON errors.
- [ ] If auth token forwarding is needed, implementation forwards the session token or documents the blocker.
- [ ] Gate check passes: `npm run lint`
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; optionally call `/api/generator/{id}` against the configured backend.

---

### T5: Add Collection Request API Route

**What**: Create the route handler that submits the create collection request.
**Where**: `src/app/api/collections/request/route.ts`
**Depends on**: T2
**Reuses**: API proxy patterns from `src/app/api/register/route.ts`
**Requirement**: CC-04, CC-06

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] `POST /api/collections/request` reads `generatorId`, optional `addressId`, `materialIds`, and `weight`.
- [ ] Route posts the body to `POST ${COLLECT_API_URL}/generator/request`.
- [ ] Route validates required payload fields before forwarding.
- [ ] Backend errors are returned with useful JSON and status.
- [ ] Gate check passes: `npm run lint`
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; optionally post a sample body to `/api/collections/request` against the configured backend.

---

### T6: Refactor Create Collection Form State

**What**: Replace ad hoc page state with typed state for address mode, selected material IDs, weight, loading states, and errors.
**Where**: `src/app/collections/new/page.tsx`
**Depends on**: T3, T4, T5
**Reuses**: Current page layout, `Header`, `Sidebar`, and existing material dropdown behavior
**Requirement**: CC-01, CC-02, CC-03, CC-04, CC-06

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] Page state tracks `useRegisteredAddress`, optional `addressId`, address fields, `materialIds`, `weight`, loading, and errors.
- [ ] Materials load from `/api/materials` on page load.
- [ ] Selected material state stores backend material names as values.
- [ ] Existing auth redirect behavior remains.
- [ ] Gate check passes: `npm run lint`
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; run the page locally and verify materials render from the API route.

---

### T7: Implement Registered Address and CEP Behavior

**What**: Implement address mode behavior for registered address autofill and manual CEP enrichment.
**Where**: `src/app/collections/new/page.tsx`, plus CEP helper/route if chosen
**Depends on**: T6
**Reuses**: Generator profile route from T4 and typed helpers from T2
**Requirement**: CC-02, CC-03, CC-06

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] Checking "Localizacao cadastrada" fetches `/api/generator/:id`.
- [ ] First/default registered address fills CEP, number, and complement.
- [ ] Registered address mode enriches street, city, and neighborhood with ViaCEP.
- [ ] Registered address mode does not block when the address has no ID.
- [ ] Unchecking the box returns to manual editable address mode.
- [ ] Manual CEP entry fills street, city, and neighborhood.
- [ ] CEP failure shows inline feedback without clearing user data.
- [ ] Gate check passes: `npm run lint`
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; manually toggle registered address and enter CEP in the local UI.

---

### T8: Implement Submit and Confirmation Modal

**What**: Submit valid form data and show a success pop-up after creation.
**Where**: `src/app/collections/new/page.tsx`
**Depends on**: T7
**Reuses**: Collection request route from T5 and `button` style from `src/app/components/ui.tsx`
**Requirement**: CC-04, CC-06

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] Confirm button validates required fields before sending.
- [ ] Submit sends `generatorId`, optional `addressId`, `materialIds`, and numeric `weight` to `/api/collections/request`.
- [ ] Submit button disables during pending request.
- [ ] API success opens a confirmation pop-up.
- [ ] API failure shows an actionable error and preserves form values.
- [ ] Gate check passes: `npm run lint`
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; submit a valid mocked or backend-backed request and verify the modal appears.

---

### T9: Clean Up UI and Remove Empresa Field

**What**: Remove the "Empresa" field and polish responsive layout states for the final form.
**Where**: `src/app/collections/new/page.tsx`
**Depends on**: T8
**Reuses**: Existing CYCO styles in `globals.css` and `ui.tsx`
**Requirement**: CC-05

**Tools**:

- MCP: filesystem
- Skill: NONE

**Done when**:

- [ ] The "Empresa" input is removed.
- [ ] Address, material, weight, information/help, cancel, and confirm controls remain usable.
- [ ] Loading, empty, error, and success states do not overlap or shift incoherently on mobile or desktop.
- [ ] Gate check passes: `npm run lint`
- [ ] Test count: 0 automated tests exist currently.

**Tests**: none
**Gate**: quick

**Verify**:
Run `npm run lint`; inspect `/collections/new` at mobile and desktop widths.

---

### T10: Build Verification and State Update

**What**: Run final verification and update spec/task state.
**Where**: `.specs/features/create-collection/tasks.md`, `.specs/project/STATE.md`
**Depends on**: T9
**Reuses**: Testing gate guidance from `.specs/codebase/TESTING.md`
**Requirement**: CC-01, CC-02, CC-03, CC-04, CC-05, CC-06

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [ ] `npm run lint` passes or any pre-existing issues are documented.
- [ ] `npm run build` passes or any blocker is documented.
- [ ] Manual verification covers materials, registered address, CEP enrichment, submit, and modal.
- [ ] Tasks and STATE are updated with completion/blockers.
- [ ] Test count: 0 automated tests exist currently unless a test stack was added during implementation.

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
    T5

Phase 3:
  T3 + T4 + T5 -> T6 -> T7 -> T8 -> T9

Phase 4:
  T9 -> T10
```

No tasks are marked `[P]` in this draft because the user did not request sub-agent execution, and the implementation changes converge on the same page/API surface. If execution is delegated later, T3, T4, and T5 are the best candidates for parallel work because they touch separate route files after T2.

## Pre-Approval Checks

### Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Align Environment Contract | Env contract | OK |
| T2: Add Create Collection Types and Helpers | One helper module | OK |
| T3: Harden Materials API Route | One endpoint | OK |
| T4: Add Generator Profile API Route | One endpoint | OK |
| T5: Add Collection Request API Route | One endpoint | OK |
| T6: Refactor Create Collection Form State | One page state refactor | OK |
| T7: Implement Registered Address and CEP Behavior | One address behavior slice | OK |
| T8: Implement Submit and Confirmation Modal | One submit/success slice | OK |
| T9: Clean Up UI and Remove Empresa Field | One UI cleanup slice | OK |
| T10: Build Verification and State Update | Verification/docs | OK |

### Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | None | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T2 | T2 -> T4 | Match |
| T5 | T2 | T2 -> T5 | Match |
| T6 | T3, T4, T5 | T3 + T4 + T5 -> T6 | Match |
| T7 | T6 | T6 -> T7 | Match |
| T8 | T7 | T7 -> T8 | Match |
| T9 | T8 | T8 -> T9 | Match |
| T10 | T9 | T9 -> T10 | Match |

### Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Env/docs | none | none | OK |
| T2 | Utility/types | none currently established | none | OK |
| T3 | API route handler | integration recommended, no framework configured | none | OK for current matrix |
| T4 | API route handler | integration recommended, no framework configured | none | OK for current matrix |
| T5 | API route handler | integration recommended, no framework configured | none | OK for current matrix |
| T6 | Page/component | component/E2E recommended, no framework configured | none | OK for current matrix |
| T7 | Page/component + address helper | component/E2E recommended, no framework configured | none | OK for current matrix |
| T8 | Page/component + submit flow | E2E recommended, no framework configured | none | OK for current matrix |
| T9 | Page/component | component/E2E recommended, no framework configured | none | OK for current matrix |
| T10 | Verification/docs | none | none | OK |

## Before Execution

Available skills for execution: `tlc-spec-driven`, plus general coding support. The repo has no automated test framework yet, so implementation should use `npm run lint` and `npm run build` as gates unless you choose to add test infrastructure as part of this feature.

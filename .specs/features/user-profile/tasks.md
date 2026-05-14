# User Profile Tasks

**Spec**: `.specs/features/user-profile/spec.md`
**Design**: `.specs/features/user-profile/design.md`
**Status**: Done
**Created:** 2026-05-14
**Completed:** 2026-05-14

**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npm run build` passed after network access was allowed for Next.js Google font fetching.

**Implementation notes:**

- Added `src/app/lib/userProfile.ts` for defensive role-aware profile normalization, including collector materials.
- Added `/profile` with authenticated shell, role-based fetch, loading/error/retry states, and read-only profile sections.
- Updated `Header` avatar to link to `/profile`.
- Added `Perfil` to the sidebar for both generator and collector users.

## Execution Plan

```text
T1 -> T2 -> T3 -> T4 -> T5
```

This is a medium feature: one normalization helper, one page, navigation updates, and final verification.

---

## Task Breakdown

### T1: Add User Profile Normalization Helpers

**What**: Create defensive profile normalization and display helpers.
**Where**: `src/app/lib/userProfile.ts`
**Depends on**: None
**Reuses**: Normalization style from `src/app/lib/collectionsPage.ts` and `src/app/lib/routes.ts`.
**Requirement**: UP-02, UP-03

**Done when**:

- [x] `UserProfileView` and related display types are exported.
- [x] Normalization unwraps `{ data: profile }` responses.
- [x] Generator and collector roles are supported.
- [x] Identity, contact, enterprise, address, and additional scalar fields are normalized.
- [x] Collector materials are normalized from strings or value objects.
- [x] Phone and address values render defensively.
- [x] Empty sections are omitted.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual sample normalization; no automated test framework currently configured.
**Gate**: quick

---

### T2: Add Profile Page Shell and Fetch Flow

**What**: Create `/profile` with auth handling, role-based profile fetch, and page states.
**Where**: `src/app/profile/page.tsx`
**Depends on**: T1
**Reuses**: `Header`, `Sidebar`, `button`, `getSessionMeta`, `isGeneratorRole`, `isCollectorRole`.
**Requirement**: UP-01, UP-02

**Done when**:

- [x] `/profile` exists.
- [x] Unauthenticated users are redirected to `/auth/login`.
- [x] Missing session ID or unsupported role shows a recoverable error.
- [x] Generators fetch `/api/generator/[id]`.
- [x] Collectors fetch `/api/waste-collector/[id]`.
- [x] Authorization token is forwarded when available.
- [x] Loading, error, retry, and ready states render.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual role-based fetch checks.
**Gate**: quick

---

### T3: Render Profile Information Sections

**What**: Render all normalized profile sections in a responsive, readable profile page.
**Where**: `src/app/profile/page.tsx`
**Depends on**: T1, T2
**Reuses**: Existing Tailwind authenticated page styling.
**Requirement**: UP-03

**Done when**:

- [x] Summary section shows name, role, email, and profile ID when available.
- [x] Identity section renders available identity fields.
- [x] Contact section renders available phone/contact fields.
- [x] Enterprise section renders available enterprise fields.
- [x] Materials section renders available collector materials.
- [x] Address section renders every normalized address.
- [x] Additional scalar details section renders useful extra top-level fields.
- [x] Missing sections are not rendered as empty cards.
- [x] Mobile and desktop layouts remain readable.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual responsive check with generator and collector profiles.
**Gate**: quick

---

### T4: Add Profile Navigation Entry Points

**What**: Make profile access discoverable from authenticated navigation.
**Where**:

- `src/app/components/Header.tsx`
- `src/app/components/Sidebar.tsx`

**Depends on**: T2
**Reuses**: Existing avatar and sidebar icon patterns.
**Requirement**: UP-04

**Done when**:

- [x] Header avatar navigates to `/profile`.
- [x] Header avatar has an accessible label.
- [x] Sidebar includes a `Perfil` navigation item.
- [x] Profile navigation is visible for generator and collector users.
- [x] Existing route filtering for generators still hides only route links.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual navigation checks from authenticated pages.
**Gate**: quick

---

### T5: Verify Build and Update TLC State

**What**: Run final verification and update feature tracking after implementation.
**Where**:

- `.specs/features/user-profile/spec.md`
- `.specs/features/user-profile/tasks.md`
- `.specs/project/STATE.md`

**Depends on**: T1, T2, T3, T4
**Reuses**: Gate guidance from `.specs/codebase/TESTING.md`.
**Requirement**: UP-01, UP-02, UP-03, UP-04

**Done when**:

- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npm run build` passes or blockers are documented.
- [x] Requirement traceability in `spec.md` is updated as tasks complete.
- [x] `STATE.md` records profile endpoint and display decisions.
- [x] Manual verification notes cover generator profile, collector profile, missing data, and navigation.

**Tests**: Lint, build, manual UI verification.
**Gate**: build

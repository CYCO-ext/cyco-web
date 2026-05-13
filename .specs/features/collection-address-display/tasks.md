# Collection Address Display Tasks

**Spec**: `.specs/features/collection-address-display/spec.md`
**Status**: Done
**Created:** 2026-05-13
**Completed:** 2026-05-13

**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npm run build` initially failed in the sandbox because Next.js could not fetch Google Fonts, then passed after network access was allowed.

**Implementation notes:**

- Added normalized collection address support and a shared `formatCollectionAddress` helper.
- Updated get-by-id normalization to support single-object collection responses.
- Updated home next/recent collection cards, `/collections` cards, route suggestion candidates/results, and saved route collection details to prefer readable address text.

## Execution Plan

```text
T1 -> T2 -> T3
      ├-> T4
      └-> T5 -> T6
```

T1 and T2 establish the shared data contract and formatter. T3, T4, and T5 update independent UI surfaces. T6 verifies the full feature.

---

## Task Breakdown

### T1: Extend Collection Address Types and Normalization

**What**: Add a normalized address type to collection summaries and parse the nested `address` object from the new API response.
**Where**: `src/app/lib/collectionsPage.ts`
**Depends on**: None
**Reuses**: Existing `stringFrom`, `numberFrom`, `numberFieldFrom`, and `normalizeCollections` patterns.
**Requirement**: CA-01

**Done when**:

- [x] `CollectionAddress` is exported with `id`, `street`, `number`, `city`, `state`, `zipCode`, `latitude`, `longitude`, `enrichmentStatus`, and `enrichmentSource` fields.
- [x] `CollectionSummary` includes optional `address?: CollectionAddress`.
- [x] `normalizeCollections` handles array responses, wrapped array responses, and a single collection object.
- [x] Address fields are normalized defensively and do not invalidate otherwise valid collection items.
- [x] Numeric latitude/longitude values are preserved when valid.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual sample normalization; no test framework currently configured.
**Gate**: quick

---

### T2: Add Shared Collection Address Formatter

**What**: Create a reusable helper that converts collection address data into user-facing text with fallbacks.
**Where**: `src/app/lib/collectionsPage.ts`
**Depends on**: T1
**Reuses**: Existing formatter export style, such as `formatWeight`, `formatDate`, and `statusLabel`.
**Requirement**: CA-02

**Done when**:

- [x] A helper such as `formatCollectionAddress(collection)` is exported.
- [x] Full addresses render as `Street, number - City/State` or a similarly concise Brazilian address format.
- [x] Partial address data renders without dangling separators.
- [x] Missing nested address falls back to shortened `addressId`.
- [x] Missing address and address ID falls back to shortened collection ID.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual cases for full, partial, ID-only, and collection-only fallback.
**Gate**: quick

---

### T3: Update Home Collection View Models and Next Card

**What**: Feed formatted addresses into home dashboard view models and ensure upcoming collection cards show the readable address.
**Where**:

- `src/app/lib/homeCollections.ts`
- `src/app/components/home/cards/NextCollectionsCard.tsx`

**Depends on**: T2
**Reuses**: Existing `NextCollectionView.location` field and card layout.
**Requirement**: CA-03

**Done when**:

- [x] `mapCollectionsToNextViews` uses the shared address formatter for `location`.
- [x] `NextCollectionsCard` continues to render loading, error, empty, material, time, and weight states unchanged.
- [x] Long addresses truncate or wrap cleanly in the card layout.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual render with the provided `Rua Fiorentina` sample response.
**Gate**: quick

---

### T4: Update Last Collections Rows With Address Context

**What**: Add compact address context to recent collection rows.
**Where**:

- `src/app/lib/homeCollections.ts`
- `src/app/components/home/cards/LastCollectionsCard.tsx`

**Depends on**: T2
**Reuses**: Existing `LastCollectionRowView` mapping and row layout.
**Requirement**: CA-03

**Done when**:

- [x] `LastCollectionRowView` includes an address or location field.
- [x] `mapCollectionsToLastRows` populates the field with the shared formatter.
- [x] `LastCollectionsCard` displays the address context without making the row cramped or overlapping.
- [x] Existing status, date, weight, and rating behavior remains unchanged.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual desktop and mobile layout check with a long street name.
**Gate**: quick

---

### T5: Update Collections and Route Cards

**What**: Display collection addresses on the main collections page and replace raw address IDs in route-related collection snippets where collection data is available.
**Where**:

- `src/app/collections/page.tsx`
- `src/app/routes/suggest/page.tsx`
- `src/app/routes/saved/page.tsx`

**Depends on**: T2
**Reuses**: Existing collection card and route snippet layouts.
**Requirement**: CA-04, CA-05

**Done when**:

- [x] `/collections` cards display collection address separately from counterpart profile details.
- [x] `/collections` cards fall back gracefully when nested address is missing.
- [x] `routes/suggest` prefers formatted address over raw `addressId`.
- [x] `routes/saved` prefers formatted address over raw `addressId` where the saved state has collection data.
- [x] Mobile and desktop layouts do not overlap action controls, status badges, or metadata.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual checks on `/collections`, `/routes/suggest`, and `/routes/saved`.
**Gate**: quick

---

### T6: Verify Build and Update TLC State

**What**: Run final verification and update the feature tracking status after implementation.
**Where**:

- `.specs/features/collection-address-display/spec.md`
- `.specs/features/collection-address-display/tasks.md`
- `.specs/project/STATE.md`

**Depends on**: T3, T4, T5
**Reuses**: Gate guidance from `.specs/codebase/TESTING.md`.
**Requirement**: CA-01, CA-02, CA-03, CA-04, CA-05

**Done when**:

- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npm run build` passes or blockers are documented.
- [x] Provided sample get-by-id response renders readable address text.
- [x] Search-by-filters array response renders readable address text in every touched collection card.
- [x] Requirement traceability in `spec.md` is updated from Planned to Verified as appropriate.
- [x] `STATE.md` records any decisions, blockers, or follow-up ideas.

**Tests**: Lint, build, and manual UI verification.
**Gate**: build

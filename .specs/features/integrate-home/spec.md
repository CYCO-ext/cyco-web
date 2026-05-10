# Integrate Home Specification

## Problem Statement

The authenticated home dashboard currently shows static collection data. Users need the dashboard collection cards to reflect their real collections from the collections API, scoped to their authenticated role.

## Goals

- [x] Replace static home collection data with API-backed data.
- [x] Reuse the existing local `GET /api/collections/search` route handler.
- [x] Search by `generatorId` for generator users and `collectorId` for waste collector users.
- [x] Show the count of in-progress collections in the "Coletas em andamento" card.
- [x] Show the first 2 API collections in `NextCollectionsCard`.
- [x] Show the first 2 API collections in `LastCollectionsCard`.
- [x] Adapt card layouts to the existing collection API return shape.
- [x] Keep dashboard loading, empty, and error states understandable.

## Out of Scope

| Feature | Reason |
| --- | --- |
| New backend endpoints | The request explicitly says to use the existing collections search endpoint. |
| Pagination | The cards only need counts and the first 2 collection items. |
| Collection detail page changes | Cards may link to existing routes, but detail behavior is not part of this feature. |
| Coins and environmental impact integration | The request only covers collection cards. |
| Ratings persistence | Current `LastCollectionsCard` has a static rating column; this feature only maps collection data. |

---

## Assumptions

- NextAuth session follows `{ user: { id, name, email }, role, token }`.
- Home can reuse `getSessionMeta`, `isGeneratorRole`, and `isCollectorRole` logic already used by `/collections`.
- `GET /api/collections/search` already proxies to `GET ${COLLECTIONS_API_URL}/collections/search`.
- Active collection count means collections with `status=IN_PROGRESS`.
- `NextCollectionsCard` and `LastCollectionsCard` should show at most 2 items.
- If the backend does not provide scheduling fields, cards use `createdAt` or `updatedAt` as the displayed date/time.
- If the backend does not provide address details, cards use a fallback such as collection ID or selected collector state instead of a location.
- API order is accepted for the "first 2 items" unless the backend later documents a sort contract.

---

## User Stories

### P1: Role-Scoped Home Collection Query

**User Story**: As an authenticated user, I want dashboard collection cards to show only collections relevant to my profile so that the home page reflects my real work.

**Why P1**: All home card data depends on the correct role-scoped API query.

**Acceptance Criteria**:

1. WHEN a generator opens home THEN the system SHALL query collections with `generatorId=<session.user.id>`.
2. WHEN a waste collector opens home THEN the system SHALL query collections with `collectorId=<session.user.id>`.
3. WHEN the API call is made THEN the system SHALL use `GET /api/collections/search` instead of calling backend URLs directly from the browser.
4. WHEN the session token exists THEN the system SHALL forward it as `Authorization: Bearer <token>`.
5. WHEN the role or user ID is missing THEN the collection cards SHALL show safe empty/error states.

**Independent Test**: Mock generator and collector sessions and verify the query parameter key changes by role.

---

### P1: Active Collections Count

**User Story**: As a user, I want to see how many collections are in progress so that I can quickly understand current operational load.

**Why P1**: The user explicitly requested integrating the "Coletas em andamento" card with the API and counting results.

**Acceptance Criteria**:

1. WHEN home loads THEN the active card SHALL request or derive collections filtered to `IN_PROGRESS`.
2. WHEN in-progress collections load successfully THEN the card SHALL display the count.
3. WHEN no in-progress collections exist THEN the card SHALL display `0`.
4. WHEN loading THEN the card SHALL avoid showing stale hardcoded values.
5. WHEN the API fails THEN the card SHALL show a fallback state and keep the link to `/collections`.

**Independent Test**: Mock three `IN_PROGRESS` collections and verify the card count is `3`.

---

### P1: Next Collections Card Integration

**User Story**: As a collector, I want the "Próximas Coletas" card to show upcoming collection items from the API so that I can see my next work from the home page.

**Why P1**: The existing layout shows this card for waste collectors and the user explicitly requested integrating it.

**Acceptance Criteria**:

1. WHEN API collections load THEN `NextCollectionsCard` SHALL receive the first 2 mapped items.
2. WHEN a collection has `materialIds` THEN the card SHALL show those material names.
3. WHEN a collection has `weight` THEN the card SHALL show the weight in kilograms.
4. WHEN date/time fields are missing THEN the card SHALL format `createdAt` or `updatedAt`.
5. WHEN no collections exist THEN the card SHALL show its empty state.

**Independent Test**: Mock a collection search response with 3 items and verify only 2 are rendered.

---

### P1: Last Collections Card Integration

**User Story**: As a generator, I want the "Últimas coletas" card to show recent collection items from the API so that my dashboard reflects real collection history.

**Why P1**: The existing layout shows this card for generators and the user explicitly requested integrating it.

**Acceptance Criteria**:

1. WHEN API collections load THEN `LastCollectionsCard` SHALL receive the first 2 mapped items.
2. WHEN a collection has `status` THEN the card SHALL show the Portuguese status label.
3. WHEN a collection has `weight` THEN the card SHALL show the weight in kilograms.
4. WHEN a collection has a date THEN the card SHALL show a compact date.
5. WHEN no collections exist THEN the card SHALL show an empty state instead of a blank panel.

**Independent Test**: Mock a collection search response with 3 items and verify only 2 are rendered with mapped status labels.

---

## Edge Cases

- WHEN the user is unauthenticated THEN the home page SHALL continue redirecting to `/auth/login`.
- WHEN `GET /api/collections/search` returns malformed items THEN the system SHALL use normalized valid items only.
- WHEN the backend returns an error THEN collection cards SHALL show safe fallback states.
- WHEN the search response is empty THEN active count SHALL be `0` and list cards SHALL show empty states.
- WHEN collection dates are invalid THEN cards SHALL show a fallback date label.
- WHEN material names are missing THEN cards SHALL show a "Sem materiais" fallback.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| IH-01 | P1: Role-Scoped Home Collection Query | Execute | Verified |
| IH-02 | P1: Active Collections Count | Execute | Verified |
| IH-03 | P1: Next Collections Card Integration | Execute | Verified |
| IH-04 | P1: Last Collections Card Integration | Execute | Verified |
| IH-05 | Edge cases and validation | Execute | Verified with build blocker documented |

**Coverage:** 5 total, 5 implemented and verified with build network blocker documented.

---

## Success Criteria

- [x] Home uses real collection data from `/api/collections/search`.
- [x] Active card count reflects `IN_PROGRESS` collections for the current role.
- [x] Next collections shows at most 2 API-backed items.
- [x] Last collections shows at most 2 API-backed items.
- [x] Empty/loading/error states replace hardcoded data.
- [x] `npm run lint` and `npx tsc --noEmit` pass after implementation.
- [ ] `npm run build` needs network access for Google font fetching.

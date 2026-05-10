# Collections Page Specification

## Problem Statement

Generators and collectors need a single place to review collection requests relevant to them. The current navigation already points to `/collections`, but there is no documented collections page that searches collections by role, user ID, and status.

## Goals

- [x] Add a `/collections` page for authenticated users.
- [x] Filter collections by status.
- [x] For generators, query collections using `generatorId`.
- [x] For collectors, query collections using `collectorId`.
- [x] Call `GET ${COLLECTIONS_API_URL}/collections/search` through a local route handler using query parameters.
- [x] Render collection rows/cards from the provided collection result shape.
- [x] For generators, hide generator profile information and show selected collector information when available.
- [x] For collectors, hide collector profile information and show generator information.
- [x] For collectors, provide a quick accept action for collection requests.
- [x] Show quick accept only for pending collections.
- [x] Show finish action for in-progress collections for both generators and collectors.
- [x] Disable finish action when the current user already confirmed the collection.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Generic status management | Only collector quick accept and role-specific finish confirmation are included. |
| Pagination or infinite scroll | Not included in the requested contract. |
| Detailed collection page | This feature only adds the listing page. |
| Exporting reports | Operational reporting belongs to a future analytics feature. |

---

## Assumptions

- NextAuth session follows `{ user: { id, name, email }, role, token }`.
- For role `GENERATOR`, the page sends `generatorId=session.user.id`.
- For role `WASTE_COLLECTOR`, the page sends `collectorId=session.user.id`.
- `COLLECTIONS_API_URL` is the backend base URL for `GET /collections/search`.
- `BASE_API_URL` is the backend base URL for profile lookup routes. The user request named `BASE_URL_API`, but the current project environment uses `BASE_API_URL`.
- Generator profile lookup uses `GET ${BASE_API_URL}/generator/[id]`.
- Waste collector profile lookup uses `GET ${BASE_API_URL}/waste-collector/[id]`.
- Collector quick accept uses `POST ${COLLECTIONS_API_URL}/collections/requests/[id]/accept`.
- Generator finish confirmation uses `POST ${COLLECTIONS_API_URL}/requests/[id]/confirm-generator`.
- Collector finish confirmation uses `POST ${COLLECTIONS_API_URL}/requests/[id]/confirm-collector`.
- Status values include at least `PENDING`; the UI should be able to support other backend statuses defensively.
- The existing sidebar route `/collections` should open this page.

---

## User Stories

### P1: Role-Based Collections List MVP

**User Story**: As an authenticated generator or collector, I want to see my relevant collections so that I can track collection requests.

**Why P1**: Listing role-specific collections is the core capability.

**Acceptance Criteria**:

1. WHEN a generator opens `/collections` THEN the system SHALL request collections with `generatorId=<session.user.id>`.
2. WHEN a collector opens `/collections` THEN the system SHALL request collections with `collectorId=<session.user.id>`.
3. WHEN the route handler is called THEN it SHALL call `GET ${COLLECTIONS_API_URL}/collections/search` with the provided query params.
4. WHEN collections load successfully THEN the system SHALL render collection ID, materials, weight, status, created date, and confirmation flags when available.
5. WHEN collections return an empty array THEN the system SHALL show an empty state.

**Independent Test**: Mock a generator session and collections response, open `/collections`, and verify the request uses `generatorId` and renders the collection.

---

### P1: Status Filtering MVP

**User Story**: As a user, I want to filter collections by status so that I can focus on requests in a specific state.

**Why P1**: The request explicitly requires status filtering.

**Acceptance Criteria**:

1. WHEN the page loads THEN the system SHALL show an "Todos" status option.
2. WHEN the user selects a status THEN the system SHALL add `status=<selected status>` to the search query.
3. WHEN the user clears the status filter THEN the system SHALL remove the status query param.
4. WHEN the status changes THEN the system SHALL refresh the collection list.

**Independent Test**: Select `PENDING` and verify the local API route receives `status=PENDING`.

---

### P2: Collection Card Usability

**User Story**: As a user, I want collection information to be easy to scan so that I can quickly understand request state.

**Why P2**: The API result has enough structured fields to render a useful operational view.

**Acceptance Criteria**:

1. WHEN a collection has `materialIds` THEN the system SHALL render material names as labels.
2. WHEN a collection has `weight` THEN the system SHALL show it in kilograms.
3. WHEN a collection has `selectedCollectorId` THEN the system SHALL indicate that a collector has been selected.
4. WHEN confirmation flags are present THEN the system SHALL show generator and collector confirmation states.
5. WHEN dates are present THEN the system SHALL format them for display.

**Independent Test**: Render the provided sample response and verify all visible fields appear.

---

### P1: Role-Based Counterpart Information

**User Story**: As a generator or collector, I want to see information about the other party in the collection so that I can understand who is involved without seeing redundant information about myself.

**Why P1**: The user explicitly requested role-specific profile display and hidden own-party information.

**Acceptance Criteria**:

1. WHEN a generator views `/collections` THEN the system SHALL NOT show generator profile information in collection cards.
2. WHEN a generator views a collection with `selectedCollectorId` THEN the system SHALL fetch collector information from `GET ${BASE_API_URL}/waste-collector/[selectedCollectorId]`.
3. WHEN a generator views a collection without `selectedCollectorId` THEN the system SHALL show that no collector has been selected yet.
4. WHEN a collector views `/collections` THEN the system SHALL NOT show collector profile information in collection cards.
5. WHEN a collector views a collection with `generatorId` THEN the system SHALL fetch generator information from `GET ${BASE_API_URL}/generator/[generatorId]`.
6. WHEN profile lookup fails THEN the system SHALL keep the collection visible and show a lightweight fallback using the available ID.

**Independent Test**: Mock generator and collector sessions separately, render the same collection, and verify only the opposite party profile is requested and displayed.

---

### P1: Collector Quick Accept

**User Story**: As a collector, I want to quickly accept a collection request from the list so that I can claim collection work without opening another page.

**Why P1**: The user explicitly requested a collector accept button on the collections page.

**Acceptance Criteria**:

1. WHEN the authenticated user role is `WASTE_COLLECTOR` and the collection status is `PENDING` THEN the collection card SHALL show an accept button.
2. WHEN the authenticated user role is `GENERATOR` THEN the accept button SHALL NOT be shown.
3. WHEN the collection status is not `PENDING` THEN the accept button SHALL NOT be shown.
4. WHEN a collector clicks accept THEN the system SHALL send `POST ${COLLECTIONS_API_URL}/collections/requests/[id]/accept` through a local API route.
5. WHEN accept succeeds THEN the system SHALL show success feedback and refresh the collection list or update the accepted collection card.
6. WHEN accept fails THEN the system SHALL show an error and keep the button available.
7. WHEN accept is in progress THEN the system SHALL prevent duplicate accept submissions for that collection.

**Independent Test**: Mock a collector session, click accept on a pending collection, and verify the local route posts to the backend accept endpoint.

---

### P1: Finish In-Progress Collection

**User Story**: As a generator or collector, I want to confirm that an in-progress collection is finished so that the collection can move toward completion.

**Why P1**: The user explicitly requested a finish button for both roles on in-progress collections.

**Acceptance Criteria**:

1. WHEN a collection status is `IN_PROGRESS` THEN the system SHALL show a finish button for generator and collector users.
2. WHEN a collection status is not `IN_PROGRESS` THEN the finish button SHALL NOT be shown.
3. WHEN a generator clicks finish THEN the system SHALL send `POST ${COLLECTIONS_API_URL}/requests/[id]/confirm-generator` through a local API route.
4. WHEN a collector clicks finish THEN the system SHALL send `POST ${COLLECTIONS_API_URL}/requests/[id]/confirm-collector` through a local API route.
5. WHEN finish succeeds THEN the system SHALL show success feedback and refresh the collection list or update the finished collection card.
6. WHEN finish fails THEN the system SHALL show an error and keep the button available.
7. WHEN finish is in progress THEN the system SHALL prevent duplicate finish submissions for that collection.
8. WHEN the current user already confirmed the collection THEN the finish button SHALL be disabled.

**Independent Test**: Mock generator and collector sessions on an `IN_PROGRESS` collection and verify each role posts to its corresponding confirm endpoint.

---

## Edge Cases

- WHEN the user is unauthenticated THEN the system SHALL redirect to `/auth/login`.
- WHEN the session has no user ID THEN the system SHALL show an error and not query the backend.
- WHEN the role is unknown THEN the system SHALL show an access/configuration error.
- WHEN the backend returns an error THEN the system SHALL show an error with retry.
- WHEN the backend returns malformed data THEN the system SHALL render only valid collection items.
- WHEN status is unsupported by the backend THEN the system SHALL show the backend error.
- WHEN counterpart profile data is missing or malformed THEN the system SHALL show the collection with fallback text instead of removing it.
- WHEN many collections reference the same counterpart ID THEN the system SHOULD avoid repeated duplicate profile requests within the same page session.
- WHEN a collector accepts a request that is no longer eligible THEN the system SHALL show the backend error and allow refresh.
- WHEN a user finishes a request that is no longer in progress THEN the system SHALL show the backend error and allow refresh.
- WHEN the current user's confirmation flag is already true THEN the system SHALL not allow another finish submission from that user.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CP-01 | P1: Role-Based Collections List | Execute | Verified |
| CP-02 | P1: Status Filtering | Execute | Verified |
| CP-03 | P2: Collection Card Usability | Execute | Verified |
| CP-04 | Edge cases and validation | Execute | Verified |
| CP-05 | P1: Role-Based Counterpart Information | Execute | Verified |
| CP-06 | P1: Collector Quick Accept | Execute | Verified |
| CP-07 | P1: Finish In-Progress Collection | Execute | Verified |

**Coverage:** 7 total, 7 implemented and verified.

---

## Success Criteria

- [ ] `/collections` loads role-specific collections.
- [ ] Generators query with `generatorId`.
- [ ] Collectors query with `collectorId`.
- [ ] Status filter sends query params to `/collections/search`.
- [ ] The provided sample response renders coherently.
- [x] Generators see selected collector information, not generator profile information.
- [x] Collectors see generator information, not collector profile information.
- [x] Collectors can quick accept eligible collection requests.
- [x] Quick accept appears only for pending collections.
- [x] In-progress collections show role-specific finish actions.
- [x] Finish action is disabled after the current user confirms.
- [x] `npm run lint` and `npm run build` pass after implementation.

# Routes Specification

## Problem Statement

Waste collectors need a way to build efficient route suggestions from multiple collection requests. The current home dashboard has a generator-focused "create collection" card, but collectors need a collector-specific action that leads to a route suggestion workflow.

## Goals

- [x] Add a collector-only home card that redirects to a route suggestion page.
- [x] Replace `CreateCollectionCard` with the new route suggestion card only on collector home.
- [x] Keep `CreateCollectionCard` visible for generator home.
- [x] Add a route suggestion request page for collectors.
- [x] Let collectors choose which collection requests to include in the route.
- [x] Let collectors inform vehicle count and vehicle capacity.
- [x] Let collectors choose current location or registered location as route start.
- [x] Submit route suggestion requests to `POST ${COLLECTIONS_API_URL}/collectors/routes/suggest`.
- [x] Render route suggestion results from the provided response shape.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Persisting suggested routes | The provided contract returns a suggestion only; no save endpoint was provided. |
| Map visualization | Useful later, but not required by the request. |
| Turn-by-turn navigation | Belongs to a future logistics/navigation feature. |
| Editing collection requests | This feature only selects existing requests as candidates. |
| Manual coordinate entry | Start coordinates must come from current geolocation or the registered collection address endpoint. |
| Geocoding addresses | Start uses coordinates in the provided contract. |

---

## Assumptions

- NextAuth session follows `{ user: { id, name, email }, role, token }`.
- Only users with role `WASTE_COLLECTOR` or `CATADOR` can access the route suggestion page.
- `collectorId` comes from `session.user.id` via `getSessionMeta(session).generatorId`.
- Candidate collection requests can be loaded with the existing `GET /api/collections/search?collectorId=<id>&status=IN_PROGRESS` route.
- Route suggestion candidates must be only `IN_PROGRESS` collections.
- Start coordinates can come from browser geolocation or from the collector's registered address via `GET ${COLLECTIONS_API_URL}/collectors/[collectorId]/address`.
- If the user chooses current location and denies geolocation permission, submit remains blocked until a valid location source is available.
- If the user chooses registered location and the registered address response does not expose coordinates, submit remains blocked until another valid location source is chosen.
- Default route options are `timeLimitSeconds=5` and `allowDroppingStops=true`, matching the provided contract.
- Vehicle capacity is numeric and uses the same weight unit as collection `weight`.

---

## User Stories

### P1: Collector Home Route Card

**User Story**: As a waste collector, I want a home dashboard card for route suggestions so that I can quickly start route planning.

**Why P1**: The user explicitly requested replacing `CreateCollectionCard` only on collector home.

**Acceptance Criteria**:

1. WHEN the authenticated user is a collector THEN home SHALL show a route suggestion card instead of `CreateCollectionCard`.
2. WHEN the authenticated user is a generator THEN home SHALL still show `CreateCollectionCard`.
3. WHEN a collector clicks the route suggestion card THEN the system SHALL navigate to the route suggestion page.
4. WHEN the route card renders THEN it SHALL match the dashboard card style and not disrupt the existing home layout.

**Independent Test**: Render home as collector and generator and verify the first card changes only for collector role.

---

### P1: Route Suggestion Candidate Selection

**User Story**: As a collector, I want to select collection requests for a route so that I control which stops are considered.

**Why P1**: Candidate request IDs are required in the route suggestion payload.

**Acceptance Criteria**:

1. WHEN the page loads for a collector THEN the system SHALL fetch candidate collections with the collector ID and `status=IN_PROGRESS`.
2. WHEN candidate collections are returned THEN the system SHALL list them with ID, materials, weight, status, and date.
3. WHEN candidate collections are displayed THEN every displayed collection SHALL have status `IN_PROGRESS`.
4. WHEN a collector selects collections THEN the system SHALL store their IDs in `candidateRequestIds`.
5. WHEN no collections are selected THEN submit SHALL be disabled or show a validation error.
6. WHEN candidate fetch fails THEN the page SHALL show an error and retry option.

**Independent Test**: Mock three candidate collections, select two, and verify the form state contains two request IDs.

---

### P1: Vehicle and Start Location

**User Story**: As a collector, I want to inform vehicles and choose my route start location so that the route suggestion matches my operation.

**Why P1**: These fields are required in the provided request contract.

**Acceptance Criteria**:

1. WHEN the form renders THEN it SHALL show vehicle count and vehicle capacity inputs.
2. WHEN vehicle count is less than 1 THEN the system SHALL show a validation error.
3. WHEN vehicle capacity is less than or equal to 0 THEN the system SHALL show a validation error.
4. WHEN the page loads THEN the system SHALL request the user's current location through browser geolocation.
5. WHEN the collector chooses current location THEN the system SHALL use browser geolocation coordinates for `start`.
6. WHEN the collector chooses registered location THEN the system SHALL use coordinates from `GET ${COLLECTIONS_API_URL}/collectors/[collectorId]/address` for `start`.
7. WHEN the selected location source is unavailable THEN the system SHALL show an error and block submit.
8. WHEN location loading fails THEN the system SHALL provide a retry action for the selected source.
9. WHEN the form renders THEN latitude and longitude SHALL NOT be editable fields.

**Independent Test**: Mock browser geolocation and registered address coordinates, switch between sources, and verify the built payload uses the selected coordinates.

---

### P1: Route Suggestion Submit

**User Story**: As a collector, I want to request a route suggestion so that I can see feasible routes for my selected collections.

**Why P1**: This is the core backend integration for the feature.

**Acceptance Criteria**:

1. WHEN the collector submits a valid form THEN the system SHALL POST through a local API route.
2. WHEN the local API route is called THEN it SHALL call `POST ${COLLECTIONS_API_URL}/collectors/routes/suggest`.
3. WHEN submitting THEN the payload SHALL include `collectorId`, `vehicleCount`, `vehicleCapacity`, `start`, `candidateRequestIds`, and `options`.
4. WHEN the session token exists THEN the local API route SHALL forward authorization.
5. WHEN the backend returns an error THEN the page SHALL show an error and keep form data.

**Independent Test**: Submit a valid form and verify the local route sends the expected backend payload.

---

### P1: Route Suggestion Results

**User Story**: As a collector, I want to see the suggested routes and unassigned collections so that I can evaluate the route result.

**Why P1**: The user provided a detailed response contract that should be visible in the UI.

**Acceptance Criteria**:

1. WHEN the backend returns a response THEN the page SHALL show `status`, solver engine, elapsed time, objective distance, and dropped stops.
2. WHEN routes are returned THEN the page SHALL render each vehicle route with vehicle index, capacity, total load, total distance, and stops.
3. WHEN stops are returned THEN the page SHALL show sequence, collection request ID, demand, accumulated load, distance from previous, and coordinates.
4. WHEN `unassigned` is not empty THEN the page SHALL show unassigned request IDs.
5. WHEN there are no routes THEN the page SHALL show a clear no-route result state.

**Independent Test**: Render the provided response and verify solver summary, two vehicle routes, stops, and unassigned section render.

---

## Edge Cases

- WHEN the user is unauthenticated THEN the page SHALL redirect to `/auth/login`.
- WHEN the user is not a collector THEN the page SHALL show an access error or redirect home.
- WHEN `COLLECTIONS_API_URL` is missing THEN the local API route SHALL return a configuration error.
- WHEN candidate collection data is malformed THEN invalid items SHALL be skipped.
- WHEN a candidate collection is not `IN_PROGRESS` THEN it SHALL not be displayed or selectable.
- WHEN `candidateRequestIds` is empty THEN submit SHALL not call the backend.
- WHEN coordinates are outside valid ranges THEN validation SHALL prevent submit.
- WHEN browser geolocation is unsupported or denied THEN submit SHALL remain blocked and the page SHALL show a retry/error state.
- WHEN registered address coordinates are missing THEN submit SHALL remain blocked for registered source and the page SHALL show a retry/error state.
- WHEN the backend returns `INFEASIBLE` or another non-feasible status THEN the result SHALL still render status and diagnostic data.
- WHEN some stops are dropped THEN dropped/unassigned information SHALL be visible.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RT-01 | P1: Collector Home Route Card | Execute | Verified |
| RT-02 | P1: Route Suggestion Candidate Selection | Execute | Verified |
| RT-03 | P1: Vehicle and Start Location | Execute | Verified |
| RT-04 | P1: Route Suggestion Submit | Execute | Verified |
| RT-05 | P1: Route Suggestion Results | Execute | Verified |
| RT-06 | Edge cases and validation | Execute | Verified |

**Coverage:** 6 total, 6 implemented and verified by lint/typecheck/build.

---

## Success Criteria

- [x] Collector home replaces `CreateCollectionCard` with the route suggestion card.
- [x] Generator home still shows `CreateCollectionCard`.
- [x] Collectors can open the route suggestion page.
- [x] Collectors can select candidate collections.
- [x] Collectors can submit vehicle/count/capacity/start location data.
- [x] Frontend posts to `POST ${COLLECTIONS_API_URL}/collectors/routes/suggest` through a local route handler.
- [x] Route suggestion response renders clearly.
- [x] `npm run lint` and `npm run build` pass after implementation.

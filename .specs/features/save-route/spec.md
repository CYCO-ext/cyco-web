# Save Route Specification

## Problem Statement

Collectors can generate route suggestions, but they cannot persist a useful suggestion for later execution. They also need a place to review saved routes and inspect vehicle-level route details.

## Goals

- [x] Add a save action to suggested route results.
- [x] Save a route suggestion through `POST /api/collectors/routes/save`.
- [x] Send `collectorId`, `source: "ROUTE_SUGGESTION"`, and the normalized suggestion payload.
- [x] Show save loading, success, duplicate/error, and disabled states.
- [x] Add a collector-only saved routes page.
- [x] Load saved routes through `GET /api/collectors/routes/saved`.
- [x] Let collectors inspect vehicle details from saved route suggestions.
- [x] Show stop address street and number when present in route data.
- [x] Show collection details in a modal from `GET /api/collections/{id}`.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Editing saved routes | No update endpoint was provided. |
| Route map visualization | Existing route suggestion feature renders textual route details. |
| Assigning routes to drivers | The contract only saves and lists collector routes. |
| Sharing saved routes | No share/export endpoint was provided. |
| Closing saved routes | Removed from the UI per product feedback. |

---

## Assumptions

- NextAuth session follows `{ user: { id, name, email }, role, token }`.
- Only users with role `WASTE_COLLECTOR` or `CATADOR` can save or view saved routes.
- `collectorId` comes from `session.user.id` via `getSessionMeta(session).generatorId`.
- The local route `POST /api/collectors/routes/save` proxies to `POST ${COLLECTIONS_API_URL}/collectors/routes/save`.
- The local route `GET /api/collectors/routes/saved` proxies to `GET ${COLLECTIONS_API_URL}/collectors/routes/saved`.
- Saved route `suggestion` can be normalized using the existing route suggestion response shape, but the UI should tolerate `{}` or partially populated suggestion objects.
- Saved route statuses include at least `OPEN`; other statuses should render as labels only.

---

## User Stories

### P1: Save Suggested Route

**User Story**: As a collector, I want to save a generated route suggestion so that I can return to it later.

**Why P1**: The user explicitly requested a save button for suggested routes.

**Acceptance Criteria**:

1. WHEN a route suggestion result is displayed THEN the page SHALL show a save button.
2. WHEN no suggestion result exists THEN the page SHALL NOT show an active save action.
3. WHEN the collector clicks save THEN the system SHALL POST through `/api/collectors/routes/save`.
4. WHEN saving THEN the payload SHALL include `collectorId`, `source: "ROUTE_SUGGESTION"`, and `suggestion`.
5. WHEN the session token exists THEN the local API route SHALL forward authorization.
6. WHEN saving succeeds with `201` THEN the page SHALL show a success state with the saved route ID.
7. WHEN saving fails THEN the page SHALL show an error and keep the suggestion result visible.
8. WHEN a suggestion has already been saved in the current page session THEN the save button SHALL be disabled or clearly indicate it is saved.

**Independent Test**: Mock a suggestion result, click save, and verify the request body and success state.

---

### P1: Saved Routes List

**User Story**: As a collector, I want to view my saved routes so that I can track planned route work.

**Why P1**: The user requested a page where collectors can view saved routes.

**Acceptance Criteria**:

1. WHEN a collector opens the saved routes page THEN the system SHALL fetch `GET /api/collectors/routes/saved`.
2. WHEN saved routes are returned THEN the page SHALL list route ID, status, assigned collection request IDs, created/updated dates, and closed date when present.
3. WHEN a saved route has suggestion details THEN the page SHALL show a compact solver summary, route counts, stop counts, total load, and objective distance.
4. WHEN a saved route has vehicle routes THEN the page SHALL render each vehicle inside an expandable details section.
5. WHEN a vehicle section is expanded THEN the page SHALL show capacity, total load, distance, stops, address street/number when available, demand, accumulated load, previous distance, and coordinates.
6. WHEN `suggestion` is empty or malformed THEN the page SHALL still render the saved route metadata.
7. WHEN no routes are returned THEN the page SHALL show an empty state.
8. WHEN loading fails THEN the page SHALL show an error and retry action.
9. WHEN a non-collector opens the page THEN the page SHALL block access or redirect.
10. WHEN a collector clicks a stop collection action THEN the page SHALL fetch `GET /api/collections/{id}` and show collection details in a modal.

**Independent Test**: Mock the provided saved-route array and verify the saved route card renders with metadata and route summary.

---

## Edge Cases

- WHEN `COLLECTIONS_API_URL` is missing THEN local API routes SHALL return a configuration error.
- WHEN the save payload misses `collectorId` or `suggestion` THEN the local save route SHALL return `400`.
- WHEN the backend returns `409` for duplicate fingerprint THEN the UI SHALL explain that the route may already be saved.
- WHEN saved route response is a single object instead of an array THEN normalization SHALL not crash and SHOULD render an empty list unless the contract is updated.
- WHEN a saved route has `assignedCollectionRequestIds: []` THEN the card SHALL show zero assigned requests.
- WHEN a saved route has `suggestion: {}` THEN the card SHALL omit solver details and still render metadata.
- WHEN a saved route has no vehicle routes THEN the vehicle details area SHALL be omitted.
- WHEN route stop data does not include street and number THEN the stop SHALL not display the raw address ID as the display address.
- WHEN collection detail fetch fails THEN the modal SHALL show an error state.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SR-01 | P1: Save Suggested Route | Execute | Verified |
| SR-02 | P1: Saved Routes List | Execute | Verified |
| SR-03 | P1: Saved Route Vehicle Details | Execute | Verified |
| SR-04 | Edge cases and validation | Execute | Verified |

**Coverage:** 4 total, 4 implemented and verified by lint/typecheck/build.

---

## Success Criteria

- [x] Route suggestion results can be saved once per generated result.
- [x] Save requests use `POST /api/collectors/routes/save` with the provided payload shape.
- [x] Collectors can open a saved routes page and see saved route cards.
- [x] Saved route cards tolerate empty suggestion objects.
- [x] Saved route vehicle details can be opened from a dropdown.
- [x] `npm run lint` and `npx tsc --noEmit` pass after implementation.

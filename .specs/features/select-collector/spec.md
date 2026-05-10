# Select Collector Specification

## Problem Statement

After a generator creates a collection request, they need to choose which nearby collector enterprise should collect the material. The current create-collection flow stops at success confirmation, so the generator cannot complete the next decision in the collection lifecycle.

## Goals

- [ ] Navigate the generator to a collector-selection page after a collection request is created.
- [ ] Fetch nearby collectors for the created request from `GET ${COLLECTIONS_API_URL}/generators/requests/[id]/collectors`.
- [ ] Let the generator choose one collector enterprise from the returned list.
- [ ] Submit the selected collector to `POST ${COLLECTIONS_API_URL}/collectors/requests/[id]/select`.
- [ ] Show clear loading, empty, error, selected, and success states.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Collector bidding or negotiation | The requested flow is a direct generator selection. |
| Map-based collector browsing | The provided API returns nearby collectors; no map requirement was provided. |
| Real-time collector availability updates | Requires polling/websocket rules not provided. |
| Changing collector after selection | Not included in the provided selection endpoint. |
| Collector-side acceptance workflow | Belongs to collector dashboard/workflow features. |

---

## Assumptions

- The create collection request API returns an ID for the created request. The frontend must extract it before navigating to collector selection.
- The new page route will be `/collections/[id]/collectors`.
- `COLLECTIONS_API_URL` is the canonical backend base URL for collector matching and selection APIs.
- Nearby collectors are collector enterprises. The exact response shape is not yet documented, so the frontend should normalize common fields while preserving the backend `id`.
- The authenticated NextAuth session follows `{ user: { id, name, email }, role, token }`.
- Only generator users can access the collector selection page.

---

## User Stories

### P1: Continue From Created Collection MVP

**User Story**: As a generator, I want to continue to collector selection after creating a request so that I can choose who collects my material.

**Why P1**: This connects the existing create-collection feature to the new selection flow.

**Acceptance Criteria**:

1. WHEN the create collection API returns success with a request ID THEN the system SHALL navigate to `/collections/[id]/collectors`.
2. WHEN the create collection API succeeds but no request ID is available THEN the system SHALL show an actionable error instead of navigating.
3. WHEN the generator closes the creation success UI THEN the system SHALL not lose the created request ID.

**Independent Test**: Mock create request success with an ID and verify the app navigates to the collector selection page for that ID.

---

### P1: List Nearby Collectors MVP

**User Story**: As a generator, I want to see nearby collector enterprises for my request so that I can compare and select one.

**Why P1**: The generator cannot make a selection without the nearby collector list.

**Acceptance Criteria**:

1. WHEN `/collections/[id]/collectors` loads THEN the system SHALL call `GET /api/collections/requests/[id]/collectors`.
2. WHEN the route handler is called THEN it SHALL call `GET ${COLLECTIONS_API_URL}/generators/requests/[id]/collectors`.
3. WHEN collectors load successfully THEN the system SHALL render selectable collector cards or rows.
4. WHEN no collectors are returned THEN the system SHALL show an empty state.
5. WHEN the backend returns an error THEN the system SHALL show an error state with retry.

**Independent Test**: Mock the route response with two collectors and verify both are selectable.

---

### P1: Select Collector MVP

**User Story**: As a generator, I want to select a collector enterprise so that my collection request is assigned to that collector.

**Why P1**: This is the core action of the feature.

**Acceptance Criteria**:

1. WHEN the user selects a collector and clicks Confirmar THEN the system SHALL call `POST /api/collections/requests/[id]/select-collector`.
2. WHEN the route handler is called THEN it SHALL call `POST ${COLLECTIONS_API_URL}/collectors/requests/[id]/select`.
3. WHEN submitting THEN the request body SHALL be `{ "collectorId": "<selected collector id>" }`.
4. WHEN no collector is selected THEN the system SHALL block submit and show validation feedback.
5. WHEN selection succeeds THEN the system SHALL show success feedback and offer navigation back to the dashboard.
6. WHEN selection fails THEN the system SHALL preserve the selection and show an actionable error.

**Independent Test**: Select a mocked collector, submit, and verify the POST body contains the collector ID.

---

### P2: Selection Page Usability

**User Story**: As a generator, I want a clear and modern selection page so that I can make a confident decision quickly.

**Why P2**: The workflow can function with a basic list, but decision quality depends on readable collector details.

**Acceptance Criteria**:

1. WHEN collector details include name, enterprise name, distance, materials, or rating THEN the system SHALL display available values without requiring all fields.
2. WHEN a collector is selected THEN the system SHALL visually distinguish the selected collector.
3. WHEN the page renders on mobile THEN the list and actions SHALL remain usable without overlap.

**Independent Test**: Open the page at mobile and desktop widths with partial collector data and verify the UI remains coherent.

---

## Edge Cases

- WHEN the user is unauthenticated THEN the system SHALL redirect to `/auth/login`.
- WHEN the authenticated user is not a generator THEN the system SHALL prevent collector selection.
- WHEN `[id]` is missing or malformed THEN the system SHALL show a not-found/error state.
- WHEN nearby collectors API returns an empty array THEN the system SHALL show an empty state and no submit action.
- WHEN collector objects have partial fields THEN the system SHALL still render a usable option using the collector ID and best available label.
- WHEN selected collector ID disappears after refetch THEN the system SHALL clear selection and ask the user to choose again.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SC-01 | P1: Continue From Created Collection | Execute | Verified |
| SC-02 | P1: List Nearby Collectors | Execute | Verified |
| SC-03 | P1: Select Collector | Execute | Verified |
| SC-04 | P2: Selection Page Usability | Execute | Verified |
| SC-05 | Edge cases and validation | Execute | Verified |

**Coverage:** 5 total, 5 mapped to design, 0 unmapped.

---

## Success Criteria

- [ ] A generator is routed from successful collection creation to `/collections/[id]/collectors`.
- [ ] Nearby collectors load from the provided backend endpoint.
- [ ] The generator can select one collector and submit `{ collectorId }`.
- [ ] Success and failure states are clear.
- [ ] `npm run lint` and `npm run build` pass after implementation.

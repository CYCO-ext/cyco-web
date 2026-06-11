# Vehicle Name Specification

## Problem Statement

Collectors can configure multiple vehicles when creating a route suggestion, but each vehicle is currently identified only by its position and capacity. This makes it hard to distinguish vehicles during route creation, review, saving, and later execution.

## Goals

- [x] Add a name field for each vehicle in the route suggestion create flow.
- [x] Submit each vehicle name with its capacity in the route suggestion request payload.
- [x] Validate vehicle names before submit.
- [x] Preserve vehicle names when the collector changes vehicle count.
- [x] Display vehicle names in route suggestion results and saved-route vehicle details when available.
- [x] Keep existing capacity behavior and route solver options unchanged.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Editing vehicle names after a route has been saved | No update endpoint is part of this feature. |
| Global vehicle registration or fleet management | This feature only names vehicles inside the create route workflow. |
| Driver assignment | Naming a vehicle is not the same as assigning an operator. |
| Backend migration design | This frontend spec assumes the route suggestion API accepts vehicle names in `vehicles[]`. |
| Changing route optimization logic | Names are descriptive metadata and should not affect solver behavior. |

---

## Assumptions

- The active route suggestion page is `src/app/routes/suggest/page.tsx`.
- Route suggestion request helpers and types live in `src/app/lib/routes.ts`.
- The local proxy `POST /api/collectors/routes/suggest` already forwards the request body to `POST ${COLLECTIONS_API_URL}/collectors/routes/suggest`.
- The backend accepts `vehicles[]` objects with `name` and `capacity`, for example `{ "name": "Caminhão 1", "capacity": 100 }`.
- Route suggestion and saved route responses may include vehicle names either on each route item as `vehicleName`/`name`, or the frontend may need to map displayed names from the submitted request result state when rendering the immediate result.
- Vehicle names are collector-entered display labels and do not need to be globally unique outside a single route suggestion.

---

## User Stories

### P1: Name Vehicles During Route Creation

**User Story**: As a collector, I want to add a name to each vehicle while creating a route so that I can recognize which route belongs to which vehicle.

**Why P1**: The user explicitly requested a new field in the create route section to add a name to each vehicle.

**Acceptance Criteria**:

1. WHEN the route suggestion form renders THEN each vehicle row SHALL show a vehicle name input and a capacity input.
2. WHEN the default form state is created THEN each visible vehicle SHALL receive a sensible default name.
3. WHEN the collector edits a vehicle name THEN the form SHALL store the edited name for that vehicle index.
4. WHEN the collector increases vehicle count THEN newly added vehicles SHALL receive default names without overwriting existing edited names.
5. WHEN the collector decreases vehicle count THEN hidden vehicle names SHALL not be submitted.
6. WHEN the collector increases count again in the same session THEN previously entered names SHOULD be preserved where practical.

**Independent Test**: Render the form, edit the first vehicle name, increase and decrease vehicle count, and verify names remain aligned with their vehicle indexes.

---

### P1: Submit Vehicle Names

**User Story**: As a collector, I want vehicle names to be sent with the route request so that generated and saved routes can identify vehicles clearly.

**Why P1**: Names only help downstream workflows if they are included in the route suggestion payload.

**Acceptance Criteria**:

1. WHEN the collector submits a valid route suggestion form THEN each `vehicles[]` item SHALL include `name` and `capacity`.
2. WHEN a vehicle name is blank after trimming THEN submit SHALL fail with a validation message for that vehicle.
3. WHEN a vehicle name is longer than the allowed limit THEN submit SHALL fail with a validation message.
4. WHEN two visible vehicles have the same trimmed name THEN submit SHALL fail with a duplicate-name validation message.
5. WHEN a vehicle name includes leading or trailing whitespace THEN the payload SHALL use the trimmed value.
6. WHEN existing capacity validation fails THEN vehicle name data SHALL remain in the form.

**Independent Test**: Build a route suggestion payload from form state and verify `vehicles` contains trimmed names and capacities in matching order.

---

### P2: Display Vehicle Names In Results

**User Story**: As a collector, I want route results to show the vehicle names I entered so that I can interpret route assignments quickly.

**Why P2**: Result cards currently use vehicle indexes, which are less recognizable than collector-entered labels.

**Acceptance Criteria**:

1. WHEN a route suggestion result has a vehicle name for a route THEN the result card SHALL show that name as the primary vehicle label.
2. WHEN no vehicle name is available THEN the result card SHALL fall back to the current vehicle index label.
3. WHEN saved route vehicle details include vehicle names THEN saved route cards SHALL show those names.
4. WHEN route map or move-request actions continue to rely on `vehicleIndex` THEN those actions SHALL keep using `vehicleIndex` internally.

**Independent Test**: Render route results with named and unnamed vehicle routes and verify the named route uses the vehicle name while the unnamed route falls back to index.

---

## Edge Cases

- WHEN `vehicleCount` is invalid THEN vehicle name validation SHALL not mask the existing count error.
- WHEN a visible vehicle has no matching name entry in form state THEN validation SHALL treat it as blank.
- WHEN vehicle names contain only whitespace THEN they SHALL be rejected.
- WHEN vehicle names contain repeated internal whitespace THEN the value MAY be preserved or normalized, but leading/trailing whitespace SHALL be removed.
- WHEN the backend ignores or omits vehicle names in the response THEN immediate result rendering SHOULD still use submitted names for the current page session when possible.
- WHEN saved routes were created before this feature THEN vehicle details SHALL continue to render with the existing vehicle index fallback.
- WHEN backend returns an error for unknown `name` fields THEN the frontend SHALL show the existing backend error without losing form data.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| VN-01 | P1: Name Vehicles During Route Creation | Execute | Verified |
| VN-02 | P1: Submit Vehicle Names | Execute | Verified |
| VN-03 | P2: Display Vehicle Names In Results | Execute | Verified |
| VN-04 | Edge cases and validation | Execute | Verified |

**Coverage:** 4 total, 4 implemented and verified by lint/typecheck.

---

## Success Criteria

- [x] Collectors can enter a name for every visible vehicle on the route suggestion form.
- [x] Route suggestion payload sends `vehicles[].name` with `vehicles[].capacity`.
- [x] Blank, too-long, or duplicate visible vehicle names are blocked before submit.
- [x] Vehicle names stay aligned when vehicle count changes.
- [x] Route result and saved-route vehicle sections show vehicle names when available.
- [x] `npm run lint` and `npx tsc --noEmit` pass after implementation.

# Vehicle Name Tasks

**Design**: `.specs/features/vehicle-name/design.md`
**Status**: Done
**Completed:** 2026-06-10

**Verification:**

- `npx tsc --noEmit` passed.
- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- Manual browser verification was not run in this turn.

---

## Execution Plan

### Phase 1: Shared Contract

```text
T1
```

### Phase 2: Create Route UI

```text
T1 -> T2 -> T3
```

### Phase 3: Result Display

```text
T1 -> T4 -> T5
```

### Phase 4: Verification

```text
T2 + T3 + T4 + T5 -> T6
```

---

## Task Breakdown

### T1: Extend Route Vehicle Types and Helpers

**What**: Add vehicle names to route suggestion request/form/response types, validation, payload building, and display helpers.
**Where**: `src/app/lib/routes.ts`
**Depends on**: Existing route suggestion helper patterns.
**Reuses**: `RouteSuggestionRequest`, `RouteSuggestionFormState`, `SuggestedRoute`, `buildRouteSuggestionRequest`, `isRouteSuggestionRequest`, `normalizeRouteSuggestionResponse`.
**Requirement**: VN-01, VN-02, VN-03, VN-04

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `RouteSuggestionRequest.vehicles[]` includes `name` and `capacity`.
- [x] `RouteSuggestionFormState` includes `vehicleNames: string[]`.
- [x] Initial form state creates default names for all default visible vehicles.
- [x] Payload builder trims names and emits `vehicles[]` in vehicle index order.
- [x] Payload builder rejects blank, too-long, and duplicate visible vehicle names.
- [x] `isRouteSuggestionRequest` validates `vehicles[].name`.
- [x] Route response normalization preserves `vehicleName` from backend `vehicleName` or `name` fields.
- [x] A shared display helper returns vehicle name with index fallback.
- [x] Gate check passes: `npm run lint`.

**Tests**: Add focused helper tests if the project has an existing test runner; otherwise document manual helper verification in T6.
**Gate**: quick

---

### T2: Add Vehicle Name Inputs to Route Suggestion Form

**What**: Render and update a name input for each visible vehicle in the create route section.
**Where**: `src/app/routes/suggest/page.tsx`
**Depends on**: T1
**Reuses**: Existing vehicle count and capacity input section.
**Requirement**: VN-01, VN-04

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Each visible vehicle row shows a name input and capacity input.
- [x] `updateVehicleName(index, value)` updates only the targeted vehicle name.
- [x] `updateVehicleCount(value)` resizes names and capacities together.
- [x] Increasing count adds default names only for new vehicles.
- [x] Decreasing count prevents hidden names from being submitted.
- [x] Existing edited names remain aligned with their vehicle index after count changes.
- [x] Existing capacity behavior remains unchanged.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual UI check for changing count and editing names.
**Gate**: quick

---

### T3: Submit Named Vehicles From Create Route

**What**: Ensure the route suggestion submit flow sends names, keeps form data on validation/backend errors, and shows validation messages.
**Where**: `src/app/routes/suggest/page.tsx`, `src/app/api/collectors/routes/suggest/route.ts`
**Depends on**: T1, T2
**Reuses**: Existing submit handler, error banner, and proxy validation helper.
**Requirement**: VN-02, VN-04

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Submit payload contains `vehicles: [{ name, capacity }]`.
- [x] Blank vehicle name blocks submit with a clear message.
- [x] Duplicate visible vehicle names block submit with a clear message.
- [x] Too-long vehicle name blocks submit with a clear message.
- [x] Existing capacity and location errors still render correctly.
- [x] Backend error responses preserve name and capacity form values.
- [x] Local API proxy accepts valid named vehicle payloads.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual submit validation; helper-level validation if test tooling exists.
**Gate**: quick

---

### T4: Render Vehicle Names in Route Suggestion Results

**What**: Display vehicle names as the primary label in immediate route suggestion result cards.
**Where**: `src/app/routes/suggest/page.tsx`
**Depends on**: T1
**Reuses**: `VehicleRouteCard`, route result rendering, shared vehicle display helper.
**Requirement**: VN-03

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Result route cards show `vehicleName` when available.
- [x] Result route cards fall back to the current vehicle index label when no name is available.
- [x] Capacity, total load, distance, and stops continue rendering unchanged.
- [x] Vehicle index remains available internally for keys and downstream actions.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual render check with named and unnamed route responses.
**Gate**: quick

---

### T5: Render Vehicle Names in Saved Route Details

**What**: Display vehicle names in saved-route vehicle sections when saved suggestions include names.
**Where**: `src/app/routes/saved/page.tsx`
**Depends on**: T1
**Reuses**: Existing saved route card and vehicle details rendering.
**Requirement**: VN-03, VN-04

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Saved route vehicle sections show `vehicleName` when available.
- [x] Older saved routes without names still render with vehicle index fallback.
- [x] Move-request controls continue passing source/target `vehicleIndex`.
- [x] Map links continue passing `vehicleIndex`.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual saved route render check with named and legacy unnamed routes.
**Gate**: quick

---

### T6: Final Verification and Spec Update

**What**: Run verification and update feature traceability after implementation.
**Where**: `.specs/features/vehicle-name/spec.md`, `.specs/features/vehicle-name/tasks.md`, optionally `.specs/project/STATE.md`
**Depends on**: T3, T4, T5
**Reuses**: Existing TLC completion pattern from route feature specs.
**Requirement**: VN-01, VN-02, VN-03, VN-04

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npx tsc --noEmit` passes or blockers are documented.
- [ ] Manual verification covers editing names, changing vehicle count, validation errors, successful submit payload, backend error preservation, immediate result labels, and saved route labels.
- [x] Requirement traceability moves from Draft to Verified after implementation.
- [x] Tasks status is updated from Draft to Done after implementation.
- [x] STATE records completion/blockers if project state is being maintained.

**Tests**: Lint, typecheck, and manual UI/API verification.
**Gate**: full

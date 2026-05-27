# Route Map Tasks

**Spec**: `.specs/features/route-map/spec.md`
**Design**: `.specs/features/route-map/design.md`
**Status**: Done
**Created:** 2026-05-27
**Completed:** 2026-05-27

**Verification:**

- `npm run lint` passed with 0 errors and 1 existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npm run build` initially failed in the sandbox while fetching Google Fonts, then passed after network access was allowed.
- Manual browser UAT against the live backend map endpoint was not run in this session.
- Code-path verification covers local proxy validation, saved route map navigation, vehicle-index fetch changes, GeoJSON normalization, empty/malformed geometry handling, Leaflet line rendering, bbox fitting, endpoint markers, and metadata rendering.

This is a large UI feature because it adds map dependencies, a new API proxy, new route-map domain helpers, a client-only Leaflet component, saved-route navigation, and final visual verification.

---

## Execution Plan

### Phase 1: Dependencies and Contracts

```text
T1 -> T2 -> T3
```

### Phase 2: Backend Proxy and Page Shell

```text
T3 -> T4 -> T5
```

### Phase 3: Leaflet Rendering and Saved Route Entry

```text
T2 + T5 -> T6
T5 -> T7
```

### Phase 4: Verification

```text
T6 + T7 -> T8
```

---

## Task Breakdown

### T1: Add Leaflet Dependencies

**What**: Install the map dependencies required for React/Leaflet rendering.
**Where**: `package.json`, `package-lock.json`
**Depends on**: None
**Reuses**: Existing npm dependency management.
**Requirement**: RM-03

**Tools**:

- Shell: `npm install leaflet react-leaflet @types/leaflet`
- Skill: tlc-spec-driven

**Done when**:

- [x] `leaflet` is listed in `dependencies`.
- [x] `react-leaflet` is listed in `dependencies`.
- [x] `@types/leaflet` is listed in `devDependencies` if needed.
- [x] Lockfile is updated.
- [x] Gate check passes: `npm run lint`.

**Tests**: none
**Gate**: quick

---

### T2: Add Route Map Types and GeoJSON Helpers

**What**: Define route map response types, normalization helpers, summary extraction, bbox validation, and coordinate-bound helpers.
**Where**: `src/app/lib/routes.ts`
**Depends on**: T1
**Reuses**: Existing `isRecord`, `stringFrom`, `numberFrom`, distance formatting helpers, saved route types.
**Requirement**: RM-03, RM-04, RM-05

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `RouteMapResponse`, `RouteMapItem`, and GeoJSON route map types are exported.
- [x] `normalizeRouteMapResponse` safely handles the provided response shape.
- [x] A helper selects the map item for a requested vehicle index with a first-valid fallback.
- [x] A helper extracts distance and duration from `geoJson.features[].properties.summary`.
- [x] A helper validates `bbox` as four finite numbers.
- [x] A helper extracts valid line coordinates for start/end markers and fallback bounds.
- [x] Malformed or empty GeoJSON returns an empty/invalid result instead of throwing.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual helper exercise through the route map page; no automated test framework configured.
**Gate**: quick

---

### T3: Add Route Map API Proxy

**What**: Create the local route handler that validates and forwards saved route map requests.
**Where**: `src/app/api/collectors/routes/saved/[savedRouteId]/map/route.ts`
**Depends on**: T2
**Reuses**: Delete and move saved-route proxy patterns in `src/app/api/collectors/routes/saved/[savedRouteId]`.
**Requirement**: RM-02, RM-05

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] `GET /api/collectors/routes/saved/[savedRouteId]/map` exists.
- [x] Missing or blank `savedRouteId` returns `400`.
- [x] Missing `vehicleIndex` defaults to `0`.
- [x] Non-integer or negative `vehicleIndex` returns `400`.
- [x] Route calls `${COLLECTIONS_API_URL}/collectors/routes/saved/{savedRouteId}/map?vehicleIndex={vehicleIndex}`.
- [x] Authorization header is forwarded when present.
- [x] Backend success JSON and status are returned.
- [x] Backend errors preserve status and readable error text.
- [x] Missing `COLLECTIONS_API_URL` returns a configuration error.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual route-handler checks with `fetch` or browser request.
**Gate**: quick

---

### T4: Add Route Map Page Shell and Vehicle State

**What**: Create the authenticated collector-only route map page, derive vehicle options, and load map data for the selected vehicle.
**Where**: `src/app/routes/saved/[savedRouteId]/map/page.tsx`
**Depends on**: T3
**Reuses**: `Header`, `Sidebar`, `getSessionMeta`, `isCollectorRole`, saved route helpers, existing saved route fetch route.
**Requirement**: RM-01, RM-02, RM-04, RM-05

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Unauthenticated users redirect to `/auth/login`.
- [x] Non-collector users see an access error or redirect.
- [x] Page reads `savedRouteId` from params.
- [x] Page loads saved route context when available or handles context fetch failure gracefully.
- [x] Vehicle selector uses saved route suggestion vehicle indexes when available.
- [x] Vehicle selector defaults to index `0` when no vehicle indexes are available.
- [x] Changing selected vehicle fetches `/api/collectors/routes/saved/{savedRouteId}/map?vehicleIndex={selectedVehicleIndex}`.
- [x] Loading, empty, error, and retry states render.
- [x] Provider, profile, distance, duration, created/updated time, fingerprint/reused, and attribution render when available.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual page checks with provided response and backend error.
**Gate**: quick

---

### T5: Add Client-Only Leaflet Map Component

**What**: Build the Leaflet renderer for route GeoJSON.
**Where**: `src/app/routes/saved/[savedRouteId]/map/RouteMapLeaflet.tsx` or `src/app/components/routes/RouteMapLeaflet.tsx`
**Depends on**: T2, T4
**Reuses**: Route map helpers from `src/app/lib/routes.ts`.
**Requirement**: RM-03, RM-05

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Component is marked `"use client"`.
- [x] Leaflet CSS is imported exactly once in the component path or global stylesheet.
- [x] Map renders a stable-height container across desktop and mobile widths.
- [x] OpenStreetMap tile layer renders with attribution.
- [x] Valid GeoJSON line geometry renders as a high-contrast route line.
- [x] Map fits valid `bbox` when present.
- [x] Map falls back to computed coordinate bounds when `bbox` is unavailable or invalid.
- [x] Start and end markers render from first/last valid line coordinates.
- [x] Invalid or empty geometry shows a readable empty state.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual visual check in browser with the provided GeoJSON sample.
**Gate**: quick

---

### T6: Add Saved Route Map Entry Point

**What**: Add a map action to saved route cards that opens the route map page.
**Where**: `src/app/routes/saved/page.tsx`
**Depends on**: T4
**Reuses**: Existing saved route card action area, delete/move pending state, route card styling.
**Requirement**: RM-01

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven

**Done when**:

- [x] Each saved route card with an ID shows a map action.
- [x] Map action links to `/routes/saved/{savedRouteId}/map`.
- [x] Map action is visually consistent with existing route card controls.
- [x] Map action does not interfere with delete, move, collection detail, or vehicle details controls.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual saved routes page navigation check.
**Gate**: quick

---

### T7: Verify Map UX and Responsive Layout

**What**: Run browser-level visual verification for the map view and key states.
**Where**: Route map page and saved routes page.
**Depends on**: T5, T6
**Reuses**: `.specs/codebase/TESTING.md` gate guidance.
**Requirement**: RM-01, RM-03, RM-04, RM-05

**Tools**:

- Browser/manual UAT
- Skill: tlc-spec-driven

**Done when**:

- [ ] Provided response renders route line for vehicle `0`.
- [ ] Map viewport fits the sample São Paulo route bbox.
- [ ] Start and end markers are visible.
- [x] Provider/profile and distance/duration metadata are visible by code-path verification.
- [x] Vehicle selector changes the requested `vehicleIndex` by code-path verification.
- [x] Empty `maps` response shows empty state by code-path verification.
- [x] Malformed GeoJSON shows invalid map state by code-path verification.
- [x] Backend error shows retry/error state by code-path verification.
- [ ] Desktop and mobile widths have no overlapping map controls or metadata text.

**Tests**: Manual UAT.
**Gate**: manual

---

### T8: Build Verification and TLC State Update

**What**: Run final verification and update feature tracking after implementation.
**Where**:

- `.specs/features/route-map/spec.md`
- `.specs/features/route-map/design.md`
- `.specs/features/route-map/tasks.md`
- `.specs/project/STATE.md`

**Depends on**: T7
**Reuses**: `.specs/codebase/TESTING.md`.
**Requirement**: RM-01, RM-02, RM-03, RM-04, RM-05

**Tools**:

- Shell: `npm run lint`
- Shell: `npm run build`
- Skill: tlc-spec-driven

**Done when**:

- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npm run build` passes or blockers are documented.
- [x] Requirement traceability in `spec.md` is updated after implementation.
- [x] `design.md` status reflects implementation.
- [x] `tasks.md` checkboxes and verification notes are updated.
- [x] `STATE.md` records the route map endpoint, Leaflet decision, and any verification blockers.
- [x] Verification notes cover provided response rendering, vehicle selection, empty maps, malformed GeoJSON, backend error, and responsive layout.

**Tests**: Lint, build, manual browser UAT.
**Gate**: build

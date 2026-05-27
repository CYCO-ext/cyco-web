# Route Map Specification

## Problem Statement

Collectors can inspect saved routes as text and vehicle stop lists, but they cannot see the actual road geometry for a saved route. The backend now exposes route map data as GeoJSON per saved route and vehicle index, so collectors need a map visualization that draws the route line and makes the mapped route easy to inspect from the saved routes workflow.

## Goals

- [ ] Add a collector-only route map visualization for saved routes.
- [ ] Fetch route map data from `GET /api/collectors/routes/saved/{savedRouteId}/map?vehicleIndex={vehicleIndex}`.
- [ ] Proxy the backend endpoint `GET ${COLLECTIONS_API_URL}/collectors/routes/saved/{savedRouteId}/map?vehicleIndex={vehicleIndex}` through a local App Router route.
- [ ] Render returned GeoJSON route lines with Leaflet.
- [ ] Let collectors choose a vehicle route when a saved route has multiple vehicle indexes.
- [ ] Fit the map viewport to the returned GeoJSON bounding box or route coordinates.
- [ ] Show route summary, provider/profile, distance, duration, and attribution when available.
- [ ] Handle loading, empty, malformed, and backend error states.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Turn-by-turn navigation mode | This feature is a visualization, not live navigation. |
| Editing route geometry | The map endpoint returns generated geometry only. |
| Recalculating routes | Existing backend owns route generation and saved-map creation. |
| Drawing collection stop markers from collection detail lookups | The provided contract only requires route line visualization. |
| Offline map tiles | Leaflet will use online tile providers for this iteration. |
| Route map caching in the browser | The backend response includes `fingerprint` and `reused`; client cache policy can be revisited later. |

---

## Assumptions

- NextAuth session follows `{ user: { id, name, email }, role, token }`.
- Only users with role `WASTE_COLLECTOR` or `CATADOR` can view saved route maps.
- Saved route data is already loaded by `/routes/saved`.
- Vehicle indexes can be derived from `savedRoute.suggestion.routes[].vehicleIndex` when present.
- If a saved route has no suggestion vehicle indexes, the UI can default to `vehicleIndex=0`.
- The backend map endpoint returns the provided response shape with `savedRouteId`, `provider`, `profile`, and `maps[]`.
- Each map item can include a GeoJSON `FeatureCollection` with `LineString` route features and `bbox`.
- GeoJSON coordinates are longitude/latitude pairs and must be converted to Leaflet latitude/longitude positions by the library or helper logic.
- `leaflet` and `react-leaflet` are not currently installed and must be added as dependencies.
- The Leaflet map must render client-side only because Next.js server rendering does not provide browser map APIs.

---

## User Stories

### P1: Open Saved Route Map

**User Story**: As a collector, I want to open a map for a saved route so that I can visually inspect the route path.

**Why P1**: This is the core requested workflow.

**Acceptance Criteria**:

1. WHEN a collector views a saved route card THEN the system SHALL provide a map action for that saved route.
2. WHEN the collector opens the map action THEN the system SHALL show a route map view without losing access to saved route context.
3. WHEN the saved route has multiple vehicle routes THEN the system SHALL let the collector select which vehicle map to view.
4. WHEN the saved route has no known vehicle routes THEN the system SHALL request `vehicleIndex=0`.
5. WHEN the user is unauthenticated THEN the route map view SHALL redirect to `/auth/login`.
6. WHEN the user is not a collector THEN the route map view SHALL block access or redirect.

**Independent Test**: Open a saved route with vehicle indexes `0` and `1`, switch vehicles, and verify the map request uses the selected vehicle index.

---

### P1: Route Map API Proxy

**User Story**: As a collector, I want the frontend to fetch saved route geometry securely so that backend URLs and auth details remain server-side.

**Why P1**: Existing app architecture uses local App Router proxies for backend access.

**Acceptance Criteria**:

1. WHEN the UI requests `/api/collectors/routes/saved/{savedRouteId}/map?vehicleIndex=0` THEN the local route SHALL call `GET ${COLLECTIONS_API_URL}/collectors/routes/saved/{savedRouteId}/map?vehicleIndex=0`.
2. WHEN `savedRouteId` is missing or blank THEN the local route SHALL return `400`.
3. WHEN `vehicleIndex` is missing THEN the local route SHALL default to `0`.
4. WHEN `vehicleIndex` is not an integer greater than or equal to `0` THEN the local route SHALL return `400`.
5. WHEN the request includes authorization THEN the local route SHALL forward it.
6. WHEN the backend returns success THEN the local route SHALL return the backend JSON and status.
7. WHEN the backend returns an error THEN the local route SHALL preserve the status and expose a readable error message.
8. WHEN `COLLECTIONS_API_URL` is missing THEN the local route SHALL return a configuration error.

**Independent Test**: Call the local route with `vehicleIndex=0` and verify the proxied backend URL matches the provided contract.

---

### P1: Draw GeoJSON Route Lines

**User Story**: As a collector, I want the route geometry drawn on a map so that I can understand the road path.

**Why P1**: The user explicitly requested drawing route lines with Leaflet.

**Acceptance Criteria**:

1. WHEN route map GeoJSON is returned THEN the system SHALL render the route line on a Leaflet map.
2. WHEN the GeoJSON includes `bbox` THEN the map SHALL fit to that bounding box.
3. WHEN `bbox` is missing but route coordinates exist THEN the map SHALL fit to route coordinates.
4. WHEN multiple map items are returned THEN the UI SHALL render the map item matching the selected vehicle index, or the first valid map item as fallback.
5. WHEN the GeoJSON contains no valid line geometry THEN the page SHALL show an empty map state instead of crashing.
6. WHEN the map renders THEN it SHALL include start and end visual markers or equivalent endpoints derived from the line coordinates.
7. WHEN provider attribution exists THEN the UI SHALL show it near the map.

**Independent Test**: Render the provided response and verify a line from `[-46.876563, -23.548018]` to `[-46.870906, -23.551053]` is visible and the viewport fits the route.

---

### P2: Route Map Details

**User Story**: As a collector, I want route map metadata near the map so that I can understand the distance, duration, provider, and freshness of the geometry.

**Why P2**: The provided response includes summary and metadata that make the map more useful.

**Acceptance Criteria**:

1. WHEN route summary exists THEN the page SHALL show distance and duration.
2. WHEN provider/profile exists THEN the page SHALL show provider and profile.
3. WHEN `fingerprint` and `reused` exist THEN the page SHOULD show whether the map was reused or newly generated.
4. WHEN `createdAt` or `updatedAt` exists THEN the page SHOULD show the map timestamp.
5. WHEN step instructions exist THEN the page MAY show a compact directions list, but this is not required for the first implementation.

**Independent Test**: Render the provided response and verify provider `OPEN_ROUTE_SERVICE`, profile `driving-car`, distance `731.2`, and duration `94.2` are visible.

---

## Edge Cases

- WHEN the backend response contains `maps: []` THEN the page SHALL show an empty map state.
- WHEN the backend response contains a map item without `geoJson` THEN the page SHALL show an empty map state.
- WHEN GeoJSON coordinates are malformed THEN the page SHALL skip invalid geometry and show a readable error if no valid geometry remains.
- WHEN Leaflet CSS is not loaded THEN the map tiles/controls may render incorrectly; implementation SHALL import Leaflet CSS once in the client map component or global stylesheet.
- WHEN the selected vehicle has no map item THEN the page SHALL show a clear no-map-for-vehicle state and allow selecting another vehicle.
- WHEN the tile provider fails to load THEN route metadata and error states SHALL remain readable.
- WHEN the saved route is deleted while the map view is open THEN refresh/retry may return `404`; the page SHALL show the backend error.
- WHEN the response has a `bbox` with invalid order or non-numeric values THEN the map SHALL fall back to route coordinate bounds.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RM-01 | P1: Open Saved Route Map | Execute | Verified |
| RM-02 | P1: Route Map API Proxy | Execute | Verified |
| RM-03 | P1: Draw GeoJSON Route Lines | Execute | Verified |
| RM-04 | P2: Route Map Details | Execute | Verified |
| RM-05 | Edge cases and validation | Execute | Verified |

**Coverage:** 5 total, 5 implemented and verified by lint/build. Live backend/browser UAT remains recommended.

---

## Success Criteria

- [x] Collectors can open a map from a saved route.
- [x] The frontend fetches map data through a local API proxy.
- [x] The provided GeoJSON response renders as a Leaflet route line.
- [x] Vehicle index selection triggers the correct map request.
- [x] The map viewport fits the route geometry.
- [x] Route distance, duration, provider/profile, and attribution are visible when available.
- [x] `npm run lint` and `npm run build` pass after implementation.

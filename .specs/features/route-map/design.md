# Route Map Design

**Spec**: `.specs/features/route-map/spec.md`
**Status**: Implemented

---

## Architecture Overview

Add a saved-route map experience that reuses the existing collector saved routes workflow. Saved route cards expose a map action that opens a dedicated map route for a saved route. The page validates collector access, loads saved route context when practical, fetches GeoJSON route map data for the selected vehicle index through a local API proxy, and renders the geometry with a client-only Leaflet component.

Flow:

1. Collector opens `/routes/saved`.
2. Saved route card shows a map action.
3. Collector opens `/routes/saved/{savedRouteId}/map`.
4. Page verifies authenticated collector session.
5. Page derives available vehicle indexes from saved route suggestion data when available, defaulting to `0`.
6. Collector selects a vehicle index.
7. Page fetches `/api/collectors/routes/saved/{savedRouteId}/map?vehicleIndex={vehicleIndex}`.
8. Route handler proxies to `GET ${COLLECTIONS_API_URL}/collectors/routes/saved/{savedRouteId}/map?vehicleIndex={vehicleIndex}`.
9. Client map component renders valid GeoJSON route lines with Leaflet and fits bounds to `bbox` or coordinates.

## Code Reuse Analysis

### Existing Components to Leverage

| Component/Helper | Location | How to Use |
| --- | --- | --- |
| `Header` | `src/app/components/Header.tsx` | Route map page shell. |
| `Sidebar` | `src/app/components/Sidebar.tsx` | Authenticated layout consistency. |
| `button`, shared control styles | `src/app/components/ui.tsx` | Map action, retry action, vehicle selector. |
| `getSessionMeta` | `src/app/lib/createCollection.ts` | Read collector ID, token, and role. |
| `isCollectorRole` | `src/app/lib/collectionsPage.ts` | Collector-only access guard. |
| `SavedRoute`, `normalizeSavedRoute`, route formatting helpers | `src/app/lib/routes.ts` | Saved route context, vehicle indexes, distance/load formatting patterns. |
| Saved route API proxy pattern | `src/app/api/collectors/routes/saved/[savedRouteId]/route.ts` | Match error handling and auth forwarding. |
| Saved routes page | `src/app/routes/saved/page.tsx` | Add map action and reuse visual card style. |

### New Dependencies

| Dependency | Purpose |
| --- | --- |
| `leaflet` | Core map rendering, tile layer, bounds, and GeoJSON display. |
| `react-leaflet` | React integration for Leaflet map components. |
| `@types/leaflet` | TypeScript support if not bundled by dependency versions. |

If package install is deferred, task T1 must remain blocked until dependencies are available.

### Integration Points

| System | Integration Method |
| --- | --- |
| Saved routes list | Add map action linking to `/routes/saved/{savedRouteId}/map`. |
| Route map page | New collector-only App Router page. |
| Route map proxy | `GET /api/collectors/routes/saved/[savedRouteId]/map?vehicleIndex=0`. |
| Backend target | `GET ${COLLECTIONS_API_URL}/collectors/routes/saved/{savedRouteId}/map?vehicleIndex=0`. |
| Leaflet tiles | Use a standard OpenStreetMap tile layer with visible attribution. |
| NextAuth session | Supplies role and optional token for API requests. |

## Components and Interfaces

### Saved Route Map Action

- **Purpose**: Entry point from saved route cards to the map view.
- **Location**: `src/app/routes/saved/page.tsx`
- **Behavior**:
  - Show a map action for each saved route card.
  - Link to `/routes/saved/{savedRouteId}/map`.
  - Disable or omit only when the route ID is unavailable.
  - Keep existing delete/move/detail controls unchanged.

### Route Map Page

- **Purpose**: Collector-facing page that fetches and displays map geometry.
- **Location**: `src/app/routes/saved/[savedRouteId]/map/page.tsx`
- **Interfaces**:
  - `loadSavedRouteContext(savedRouteId): Promise<SavedRoute | undefined>`
  - `loadRouteMap(savedRouteId, vehicleIndex): Promise<RouteMapResponse>`
  - `selectedVehicleIndex: number`
- **Behavior**:
  - Redirect unauthenticated users to `/auth/login`.
  - Block non-collector users with a clear access state.
  - Read `savedRouteId` from route params.
  - Derive vehicle indexes from saved route context when available.
  - Default selected vehicle index to `0`.
  - Fetch route map data when `savedRouteId` or selected vehicle changes.
  - Render loading, empty, error, and retry states.
  - Render provider/profile/summary metadata beside or above the map.

### Route Map Client Component

- **Purpose**: Render Leaflet map without server-side browser API access.
- **Location**: `src/app/routes/saved/[savedRouteId]/map/RouteMapLeaflet.tsx` or `src/app/components/routes/RouteMapLeaflet.tsx`
- **Interfaces**:
  - `geoJson: RouteMapGeoJson`
  - `bbox?: [number, number, number, number]`
  - `attribution?: string`
- **Behavior**:
  - Use `"use client"`.
  - Import Leaflet CSS once.
  - Render a stable-height map container.
  - Draw GeoJSON route lines with a high-contrast route style.
  - Fit the map to `bbox` when valid, otherwise computed coordinate bounds.
  - Show start/end markers derived from first and last valid line coordinates.
  - Avoid SSR crashes by loading Leaflet/react-leaflet only inside client code.

### Route Map API Route

- **Purpose**: Proxy route map requests to the backend.
- **Location**: `src/app/api/collectors/routes/saved/[savedRouteId]/map/route.ts`
- **Interfaces**:
  - `GET(req, { params }): Promise<NextResponse<RouteMapResponse>>`
- **Behavior**:
  - Validate `savedRouteId`.
  - Parse `vehicleIndex` from query, defaulting to `0`.
  - Reject negative or non-integer vehicle indexes.
  - Call backend target with encoded saved route ID and vehicle index.
  - Forward authorization header when present.
  - Preserve backend success/error status and readable messages.

## Data Models

### Route Map Response

```typescript
interface RouteMapResponse {
  savedRouteId: string;
  provider: string;
  profile: string;
  maps: RouteMapItem[];
}
```

### Route Map Item

```typescript
interface RouteMapItem {
  vehicleIndex: number;
  fingerprint?: string;
  reused?: boolean;
  geoJson?: RouteMapGeoJson;
  createdAt?: string;
  updatedAt?: string;
}
```

### Route Map GeoJSON

```typescript
interface RouteMapGeoJson {
  type: "FeatureCollection";
  bbox?: [number, number, number, number];
  features: Array<{
    type: "Feature";
    bbox?: [number, number, number, number];
    properties?: {
      segments?: Array<{
        distance?: number;
        duration?: number;
        steps?: Array<{
          distance?: number;
          duration?: number;
          instruction?: string;
          name?: string;
          way_points?: [number, number];
        }>;
      }>;
      summary?: {
        distance?: number;
        duration?: number;
      };
      way_points?: [number, number];
    };
    geometry?: {
      type: "LineString" | string;
      coordinates?: number[][];
    };
  }>;
  metadata?: {
    attribution?: string;
    service?: string;
    timestamp?: number;
  };
}
```

### Route Map UI State

```typescript
type RouteMapLoadState =
  | { status: "idle" | "loading" }
  | { status: "loaded"; response: RouteMapResponse; selectedMap: RouteMapItem }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };
```

## API Contract

### Local Route

```text
GET /api/collectors/routes/saved/{savedRouteId}/map?vehicleIndex=0
```

### Backend Target

```text
GET ${COLLECTIONS_API_URL}/collectors/routes/saved/{savedRouteId}/map?vehicleIndex=0
```

### Example Response

The response shape follows the user-provided sample:

- `savedRouteId`: `28337294-c7d5-4953-a685-c4ab0479d2aa`
- `provider`: `OPEN_ROUTE_SERVICE`
- `profile`: `driving-car`
- `maps[0].vehicleIndex`: `0`
- `maps[0].geoJson.type`: `FeatureCollection`
- `maps[0].geoJson.features[0].geometry.type`: `LineString`

## Validation Strategy

| Field | Validation |
| --- | --- |
| `savedRouteId` | Required non-empty string from route params. |
| `vehicleIndex` | Integer greater than or equal to `0`; default `0`. |
| `maps` | Array; fallback to empty state when absent. |
| `map.vehicleIndex` | Number; match selected vehicle when possible. |
| `geoJson.type` | Must be `FeatureCollection` to render. |
| `bbox` | Four finite numbers `[west, south, east, north]`; otherwise compute bounds. |
| `LineString.coordinates` | Array of finite `[longitude, latitude]` pairs. |
| `summary.distance`, `summary.duration` | Finite numbers; show only when present. |
| `metadata.attribution` | String; show when present. |

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Unauthenticated user | Redirect to `/auth/login` | User must log in. |
| Non-collector user | Show access error or redirect home | Prevents generators from viewing collector routes. |
| Missing `COLLECTIONS_API_URL` | Local route returns `500` config error | Failure is explicit. |
| Invalid `vehicleIndex` | Local route returns `400` | UI can show readable validation error. |
| Backend `404` or deleted route | Show error and retry/back action | Collector understands map is unavailable. |
| Empty `maps` | Show empty state | Page remains stable. |
| Missing selected vehicle map | Show no-map-for-vehicle state | Collector can switch vehicle. |
| Malformed GeoJSON | Show invalid map data state | Avoids rendering crashes. |
| Tile load issue | Keep metadata and controls readable | Route data failure is distinct from tile failure. |

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Map library | Leaflet with `react-leaflet` | User requested Leaflet and React wrapper keeps map code idiomatic. |
| Page route | `/routes/saved/[savedRouteId]/map` | Keeps map tied to saved route workflow and allows direct linking. |
| Backend access | Local App Router proxy | Matches existing route proxy pattern and keeps backend URL server-side. |
| Vehicle selection | Query-driven API fetch per selected vehicle | Matches backend contract and avoids fetching all vehicle maps unnecessarily. |
| Geometry rendering | Render backend GeoJSON directly with a defensive normalizer | Keeps route line faithful to provider output while protecting UI from malformed data. |
| Bounds | Prefer GeoJSON `bbox`, fallback to coordinates | Uses provider bounds when available and still handles partial responses. |
| Map component | Client-only component | Avoids SSR access to `window`, DOM, and Leaflet internals. |
| Tests | Lint/build gates plus manual map UAT | Project has no automated test framework configured. |

## Open Questions

- Should route maps open inline in the saved route card or only on a dedicated page?
- Should step-by-step instructions be rendered in the first implementation or deferred until after the line visualization works?
- Should the selected vehicle index be stored in the URL query string for shareable links?

# Vehicle Name Design

**Spec**: `.specs/features/vehicle-name/spec.md`
**Status**: Implemented

---

## Architecture Overview

Extend the existing route suggestion vehicle model from capacity-only to name-plus-capacity. The create route page remains the only entry point for editing names. The shared route helpers validate and serialize names into `vehicles[]`, while route result components render names when the normalized route response or submitted request context exposes them.

Flow:

1. Collector opens `/routes/suggest`.
2. `createInitialRouteSuggestionFormState` initializes vehicle capacities and names.
3. Collector edits vehicle names and capacities in the vehicle section.
4. Vehicle count changes resize visible name and capacity arrays while preserving existing entries.
5. `buildRouteSuggestionRequest` validates selected requests, vehicle count, vehicle names, capacities, and coordinates.
6. Page posts payload to `/api/collectors/routes/suggest`.
7. Local API route validates `vehicles[]` entries with `name` and `capacity`, then forwards to `${COLLECTIONS_API_URL}/collectors/routes/suggest`.
8. Result and saved-route vehicle cards show the best available vehicle label: `vehicleName`, `name`, submitted vehicle name by `vehicleIndex`, then index fallback.

## Code Reuse Analysis

### Existing Components to Leverage

| Component/Helper | Location | How to Use |
| --- | --- | --- |
| `RouteSuggestionFormState` | `src/app/lib/routes.ts` | Add `vehicleNames: string[]` next to capacities. |
| `createInitialRouteSuggestionFormState` | `src/app/lib/routes.ts` | Add default vehicle names. |
| `buildRouteSuggestionRequest` | `src/app/lib/routes.ts` | Validate and serialize names into `vehicles[]`. |
| `isRouteSuggestionRequest` | `src/app/lib/routes.ts` | Accept and validate `vehicles[].name`. |
| `normalizeRouteSuggestionResponse` | `src/app/lib/routes.ts` | Preserve vehicle name fields returned by backend. |
| Vehicle form section | `src/app/routes/suggest/page.tsx` | Add name input per vehicle row. |
| `VehicleRouteCard` | `src/app/routes/suggest/page.tsx` | Render vehicle label helper instead of index-only title. |
| Saved route vehicle details | `src/app/routes/saved/page.tsx` | Render the same vehicle label fallback. |

### Integration Points

| System | Integration Method |
| --- | --- |
| Route suggestion form | Add per-vehicle name inputs beside capacity inputs. |
| Route suggestion payload | Send `vehicles: Array<{ name: string; capacity: number }>` to the existing local proxy. |
| Route suggestion response | Normalize optional vehicle name fields on each `SuggestedRoute`. |
| Saved route response | Reuse normalized `SuggestedRoute` names when saved route suggestions include them. |
| Move/map route features | Continue using `vehicleIndex` for backend operations and URLs. |

## Components and Interfaces

### Route Types and Helpers

**Location**: `src/app/lib/routes.ts`

Update the shared models:

```typescript
interface RouteSuggestionRequest {
  collectorId: string;
  vehicles: Array<{
    name: string;
    capacity: number;
  }>;
  // unchanged fields...
}

interface SuggestedRoute {
  vehicleIndex: number;
  vehicleName?: string;
  capacity: number;
  totalLoad: number;
  totalDistanceMeters: number;
  stops: SuggestedRouteStop[];
}

interface RouteSuggestionFormState {
  selectedRequestIds: string[];
  vehicleCount: string;
  vehicleNames: string[];
  vehicleCapacities: string[];
  // unchanged fields...
}
```

Add small helper functions:

```typescript
function defaultVehicleName(index: number): string;
function normalizeVehicleName(value: string): string;
function getVehicleDisplayName(route: SuggestedRoute): string;
```

`getVehicleDisplayName` can be exported if both `/routes/suggest` and `/routes/saved` need the same fallback.

### Vehicle Form Section

**Location**: `src/app/routes/suggest/page.tsx`

- Add `updateVehicleName(index, value)`.
- Update `updateVehicleCount(value)` to resize both `vehicleNames` and `vehicleCapacities`.
- Render each vehicle as a stable two-field row:
  - Name input: label `Nome do veículo {index + 1}`.
  - Capacity input: existing numeric capacity behavior.
- Keep the existing vehicle count control and validation feedback pattern.

### Route Result Vehicle Label

**Locations**:

- `src/app/routes/suggest/page.tsx`
- `src/app/routes/saved/page.tsx`

Behavior:

- Prefer `route.vehicleName`.
- Accept backend alias `route.name` only during normalization; do not use ad hoc property reads in components.
- Fall back to `Veículo ${route.vehicleIndex + 1}`.
- Keep `vehicleIndex` visible as secondary metadata if useful for debugging or consistency, but do not make it the only primary label when a name exists.

### Route Suggestion API Validation

**Location**: `src/app/lib/routes.ts`

`isRouteSuggestionRequest` should require every submitted vehicle to be a record with:

- `name`: non-empty string after trimming.
- `capacity`: finite number greater than zero.

The API route in `src/app/api/collectors/routes/suggest/route.ts` can continue calling this helper without route-handler structural changes.

## Data Models

### Route Suggestion Request

```typescript
interface VehicleRouteInput {
  name: string;
  capacity: number;
}
```

Example payload fragment:

```json
{
  "vehicles": [
    { "name": "Caminhão principal", "capacity": 100 },
    { "name": "Van apoio", "capacity": 80 }
  ]
}
```

### Suggested Route

```typescript
interface SuggestedRoute {
  vehicleIndex: number;
  vehicleName?: string;
  capacity: number;
  totalLoad: number;
  totalDistanceMeters: number;
  stops: SuggestedRouteStop[];
}
```

## Validation Strategy

| Field | Validation |
| --- | --- |
| `vehicleCount` | Existing integer greater than or equal to 1. |
| `vehicleNames[]` | Each visible name is required after trimming. |
| `vehicleNames[]` length | Maximum 60 characters after trimming. |
| `vehicleNames[]` uniqueness | Visible names must be unique after trim and case-insensitive comparison. |
| `vehicleCapacities[]` | Existing greater-than-zero validation remains unchanged. |
| `vehicles[]` API body | Every item must include a valid `name` and `capacity`. |

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Blank vehicle name | Show validation error for the vehicle index | Collector can fill the missing label. |
| Duplicate visible names | Show validation error before submit | Avoids ambiguous route labels. |
| Name too long | Show validation error before submit | Keeps labels readable. |
| Backend rejects new field | Existing submit error area shows backend message | Form data remains intact. |
| Response omits names | UI falls back to vehicle index or current submitted name map | Older saved routes still work. |

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Payload field | `vehicles[].name` | Matches the user language and keeps vehicle metadata inside each vehicle object. |
| Name limit | 60 trimmed characters | Enough for readable labels while preventing oversized UI text. |
| Duplicate rule | Case-insensitive uniqueness within visible vehicles | Prevents two route cards from looking identical. |
| Display fallback | `vehicleName` -> `Veículo N` | Preserves compatibility with existing saved routes. |
| Backend operations | Continue using `vehicleIndex` | Existing move and map APIs are index-based. |

## Risks

| Risk | Mitigation |
| --- | --- |
| Backend contract may not yet accept `vehicles[].name` | Keep errors visible and confirm API support before implementation. |
| Saved route responses may not include names even after submit | Normalize optional fields and use fallback labels. |
| Vehicle count resizing can desync names and capacities | Resize both arrays in one state update and test count changes. |
| Large vehicle names can break compact cards | Validate max length and use existing responsive text styles. |

## Verification Plan

- Unit or helper-level check for `buildRouteSuggestionRequest` name validation and payload serialization.
- Unit or helper-level check for `isRouteSuggestionRequest` accepting named vehicles and rejecting blank names.
- Manual UI check for editing names, changing vehicle count, submit validation, and route result labels.
- Run `npm run lint`.
- Run `npx tsc --noEmit`.

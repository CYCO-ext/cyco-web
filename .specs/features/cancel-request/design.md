# Cancel Request Design

**Spec**: `.specs/features/cancel-request/spec.md`
**Status**: Implemented

---

## Architecture Overview

Add a role-aware cancel action to `/collections`. The action is available to both generators and collectors when a collection is `PENDING` or `IN_PROGRESS`. The page selects the correct local route and payload from the viewer role, then refreshes collection data after success.

Flow:

1. User opens `/collections`.
2. Page loads role-specific collections through `/api/collections/search`.
3. For each `PENDING` or `IN_PROGRESS` collection, the card renders a cancel button for generator and collector viewers.
4. User clicks cancel.
5. Page chooses the endpoint from `viewerRole`:
   - Collector: `POST /api/collectors/requests/{requestId}/cancel`
   - Generator: `POST /api/generators/requests/{requestId}/cancel`
6. Page sends the actor ID body:
   - Collector: `{ "collectorId": sessionMeta.generatorId }`
   - Generator: `{ "generatorId": sessionMeta.generatorId }`
7. Local route validates params/body, forwards authorization, and calls the backend endpoint through `COLLECTIONS_API_URL`.
8. On success, page shows cancellation feedback and reloads the collection list.
9. On failure, page shows an error and leaves the card actionable.

## Code Reuse Analysis

| Existing Code | Location | Reuse |
| --- | --- | --- |
| Collection action feedback | `src/app/collections/page.tsx` | Reuse `actionFeedback` success/error rendering. |
| Per-card action pending state | `src/app/collections/page.tsx` | Extend `actionPendingKind` with `cancel`. |
| Finish eligibility pattern | `src/app/collections/page.tsx` | Add similar `isCancelEligible` helper. |
| Reject route handler | `src/app/api/collectors/requests/[requestId]/reject/route.ts` | Reuse route-handler structure and empty-body success tolerance. |
| `getSessionMeta` | `src/app/lib/createCollection.ts` | Reuse session actor ID and token extraction. |
| `button()` helper | `src/app/components/ui.tsx` | Reuse base button classes, with high-contrast destructive styling. |

## Components and Interfaces

### Collections Page

**Location**: `src/app/collections/page.tsx`

Add:

```typescript
function isCancelEligible(collection: CollectionSummary): boolean {
  return ["PENDING", "IN_PROGRESS"].includes(collection.status);
}

const handleCancel = useCallback(async (collectionId: string) => {
  // chooses generator or collector endpoint from viewerRole
}, [loadCollections, sessionMeta.generatorId, sessionMeta.token, viewerRole]);
```

Update action kind:

```typescript
type CollectionActionKind = "accept" | "reject" | "finish" | "cancel";
```

Update `CollectionCard` props:

```typescript
onCancel: (collectionId: string) => void;
```

Render behavior:

- `showCancel = !!viewerRole && isCancelEligible(collection)`.
- Show cancel on pending and in-progress cards for both supported roles.
- Disable cancel while `actionPending` is true.
- Prefer labels:
  - Idle: `Cancelar`
  - Pending: `Cancelando...`
  - Success feedback: `Coleta cancelada com sucesso.`
  - Error fallback: `Erro ao cancelar coleta.`

### Collector Cancel API Route

**Location**: `src/app/api/collectors/requests/[requestId]/cancel/route.ts`

Interface:

```typescript
export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse>
```

Behavior:

- Require `COLLECTIONS_API_URL`.
- Await `context.params` and validate `requestId`.
- Parse JSON body and validate non-empty `collectorId`.
- Forward `Authorization` header when present.
- Call `${COLLECTIONS_API_URL}/collectors/requests/${requestId}/cancel`.
- Send `Content-Type: application/json` with `{ collectorId }`.
- Return backend success payload if present, otherwise `{ ok: true }`.
- Forward backend errors with status and payload when available.
- Return `500` JSON on unexpected errors.

### Generator Cancel API Route

**Location**: `src/app/api/generators/requests/[requestId]/cancel/route.ts`

Interface:

```typescript
export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse>
```

Behavior:

- Require `COLLECTIONS_API_URL`.
- Await `context.params` and validate `requestId`.
- Parse JSON body and validate non-empty `generatorId`.
- Forward `Authorization` header when present.
- Call `${COLLECTIONS_API_URL}/generators/requests/${requestId}/cancel`.
- Send `Content-Type: application/json` with `{ generatorId }`.
- Return backend success payload if present, otherwise `{ ok: true }`.
- Forward backend errors with status and payload when available.
- Return `500` JSON on unexpected errors.

## API Contract

### Collector Cancel

```http
POST /api/collectors/requests/{requestId}/cancel
Content-Type: application/json
Authorization: Bearer <token>

{
  "collectorId": "coll-001"
}
```

Success:

```http
200 OK
```

### Generator Cancel

```http
POST /api/generators/requests/{requestId}/cancel
Content-Type: application/json
Authorization: Bearer <token>

{
  "generatorId": "gen-001"
}
```

Success:

```http
200 OK
```

## State and UX

| State | UI |
| --- | --- |
| Pending generator collection | Show cancel. |
| Pending collector collection | Show accept, reject, and cancel. |
| In-progress generator collection | Show finish and cancel. |
| In-progress collector collection | Show finish and cancel. |
| Cancel in progress | Disable available action buttons for that collection and show `Cancelando...`. |
| Cancel success | Show success feedback, then refreshed list. |
| Cancel failure | Show error feedback and keep action available after pending clears. |
| Completed/canceled/unknown status | No cancel button. |

## Validation Strategy

- `npm run lint`
- `npm run build`
- Manual check that cancel appears for generator and collector users on `PENDING` and `IN_PROGRESS`.
- Manual check that cancel is hidden for `COMPLETED`, `CANCELED`, `CANCELLED`, and unknown statuses.
- Manual check that collector cancel sends `{ collectorId }`.
- Manual check that generator cancel sends `{ generatorId }`.
- Manual check success refresh and failure feedback.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| `sessionMeta.generatorId` naming is confusing for collector actor ID | Document the assumption and reuse current role-query behavior already relying on this field. |
| Backend returns empty success body | Route handlers should not require JSON on success. |
| Cancel competes visually with reject | Use concise action grouping and high-contrast destructive styling. |
| User cancels after status changed | Backend error is surfaced through existing action feedback. |

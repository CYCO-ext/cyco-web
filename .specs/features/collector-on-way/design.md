# Collector On Way Design

**Spec**: `.specs/features/collector-on-way/spec.md`
**Status**: Implemented

---

## Architecture Overview

Add a collector-only status action to `/collections`. The action appears on eligible collection cards, posts to a local Next.js route, and the local route proxies to the backend `on-the-way` endpoint with `{ collectorId }`. After success, `/collections` shows feedback and reloads collection data so the new status is reflected.

Flow:

1. Collector opens `/collections`.
2. Page loads role-specific collections through `/api/collections/search`.
3. For each eligible collector collection, the card renders an "Estou a caminho" button.
4. Collector clicks the button.
5. Page sends `POST /api/collectors/requests/{requestId}/on-the-way` with `{ collectorId }`.
6. Local route validates params/body, forwards authorization, and calls `${COLLECTIONS_API_URL}/collectors/requests/{requestId}/on-the-way`.
7. Backend updates collection status and may trigger generator notification delivery.
8. Page shows success feedback and reloads the collection list.
9. On failure, page shows the backend error and keeps the action recoverable.

## Code Reuse Analysis

| Existing Code | Location | Reuse |
| --- | --- | --- |
| Collection card action rendering | `src/app/collections/page.tsx` | Add the on-way action beside existing collector actions. |
| Action pending state | `src/app/collections/page.tsx` | Extend `CollectionActionKind` with `on-way`. |
| Action feedback | `src/app/collections/page.tsx` | Reuse success/error feedback panel. |
| Cancel/reject route handlers | `src/app/api/collectors/requests/[requestId]/*/route.ts` | Mirror env validation, body validation, auth forwarding, backend error handling, and `204` handling. |
| `getSessionMeta` | `src/app/lib/createCollection.ts` | Reuse collector actor ID and token extraction. |
| `statusLabel` | `src/app/lib/collectionsPage.ts` | Add on-way status label when backend enum is known. |
| `button()` helper | `src/app/components/ui.tsx` | Reuse base button style and adjust class locally if needed. |

## Components and Interfaces

### Collections Page

**Location**: `src/app/collections/page.tsx`

Add an eligibility helper:

```typescript
function isOnWayEligible(collection: CollectionSummary): boolean {
  return collection.status === "IN_PROGRESS";
}
```

Update action kind:

```typescript
type CollectionActionKind = "accept" | "reject" | "finish" | "cancel" | "on-way";
```

Add handler:

```typescript
const handleMarkOnWay = useCallback(async (collectionId: string) => {
  // POST /api/collectors/requests/${collectionId}/on-the-way
}, [loadCollections, sessionMeta.generatorId, sessionMeta.token]);
```

Render behavior:

- `showOnWay = viewerRole === "WASTE_COLLECTOR" && isOnWayEligible(collection)`.
- Hide when collection is already on-way, finished, canceled, pending, or unknown.
- Disable while any action is pending for the collection.
- Pending label: `Avisando...`.
- Idle label: `Estou a caminho`.
- Success feedback: `Gerador avisado que o coletor está a caminho.`
- Error fallback: `Erro ao avisar que o coletor está a caminho.`

### Collector On-Way API Route

**Location**: `src/app/api/collectors/requests/[requestId]/on-the-way/route.ts`

Interface:

```typescript
export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse>
```

Behavior:

- Require `COLLECTIONS_API_URL`.
- Await `context.params` and validate `requestId`.
- Parse JSON body and validate non-empty `collectorId`.
- Forward `Authorization` header when present.
- Call `${COLLECTIONS_API_URL}/collectors/requests/${requestId}/on-the-way`.
- Send `Content-Type: application/json` with `{ collectorId }`.
- If backend returns `204`, return `new NextResponse(null, { status: 204 })`.
- If backend returns success JSON, return JSON with backend status.
- If backend returns an error, preserve status and readable payload.
- Return `500` JSON on unexpected errors.

### Status Label

**Location**: `src/app/lib/collectionsPage.ts`

Add a readable label once the backend enum is confirmed. Candidate values:

```typescript
{
  COLLECTOR_ON_THE_WAY: "Coletor a caminho",
  ON_THE_WAY: "Coletor a caminho"
}
```

The implementation should support the confirmed backend status and keep the existing fallback for unknown statuses.

## API Contract

### Frontend Local Route

```http
POST /api/collectors/requests/{requestId}/on-the-way
Content-Type: application/json
Authorization: Bearer <token>

{
  "collectorId": "collector-id"
}
```

### Backend Route

```http
POST ${COLLECTIONS_API_URL}/collectors/requests/{requestId}/on-the-way
Content-Type: application/json
Authorization: Bearer <token>

{
  "collectorId": "collector-id"
}
```

Success may be:

```http
204 No Content
```

or:

```http
200 OK
Content-Type: application/json
```

```json
{
  "id": "request-id",
  "status": "COLLECTOR_ON_THE_WAY"
}
```

## State and UX

| State | UI |
| --- | --- |
| Collector viewing eligible `IN_PROGRESS` collection | Show `Estou a caminho`. |
| Collector viewing `PENDING` collection | Do not show on-way; existing accept/reject/cancel apply. |
| Collector viewing on-way collection | Do not show on-way again; show readable status. |
| Generator viewing any collection | Do not show on-way action. |
| Action in progress | Disable all card actions and show `Avisando...`. |
| Success | Show success feedback and refresh list. |
| Failure | Show backend error or fallback error and keep card visible. |

## Validation Strategy

- `npm run lint`
- `npx tsc --noEmit`
- Manual check that on-way appears only for collector eligible cards.
- Manual check that click sends `{ collectorId }`.
- Manual check that backend `204` returns local `204` without `500`.
- Manual check that success refreshes collections.
- Manual check that push notification is triggered by backend status transition if notification backend is enabled.

## Implementation Notes

- Implemented local route: `src/app/api/collectors/requests/[requestId]/on-the-way/route.ts`.
- Implemented UI action in `src/app/collections/page.tsx`.
- Added readable labels for `COLLECTOR_ON_THE_WAY` and `ON_THE_WAY`.
- `IN_PROGRESS` cards for collectors show `Estou a caminho`; already-on-way cards hide that action but remain finish/cancel eligible.
- Backend `204 No Content` responses are returned as empty `204` responses.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Backend status enum is unknown | Support known candidate labels and preserve fallback for unknown statuses. |
| Eligibility differs from product expectation | Keep eligibility helper small so changing statuses is localized. |
| Existing `sessionMeta.generatorId` name is confusing for collector ID | Reuse current collection page pattern and document it in spec assumptions. |
| Backend returns empty success body | Explicitly handle `204 No Content`. |
| On-way competes with finish/cancel actions | Disable all actions while pending and place on-way as a collector lifecycle action. |
| Push notification is not sent | Treat notification sending as backend responsibility triggered by the endpoint. |

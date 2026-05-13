# Reject Collection Design

**Spec**: `.specs/features/reject-collection/spec.md`
**Status**: Implemented

---

## Architecture Overview

Add a collector-only reject action beside the existing pending accept action on `/collections`. The page keeps using the current role, status, feedback, and per-card pending patterns. A new local App Router route proxies the reject request to the collection backend.

Flow:

1. Collector opens `/collections`.
2. Page loads collections through `/api/collections/search`.
3. For each `PENDING` collection and collector viewer, the card renders both accept and reject actions.
4. Collector clicks reject.
5. Page calls `POST /api/collectors/requests/{requestId}/reject` with the session authorization header.
6. Local route validates `requestId`, forwards authorization, and calls the backend reject endpoint through `COLLECTIONS_API_URL`.
7. On success, page shows rejection feedback and refreshes the collection list.
8. On failure, page shows an error and leaves the card actionable.

## Code Reuse Analysis

| Existing Code | Location | Reuse |
| --- | --- | --- |
| Pending eligibility helper | `src/app/collections/page.tsx` | Use the same `status === "PENDING"` rule for reject. |
| `actionPendingId` state | `src/app/collections/page.tsx` | Reuse per-collection submission guard for accept/reject/finish. |
| `actionFeedback` state | `src/app/collections/page.tsx` | Reuse success/error card feedback. |
| Accept handler pattern | `src/app/collections/page.tsx` | Mirror request, success, catch, and reload behavior. |
| Accept route handler | `src/app/api/collections/requests/[id]/accept/route.ts` | Mirror env validation, auth forwarding, backend error handling. |
| `button()` helper | `src/app/components/ui.tsx` | Reuse for reject button styling, likely with ghost/destructive classes if supported locally. |

## Components and Interfaces

### Collections Page

**Location**: `src/app/collections/page.tsx`

Add:

```typescript
function isRejectEligible(collection: CollectionSummary): boolean {
  return collection.status === "PENDING";
}

const handleReject = useCallback(async (collectionId: string) => {
  // POST /api/collectors/requests/${collectionId}/reject
}, [loadCollections, sessionMeta.token]);
```

Update `CollectionCard` props:

```typescript
onReject: (collectionId: string) => void;
```

Render behavior:

- `showReject = viewerRole === "WASTE_COLLECTOR" && isRejectEligible(collection)`.
- Show reject near accept for pending collector cards.
- Disable reject while `actionPending` is true.
- Prefer labels:
  - Idle: `Rejeitar`
  - Pending: `Rejeitando...`
  - Success feedback: `Coleta rejeitada com sucesso.`
  - Error fallback: `Erro ao rejeitar coleta.`

### Reject API Route

**Location**: `src/app/api/collectors/requests/[requestId]/reject/route.ts`

Interface:

```typescript
export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse>
```

Behavior:

- Require `COLLECTIONS_API_URL`.
- Await `context.params` and validate `requestId`.
- Forward `Authorization` header when present.
- Call `${COLLECTIONS_API_URL}/collectors/requests/${requestId}/reject`.
- Parse JSON response when available.
- Return backend success payload if present, otherwise `{ ok: true }`.
- Forward backend errors with their status and payload when available.
- Return `500` JSON on unexpected errors.

## API Contract

### Local Route

```http
POST /api/collectors/requests/{requestId}/reject
Authorization: Bearer <token>
```

Success:

```http
200 OK
```

The frontend should not require a response body.

### Backend Proxy Target

```http
POST ${COLLECTIONS_API_URL}/collectors/requests/{requestId}/reject
```

## State and UX

| State | UI |
| --- | --- |
| Pending collector collection | Show `Aceitar coleta` and `Rejeitar`. |
| Reject in progress | Disable available action buttons for that collection and show `Rejeitando...`. |
| Reject success | Show success feedback, then refreshed list. |
| Reject failure | Show error feedback and keep action available after pending clears. |
| Non-collector user | No reject button. |
| Non-pending collection | No reject button. |

## Validation Strategy

- `npm run lint`
- `npm run build`
- Manual check that reject appears only for collector pending cards.
- Manual check that reject calls `/api/collectors/requests/{id}/reject`.
- Manual check success refresh and failure feedback.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Backend returns empty success body | Route handler should not require JSON on success. |
| Endpoint path differs from existing `/api/collections/requests/...` action namespace | Use the exact user-provided path for the local route. |
| Accept and reject clicks race | Reuse one `actionPendingId` guard to disable both while any action is pending for that card. |
| Rejected request remains in search results | Reload after success and rely on backend status/search behavior. |

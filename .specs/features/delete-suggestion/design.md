# Delete Suggestion Design

**Spec**: `.specs/features/delete-suggestion/spec.md`
**Status**: Implemented

---

## Architecture Overview

Add a delete action to each saved route card on `/routes/saved`. The page calls a new local App Router route that proxies `DELETE` to the collections backend. On `204 No Content`, the page removes the saved route from local state and shows success feedback.

Flow:

1. Collector opens `/routes/saved`.
2. Page loads saved routes through `/api/collectors/routes/saved`.
3. Each saved route card renders a delete button.
4. Collector clicks delete.
5. Page calls `DELETE /api/collectors/routes/saved/{savedRouteId}` with the session authorization header.
6. Local route validates `savedRouteId`, forwards authorization, and calls `${COLLECTIONS_API_URL}/collectors/routes/saved/{savedRouteId}`.
7. On `204 No Content`, page removes the route from `routes`.
8. On failure, page keeps the route visible and shows an error.

## Code Reuse Analysis

| Existing Code | Location | Reuse |
| --- | --- | --- |
| Saved routes list state | `src/app/routes/saved/page.tsx` | Remove deleted route from `routes` or reload via `loadSavedRoutes`. |
| Saved route card component | `src/app/routes/saved/page.tsx` | Add delete button and pending state props. |
| `getApiError` | `src/app/routes/saved/page.tsx` | Reuse backend error extraction. |
| `headers` memo | `src/app/routes/saved/page.tsx` | Reuse authorization forwarding for fetch. |
| Saved routes proxy | `src/app/api/collectors/routes/saved/route.ts` | Match route-handler style and environment validation. |
| `button()` helper | `src/app/components/ui.tsx` | Reuse for delete action styling, with high-contrast destructive classes. |

## Components and Interfaces

### Saved Routes Page

**Location**: `src/app/routes/saved/page.tsx`

Add state:

```typescript
type DeleteRouteFeedback = {
  type: "success" | "error";
  message: string;
};

const [deletePendingId, setDeletePendingId] = useState<string>();
const [deleteFeedback, setDeleteFeedback] = useState<DeleteRouteFeedback>();
```

Add handler:

```typescript
async function deleteSavedRoute(savedRouteId: string) {
  // DELETE /api/collectors/routes/saved/${savedRouteId}
}
```

Behavior:

- Set `deletePendingId` before the request.
- Clear previous delete feedback before the request.
- On success, remove the route from local state with `setRoutes`.
- On success, show `Rota salva excluída com sucesso.`
- On failure, show backend error text or `Erro ao excluir rota salva.`
- Clear `deletePendingId` in `finally`.

### Saved Route Card

**Location**: `src/app/routes/saved/page.tsx`

Update props:

```typescript
type SavedRouteCardProps = {
  route: SavedRoute;
  deletePending: boolean;
  onDelete: (id: string) => void;
  onOpenCollection: (id: string) => void;
};
```

Render behavior:

- Place delete button in the card header action area.
- Disable while `deletePending`.
- Label: `Excluir` normally, `Excluindo...` while pending.
- Use visible destructive styling: red border/text with red solid hover.

### Delete Saved Route API Route

**Location**: `src/app/api/collectors/routes/saved/[savedRouteId]/route.ts`

Interface:

```typescript
export async function DELETE(req: NextRequest, context: RouteContext): Promise<NextResponse>
```

Behavior:

- Require `COLLECTIONS_API_URL`.
- Await `context.params` and validate `savedRouteId`.
- Forward `Authorization` header when present.
- Call `${COLLECTIONS_API_URL}/collectors/routes/saved/${savedRouteId}` with method `DELETE`.
- If backend returns `204`, return `new NextResponse(null, { status: 204 })`.
- For other success statuses, return JSON payload if present, otherwise `{ ok: true }`.
- For backend errors, forward status and payload when available.
- Return `500` JSON on unexpected errors.

## API Contract

### Local Route

```http
DELETE /api/collectors/routes/saved/{savedRouteId}
Authorization: Bearer <token>
```

Success:

```http
204 No Content
```

### Backend Proxy Target

```http
DELETE ${COLLECTIONS_API_URL}/collectors/routes/saved/{savedRouteId}
```

## State and UX

| State | UI |
| --- | --- |
| Saved route card idle | Show `Excluir`. |
| Deleting one route | Disable only that route's delete button and show `Excluindo...`. |
| Delete success | Remove route from list and show success feedback. |
| Delete failure | Keep route visible and show error feedback. |
| Last route deleted | Existing empty state appears. |
| Non-collector user | Existing collector-only access state remains. |

## Validation Strategy

- `npm run lint`
- `npm run build`
- Manual check that delete appears on saved route cards.
- Manual check that delete calls `/api/collectors/routes/saved/{savedRouteId}` with method `DELETE`.
- Manual check that `204 No Content` removes the route from the list.
- Manual check failure feedback leaves the route visible.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Backend returns no body on success | Route handler explicitly returns `204` and page does not parse a body for success. |
| Accidental deletion | Button uses destructive styling; a confirmation modal is out of scope but can be added later. |
| Route disappears while modal is open | Delete only affects route list state; collection details modal can remain independently controlled. |
| Saved-route endpoint path differs from list path | Use exact user-provided local path and proxy to matching backend path. |

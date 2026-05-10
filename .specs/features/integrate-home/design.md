# Integrate Home Design

**Spec**: `.specs/features/integrate-home/spec.md`
**Status**: Implemented

---

## Architecture Overview

Integrate the home dashboard with the existing collections search route. The home page already reads the authenticated session and passes a normalized `userType` into `MainContent`; this feature should also pass the session user ID and token so `MainContent` can load role-scoped collections and derive card view models.

Flow:

1. User opens `/`.
2. `src/app/page.tsx` checks NextAuth session and derives role/user metadata.
3. `MainContent` receives `userType`, `userId`, and `token`.
4. `MainContent` calls `/api/collections/search` with `generatorId` or `collectorId`.
5. `MainContent` normalizes the response into `CollectionSummary[]`.
6. Active card counts `IN_PROGRESS` collections.
7. Next and last cards receive the first 2 mapped items.
8. Cards render loading, empty, and error-friendly states.

## Code Reuse Analysis

### Existing Components to Leverage

| Component/Helper | Location | How to Use |
| --- | --- | --- |
| `getSessionMeta` | `src/app/lib/createCollection.ts` | Read session user ID, role, and token. |
| `isGeneratorRole` | `src/app/lib/createCollection.ts` | Derive generator query key. |
| `isCollectorRole` | `src/app/lib/collectionsPage.ts` | Derive collector query key. |
| `normalizeCollections` | `src/app/lib/collectionsPage.ts` | Normalize `/api/collections/search` response. |
| `formatWeight`, `formatDate`, `statusLabel` | `src/app/lib/collectionsPage.ts` | Reuse display formatting. |
| `ActiveCollectionsCard` | `src/app/components/home/cards/ActiveCollectionsCard.tsx` | Convert from hardcoded count to props. |
| `NextCollectionsCard` | `src/app/components/home/cards/NextCollectionsCard.tsx` | Keep visual layout, adapt props from API. |
| `LastCollectionsCard` | `src/app/components/home/cards/LastCollectionsCard.tsx` | Keep visual layout, adapt props from API. |
| Collections search route | `src/app/api/collections/search/route.ts` | Existing local API proxy. |

### Integration Points

| System | Integration Method |
| --- | --- |
| Home session | `src/app/page.tsx` passes `userId`, `userType`, `token` to `MainContent`. |
| Collection search | `GET /api/collections/search?generatorId=<id>` or `collectorId=<id>`. |
| Active count | Filter normalized collections by `status === "IN_PROGRESS"` and count. |
| Next card | First 2 normalized collections mapped to `NextCollection` view model. |
| Last card | First 2 normalized collections mapped to `CollectionRow` view model. |

## Components and Interfaces

### Home Main Content

- **Purpose**: Own home collection loading and pass derived card data into cards.
- **Location**: `src/app/components/home/MainContent.tsx`
- **Interfaces**:
  - `userType?: "WASTE_COLLECTOR" | "GENERATOR"`
  - `userId?: string`
  - `token?: string`
  - `loadHomeCollections(): Promise<void>`
- **Dependencies**: `/api/collections/search`, collection normalizers, dashboard cards.
- **Behavior**:
  - Do not load collections until `userType` and `userId` exist.
  - Use `collectorId` for waste collectors and `generatorId` for generators.
  - Store `loading`, `error`, and normalized collections in local state.

### Active Collections Card

- **Purpose**: Show count of active in-progress collections.
- **Location**: `src/app/components/home/cards/ActiveCollectionsCard.tsx`
- **Interfaces**:
  - `count: number`
  - `loading?: boolean`
  - `error?: boolean`
- **Behavior**:
  - Replace hardcoded `5`.
  - Show a loading placeholder while home collection data loads.
  - Show `0` or fallback text on error without breaking the card link.

### Next Collections Card

- **Purpose**: Show up to 2 collection summaries using the existing upcoming-card layout.
- **Location**: `src/app/components/home/cards/NextCollectionsCard.tsx`
- **Interfaces**:
  - `collections: NextCollection[]`
  - `loading?: boolean`
  - `error?: boolean`
- **View Model**:

```typescript
interface NextCollection {
  id: string;
  date: Date;
  location: string;
  time: string;
  weight: string;
  materials: string[];
}
```

- **Behavior**:
  - Map `createdAt` or `updatedAt` to `date` and `time`.
  - Map `weight` to localized kilogram text.
  - Map `materialIds` to material labels.
  - Use fallback location text because the current collection search result only exposes `addressId`.

### Last Collections Card

- **Purpose**: Show up to 2 recent collection rows using the existing table-like layout.
- **Location**: `src/app/components/home/cards/LastCollectionsCard.tsx`
- **Interfaces**:
  - `collections: CollectionRow[]`
  - `loading?: boolean`
  - `error?: boolean`
- **View Model**:

```typescript
interface CollectionRow {
  id: string;
  kg: string;
  date: string;
  status: "Concluída" | "Cancelado" | "Em Andamento" | "Pendente" | string;
  rating: number | null;
}
```

- **Behavior**:
  - Map `weight` to kilogram text.
  - Map `createdAt` or `updatedAt` to compact date text.
  - Map `status` through existing `statusLabel`.
  - Keep `rating` as `null` until rating backend exists.

## Data Mapping

### Home Collection Query

```text
GET /api/collections/search?generatorId=<session.user.id>
GET /api/collections/search?collectorId=<session.user.id>
```

### Active Count

```typescript
const activeCount = collections.filter((item) => item.status === "IN_PROGRESS").length;
```

### Next Collections

```typescript
const nextCollections = collections.slice(0, 2).map(mapCollectionToNextCollection);
```

### Last Collections

```typescript
const lastCollections = collections.slice(0, 2).map(mapCollectionToLastCollectionRow);
```

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Missing session user ID | Skip fetch and show collection card empty states | Dashboard remains usable. |
| Unknown role | Skip fetch and show collection card empty states | Avoids wrong query params. |
| Search API error | Set card error state | User sees fallback instead of stale fake data. |
| Empty response | Active count `0`, list cards empty | User understands there are no collections. |
| Malformed items | `normalizeCollections` filters invalid items | Cards render valid data only. |
| Missing address details | Use fallback location label | Avoids showing broken layout. |

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Data owner | `MainContent` | It already composes all home cards and can share one API response. |
| API access | Existing local `/api/collections/search` | Keeps backend URL server-side and reuses normalized route behavior. |
| Fetch count strategy | One role-scoped search response, derive count/client lists | Avoids extra requests while the API has no count endpoint. |
| Card props | Extend existing card props | Keeps visual components simple and testable. |
| Sorting | Use backend order for "first 2" | User requested first 2 items and no sort contract exists. |
| Tests | Lint/build gates for now | Project has no automated test framework configured. |

## Open Questions

- Should "Próximas Coletas" filter to only `PENDING` or `IN_PROGRESS` once status semantics are finalized?
- Should "Últimas coletas" sort by `updatedAt` descending if the backend does not sort?
- Should location eventually be enriched from `addressId` when an address endpoint exists?

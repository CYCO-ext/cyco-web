# Create Collection Design

**Spec**: `.specs/features/create-collection/spec.md`
**Status**: Implemented

---

## Architecture Overview

Implement create collection as a generator-only page flow backed by small Next.js route handlers. The page should keep UI state local, reuse existing layout/components, and route all backend calls through `/api/*` endpoints so environment variables remain server-side.

Flow:

1. `/collections/new` checks authentication and generator role.
2. The page loads materials through `/api/materials`, which calls `GET ${BASE_API_URL}/materials`.
3. When "Localizacao cadastrada" is checked, the page calls a new generator profile route, which calls `GET ${BASE_API_URL}/generator/:id`.
4. Manual CEP input calls an address enrichment adapter and fills street, city, and neighborhood.
5. Submit calls a new collection request route, which posts to `POST ${COLLECT_API_URL}/generator/request`.
6. Success opens a confirmation modal.

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --- | --- | --- |
| `Header` | `src/app/components/Header.tsx` | Keep page shell consistent. |
| `Sidebar` | `src/app/components/Sidebar.tsx` | Keep dashboard navigation. |
| `Input` | `src/app/components/ui.tsx` | Reuse for address and weight fields where possible. |
| `button` | `src/app/components/ui.tsx` | Reuse CYCO button styling for submit/cancel/modal action. |
| Current collection page | `src/app/collections/new/page.tsx` | Refactor existing page instead of replacing the route. |
| Materials route | `src/app/api/materials/route.ts` | Reuse and adjust response typing/normalization if needed. |
| Auth/session pattern | `src/app/page.tsx` | Reuse `useSession` redirect pattern, with stricter generator checks. |

### Integration Points

| System | Integration Method |
| --- | --- |
| Materials API | `GET /api/materials` -> `GET ${BASE_API_URL}/materials` |
| Generator profile API | `GET /api/generator/[id]` -> `GET ${BASE_API_URL}/generator/:id` |
| Collection request API | `POST /api/collections/request` -> `POST ${COLLECT_API_URL}/generator/request` |
| CEP enrichment | Adapter function or route that returns `street`, `city`, and `neighborhood` for a CEP |
| NextAuth session | Read `session.user.id` as `generatorId`, plus `role` and `token` from the JWT session contract |

## Components and Interfaces

### Create Collection Page

- **Purpose**: Render and orchestrate the create collection form.
- **Location**: `src/app/collections/new/page.tsx`
- **Interfaces**:
  - `loadMaterials(): Promise<void>` - loads material options.
  - `handleRegisteredAddressToggle(checked: boolean): Promise<void>` - applies or clears registered address mode.
  - `handleCepBlur(): Promise<void>` - enriches manual address fields.
  - `handleSubmit(): Promise<void>` - validates and sends the request.
- **Dependencies**: NextAuth session, materials route, generator route, collection request route, CEP enrichment adapter.
- **Reuses**: `Header`, `Sidebar`, `Input`, `button`, existing dropdown behavior.

### Confirmation Modal

- **Purpose**: Confirm successful creation without leaving the user uncertain.
- **Location**: Prefer colocated in `src/app/collections/new/page.tsx` initially, or extract to `src/app/components/ConfirmationModal.tsx` if reused.
- **Interfaces**:
  - `open: boolean`
  - `title: string`
  - `description?: string`
  - `onClose(): void`
- **Dependencies**: Local page state.
- **Reuses**: Existing button styles.

### Generator Profile Route

- **Purpose**: Fetch the current generator's registered address data.
- **Location**: `src/app/api/generator/[id]/route.ts`
- **Interfaces**:
  - `GET(req, { params: { id } }): Promise<NextResponse<GeneratorProfile>>`
- **Dependencies**: `BASE_API_URL`, optional access token forwarding if backend requires auth.
- **Reuses**: API proxy style from `src/app/api/materials/route.ts`.

### Collection Request Route

- **Purpose**: Submit a create collection request while keeping `COLLECT_API_URL` server-side.
- **Location**: `src/app/api/collections/request/route.ts`
- **Interfaces**:
  - `POST(req): Promise<NextResponse<CollectionRequestResponse>>`
- **Dependencies**: `COLLECT_API_URL`.
- **Reuses**: API proxy style from `src/app/api/register/route.ts`.

### CEP Enrichment Adapter

- **Purpose**: Convert a CEP into street, city, and neighborhood.
- **Location**: `src/app/lib/address.ts` or `src/app/api/address/cep/[cep]/route.ts`
- **Interfaces**:
  - `enrichCep(cep: string): Promise<CepAddress>`
- **Dependencies**: Preferred backend endpoint if available; otherwise an external CEP service should be isolated behind this function/route.
- **Reuses**: None currently.

## Data Models

### Material

```typescript
interface Material {
  // Materials are backend value objects; this is the selectable value.
  id: string;
  name: string;
}
```

**Relationships:** `GET /materials` returns `{ name: string }[]`. The frontend normalizes each material to `{ id: name, name }`, so selected material names map to `materialIds` in the collection request.

### Generator Profile

```typescript
interface GeneratorProfile {
  id: string;
  birthDate: string;
  document: string;
  email: string;
  name: string;
  phone: {
    ddd: number;
    ddi: number;
    number: string;
  };
  address: GeneratorAddress[];
}

interface GeneratorAddress {
  id?: string;
  zipCode: string;
  number: string;
  complement?: string;
  street?: string;
  city?: string;
  neighborhood?: string;
}
```

**Relationships:** The first/default `GeneratorAddress` fills the form fields. Address is treated as a value object and does not need an ID.

### Create Collection Form State

```typescript
interface CreateCollectionFormState {
  useRegisteredAddress: boolean;
  addressId?: string;
  zipCode: string;
  number: string;
  street: string;
  city: string;
  neighborhood: string;
  complement?: string;
  materialIds: string[];
  weight: string;
}
```

**Relationships:** Valid form state maps to `CreateCollectionRequest`.

### Create Collection Request

```typescript
interface CreateCollectionRequest {
  generatorId: string;
  addressId?: string;
  materialIds: string[];
  weight: number;
}
```

**Relationships:** This is the backend POST body for `POST ${COLLECT_API_URL}/generator/request`.

## Validation Rules

| Field | Rule |
| --- | --- |
| `generatorId` | Required from authenticated NextAuth `session.user.id`. |
| `addressId` | Optional; address values from the generator profile do not include IDs. |
| `materialIds` | At least one selected material name from `GET /materials`. |
| `weight` | Required number greater than 0. |
| `zipCode` | Required for manual mode before enrichment. |
| `street`, `city`, `neighborhood` | Filled by enrichment, editable after fill. |

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Unauthenticated user | Redirect to `/auth/login` | User must log in. |
| Non-generator user | Show access message or redirect home | Collector cannot create generator request. |
| Materials fail | Show inline load error and retry action | User cannot submit until material values are available. |
| Generator profile fails | Show inline error and keep manual mode enabled | User can continue manually. |
| Registered address lacks `id` | Do not block; fill fields and enrich from ViaCEP | Matches backend value-object address contract. |
| CEP enrichment fails | Inline warning, keep fields editable | User can fix CEP or enter data manually. |
| Request submit fails | Inline/form-level error and preserve form state | User can retry without losing data. |
| Request submit succeeds | Open confirmation pop-up | User receives clear success feedback. |

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Backend calls | Use Next.js route handlers | Matches existing proxy pattern and keeps env vars server-side. |
| Materials source | Keep `/api/materials`, backed by `BASE_API_URL` | Existing route already follows this pattern. |
| Collection API env | Use `COLLECT_API_URL` for submit route | Matches requested feature contract, but may require `.env` alignment. |
| Registered address | Use first/default address for v1 | The provided contract returns an array but no selection behavior. |
| Success feedback | Modal/pop-up | Explicit user requirement and clearer than `alert`. |
| Tests | Start with lint/build gates unless test stack is added | Current project has no automated test framework configured. |

## Implementation Notes

- Remove the "Empresa" input from `src/app/collections/new/page.tsx`.
- Keep images visually optional or remove them from required submission unless backend extends the request contract.
- The current generator address is a value object without `id`; implementation must not validate address IDs and should enrich registered CEP with ViaCEP.
- The NextAuth session should follow `{ user: { id, name, email }, role, token }`; helper code should read `session.user.id` as `generatorId`.

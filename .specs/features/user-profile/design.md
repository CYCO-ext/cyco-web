# User Profile Design

**Spec**: `.specs/features/user-profile/spec.md`
**Status**: Implemented

---

## Architecture Overview

Add a read-only `/profile` page that uses the authenticated session to fetch the user's full role-specific profile. The page reuses the authenticated app shell and local profile proxy routes already used by collection flows.

Flow:

1. User opens `/profile`.
2. Page checks NextAuth session.
3. Page derives role and ID using `getSessionMeta(session)`.
4. Page chooses endpoint:
   - Generator: `/api/generator/{id}`
   - Collector: `/api/waste-collector/{id}`
5. Page forwards bearer token when present.
6. Page normalizes the response into display sections.
7. Page renders identity, contact, address, enterprise, collector materials, and additional details.

## Code Reuse Analysis

| Existing Code | Location | Reuse |
| --- | --- | --- |
| `Header` | `src/app/components/Header.tsx` | Authenticated page shell and profile avatar entry point. |
| `Sidebar` | `src/app/components/Sidebar.tsx` | Authenticated navigation. |
| `button()` | `src/app/components/ui.tsx` | Retry action. |
| `getSessionMeta` | `src/app/lib/createCollection.ts` | Session ID, role, and token extraction. |
| `isGeneratorRole` | `src/app/lib/createCollection.ts` | Generator role detection. |
| `isCollectorRole` | `src/app/lib/collectionsPage.ts` | Collector role detection. |
| `formatProfilePhone` | `src/app/lib/collectionsPage.ts` | Phone formatting style. |
| Generator profile proxy | `src/app/api/generator/[id]/route.ts` | Fetch generator profile. |
| Waste collector proxy | `src/app/api/waste-collector/[id]/route.ts` | Fetch collector profile. |

## Components and Interfaces

### Profile Page

**Location**: `src/app/profile/page.tsx`

Responsibilities:

- Redirect unauthenticated users to `/auth/login`.
- Resolve profile endpoint from session role.
- Load profile data with token forwarding.
- Render loading, error, unsupported-role, and missing-ID states.
- Render normalized profile sections.

Suggested state:

```typescript
type ProfilePageState =
  | { status: "idle" | "loading" }
  | { status: "ready"; profile: UserProfileView }
  | { status: "error"; message: string };
```

### Profile Normalization Helpers

**Preferred location**: `src/app/lib/userProfile.ts`

Exports:

```typescript
export type UserProfileRole = "GENERATOR" | "WASTE_COLLECTOR";

export interface UserProfileView {
  id: string;
  role: UserProfileRole;
  identity: Array<{ label: string; value: string }>;
  contact: Array<{ label: string; value: string }>;
  enterprise: Array<{ label: string; value: string }>;
  materials: Array<{ label: string; value: string }>;
  addresses: Array<{
    title: string;
    fields: Array<{ label: string; value: string }>;
  }>;
  additional: Array<{ label: string; value: string }>;
}
```

Helper responsibilities:

- Unwrap `{ data: profile }` responses.
- Normalize strings, numbers, booleans, and dates into display text.
- Accept `address` as either an object or array.
- Format phone from `phone.ddi`, `phone.ddd`, `phone.number`.
- Avoid showing empty sections.
- Keep extra scalar top-level fields in `additional` if they are not already displayed.
- Normalize collector `materials` arrays into a dedicated materials section.

### Header Profile Entry

**Location**: `src/app/components/Header.tsx`

Design:

- Make the profile avatar clickable.
- Navigate to `/profile`.
- Preserve current visual appearance.
- Add an accessible label such as `Abrir perfil`.

Implementation option:

- Convert `Header` to a client component and use `useRouter`, or wrap avatar with `Link`.
- Prefer `Link` if it keeps the component simple.

### Sidebar Profile Entry

**Location**: `src/app/components/Sidebar.tsx`

Design:

- Add a `Perfil` navigation item using a user/profile icon from `lucide-react`.
- Keep it visible for generators and collectors.
- Existing generator route filtering should not hide `/profile`.

## Data Mapping

### Identity Section

Candidate fields:

- `id`
- `name`
- `email`
- `document`
- `birthDate`
- role label

### Contact Section

Candidate fields:

- formatted `phone`
- `phone.ddi`
- `phone.ddd`
- `phone.number`

### Enterprise Section

Candidate fields under `enterprise`:

- `companyName`
- `businessName`
- `tradeName`
- `document`
- `cnpj`
- `stateRegistration`
- `municipalRegistration`

### Materials Section

Candidate fields:

- `materials` as string names
- `materials[].name`
- `materials[].id`
- `materials[].value`

### Address Section

Candidate fields:

- `zipCode`
- `street`
- `number`
- `complement`
- `neighborhood`
- `city`
- `state`
- `latitude`
- `longitude`
- `enrichmentStatus`
- `enrichmentSource`

## UI Layout

- Use the existing authenticated layout: full-height page, `Header`, `Sidebar`, scrollable `main`.
- Use a constrained max-width content column.
- Top summary band with name, role, email, and ID.
- Detail sections as simple white cards in a responsive grid.
- Avoid nested card-in-card layouts.
- Use compact labels and values for scan-friendly operational UI.

## Error Handling Strategy

| Scenario | Handling |
| --- | --- |
| Unauthenticated | Redirect to `/auth/login`. |
| Missing ID | Show configuration error and no backend request. |
| Unknown role | Show unsupported-role error. |
| Backend error | Show backend error text when available and retry button. |
| Empty profile | Show fallback summary from session data and note full profile is unavailable. |
| Missing section data | Hide that section. |

## Validation Strategy

- `npm run lint`
- `npm run build`
- Manual check generator profile page.
- Manual check collector profile page.
- Manual check missing/failed profile response.
- Manual check header avatar and sidebar profile navigation.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Backend profile shapes differ between roles | Normalize defensively and expose extra scalar fields in `additional`. |
| Collector materials are arrays and skipped by scalar fallback | Normalize them before the generic additional-field pass. |
| `getSessionMeta.generatorId` name is role-neutral in practice but confusing | Document assumption and reuse existing project convention. |
| Header becoming client-side could affect layout | Prefer `Link` to keep it simple. |
| Sensitive fields displayed unintentionally | Show known useful fields plus scalar extras only; do not recursively dump nested objects outside known sections. |

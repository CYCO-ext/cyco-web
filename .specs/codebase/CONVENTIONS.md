# Code Conventions

## Naming Conventions

**Files:**
Pages and route handlers follow Next.js App Router names: `page.tsx`, `layout.tsx`, and `route.ts`.
Component files use PascalCase for most components, such as `Header.tsx`, `Sidebar.tsx`, and `MainContent.tsx`. A few files use lowercase or mixed naming, such as `ui.tsx`, `roleCard.tsx`, and `authLayout.tsx`.

**Functions and components:**
React components are exported as named or default functions in PascalCase: `WelcomePage`, `LoginPage`, `RegisterStep1`, `NewCollectionPage`, `MainContent`.
Event handlers use `handle*` naming when extracted, such as `handleNextStep` and `handleImageChange`.

**Variables:**
Local state uses descriptive camelCase names: `selectedMaterials`, `isEnterprise`, `materials`, `dropdownRef`.
Some domain sample data uses Portuguese names, such as `coletasRecentes` and `proximasColetas`.

**Constants:**
Environment constants use uppercase names such as `BASE_API_URL` and `NEXTAUTH_URL`.
Static lists use camelCase, such as `materialsList`.

## Code Organization

**Imports:**
Imports are generally grouped by external libraries first, then local modules. There is not yet a strict enforced ordering.

**File structure:**
Client pages usually follow this order:

- `"use client"` directive.
- Imports.
- Local constants or component function.
- Hook setup and handlers.
- Conditional loading/redirect rendering.
- JSX return.

**Styling:**
Styling is primarily inline Tailwind classes. Global tokens live in `src/app/globals.css`.

**Forms:**
Auth forms use `react-hook-form` and Zod schemas from `src/app/lib/schemas.ts`.

**Routing:**
Client navigation uses `useRouter` from `next/navigation`.

## Type Safety and Documentation

**Approach:** TypeScript is strict, but some values currently use `any` when NextAuth session types are not extended.

Examples:

- `RegisterSchemaType` is inferred from `registerSchema`.
- Home page casts session to `any` to read role.
- Register page uses `payload: any` when constructing role-specific backend payloads.

## Error Handling

**Pattern:** Current error handling is simple and user-facing errors often use `alert`.

Examples:

- Login shows `alert("Email ou senha invalidos")` when credentials fail.
- Registration shows `alert("Erro ao registrar")` on failed backend response.
- API route handlers catch unexpected errors and return JSON with status 500.

## Comments and Documentation

**Style:** Comments are sparse and mostly label JSX sections in Portuguese, such as `STEP 2`, `SIDEBAR`, `CONTENT`, and `FOOTER`.

## Notable Variations

- Role naming differs between frontend registration values (`GERADOR`, `CATADOR`) and dashboard session comparison (`WASTE_COLLECTOR`, `GENERATOR`).
- Material names appear in both English and Portuguese depending on file.
- Some components use CYCO theme tokens while the collection page uses generic green classes.

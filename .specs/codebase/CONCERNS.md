# Codebase Concerns

**Analyzed:** 2026-05-09

## High Priority

### Role naming is inconsistent

**Evidence:** Registration uses `GERADOR` and `CATADOR` in `src/app/lib/schemas.ts` and `src/app/auth/register/page.tsx`, while `src/app/page.tsx` checks `(session as any)?.role === "WASTE_COLLECTOR"` and otherwise treats the user as `GENERATOR`.

**Risk:** Waste collectors may see the generator dashboard if the backend returns `CATADOR` or another role string.

**Suggested fix:** Define one frontend role type and a normalization helper near auth/session code. Extend NextAuth session typing so role access does not require `any`.

### Logout does not clear the NextAuth session

**Evidence:** `src/app/components/Sidebar.tsx` handles logout by `router.push("/auth/login")`.

**Risk:** The session can remain valid after navigating to the login page, causing confusing redirects or retained access.

**Suggested fix:** Use `signOut` from `next-auth/react` and redirect after the session is cleared.

### New collection form has no submit integration

**Evidence:** `src/app/collections/new/page.tsx` gathers materials, weight, location fields, and images, but the Confirm button has no submit handler.

**Risk:** The core generator workflow appears usable but does not create a collection request.

**Suggested fix:** Create a feature spec for collection request creation, confirm backend payload shape, then add a route handler and form submit flow.

## Medium Priority

### Test infrastructure is missing

**Evidence:** `package.json` has `dev`, `build`, `start`, and `lint`, but no `test` script. No test files or test configs were found.

**Risk:** Auth, registration, and collection behavior can regress without automated feedback.

**Suggested fix:** Add the smallest useful test stack when implementing the next behavior-heavy feature. Start with schema and API route handler tests, then add E2E for auth and collection creation.

### API error handling loses detail

**Evidence:** API route handlers return generic 500 messages on catch, while UI pages mostly show `alert` without backend validation detail.

**Risk:** Users and developers get limited feedback when backend validation fails.

**Suggested fix:** Normalize API error responses and render inline form errors where possible.

### Static dashboard data may hide missing integrations

**Evidence:** `src/app/components/home/MainContent.tsx` defines hard-coded recent collections, upcoming collections, and material impact data.

**Risk:** Dashboard cards can look complete before backend data, loading, empty, and error states are implemented.

**Suggested fix:** Track dashboard backend integration as a separate feature and add explicit loading/empty/error states.

### Material names are inconsistent

**Evidence:** `src/app/lib/schemas.ts` exports English material names (`Glass`, `Plastic`, `Paper`, `Metal`, `Organic`), while the collection page and dashboard use Portuguese names (`Vidro`, `Metal`, `Eletronico`, `Plastico`, `Papel`).

**Risk:** Backend filtering, display labels, and analytics can diverge.

**Suggested fix:** Centralize material IDs and localized labels after confirming backend material taxonomy.

## Low Priority

### README is still the default Next.js template

**Evidence:** `README.md` describes a create-next-app starter and does not mention CYCO setup, env vars, or workflows.

**Risk:** New contributors will not know how to configure backend URLs or use the project-specific flows.

**Suggested fix:** Replace the README with project setup, environment variables, scripts, and product overview.

### Component/file naming is mixed

**Evidence:** `Header.tsx`, `Sidebar.tsx`, and `MainContent.tsx` use PascalCase, while `authLayout.tsx` and `roleCard.tsx` use lowercase/camelCase file names.

**Risk:** Import style can become inconsistent as the project grows.

**Suggested fix:** Pick a convention for component files and apply it during nearby edits.

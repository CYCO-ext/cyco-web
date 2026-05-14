# User Profile Specification

## Problem Statement

Authenticated users need a dedicated profile page where they can review all known account, contact, enterprise, and address information. The app currently uses profile data indirectly for collections and route planning, but there is no first-class profile screen.

## Goals

- [x] Add a profile page for authenticated users.
- [x] Fetch full profile data using the current user's role and ID.
- [x] Show all available user information in readable sections, including collector materials.
- [x] Support generator and waste collector profile response shapes.
- [x] Provide loading, error, empty/fallback, and retry states.
- [x] Add navigation entry points to the profile page.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Editing profile information | The request only asks to show profile information. |
| Changing password or authentication settings | Auth management belongs to a separate security/settings feature. |
| Uploading profile photos | No upload endpoint or image contract is specified. |
| Creating missing profile fields | This is a read-only profile page. |

---

## Assumptions

- The authenticated session includes `session.user.id`, `session.role`, and token/access token fields already used by `getSessionMeta`.
- Generator users fetch full profile data through `GET /api/generator/[id]`.
- Waste collector users fetch full profile data through `GET /api/waste-collector/[id]`.
- Existing local proxy routes forward authorization and backend errors.
- Profile API responses may be either the raw profile object or wrapped under a `data` property.
- User profile fields are not fully standardized; the UI should render known fields and preserve graceful fallbacks for missing fields.
- The page path should be `/profile`.

---

## Requirements

### UP-01: Authenticated Profile Page

**User Story**: As an authenticated user, I want to open my profile page so that I can review the information registered for my account.

**Acceptance Criteria**:

1. WHEN an unauthenticated user opens `/profile` THEN the system SHALL redirect to `/auth/login`.
2. WHEN an authenticated user opens `/profile` THEN the system SHALL show the authenticated page shell with `Header` and `Sidebar`.
3. WHEN session ID or role is missing THEN the page SHALL show a recoverable configuration error.
4. WHEN profile data is loading THEN the page SHALL show a loading state.
5. WHEN profile loading fails THEN the page SHALL show an error and retry action.

### UP-02: Role-Based Profile Fetch

**User Story**: As the frontend, I want to fetch the correct profile endpoint for each role so that generator and collector profiles show complete data.

**Acceptance Criteria**:

1. WHEN the user role is `GENERATOR` or `GERADOR` THEN the page SHALL call `GET /api/generator/[session.user.id]`.
2. WHEN the user role is `WASTE_COLLECTOR` or `CATADOR` THEN the page SHALL call `GET /api/waste-collector/[session.user.id]`.
3. WHEN authorization token exists THEN the page SHALL forward it in the request.
4. WHEN the backend returns a wrapped profile object THEN the page SHALL normalize the wrapper.
5. WHEN the role is unknown THEN the page SHALL show a recoverable unsupported-role error.

### UP-03: Profile Data Display

**User Story**: As a user, I want all available profile information grouped clearly so that I can understand what data the system has for me.

**Acceptance Criteria**:

1. WHEN identity fields exist THEN the page SHALL show name, email, document, role, and profile ID.
2. WHEN phone fields exist THEN the page SHALL show phone with country code, area code, and number.
3. WHEN address fields exist THEN the page SHALL show every address with zip code, street, number, complement, neighborhood, city, state, and coordinates when available.
4. WHEN enterprise fields exist THEN the page SHALL show company name, business name, trade name, and enterprise document fields when available.
5. WHEN collector materials exist THEN the page SHALL show accepted materials in a dedicated materials section.
6. WHEN unknown but displayable top-level scalar fields exist THEN the page SHOULD expose them in an additional details section.
7. WHEN a section has no data THEN the page SHALL not render an empty card for that section.

### UP-04: Navigation Entry Points

**User Story**: As a user, I want profile navigation to be discoverable so that I can open my profile from the authenticated layout.

**Acceptance Criteria**:

1. WHEN the user clicks the profile avatar in `Header` THEN the system SHALL navigate to `/profile`.
2. WHEN authenticated sidebar navigation renders THEN it SHALL include a profile entry or otherwise keep profile access obvious.
3. WHEN generator route filtering hides route-specific links THEN profile navigation SHALL remain visible for both roles.

---

## Edge Cases

- Profile API returns `null`, an empty object, or malformed data.
- Role uses Portuguese values such as `GERADOR` or `CATADOR`.
- Phone fields are numbers or strings.
- Address is a single object or an array.
- Enterprise data is nested under `enterprise`.
- Collector materials may be strings or value objects.
- Backend returns extra scalar fields not explicitly modeled.
- User has multiple addresses.
- User has no registered address.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| UP-01 | Authenticated Profile Page | Execute | Verified |
| UP-02 | Role-Based Profile Fetch | Execute | Verified |
| UP-03 | Profile Data Display | Execute | Verified |
| UP-04 | Navigation Entry Points | Execute | Verified |

**Coverage:** 4 total, 4 implemented and verified.

---

## Success Criteria

- [x] `/profile` is available to authenticated users.
- [x] Generators load profile data from `/api/generator/[id]`.
- [x] Collectors load profile data from `/api/waste-collector/[id]`.
- [x] Profile sections show identity, contact, address, enterprise, collector materials, and additional known data when available.
- [x] Missing fields render gracefully.
- [x] Header avatar navigates to `/profile`.
- [x] Sidebar or authenticated navigation exposes profile access.
- [x] `npm run lint` passes.
- [x] `npm run build` passes or blockers are documented.

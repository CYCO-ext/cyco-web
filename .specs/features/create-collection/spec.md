# Create Collection Specification

## Problem Statement

Generators need a reliable way to request waste collection from the CYCO web app. The current create collection page captures some fields visually, but it does not load materials from the backend, does not submit requests, and does not support using the generator's registered address.

## Goals

- [ ] Let authenticated generator users create a collection request from `/collections/new`.
- [ ] Load selectable materials from `GET ${BASE_API_URL}/materials`.
- [ ] Submit collection requests to `POST ${COLLECT_API_URL}/generator/request`.
- [ ] Support either the generator's registered address or a manually entered/enriched address.
- [ ] Show a confirmation pop-up when the request is created successfully.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Uploading images to the create request API | The provided request contract does not include image upload handling. |
| Collector assignment/matching | Not part of the create request contract. |
| Collection status tracking | Belongs to dashboard/listing features. |
| CyCoins calculation | Requires reward rules not provided in this feature. |
| Multiple registered address selection | The example includes an address array, but no selection requirement was provided. v1 uses the first/default address. |

---

## Assumptions

- `COLLECT_API_URL` is the environment variable for the collection API base URL. The current project may need to add or align this variable.
- The authenticated NextAuth session follows the backend JWT contract: `{ user: { id, name, email }, role, token }`. The create collection flow uses `session.user.id` as `generatorId`.
- `GET /materials` returns material value objects in the format `{ name: string }`; the frontend uses `name` as the selectable and submittable material value.
- `GET /generator/:id` returns the generator shape provided by the user, including an `address` array of value objects without IDs.
- For v1, checking "Localizacao cadastrada" uses the first address returned by `GET /generator/:id` and enriches its CEP with ViaCEP.
- CEP enrichment should fill `street`, `city`, and `neighborhood` after the user enters a valid CEP. The exact enrichment source is an implementation detail, with preference for a backend endpoint if one exists; otherwise use a CEP lookup adapter.
- Address data is treated as a value object in the frontend; the UI must not require or validate `addressId`.

---

## User Stories

### P1: Load Backend Materials MVP

**User Story**: As a generator, I want to select materials loaded from the backend so that my collection request uses valid material values.

**Why P1**: The create request API requires `materialIds`, but the materials API exposes value-object names rather than database IDs.

**Acceptance Criteria**:

1. WHEN the create collection page loads THEN the system SHALL request materials from `GET ${BASE_API_URL}/materials`.
2. WHEN materials load successfully THEN the system SHALL show them as selectable options using material `name` as the value.
3. WHEN materials fail to load THEN the system SHALL show a non-blocking error state and prevent submission until materials are available.
4. WHEN the user selects one or more materials THEN the system SHALL store their names in `materialIds` for request submission.

**Independent Test**: Mock `/api/materials` with `[{ "name": "Glass" }]`, open `/collections/new`, and verify returned materials can be selected and `"Glass"` is used in submit state.

---

### P1: Use Registered Address MVP

**User Story**: As a generator, I want to use my registered address so that I do not need to type collection location data again.

**Why P1**: This is explicitly required and reduces friction for small/medium enterprises.

**Acceptance Criteria**:

1. WHEN the user checks "Localizacao cadastrada" THEN the system SHALL fetch `GET /generator/:id` for the current generator.
2. WHEN the generator has at least one registered address THEN the system SHALL fill CEP, number, and complement from the first/default registered address.
3. WHEN the registered address is applied THEN the system SHALL enrich street, city, and neighborhood from ViaCEP using the registered CEP.
4. WHEN the user unchecks "Localizacao cadastrada" THEN the system SHALL allow manual address editing again and clear registered-address-only submission state.
5. WHEN the generator has no registered address THEN the system SHALL show an error and leave manual address entry enabled.

**Independent Test**: Mock the generator response and ViaCEP response, then verify checking the box fills CEP, number, complement, street, city, and neighborhood without requiring an address ID.

---

### P1: Enrich Manual CEP MVP

**User Story**: As a generator, I want the system to fill street, city, and neighborhood after I enter a CEP so that manual address entry is faster and less error-prone.

**Why P1**: This is part of the requested create collection flow.

**Acceptance Criteria**:

1. WHEN the user enters a valid CEP in manual address mode THEN the system SHALL enrich street, city, and neighborhood.
2. WHEN CEP enrichment succeeds THEN the system SHALL display the enriched values in editable fields.
3. WHEN CEP enrichment fails THEN the system SHALL show an inline error and keep manual editing available.
4. WHEN "Localizacao cadastrada" is checked THEN the system SHALL not run manual CEP enrichment from user edits.

**Independent Test**: Enter a valid mocked CEP response and verify street, city, and neighborhood fields are filled.

---

### P1: Submit Collection Request MVP

**User Story**: As a generator, I want to submit a collection request with materials, address, and weight so that a collector can later collect the material.

**Why P1**: This is the core value of the feature.

**Acceptance Criteria**:

1. WHEN the user clicks Confirmar with valid data THEN the system SHALL send `POST ${COLLECT_API_URL}/generator/request`.
2. WHEN submitting THEN the request body SHALL include `generatorId`, `materialIds`, and `weight`; `addressId` SHALL be optional.
3. WHEN required data is missing THEN the system SHALL show validation feedback and SHALL NOT send the request.
4. WHEN the API returns success THEN the system SHALL show a confirmation pop-up.
5. WHEN the API returns an error THEN the system SHALL show an actionable error message and keep the form data.

**Independent Test**: Fill valid form data, submit, and verify the POST payload and success modal.

---

### P2: Clean Up Create Collection UI

**User Story**: As a generator, I want a focused request form without irrelevant fields so that creating a request is straightforward.

**Why P2**: Removing "Empresa" is required, but the page can still function without broader visual cleanup.

**Acceptance Criteria**:

1. WHEN the page renders THEN the system SHALL NOT show the "Empresa" field.
2. WHEN the page renders THEN the address, materials, weight, and actions SHALL remain visible and usable on desktop and mobile.
3. WHEN submitting or loading data THEN the system SHALL disable duplicate submits and show clear loading states.

**Independent Test**: Open `/collections/new` and verify no "Empresa" input exists while the remaining form flow still works.

---

## Edge Cases

- WHEN the user is unauthenticated THEN the system SHALL redirect to `/auth/login`.
- WHEN the authenticated user is not a generator THEN the system SHALL prevent collection request creation.
- WHEN materials return an empty list THEN the system SHALL show an empty state and block submission.
- WHEN weight is zero, negative, or empty THEN the system SHALL show validation feedback and block submission.
- WHEN no material is selected THEN the system SHALL show validation feedback and block submission.
- WHEN the generator profile fetch fails THEN the system SHALL show an inline error and keep manual address entry available.
- WHEN the selected registered address has no `id` THEN the system SHALL still fill and enrich the address fields because address is a value object.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CC-01 | P1: Load Backend Materials | Execute | Verified |
| CC-02 | P1: Use Registered Address | Execute | Verified |
| CC-03 | P1: Enrich Manual CEP | Execute | Verified |
| CC-04 | P1: Submit Collection Request | Execute | Verified |
| CC-05 | P2: Clean Up Create Collection UI | Execute | Verified |
| CC-06 | Edge cases and validation | Execute | Verified |

**Coverage:** 6 total, 6 mapped to design, 0 unmapped.

---

## Success Criteria

- [ ] A generator can create a collection request from `/collections/new`.
- [ ] Materials come from `GET /materials` and request submission uses material names in `materialIds`.
- [ ] Checking "Localizacao cadastrada" fills address fields from `GET /generator/:id`.
- [ ] Entering CEP manually enriches street, city, and neighborhood.
- [ ] Successful creation shows a confirmation pop-up.
- [ ] `npm run lint` and `npm run build` pass after implementation.

# Collection Address Display Specification

## Problem Statement

Collection cards currently fall back to `addressId` labels such as `Endereço 847a1779`, even though the collection API now returns a structured `address` object for get-by-id and search-by-filters responses. Users need to see a readable collection address directly in collection cards and related summaries.

## Goals

- [x] Support the new collection response shape with nested `address`.
- [x] Keep compatibility with responses that only include `addressId`.
- [x] Show human-readable addresses on collection cards instead of raw IDs when address data is available.
- [x] Reuse one formatting helper for address display across home, collections, and route-related collection snippets.
- [x] Handle get-by-id response as a single object and search-by-filters response as an array.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Address editing | This feature only displays address data returned by the collections API. |
| Geocoding or enrichment | The backend already returns enrichment fields; frontend should not enrich addresses. |
| Map rendering | Showing latitude/longitude on a map belongs to a separate route/map experience. |
| API contract changes for collection creation | This feature targets read responses only. |

---

## Assumptions

- The backend returns `address` for `GET /collections/[id]` as a single collection object.
- The backend returns the same collection item shape in an array for `GET /collections/search`.
- `address.street`, `address.number`, `address.city`, `address.state`, and `address.zipCode` are optional at runtime and must be rendered defensively.
- When the nested address is missing or malformed, the UI may fall back to `addressId`, then collection ID.
- Coordinates and enrichment metadata are kept in the normalized type for future use but do not need to be shown in cards now.

---

## Requirements

### CA-01: Normalize Collection Address

**User Story**: As a frontend developer, I want collection normalization to include nested address data so that all collection views can render the new API contract consistently.

**Acceptance Criteria**:

1. WHEN `normalizeCollections` receives an item with `address` THEN it SHALL include normalized address fields in `CollectionSummary`.
2. WHEN address fields are missing, empty, or malformed THEN normalization SHALL keep the collection valid if the existing required collection fields are valid.
3. WHEN `address.latitude` or `address.longitude` are numeric strings or numbers THEN normalization SHALL preserve numeric values.
4. WHEN get-by-id returns a single object THEN local normalization SHALL support it without requiring callers to wrap it manually.
5. WHEN search returns an array, `{ data: [] }`, or `{ collections: [] }` THEN local normalization SHALL continue to support all current shapes.

### CA-02: Format Address for Display

**User Story**: As a user, I want to see a readable address instead of an opaque address ID so that I can understand where a collection happens.

**Acceptance Criteria**:

1. WHEN street and number exist THEN the display SHALL include both.
2. WHEN city and state exist THEN the display SHALL include both.
3. WHEN only partial address fields exist THEN the display SHALL show the available useful fields without dangling punctuation.
4. WHEN no nested address exists but `addressId` exists THEN the display SHALL fall back to a shortened address ID.
5. WHEN neither address nor address ID exists THEN the display SHALL fall back to a shortened collection ID.

### CA-03: Update Home Collection Cards

**User Story**: As a dashboard user, I want upcoming and recent collection cards to show address context so that I can quickly identify each collection.

**Acceptance Criteria**:

1. WHEN `NextCollectionsCard` renders a collection with nested address data THEN it SHALL show the formatted address as its location.
2. WHEN `LastCollectionsCard` renders recent collection rows THEN it SHALL include address context without breaking the compact layout.
3. WHEN address text is long THEN cards SHALL truncate or wrap cleanly on mobile and desktop.
4. WHEN loading, error, or empty states render THEN existing behavior SHALL remain unchanged.

### CA-04: Update Collections Page Cards

**User Story**: As a generator or collector, I want each collection page card to show the collection address so that operational details are visible in the main list.

**Acceptance Criteria**:

1. WHEN a collection has nested address data THEN `CollectionCard` SHALL display the formatted address.
2. WHEN no nested address exists THEN the card SHALL use the fallback address display.
3. WHEN counterpart profile details also include an address THEN the collection address SHALL be visually distinct from the counterpart profile address.
4. WHEN cards render on mobile and desktop THEN address text SHALL not overlap action controls or status labels.

### CA-05: Update Route Collection Snippets

**User Story**: As a route-planning user, I want collection references in route screens to show readable address data so that stops are identifiable.

**Acceptance Criteria**:

1. WHEN `routes/suggest` displays candidate stops THEN it SHALL prefer formatted collection address over `addressId`.
2. WHEN `routes/saved` displays a saved collection reference THEN it SHALL prefer formatted collection address over `addressId`.
3. WHEN nested address is unavailable THEN existing `addressId` fallback behavior SHALL remain usable.

---

## Edge Cases

- Address object exists but all display fields are blank.
- Zip code is returned as a string without punctuation.
- Latitude and longitude are omitted, null, strings, or numbers.
- Search results include a mix of new and old response shapes.
- Cards receive very long street names.
- The backend returns unknown additional address fields.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CA-01 | Normalize Collection Address | Execute | Verified |
| CA-02 | Format Address for Display | Execute | Verified |
| CA-03 | Update Home Collection Cards | Execute | Verified |
| CA-04 | Update Collections Page Cards | Execute | Verified |
| CA-05 | Update Route Collection Snippets | Execute | Verified |

**Coverage:** 5 total, 5 implemented and verified.

---

## Success Criteria

- [x] Provided sample response normalizes with `address`.
- [x] Home next collections show `Rua Fiorentina, 50 - Jandira/SP` or equivalent readable text.
- [x] Home last collections include readable address context.
- [x] `/collections` cards display collection address separately from counterpart profile details.
- [x] Route screens prefer readable collection address where collection data is available.
- [x] `npm run lint` passes.
- [x] `npm run build` passes or any blocker is documented.

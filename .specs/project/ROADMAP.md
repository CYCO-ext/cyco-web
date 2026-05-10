# Roadmap

**Current Milestone:** Foundation and MVP planning
**Status:** Planning

---

## Milestone 1: Product Foundation

**Goal:** Establish the project vision, codebase map, and baseline flows needed to build safely.
**Target:** Ready for scoped feature specs and implementation tasks.

### Features

**Project setup and codebase mapping** - COMPLETE

- Capture product vision, target users, and v1 assumptions.
- Document current stack, architecture, conventions, testing, integrations, and concerns.
- Identify open questions that affect the MVP.

**Authentication and onboarding hardening** - PLANNED

- Confirm role names and backend payload contracts.
- Improve registration validation and error states.
- Ensure logout clears the authenticated session.

---

## Milestone 2: Generator MVP

**Goal:** Let waste generators create and track collection requests.

### Features

**Create collection request** - COMPLETE

- Submit company/location data.
- Select materials and estimated weight.
- Attach material images.
- Show request confirmation and initial status.

**Select collector for request** - COMPLETE

- Show nearby collector enterprises after request creation.
- Let generator select one collector.
- Submit selected collector to backend.

**Collections page** - COMPLETE

- List collections relevant to the authenticated user.
- Filter collections by status.
- Query by generator or collector role.

**Generator dashboard** - PLANNED

- Show active requests.
- Show recent completed/cancelled requests.
- Display environmental impact and CyCoins once backend rules are available.

---

## Milestone 3: Collector MVP

**Goal:** Let waste collectors discover or manage collection work.

### Features

**Collector profile and materials** - PLANNED

- Register accepted materials.
- Mark collector as individual or enterprise.
- Keep profile data aligned with backend collector records.

**Collector dashboard** - PLANNED

- Show upcoming collections.
- Show relevant collection details: location, weight, materials, and time.
- Support the agreed collection action model once defined.

---

## Future Considerations

- Route optimization and map-based collection planning.
- Ratings, dispute handling, and support workflows.
- Admin dashboard for moderation and operations.
- Notification channels for collection updates.
- Analytics for waste volume, impact, and collector performance.

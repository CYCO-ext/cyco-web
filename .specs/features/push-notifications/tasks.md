# Push Notifications Tasks

**Design**: `.specs/features/push-notifications/design.md`
**Status**: Frontend Done; Backend Pending

**Verification:**

- `npm run lint` passed with one existing React Hook Form compiler warning in `src/app/auth/register/page.tsx`.
- `npx tsc --noEmit` passed.
- Manual browser/Firebase delivery verification was not run in this turn.

---

## Execution Plan

### Phase 1: Configuration and Client Messaging

```text
T1 -> T2 -> T3
```

### Phase 2: Token Registration

```text
T2 -> T4 -> T5
```

### Phase 3: Notification Delivery

```text
T4 -> T6 -> T7
```

### Phase 4: Foreground UX and Verification

```text
T3 + T5 + T7 -> T8 -> T9
```

---

## Task Breakdown

### T1: Add Firebase Messaging Configuration

**What**: Add documented Firebase public config and required VAPID key configuration for web push.
**Where**: `.env.example` if present, `README.md` or `.specs/codebase/INTEGRATIONS.md`, Firebase client config docs.
**Depends on**: Provided Firebase project config.
**Reuses**: Existing env-based integration documentation style.
**Requirement**: PN-01, PN-05

**Done when**:

- [x] Public Firebase values are documented as `NEXT_PUBLIC_FIREBASE_*` variables.
- [x] `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is documented as required for FCM web tokens.
- [x] The Firebase config shape is captured in setup docs without introducing server credentials.
- [x] Missing config behavior is defined as non-blocking.
- [x] Gate check passes: docs review.

**Tests**: Manual config review.
**Gate**: docs

---

### T2: Create Client-Only Firebase Messaging Helpers

**What**: Implement Firebase app initialization and messaging helpers that run only in the browser.
**Where**: `src/app/lib/firebase/client.ts`, `src/app/lib/firebase/messaging.ts`
**Depends on**: T1
**Reuses**: Existing `firebase` dependency.
**Requirement**: PN-01, PN-04, PN-05

**Done when**:

- [x] Firebase app initialization reads public env config.
- [x] Messaging initialization is guarded by browser, service worker, and notification support checks.
- [x] `requestNotificationPermission()` requests permission only from a user action.
- [x] `getGeneratorFcmToken()` returns a token only when permission is granted and VAPID key exists.
- [x] `subscribeToForegroundMessages()` wraps `onMessage` and safely ignores malformed payloads.
- [x] Helpers avoid Firebase Messaging imports in server execution paths.
- [x] Gate check passes: `npm run lint`.

**Tests**: Unit-test helpers if test tooling exists; otherwise manual browser verification in T9.
**Gate**: quick

---

### T3: Add Firebase Messaging Service Worker

**What**: Add service worker support for background FCM messages and notification click navigation.
**Where**: `public/firebase-messaging-sw.js`
**Depends on**: T1
**Reuses**: Firebase Messaging service worker APIs.
**Requirement**: PN-01, PN-03, PN-05

**Done when**:

- [x] Service worker initializes Firebase with CYCO public config.
- [x] Background messages display title and body from payload.
- [x] Notification data includes `url`, `collectionId`, and `status` when provided.
- [x] Notification click focuses an existing app tab when possible.
- [x] Notification click opens `/collections` or payload URL when no tab is focused.
- [x] Service worker handles missing payload fields safely.
- [ ] Gate check passes: manual service worker registration check.

**Tests**: Send a Firebase test message to a registered token and verify background notification behavior.
**Gate**: manual

---

### T4: Add Local FCM Token API Route

**What**: Create local authenticated route handlers to register and optionally deactivate generator FCM tokens.
**Where**: `src/app/api/generators/[generatorId]/notification-token/route.ts`
**Depends on**: T1
**Reuses**: Existing Next.js API proxy patterns and session token forwarding.
**Requirement**: PN-02, PN-05

**Done when**:

- [x] `PUT /api/generators/[generatorId]/notification-token` validates `{ token, platform }`.
- [x] Route requires authenticated session token.
- [x] Route forwards token registration to `${COLLECTIONS_API_URL}/api/generators/{generatorId}/notification-token`.
- [x] Route uses the backend-supported platform value; confirm whether browser tokens should use `WEB` or the current `ANDROID` enum.
- [x] Backend errors preserve status and readable messages.
- [x] Missing `COLLECTIONS_API_URL` returns a clear 500 JSON error.
- [x] Gate check passes: `npm run lint`.

**Tests**: Mock/manual API request verifies validation and backend proxy payload.
**Gate**: quick

---

### T5: Build Generator Notification Provider and Prompt

**What**: Add auth-aware UI and lifecycle logic for generator notification registration.
**Where**: `src/app/components/notifications/NotificationProvider.tsx`, `src/app/components/notifications/NotificationPrompt.tsx`, `src/app/layout.tsx` or authenticated app shell.
**Depends on**: T2, T4
**Reuses**: `useSession`, existing role helpers, shared button styles.
**Requirement**: PN-01, PN-02, PN-05

**Done when**:

- [x] Provider runs only on the client.
- [x] Provider registers tokens only for generator users.
- [x] Supported/granted notifications silently refresh token registration.
- [x] Supported/default notifications show an opt-in prompt.
- [x] Denied or unsupported notifications do not block the UI.
- [x] Token registration failures show non-blocking feedback or retry affordance.
- [x] Prompt dismissal prevents noisy repeated prompts in the same browser.
- [x] Gate check passes: `npm run lint`.

**Tests**: Manual browser test for generator, collector, permission granted, denied, and default states.
**Gate**: quick

---

### T6: Implement Backend Token Persistence Contract

**What**: Confirm backend persistence for generator FCM tokens through the created endpoint.
**Where**: CYCO backend service, not this frontend repository unless backend code is added here later.
**Depends on**: T4
**Reuses**: Backend auth, user, and persistence patterns.
**Requirement**: PN-02, PN-03, PN-05

**Done when**:

- [x] Backend exposes `PUT /api/generators/{generatorId}/notification-token`.
- [ ] Backend stores tokens idempotently per authenticated generator user.
- [ ] Backend records platform, active/inactive state, and timestamps.
- [ ] Backend platform enum for browser tokens is confirmed.
- [ ] Backend rejects collector or unauthenticated token registration for generator notifications.
- [ ] Backend can deactivate tokens on request or FCM invalid-token response.
- [ ] Contract is documented for frontend integration.
- [ ] Gate check passes: backend tests or documented manual API verification.

**Tests**: Backend unit/integration tests for register, duplicate register, deactivate, and unauthorized role.
**Gate**: backend

---

### T7: Send Notification on Collection Status Change

**What**: Trigger FCM notification delivery when a collection enters the "collector on the way" status.
**Where**: CYCO backend status-change workflow; optionally frontend action labels if status enum must be exposed.
**Depends on**: T6
**Reuses**: Backend collection status transition logic.
**Requirement**: PN-03, PN-05

**Done when**:

- [ ] Backend status enum for "collector on the way" is confirmed.
- [ ] Status transition detects the target status exactly once per relevant change.
- [ ] Sender resolves active FCM tokens for the collection generator.
- [ ] FCM message includes title, body, type, collection ID, status, and URL.
- [ ] Body includes `Coletor está a caminho` for the target status.
- [ ] Invalid FCM tokens are deactivated without failing the collection status change.
- [ ] Gate check passes: backend notification sender test.

**Tests**: Backend integration test simulating status change and asserting FCM send payload.
**Gate**: backend

---

### T8: Handle Foreground Messages in the App

**What**: Display in-app feedback when FCM messages arrive while the generator has CYCO open.
**Where**: `src/app/components/notifications/NotificationProvider.tsx`, optional shared toast/alert component.
**Depends on**: T2, T5
**Reuses**: Existing CYCO styling and collection navigation.
**Requirement**: PN-04, PN-05

**Done when**:

- [x] Provider subscribes to foreground FCM messages after setup.
- [x] Valid collection status messages show a non-blocking visible notification.
- [x] Notification action routes to `/collections` or provided payload URL.
- [x] Malformed payloads are ignored safely.
- [x] Foreground handling does not duplicate browser background notification behavior.
- [x] Gate check passes: `npm run lint`.

**Tests**: Mock/manual foreground message verification.
**Gate**: quick

---

### T9: Final Verification and Spec Update

**What**: Verify end-to-end behavior and update traceability.
**Where**: `.specs/features/push-notifications/spec.md`, `.specs/features/push-notifications/tasks.md`, `.specs/project/STATE.md`
**Depends on**: T1, T2, T3, T4, T5, T6, T7, T8
**Reuses**: Existing TLC completion pattern from feature specs.
**Requirement**: PN-01, PN-02, PN-03, PN-04, PN-05

**Done when**:

- [x] `npm run lint` passes or existing warnings are documented.
- [x] `npx tsc --noEmit` passes or blockers are documented.
- [ ] Generator permission grant path is manually verified.
- [ ] Permission denied path is manually verified.
- [ ] Unsupported browser path is manually verified or documented.
- [ ] Token registration request is verified.
- [ ] Background notification from Firebase test message is verified.
- [ ] Foreground message handling is verified.
- [ ] Backend status-change notification delivery is verified.
- [ ] Requirement traceability moves from Planned to Verified after implementation.
- [ ] Tasks status is updated from Draft to Done after implementation.

**Tests**: Lint, typecheck, browser manual verification, Firebase test message, backend integration tests.
**Gate**: full

# Push Notifications Specification

## Problem Statement

Generator users need timely updates when the status of a collection changes, especially when the collector is on the way. The application currently relies on users opening pages and refreshing collection data, so important status changes can be missed.

## Goals

- [x] Add Firebase Cloud Messaging support for browser push notifications.
- [x] Ask generator users for notification permission at an appropriate moment.
- [x] Register each generator user's FCM token through the frontend proxy.
- [ ] Notify generator users when a collection status changes.
- [x] Support browser display for a notification message like "Coletor está a caminho".
- [x] Keep collection pages usable when notifications are unsupported, denied, or unavailable.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Native mobile push notifications | This feature targets the web app and browser FCM. |
| Collector-facing push notifications | The requested recipient is the generator user. |
| Full notification preferences center | This feature can store permission/token state but does not add granular settings. |
| In-app notification inbox | Browser push delivery is the primary channel. |
| Email/SMS fallback | Not part of the requested Firebase Cloud Messaging flow. |
| Admin notification composer | Notifications are triggered by collection status changes only. |

---

## Assumptions

- The app is a Next.js web app that can initialize Firebase on the client.
- Firebase Cloud Messaging requires a service worker file served from `public/`.
- Firebase web app configuration will be provided through environment variables:

```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};
```

- The frontend should not commit concrete Firebase project values into feature specs or source files.
- FCM web token generation requires a Firebase Web Push certificate public VAPID key, which is not included in the provided config.
- The backend stores generator notification tokens through `PUT /api/generators/{generatorId}/notification-token` and sends FCM messages when collection status changes; the frontend alone cannot securely send server-side push notifications.
- Existing authenticated API route handlers proxy calls to the CYCO backend using the session token.
- The current backend token registration payload is `{ "token": "firebase-device-token", "platform": "ANDROID" }`; implementation should confirm whether the backend also accepts a `WEB` platform value for browser tokens.
- Status values include or will include a state that can represent "collector on the way", such as `COLLECTOR_ON_THE_WAY` or an equivalent backend status.

---

## User Stories

### P1: Enable Notifications for Generator Users

**User Story**: As a generator, I want to enable browser notifications so that I can receive collection updates even when I am not actively viewing the app.

**Why P1**: Push notifications require explicit browser permission and an FCM token before any status-change alert can be delivered.

**Acceptance Criteria**:

1. WHEN an authenticated generator opens the app THEN the system SHALL detect whether browser notifications and service workers are supported.
2. WHEN notifications are supported and permission is not granted THEN the system SHALL provide a clear user action to enable notifications.
3. WHEN the generator enables notifications THEN the system SHALL request browser notification permission.
4. WHEN permission is granted THEN the system SHALL request an FCM token using the configured Firebase app and VAPID key.
5. WHEN permission is denied THEN the system SHALL avoid repeated prompts and keep the app usable.
6. WHEN the user is not a generator THEN the system SHALL NOT register that user for generator collection status notifications.

**Independent Test**: Mock a generator session and Notification permission flow, trigger enablement, and verify `getToken` is called only after permission is granted.

---

### P1: Persist Generator FCM Tokens

**User Story**: As a generator, I want my notification token to be saved so that status changes can be sent to my current browser.

**Why P1**: FCM tokens must be stored server-side before the backend can target a user.

**Acceptance Criteria**:

1. WHEN the frontend receives an FCM token THEN it SHALL send it to a local authenticated API route with the token and platform.
2. WHEN the local token route receives a token THEN it SHALL proxy it to `PUT ${COLLECTIONS_API_URL}/api/generators/{generatorId}/notification-token` with the authenticated user's bearer token.
3. WHEN the same token is registered more than once THEN the backend SHOULD treat registration as idempotent.
4. WHEN token registration fails THEN the frontend SHALL show non-blocking feedback and retry on a later app load or user action.
5. WHEN a token changes THEN the latest token SHALL be sent to the backend.
6. WHEN the user signs out or token deletion is supported THEN the system SHOULD remove or deactivate the token.

**Independent Test**: Mock `getToken`, submit a token, and verify the local API route posts the expected payload to the backend token registration endpoint.

---

### P1: Notify Generator on Collection Status Change

**User Story**: As a generator, I want to receive a push notification when my collection status changes so that I know what is happening without refreshing the page.

**Why P1**: The requested feature is specifically about status-change notifications.

**Acceptance Criteria**:

1. WHEN a collection status changes to "collector on the way" THEN the backend SHALL send a push notification to the collection's generator user.
2. WHEN the notification is sent THEN the title SHALL clearly identify the collection update.
3. WHEN the status is "collector on the way" THEN the notification body SHALL include "Coletor está a caminho" or equivalent localized text.
4. WHEN the generator clicks the notification THEN the app SHOULD open `/collections` or a collection detail route if one exists.
5. WHEN the generator has multiple active browser tokens THEN the backend SHOULD send to all active tokens.
6. WHEN FCM reports an invalid or expired token THEN the backend SHOULD deactivate or delete that token.

**Independent Test**: Simulate a collection status change event and verify the backend notification sender receives the generator ID, collection ID, target status, and message payload.

---

### P2: Handle Foreground Messages

**User Story**: As a generator using the app, I want to see a lightweight in-app update when a push message arrives while the page is open.

**Why P2**: Browser push notifications may behave differently while the app is foregrounded; users should still get visible feedback.

**Acceptance Criteria**:

1. WHEN an FCM message arrives while the app is open THEN the system SHALL display a non-blocking in-app notification or toast.
2. WHEN the foreground notification references a collection THEN the user SHOULD be able to navigate to relevant collection context.
3. WHEN the message payload is malformed THEN the app SHALL ignore it safely.
4. WHEN foreground messaging is unavailable THEN background notification behavior SHALL still work through the service worker.

**Independent Test**: Mock `onMessage` with a valid status-change payload and verify a visible UI notification appears.

---

## Edge Cases

- WHEN the browser does not support service workers or notifications THEN the app SHALL hide or disable notification enablement.
- WHEN Firebase initialization fails THEN the app SHALL report non-blocking notification setup failure.
- WHEN no VAPID key is configured THEN token registration SHALL be skipped with a developer-visible error.
- WHEN permission is `denied` THEN the app SHALL not call `Notification.requestPermission()` automatically on every load.
- WHEN the user changes browsers/devices THEN each browser SHOULD register its own token.
- WHEN the same generator has stale tokens THEN backend send failures SHOULD not block collection status transitions.
- WHEN the backend sends a notification for an unknown status THEN the frontend SHALL still render the notification using payload title/body if present.
- WHEN the app runs in server-side rendering context THEN Firebase Messaging SHALL not be imported or initialized in server code.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PN-01 | Enable Notifications for Generator Users | Execute | Implemented |
| PN-02 | Persist Generator FCM Tokens | Execute | Frontend implemented; backend persistence pending external verification |
| PN-03 | Notify Generator on Collection Status Change | Backend | Pending |
| PN-04 | Handle Foreground Messages | Execute | Implemented |
| PN-05 | Edge cases and graceful degradation | Execute | Implemented |

**Coverage:** 5 total, 3 implemented, 1 frontend implemented with backend verification pending, 1 backend status-change sender pending.

---

## Success Criteria

- [x] Generator users can opt in to browser notifications.
- [x] FCM tokens are registered through an authenticated local API route.
- [ ] A collection status change to "Coletor está a caminho" sends a push notification to the generator.
- [x] Notification clicks route users back into collection context.
- [x] Unsupported/denied notification environments do not break normal collection workflows.
- [ ] Verification covers permission grant/deny, token registration, foreground message handling, and backend status-change notification dispatch.

# Push Notifications Design

**Spec**: `.specs/features/push-notifications/spec.md`
**Status**: Frontend Implemented

---

## Architecture Overview

Add Firebase Cloud Messaging as a browser notification channel for generator users. The frontend owns Firebase client initialization, permission UX, service worker registration, foreground message handling, and token registration through local API routes. The backend owns token persistence and sending FCM messages when collection status changes.

Flow:

1. Generator signs in and opens the app.
2. A client-only notification registration component checks browser support and current permission state.
3. If the generator opts in, the app requests notification permission.
4. After permission is granted, the app initializes Firebase Messaging and gets an FCM token using the configured VAPID key.
5. The app posts the token to a local token registration route.
6. The local route proxies the token to `PUT ${COLLECTIONS_API_URL}/api/generators/{generatorId}/notification-token` with the authenticated bearer token.
7. When a collection status changes, backend domain logic resolves the generator's active FCM tokens.
8. Backend sends an FCM message with title, body, URL, collection ID, and status.
9. The Firebase service worker displays background notifications and handles notification clicks.
10. If the app is open, foreground message handling shows non-blocking in-app feedback.

## Code Reuse Analysis

### Existing Components to Leverage

| Component/Helper | Location | How to Use |
| --- | --- | --- |
| `SessionProvider` | `src/app/layout.tsx` | Mount a client notification provider inside the authenticated app tree if appropriate. |
| `useSession` | Existing pages/components | Determine authenticated user role and ID before token registration. |
| `getSessionMeta` | `src/app/lib/createCollection.ts` | Reuse token/header extraction style for authenticated local API calls. |
| API proxy handlers | `src/app/api/*/route.ts` | Follow existing `COLLECTIONS_API_URL` validation, bearer forwarding, JSON error handling. |
| Collection status helpers | `src/app/lib/collectionsPage.ts` | Reuse status labels for foreground notification text where useful. |
| `/collections` page | `src/app/collections/page.tsx` | Use as the default notification click destination. |

### New Components and Files

| Component/File | Purpose |
| --- | --- |
| `src/app/lib/firebase/client.ts` | Client-only Firebase app and messaging initialization helpers. |
| `src/app/lib/firebase/messaging.ts` | FCM support checks, permission request, token retrieval, and foreground subscription helpers. |
| `src/app/components/notifications/NotificationProvider.tsx` | Auth-aware generator notification setup and foreground message UI. |
| `src/app/components/notifications/NotificationPrompt.tsx` | Small opt-in UI shown only when notifications are supported and permission is not granted. |
| `src/app/api/generators/[generatorId]/notification-token/route.ts` | Local authenticated route for registering generator FCM tokens with backend. |
| `src/app/api/firebase/config/route.ts` | Public Firebase config endpoint used by the service worker. |
| `public/firebase-messaging-sw.js` | Firebase Messaging service worker for background notifications and click handling. |

## Firebase Configuration

Use environment variables for runtime configuration:

```text
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

The supplied Firebase config can populate the non-secret public values. `NEXT_PUBLIC_FIREBASE_VAPID_KEY` must be created in Firebase Console under Cloud Messaging > Web Push certificates.

Analytics should be optional and browser-only. Messaging must not be imported from server components or API route handlers.

## Backend Contract

The frontend uses the backend endpoint created for generator notification-token registration:

### Register Token

```http
PUT /api/generators/{generatorId}/notification-token
Authorization: Bearer <session-token>
Content-Type: application/json
```

```json
{
  "token": "firebase-device-token",
  "platform": "ANDROID"
}
```

Expected behavior:

- Validate authenticated user is a generator.
- Validate `{generatorId}` belongs to the authenticated generator or is otherwise authorized by the backend.
- Store the token idempotently.
- Track token status, generator ID, platform, created/updated timestamps.
- Return success JSON.

Open contract question:

- The backend example uses `platform: "ANDROID"`. Because this feature registers browser FCM tokens, confirm whether the backend accepts `platform: "WEB"` or whether the frontend should temporarily send the existing enum value.

### Status Change Sender

Backend collection status-change logic should call a notification sender when status enters a configured notification state.

Payload to FCM:

```json
{
  "notification": {
    "title": "Atualização da coleta",
    "body": "Coletor está a caminho"
  },
  "data": {
    "type": "COLLECTION_STATUS_CHANGED",
    "collectionId": "collection-id",
    "status": "COLLECTOR_ON_THE_WAY",
    "url": "/collections"
  }
}
```

## Frontend Behavior

### Notification Provider

Mount once in the app shell:

- Wait for authenticated session.
- Confirm user role is generator.
- Check browser support.
- Read `Notification.permission`.
- If granted, silently refresh/register token.
- If default, show an opt-in prompt.
- If denied, hide prompt and expose no blocking error.
- Subscribe to foreground messages after token setup.

### Prompt UX

Prompt should be lightweight and non-blocking:

- Show only to generator users.
- Explain that notifications are for collection updates.
- Provide a clear enable action.
- Avoid repeatedly showing after denial.
- Store a local dismissal flag if the user closes the prompt without choosing.

### Service Worker

`public/firebase-messaging-sw.js` should:

- Initialize Firebase with the public config.
- Listen for background messages.
- Display notification title/body from payload.
- Include `data.url` and `data.collectionId`.
- On click, focus an existing CYCO window if possible, otherwise open the target URL.

Because service workers cannot read Next.js runtime env variables directly, the file either needs public config embedded at build time or a generated/static config approach. The initial implementation can embed the provided public Firebase values and document that changes require updating the service worker config.

## Data Models

```typescript
interface FcmTokenRegistrationRequest {
  token: string;
  platform: "WEB" | "ANDROID";
}

interface CollectionStatusNotificationData {
  type: "COLLECTION_STATUS_CHANGED";
  collectionId: string;
  status: string;
  url: string;
}

type NotificationSetupState =
  | { status: "unsupported" }
  | { status: "permission-denied" }
  | { status: "prompt" }
  | { status: "registering" }
  | { status: "ready" }
  | { status: "error"; message: string };
```

## Security and Privacy

| Concern | Decision |
| --- | --- |
| Firebase API key exposure | Firebase web API keys are public identifiers; use env vars for maintainability, not secrecy. |
| Server key exposure | Never put Firebase Admin credentials or server keys in frontend code. |
| Token ownership | Backend must associate tokens with the authenticated user, not trust a user ID from the client. |
| Role restriction | Only generator users register for this feature. |
| Token ownership | Backend must verify `{generatorId}` against the authenticated user instead of trusting a client-selected ID. |
| Token lifecycle | Backend should deactivate invalid tokens reported by FCM. |
| Notification content | Avoid sensitive address or personal details in the push body. |

## Status Mapping

Initial notification mapping:

| Backend Status | Notification Title | Body | URL |
| --- | --- | --- | --- |
| `COLLECTOR_ON_THE_WAY` | `Atualização da coleta` | `Coletor está a caminho` | `/collections` |

If the backend uses a different enum for "collector on the way", update the mapping before implementation and record it in `context.md` or this design.

## Risks

| Risk | Mitigation |
| --- | --- |
| Missing VAPID key blocks token generation | Add explicit configuration task and fail gracefully when absent. |
| Backend platform enum may not include web | Confirm whether `WEB` is supported before implementing the frontend payload. |
| Service worker config drifts from env config | Document service worker setup and consider generating the SW file in a later build step. |
| Notifications are denied by user/browser | Keep collection pages functional and do not repeatedly prompt. |
| Status enum is not finalized | Make status mapping a dedicated task before wiring sender behavior. |
| SSR imports break build | Keep Firebase Messaging imports inside client-only dynamic helpers. |

## Verification Plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Browser manual test for permission grant, permission denial, unsupported messaging path, and token registration.
- API route test or manual request for the local generator notification-token proxy.
- Service worker manual test with a Firebase test message.
- Backend integration test for collection status change to "collector on the way" triggering FCM send.

## Implementation Notes

- Frontend implementation uses `platform: "ANDROID"` to match the currently provided backend contract.
- Browser Firebase config is read from `NEXT_PUBLIC_FIREBASE_*` variables.
- The service worker fetches public config from `/api/firebase/config` to avoid hard-coding Firebase project values in `public/`.
- Backend status-change sending remains outside this frontend repository.

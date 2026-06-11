importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

let messagingPromise;

async function getMessaging() {
  if (!messagingPromise) {
    messagingPromise = fetch("/api/firebase/config")
      .then((response) => {
        if (!response.ok) throw new Error("Firebase config unavailable");
        return response.json();
      })
      .then((config) => {
        firebase.initializeApp(config);
        return firebase.messaging();
      });
  }

  return messagingPromise;
}

getMessaging()
  .then((messaging) => {
    messaging.onBackgroundMessage((payload) => {
      console.log("[firebase-messaging-sw] Background message received", payload);

      const data = payload.data || {};
      const notification = payload.notification || {};
      const title = notification.title || data.title || "Atualizacao da coleta";
      const body = notification.body || data.body || "O status da sua coleta foi atualizado.";
      const url = data.url || "/collections";

      self.registration.showNotification(title, {
        body,
        data: {
          url,
          collectionId: data.collectionId,
          status: data.status,
        },
      });
    });
  })
  .catch((error) => {
    console.error("[firebase-messaging-sw] Failed to initialize messaging", error);
  });

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/collections";
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(absoluteUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) return clients.openWindow(absoluteUrl);
      return undefined;
    }),
  );
});

"use client";

import { getMessaging, getToken, isSupported, MessagePayload, onMessage } from "firebase/messaging";
import { getFirebaseClientApp } from "./client";

export const FCM_TOKEN_PLATFORM = "ANDROID";

export interface FcmTokenRegistrationPayload {
  token: string;
  platform: typeof FCM_TOKEN_PLATFORM;
}

export type FcmTokenResult =
  | { ok: true; payload: FcmTokenRegistrationPayload }
  | { ok: false; reason: string };

export interface CollectionStatusMessage {
  title: string;
  body: string;
  url: string;
  collectionId?: string;
  status?: string;
}

export function canUseNotifications(): boolean {
  return typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator;
}

export async function isFirebaseMessagingSupported(): Promise<boolean> {
  if (!canUseNotifications()) return false;

  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!canUseNotifications()) return "denied";
  return Notification.requestPermission();
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!("serviceWorker" in navigator)) return undefined;

  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;

  await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

export async function getGeneratorFcmToken(): Promise<FcmTokenResult> {
  if (!await isFirebaseMessagingSupported()) {
    return { ok: false, reason: "Este navegador nao oferece suporte a notificacoes Firebase." };
  }

  if (Notification.permission !== "granted") {
    return { ok: false, reason: "Permissao de notificacao nao concedida." };
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  const app = getFirebaseClientApp();
  if (!app) {
    return { ok: false, reason: "Configuracao publica do Firebase ausente." };
  }

  if (!vapidKey) {
    return { ok: false, reason: "NEXT_PUBLIC_FIREBASE_VAPID_KEY nao configurada." };
  }

  const serviceWorkerRegistration = await getServiceWorkerRegistration();
  if (!serviceWorkerRegistration) {
    return { ok: false, reason: "Nao foi possivel registrar o service worker de notificacoes." };
  }

  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });

  return token
    ? { ok: true, payload: { token, platform: FCM_TOKEN_PLATFORM } }
    : { ok: false, reason: "Firebase nao retornou um token de notificacao." };
}

export async function subscribeToForegroundMessages(
  onCollectionStatusMessage: (message: CollectionStatusMessage) => void,
): Promise<() => void> {
  if (!await isFirebaseMessagingSupported()) return () => {};

  const app = getFirebaseClientApp();
  if (!app) return () => {};

  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    const message = collectionStatusMessageFromPayload(payload);
    if (message) onCollectionStatusMessage(message);
  });
}

function collectionStatusMessageFromPayload(payload: MessagePayload): CollectionStatusMessage | undefined {
  const data = payload.data ?? {};
  const type = data.type;

  if (type && type !== "COLLECTION_STATUS_CHANGED") return undefined;

  const title = payload.notification?.title ?? data.title ?? "Atualizacao da coleta";
  const body = payload.notification?.body ?? data.body;
  if (!body) return undefined;

  return {
    title,
    body,
    url: data.url || "/collections",
    collectionId: data.collectionId,
    status: data.status,
  };
}

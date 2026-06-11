"use client";

import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";

export interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const firebaseConfig: FirebasePublicConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function getFirebaseConfig(): FirebasePublicConfig | undefined {
  const requiredFields: Array<keyof FirebasePublicConfig> = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];

  return requiredFields.every((field) => firebaseConfig[field]) ? firebaseConfig : undefined;
}

export function getFirebaseClientApp(): FirebaseApp | undefined {
  const config = getFirebaseConfig();
  if (!config) return undefined;

  return getApps().length ? getApp() : initializeApp(config);
}

export async function initializeFirebaseAnalytics(): Promise<void> {
  const app = getFirebaseClientApp();
  if (!app) return;

  if (await isAnalyticsSupported()) {
    getAnalytics(app);
  }
}

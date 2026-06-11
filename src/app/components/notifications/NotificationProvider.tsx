"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { X } from "lucide-react";
import { getSessionMeta, isGeneratorRole } from "@/app/lib/createCollection";
import {
  canUseNotifications,
  CollectionStatusMessage,
  getGeneratorFcmToken,
  requestNotificationPermission,
  subscribeToForegroundMessages,
} from "@/app/lib/firebase/messaging";
import { NotificationPrompt } from "./NotificationPrompt";

type SetupState =
  | { status: "idle" }
  | { status: "unsupported" }
  | { status: "prompt" }
  | { status: "registering" }
  | { status: "ready" }
  | { status: "permission-denied"; message: string }
  | { status: "error"; message: string };

const DISMISSED_KEY = "cyco.notifications.dismissed";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const meta = useMemo(() => getSessionMeta(session), [session]);
  const [setupState, setSetupState] = useState<SetupState>({ status: "idle" });
  const [foregroundMessage, setForegroundMessage] = useState<CollectionStatusMessage>();
  const isGenerator = isGeneratorRole(meta.role);

  const registerToken = useCallback(async () => {
    if (!meta.generatorId || !meta.token) {
      setSetupState({ status: "error", message: "Nao foi possivel identificar sua sessao para notificacoes." });
      return;
    }

    setSetupState({ status: "registering" });

    try {
      const tokenResult = await getGeneratorFcmToken();
      if (!tokenResult.ok) {
        setSetupState({ status: "error", message: tokenResult.reason });
        return;
      }

      const response = await fetch(`/api/generators/${encodeURIComponent(meta.generatorId)}/notification-token`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${meta.token}`,
        },
        body: JSON.stringify(tokenResult.payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = typeof data?.error === "string" ? data.error : "Erro ao registrar notificacoes.";
        throw new Error(message);
      }

      setSetupState({ status: "ready" });
      window.localStorage.removeItem(DISMISSED_KEY);
    } catch (error) {
      setSetupState({
        status: "error",
        message: error instanceof Error ? error.message : "Erro ao registrar notificacoes.",
      });
    }
  }, [meta.generatorId, meta.token]);

  const handleEnable = useCallback(async () => {
    const permission = await requestNotificationPermission();

    if (permission === "denied") {
      setSetupState({
        status: "permission-denied",
        message: "As notificacoes foram bloqueadas neste navegador.",
      });
      return;
    }

    if (permission === "granted") {
      await registerToken();
    }
  }, [registerToken]);

  useEffect(() => {
    if (status !== "authenticated" || !isGenerator) return;

    if (!canUseNotifications()) {
      setSetupState({ status: "unsupported" });
      return;
    }

    if (Notification.permission === "granted") {
      void registerToken();
      return;
    }

    if (Notification.permission === "denied") {
      setSetupState({
        status: "permission-denied",
        message: "As notificacoes estao bloqueadas neste navegador.",
      });
      return;
    }

    const dismissed = window.localStorage.getItem(DISMISSED_KEY) === "true";
    setSetupState(dismissed ? { status: "idle" } : { status: "prompt" });
  }, [isGenerator, registerToken, status]);

  useEffect(() => {
    if (setupState.status !== "ready") return;

    let unsubscribe: (() => void) | undefined;
    let active = true;

    void subscribeToForegroundMessages((message) => {
      if (active) setForegroundMessage(message);
    }).then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [setupState.status]);

  function dismissPrompt() {
    window.localStorage.setItem(DISMISSED_KEY, "true");
    setSetupState({ status: "idle" });
  }

  function openForegroundMessage() {
    if (!foregroundMessage) return;
    router.push(foregroundMessage.url || "/collections");
    setForegroundMessage(undefined);
  }

  const promptState = setupState.status === "prompt" ||
    setupState.status === "registering" ||
    setupState.status === "ready" ||
    setupState.status === "permission-denied" ||
    setupState.status === "error"
    ? setupState.status
    : undefined;

  return (
    <>
      {children}
      {promptState && (
        <NotificationPrompt
          state={promptState}
          message={"message" in setupState ? setupState.message : undefined}
          onEnable={handleEnable}
          onDismiss={dismissPrompt}
        />
      )}
      {foregroundMessage && (
        <div className="fixed bottom-4 left-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-cyco-green/20 bg-white p-4 text-sm text-gray-700 shadow-lg">
          <div className="flex items-start gap-3">
            <button type="button" onClick={openForegroundMessage} className="min-w-0 flex-1 text-left">
              <div className="font-semibold text-gray-900">{foregroundMessage.title}</div>
              <p className="mt-1">{foregroundMessage.body}</p>
            </button>
            <button
              type="button"
              onClick={() => setForegroundMessage(undefined)}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Fechar notificacao"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

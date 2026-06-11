"use client";

import { Bell, BellOff, Loader2, X } from "lucide-react";

type PromptState = "prompt" | "registering" | "ready" | "permission-denied" | "error";

interface NotificationPromptProps {
  state: PromptState;
  message?: string;
  onEnable: () => void;
  onDismiss: () => void;
}

export function NotificationPrompt({ state, message, onEnable, onDismiss }: NotificationPromptProps) {
  if (state === "ready") return null;

  const isRegistering = state === "registering";
  const isDenied = state === "permission-denied";
  const Icon = isDenied ? BellOff : Bell;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-cyco-green/20 bg-white p-4 text-sm text-gray-700 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-cyco-light p-2 text-cyco-green">
          {isRegistering ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900">Notificacoes de coleta</div>
          <p className="mt-1">
            {message ?? "Receba avisos quando o status da sua coleta mudar."}
          </p>
          {!isDenied && (
            <button
              type="button"
              onClick={onEnable}
              disabled={isRegistering}
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-cyco-green px-3 py-2 text-white shadow hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRegistering ? "Ativando..." : "Ativar notificacoes"}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Dispensar notificacoes"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

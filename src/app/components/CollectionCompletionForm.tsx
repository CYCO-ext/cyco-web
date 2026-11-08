"use client";

import { FormEvent, useId, useState } from "react";

type ErrorPayload = {
  error?: { code?: string; message?: string } | string;
  retryAfterSeconds?: number;
};

type CollectionCompletionFormProps = {
  onConfirm: (code: string, idempotencyKey: string) => Promise<Response>;
  label?: string;
  allowPending?: boolean;
};

function createIdempotencyKey() {
  return crypto.randomUUID();
}

export default function CollectionCompletionForm({
  onConfirm,
  label = "Código de confirmação",
  allowPending = true,
}: CollectionCompletionFormProps) {
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const [code, setCode] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, 6));
    setIdempotencyKey(null);
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code) || isSubmitting) return;

    const key = idempotencyKey ?? createIdempotencyKey();
    setIdempotencyKey(key);
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await onConfirm(code, key);
      const payload = await response.json().catch(() => ({})) as ErrorPayload;

      if (response.status === 200 || (response.status === 202 && allowPending)) {
        setCode("");
        setIdempotencyKey(null);
        setMessage(response.status === 202
          ? "Confirmação recebida. A atualização da rota está pendente."
          : "Coleta confirmada.");
        return;
      }

      if (response.status === 202) {
        setMessage("A coleta não foi confirmada. Atualize o status e tente novamente.");
        return;
      }

      if (response.status === 422) {
        setMessage("O código informado não confere. Confira os seis dígitos e tente novamente.");
      } else if (response.status === 429) {
        const seconds = payload.retryAfterSeconds;
        setMessage(typeof seconds === "number"
          ? `Muitas tentativas. Aguarde ${seconds} segundos antes de tentar novamente.`
          : "Muitas tentativas. Aguarde antes de tentar novamente.");
      } else if (typeof payload.error === "string") {
        setMessage(payload.error);
      } else {
        setMessage(payload.error?.message ?? "Não foi possível confirmar a coleta. Tente novamente.");
      }
    } catch {
      setMessage("Não foi possível confirmar agora. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        name="completionCode"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9]{6}"
        minLength={6}
        maxLength={6}
        required
        value={code}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isSubmitting}
        aria-describedby={messageId}
        className="w-full rounded-md border border-gray-300 px-3 py-2 tracking-widest"
      />
      <button
        type="submit"
        disabled={isSubmitting || code.length !== 6}
        className="rounded-md bg-cyco-green px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Confirmando…" : "Confirmar coleta"}
      </button>
      <p id={messageId} role="status" aria-live="polite" className="text-sm">
        {message}
      </p>
    </form>
  );
}

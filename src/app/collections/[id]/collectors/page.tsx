"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertCircle, Check, MapPin, RotateCcw, Star } from "lucide-react";

import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { button } from "@/app/components/ui";
import { getSessionMeta, isGeneratorRole } from "@/app/lib/createCollection";
import { CollectorOption } from "@/app/lib/selectCollector";

type PageError = {
  message: string;
  scope: "load" | "submit" | "validation";
};

function getApiError(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }

  return fallback;
}

function ErrorMessage({ error }: { error?: PageError }) {
  if (!error) return null;

  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error.message}</span>
    </div>
  );
}

function CollectorCard({
  collector,
  selected,
  onSelect,
}: {
  collector: CollectorOption;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(collector.id)}
      className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
        selected
          ? "border-cyco-green ring-2 ring-cyco-green/30"
          : "border-gray-200 hover:border-cyco-green/70 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{collector.enterpriseName ?? collector.name}</h2>
          {collector.enterpriseName && collector.enterpriseName !== collector.name && (
            <p className="mt-1 text-sm text-gray-600">{collector.name}</p>
          )}
        </div>
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
            selected ? "border-cyco-green bg-cyco-green text-white" : "border-gray-300 text-transparent"
          }`}
        >
          <Check className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
        {typeof collector.distance === "number" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
            <MapPin className="h-3.5 w-3.5" />
            {collector.distance.toLocaleString("pt-BR")} km
          </span>
        )}
        {typeof collector.rating === "number" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
            <Star className="h-3.5 w-3.5" />
            {collector.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          </span>
        )}
        {collector.materials?.map((material) => (
          <span key={material} className="rounded-full bg-cyco-light px-2 py-1 text-cyco-green">
            {material}
          </span>
        ))}
      </div>
    </button>
  );
}

export default function SelectCollectorPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const requestId = useMemo(() => {
    const id = params.id;
    return Array.isArray(id) ? id[0] : id;
  }, [params.id]);

  const { data: session, status } = useSession();
  const sessionMeta = getSessionMeta(session);
  const canSelectCollector = !sessionMeta.role || isGeneratorRole(sessionMeta.role);

  const [collectors, setCollectors] = useState<CollectorOption[]>([]);
  const [selectedCollectorId, setSelectedCollectorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<PageError>();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const loadCollectors = useCallback(async () => {
    if (!requestId) {
      setError({ scope: "load", message: "ID da solicitação não informado." });
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const headers: HeadersInit = sessionMeta.token
        ? { authorization: `Bearer ${sessionMeta.token}` }
        : {};
      const res = await fetch(`/api/collections/requests/${encodeURIComponent(requestId)}/collectors`, {
        headers,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao buscar coletores próximos."));
      }

      const nextCollectors = Array.isArray(data) ? data as CollectorOption[] : [];
      setCollectors(nextCollectors);
      setSelectedCollectorId((current) =>
        nextCollectors.some((collector) => collector.id === current) ? current : "",
      );
    } catch (loadError) {
      setCollectors([]);
      setError({
        scope: "load",
        message: loadError instanceof Error ? loadError.message : "Erro ao buscar coletores próximos.",
      });
    } finally {
      setLoading(false);
    }
  }, [requestId, sessionMeta.token]);

  useEffect(() => {
    if (status !== "authenticated" || !canSelectCollector) return;
    loadCollectors();
  }, [status, canSelectCollector, loadCollectors]);

  async function handleSubmit() {
    if (!requestId) {
      setError({ scope: "validation", message: "ID da solicitação não informado." });
      return;
    }

    if (!selectedCollectorId) {
      setError({ scope: "validation", message: "Selecione um coletor para continuar." });
      return;
    }

    setSubmitting(true);
    setError(undefined);

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(sessionMeta.token ? { authorization: `Bearer ${sessionMeta.token}` } : {}),
      };
      const res = await fetch(`/api/collections/requests/${encodeURIComponent(requestId)}/select-collector`, {
        method: "POST",
        headers,
        body: JSON.stringify({ collectorId: selectedCollectorId }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao selecionar coletor."));
      }

      setSuccess(true);
    } catch (submitError) {
      setError({
        scope: "submit",
        message: submitError instanceof Error ? submitError.message : "Erro ao selecionar coletor.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-gray-500">Carregando...</span>
      </div>
    );
  }

  if (!canSelectCollector) {
    return (
      <div className="flex h-screen flex-col bg-gray-100">
        <Header />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-gray-900">Acesso indisponível</h1>
            <p className="mt-2 text-sm text-gray-600">
              Apenas geradores podem selecionar coletores.
            </p>
            <button type="button" className={`${button()} mt-5`} onClick={() => router.push("/")}>
              Voltar
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-gray-100">
      <Header centerText="Escolha o coletor" />

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        <main className="flex flex-1 flex-col overflow-y-auto p-4 md:p-8">
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Coletores próximos</h1>
              <p className="mt-1 text-sm text-gray-600">
                Selecione a empresa que fará a coleta desta solicitação.
              </p>
            </div>

            {success ? (
              <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <Check className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-gray-900">Coletor selecionado</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Sua solicitação foi enviada para o coletor escolhido.
                </p>
                <button type="button" onClick={() => router.push("/")} className={`${button()} mt-5`}>
                  Voltar ao início
                </button>
              </div>
            ) : (
              <>
                <ErrorMessage error={error} />

                {loading ? (
                  <div className="rounded-2xl bg-white p-6 text-sm text-gray-600 shadow-sm">
                    Buscando coletores próximos...
                  </div>
                ) : collectors.length === 0 && !error ? (
                  <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                    <h2 className="text-base font-semibold text-gray-900">Nenhum coletor encontrado</h2>
                    <p className="mt-2 text-sm text-gray-600">
                      Ainda não há coletores próximos disponíveis para esta solicitação.
                    </p>
                    <button type="button" onClick={loadCollectors} className={`${button()} mt-5`}>
                      Tentar novamente
                    </button>
                  </div>
                ) : error?.scope === "load" ? (
                  <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                    <button
                      type="button"
                      onClick={loadCollectors}
                      className="mx-auto flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Tentar novamente
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {collectors.map((collector) => (
                      <CollectorCard
                        key={collector.id}
                        collector={collector}
                        selected={collector.id === selectedCollectorId}
                        onSelect={(collectorId) => {
                          setSelectedCollectorId(collectorId);
                          setError(undefined);
                        }}
                      />
                    ))}
                  </div>
                )}

                {collectors.length > 0 && (
                  <div className="mt-auto flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => router.push("/")}
                      className="rounded-xl border border-gray-300 px-5 py-2 hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className={`${button()} px-6`}
                    >
                      {submitting ? "Enviando..." : "Confirmar coletor"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

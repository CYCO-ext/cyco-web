"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  RotateCcw,
  UserCheck,
  XCircle,
} from "lucide-react";

import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { button } from "@/app/components/ui";
import { getSessionMeta, isGeneratorRole } from "@/app/lib/createCollection";
import {
  COLLECTION_STATUS_OPTIONS,
  collectCounterpartLookups,
  CollectionStatus,
  CollectionSummary,
  counterpartProfileMapKey,
  formatDate,
  formatProfilePhone,
  formatWeight,
  getCounterpartLookup,
  getViewerRole,
  isCollectorRole,
  normalizeCounterpartProfile,
  CounterpartProfile,
  ViewerRole,
  formatCollectionAddress,
  statusLabel,
} from "@/app/lib/collectionsPage";

type StatusFilter = "ALL" | CollectionStatus;
type CounterpartProfiles = Record<string, CounterpartProfile>;
type ActionFeedback = {
  collectionId: string;
  type: "success" | "error";
  message: string;
};

type PageError = {
  message: string;
};

type CollectionActionKind = "accept" | "reject" | "finish" | "cancel";

function getApiError(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }

  return fallback;
}

function StatusBadge({ status }: { status: CollectionStatus }) {
  const color = {
    PENDING: "bg-amber-100 text-amber-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELED: "bg-red-100 text-red-800",
    CANCELLED: "bg-red-100 text-red-800",
  }[status] ?? "bg-gray-100 text-gray-700";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
      {statusLabel(status)}
    </span>
  );
}

function ConfirmationFlag({ label, confirmed }: { label: string; confirmed: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
      {confirmed ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-700" />
      ) : (
        <Clock className="h-3.5 w-3.5 text-gray-500" />
      )}
      {label}: {confirmed ? "confirmado" : "pendente"}
    </span>
  );
}

function isAcceptEligible(collection: CollectionSummary): boolean {
  return collection.status === "PENDING";
}

function isRejectEligible(collection: CollectionSummary): boolean {
  return collection.status === "PENDING";
}

function isFinishEligible(collection: CollectionSummary): boolean {
  return collection.status === "IN_PROGRESS";
}

function isCancelEligible(collection: CollectionSummary): boolean {
  return ["PENDING", "IN_PROGRESS"].includes(collection.status);
}

function hasViewerConfirmed(collection: CollectionSummary, viewerRole?: ViewerRole): boolean {
  if (viewerRole === "GENERATOR") return collection.generatorConfirmed;
  if (viewerRole === "WASTE_COLLECTOR") return collection.collectorConfirmed;
  return false;
}

function CounterpartDetails({
  collection,
  profile,
  viewerRole,
  profileLoading,
}: {
  collection: CollectionSummary;
  profile?: CounterpartProfile;
  viewerRole?: ViewerRole;
  profileLoading: boolean;
}) {
  if (viewerRole === "GENERATOR" && !collection.selectedCollectorId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        Nenhum coletor selecionado ainda.
      </div>
    );
  }

  if (!viewerRole) return null;

  const label = viewerRole === "GENERATOR" ? "Coletor selecionado" : "Gerador";

  if (profileLoading && !profile) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        Buscando dados de {label.toLowerCase()}...
      </div>
    );
  }

  if (!profile) {
    const fallbackId = viewerRole === "GENERATOR" ? collection.selectedCollectorId : collection.generatorId;
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        {label}: {fallbackId ? fallbackId.slice(0, 8) : "não informado"}
      </div>
    );
  }

  const phone = formatProfilePhone(profile.phone);
  const address = profile.address?.[0];
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
        <span className="text-sm font-semibold text-gray-900">
          {profile.name ?? profile.enterprise?.companyName ?? profile.id.slice(0, 8)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
        {profile.email && (
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            {profile.email}
          </span>
        )}
        {phone && (
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" />
            {phone}
          </span>
        )}
        {!profile.email && !phone && profile.fallback && (
          <span>Dados completos indisponíveis. ID: {profile.id.slice(0, 8)}</span>
        )}
      </div>

      {address && (
        <p className="mt-2 text-xs text-gray-500">
          CEP {address.zipCode ?? "não informado"}
          {address.number ? `, nº ${address.number}` : ""}
          {address.complement ? `, ${address.complement}` : ""}
        </p>
      )}
    </div>
  );
}

function CollectionCard({
  collection,
  counterpart,
  viewerRole,
  profileLoading,
  actionPending,
  actionPendingKind,
  feedback,
  onAccept,
  onReject,
  onFinish,
  onCancel,
}: {
  collection: CollectionSummary;
  counterpart?: CounterpartProfile;
  viewerRole?: ViewerRole;
  profileLoading: boolean;
  actionPending: boolean;
  actionPendingKind?: CollectionActionKind;
  feedback?: ActionFeedback;
  onAccept: (collectionId: string) => void;
  onReject: (collectionId: string) => void;
  onFinish: (collectionId: string) => void;
  onCancel: (collectionId: string) => void;
}) {
  const showAccept = viewerRole === "WASTE_COLLECTOR" && isAcceptEligible(collection);
  const showReject = viewerRole === "WASTE_COLLECTOR" && isRejectEligible(collection);
  const showFinish = !!viewerRole && isFinishEligible(collection);
  const showCancel = !!viewerRole && isCancelEligible(collection);
  const viewerConfirmed = hasViewerConfirmed(collection, viewerRole);
  const actionCopy = showFinish
    ? viewerConfirmed
      ? "Você já confirmou a finalização desta coleta."
      : "Confirme a finalização desta coleta."
    : showAccept
      ? "Aceite, rejeite ou cancele esta solicitação."
      : showCancel
        ? "Cancele esta coleta se ela não deve continuar."
        : "Acompanhe o status desta coleta.";

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">Coleta #{collection.id.slice(0, 8)}</h2>
            <StatusBadge status={collection.status} />
          </div>
          <p className="mt-1 text-xs text-gray-500">ID: {collection.id}</p>
        </div>
        <div className="text-sm font-semibold text-cyco-green">{formatWeight(collection.weight)}</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {collection.materialIds.length > 0 ? (
          collection.materialIds.map((material) => (
            <span key={material} className="rounded-full bg-cyco-light px-2.5 py-1 text-xs text-cyco-green">
              {material}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
            Sem materiais informados
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-2 text-sm text-gray-600 md:grid-cols-2">
        <div>Criada em: {formatDate(collection.createdAt)}</div>
        <div>Atualizada em: {formatDate(collection.updatedAt)}</div>
      </div>

      <div className="mt-4 rounded-xl border border-cyco-light bg-cyco-light/40 p-3">
        <div className="text-xs font-medium uppercase tracking-wide text-cyco-green">Endereço da coleta</div>
        <div className="mt-1 break-words text-sm font-semibold text-gray-800">
          {formatCollectionAddress(collection)}
        </div>
      </div>

      <div className="mt-4">
        <CounterpartDetails
          collection={collection}
          profile={counterpart}
          viewerRole={viewerRole}
          profileLoading={profileLoading}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {collection.selectedCollectorId ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
            <UserCheck className="h-3.5 w-3.5" />
            coletor selecionado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
            <XCircle className="h-3.5 w-3.5" />
            sem coletor
          </span>
        )}
        <ConfirmationFlag label="Gerador" confirmed={collection.generatorConfirmed} />
        <ConfirmationFlag label="Coletor" confirmed={collection.collectorConfirmed} />
      </div>

      {(showAccept || showReject || showFinish || showCancel || feedback) && (
        <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          {feedback ? (
            <span
              className={`text-sm ${
                feedback.type === "success" ? "text-green-700" : "text-red-700"
              }`}
            >
              {feedback.message}
            </span>
          ) : (
            <span className="text-sm text-gray-500">{actionCopy}</span>
          )}

          {showAccept && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onAccept(collection.id)}
                disabled={actionPending}
                className={`${button()} min-w-32 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {actionPending && actionPendingKind === "accept" ? "Aceitando..." : "Aceitar coleta"}
              </button>

              {showReject && (
                <button
                  type="button"
                  onClick={() => onReject(collection.id)}
                  disabled={actionPending}
                  className="inline-flex min-w-28 items-center justify-center rounded-xl border border-red-700 bg-white px-4 py-2 font-semibold text-red-800 shadow-sm hover:bg-red-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionPending && actionPendingKind === "reject" ? "Rejeitando..." : "Rejeitar"}
                </button>
              )}
            </div>
          )}

          {showFinish && (
            <button
              type="button"
              onClick={() => onFinish(collection.id)}
              disabled={actionPending || viewerConfirmed}
              className={`${button()} min-w-32 disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {actionPending && actionPendingKind === "finish"
                ? "Finalizando..."
                : viewerConfirmed
                  ? "Finalização confirmada"
                  : "Finalizar coleta"}
            </button>
          )}

          {showCancel && (
            <button
              type="button"
              onClick={() => onCancel(collection.id)}
              disabled={actionPending}
              className="inline-flex min-w-28 items-center justify-center rounded-xl border border-red-700 bg-white px-4 py-2 font-semibold text-red-800 shadow-sm hover:bg-red-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionPending && actionPendingKind === "cancel" ? "Cancelando..." : "Cancelar"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default function CollectionsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionMeta = getSessionMeta(session);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [counterpartProfiles, setCounterpartProfiles] = useState<CounterpartProfiles>({});
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [actionPendingId, setActionPendingId] = useState<string>();
  const [actionPendingKind, setActionPendingKind] = useState<CollectionActionKind>();
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PageError>();
  const viewerRole = getViewerRole(sessionMeta.role);

  const roleQuery = useMemo(() => {
    if (!sessionMeta.generatorId) return undefined;
    if (isGeneratorRole(sessionMeta.role)) return { key: "generatorId", value: sessionMeta.generatorId };
    if (isCollectorRole(sessionMeta.role)) return { key: "collectorId", value: sessionMeta.generatorId };
    return undefined;
  }, [sessionMeta.generatorId, sessionMeta.role]);

  const fetchCounterpartProfiles = useCallback(async (items: CollectionSummary[]) => {
    const lookups = collectCounterpartLookups(items, viewerRole);

    if (lookups.length === 0) {
      setCounterpartProfiles({});
      return;
    }

    setProfilesLoading(true);

    try {
      const headers: HeadersInit = sessionMeta.token
        ? { authorization: `Bearer ${sessionMeta.token}` }
        : {};
      const entries = await Promise.all(
        lookups.map(async (lookup) => {
          const endpoint = lookup.kind === "generator"
            ? `/api/generator/${lookup.id}`
            : `/api/waste-collector/${lookup.id}`;

          try {
            const res = await fetch(endpoint, { headers });
            const data = await res.json().catch(() => null);
            const profile = res.ok
              ? normalizeCounterpartProfile(data, lookup.id)
              : normalizeCounterpartProfile(null, lookup.id);

            return [counterpartProfileMapKey(lookup.kind, lookup.id), profile] as const;
          } catch {
            return [
              counterpartProfileMapKey(lookup.kind, lookup.id),
              normalizeCounterpartProfile(null, lookup.id),
            ] as const;
          }
        }),
      );

      setCounterpartProfiles(Object.fromEntries(entries));
    } finally {
      setProfilesLoading(false);
    }
  }, [sessionMeta.token, viewerRole]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const loadCollections = useCallback(async () => {
    if (!roleQuery) {
      setError({ message: "Não foi possível identificar o usuário ou perfil autenticado." });
      setCollections([]);
      return;
    }

    setLoading(true);
    setError(undefined);

    const query = new URLSearchParams();
    query.set(roleQuery.key, roleQuery.value);
    if (statusFilter !== "ALL") {
      query.set("status", statusFilter);
    }

    try {
      const headers: HeadersInit = sessionMeta.token
        ? { authorization: `Bearer ${sessionMeta.token}` }
        : {};
      const res = await fetch(`/api/collections/search?${query.toString()}`, { headers });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao buscar coletas."));
      }

      const loadedCollections = Array.isArray(data) ? data : [];
      setCollections(loadedCollections);
      await fetchCounterpartProfiles(loadedCollections);
    } catch (loadError) {
      setCollections([]);
      setCounterpartProfiles({});
      setError({
        message: loadError instanceof Error ? loadError.message : "Erro ao buscar coletas.",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchCounterpartProfiles, roleQuery, sessionMeta.token, statusFilter]);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadCollections();
  }, [status, loadCollections]);

  const handleAccept = useCallback(async (collectionId: string) => {
    setActionPendingId(collectionId);
    setActionPendingKind("accept");
    setActionFeedback(undefined);

    try {
      const headers: HeadersInit = sessionMeta.token
        ? { authorization: `Bearer ${sessionMeta.token}` }
        : {};
      const res = await fetch(`/api/collections/requests/${collectionId}/accept`, {
        method: "POST",
        headers,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao aceitar coleta."));
      }

      setActionFeedback({
        collectionId,
        type: "success",
        message: "Coleta aceita com sucesso.",
      });
      await loadCollections();
    } catch (acceptError) {
      setActionFeedback({
        collectionId,
        type: "error",
        message: acceptError instanceof Error ? acceptError.message : "Erro ao aceitar coleta.",
      });
    } finally {
      setActionPendingId(undefined);
      setActionPendingKind(undefined);
    }
  }, [loadCollections, sessionMeta.token]);

  const handleReject = useCallback(async (collectionId: string) => {
    setActionPendingId(collectionId);
    setActionPendingKind("reject");
    setActionFeedback(undefined);

    try {
      const headers: HeadersInit = sessionMeta.token
        ? { authorization: `Bearer ${sessionMeta.token}` }
        : {};
      const res = await fetch(`/api/collectors/requests/${collectionId}/reject`, {
        method: "POST",
        headers,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao rejeitar coleta."));
      }

      setActionFeedback({
        collectionId,
        type: "success",
        message: "Coleta rejeitada com sucesso.",
      });
      await loadCollections();
    } catch (rejectError) {
      setActionFeedback({
        collectionId,
        type: "error",
        message: rejectError instanceof Error ? rejectError.message : "Erro ao rejeitar coleta.",
      });
    } finally {
      setActionPendingId(undefined);
      setActionPendingKind(undefined);
    }
  }, [loadCollections, sessionMeta.token]);

  const handleCancel = useCallback(async (collectionId: string) => {
    if (!viewerRole || !sessionMeta.generatorId) {
      setActionFeedback({
        collectionId,
        type: "error",
        message: "Não foi possível identificar o usuário autenticado.",
      });
      return;
    }

    setActionPendingId(collectionId);
    setActionPendingKind("cancel");
    setActionFeedback(undefined);

    const isCollector = viewerRole === "WASTE_COLLECTOR";
    const endpoint = isCollector
      ? `/api/collectors/requests/${collectionId}/cancel`
      : `/api/generators/requests/${collectionId}/cancel`;
    const payload = isCollector
      ? { collectorId: sessionMeta.generatorId }
      : { generatorId: sessionMeta.generatorId };

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(sessionMeta.token ? { authorization: `Bearer ${sessionMeta.token}` } : {}),
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao cancelar coleta."));
      }

      setActionFeedback({
        collectionId,
        type: "success",
        message: "Coleta cancelada com sucesso.",
      });
      await loadCollections();
    } catch (cancelError) {
      setActionFeedback({
        collectionId,
        type: "error",
        message: cancelError instanceof Error ? cancelError.message : "Erro ao cancelar coleta.",
      });
    } finally {
      setActionPendingId(undefined);
      setActionPendingKind(undefined);
    }
  }, [loadCollections, sessionMeta.generatorId, sessionMeta.token, viewerRole]);

  const handleFinish = useCallback(async (collectionId: string) => {
    if (!viewerRole) return;

    setActionPendingId(collectionId);
    setActionPendingKind("finish");
    setActionFeedback(undefined);

    const endpoint = viewerRole === "GENERATOR"
      ? `/api/collections/requests/${collectionId}/confirm-generator`
      : `/api/collections/requests/${collectionId}/confirm-collector`;
    const fallback = viewerRole === "GENERATOR"
      ? "Erro ao finalizar coleta como gerador."
      : "Erro ao finalizar coleta como coletor.";

    try {
      const headers: HeadersInit = sessionMeta.token
        ? { authorization: `Bearer ${sessionMeta.token}` }
        : {};
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, fallback));
      }

      setActionFeedback({
        collectionId,
        type: "success",
        message: "Finalização confirmada com sucesso.",
      });
      await loadCollections();
    } catch (finishError) {
      setActionFeedback({
        collectionId,
        type: "error",
        message: finishError instanceof Error ? finishError.message : fallback,
      });
    } finally {
      setActionPendingId(undefined);
      setActionPendingKind(undefined);
    }
  }, [loadCollections, sessionMeta.token, viewerRole]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-gray-500">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-gray-100">
      <Header centerText="Coletas" />

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        <main className="flex flex-1 flex-col overflow-y-auto p-4 md:p-8">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Minhas coletas</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Acompanhe solicitações e filtre por status.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    statusFilter === "ALL"
                      ? "bg-cyco-green text-white"
                      : "bg-white text-gray-700 hover:bg-cyco-light"
                  }`}
                >
                  Todos
                </button>
                {COLLECTION_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStatusFilter(option)}
                    className={`rounded-full px-3 py-1.5 text-sm transition ${
                      statusFilter === option
                        ? "bg-cyco-green text-white"
                        : "bg-white text-gray-700 hover:bg-cyco-light"
                    }`}
                  >
                    {statusLabel(option)}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error.message}</span>
                </div>
                <button
                  type="button"
                  onClick={loadCollections}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-red-800 hover:bg-red-100"
                >
                  <RotateCcw className="h-4 w-4" />
                  Tentar novamente
                </button>
              </div>
            )}

            {loading ? (
              <div className="rounded-2xl bg-white p-6 text-sm text-gray-600 shadow-sm">
                Buscando coletas...
              </div>
            ) : collections.length === 0 && !error ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <h2 className="text-base font-semibold text-gray-900">Nenhuma coleta encontrada</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Não há coletas para o filtro selecionado.
                </p>
                <button type="button" onClick={loadCollections} className={`${button()} mt-5`}>
                  Atualizar
                </button>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {collections.map((collection) => {
                  const lookup = getCounterpartLookup(collection, viewerRole);
                  const counterpart = lookup
                    ? counterpartProfiles[counterpartProfileMapKey(lookup.kind, lookup.id)]
                    : undefined;

                  return (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      counterpart={counterpart}
                      viewerRole={viewerRole}
                      profileLoading={profilesLoading}
                      actionPending={actionPendingId === collection.id}
                      actionPendingKind={actionPendingId === collection.id ? actionPendingKind : undefined}
                      feedback={actionFeedback?.collectionId === collection.id ? actionFeedback : undefined}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onFinish={handleFinish}
                      onCancel={handleCancel}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

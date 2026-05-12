"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  ChevronDown,
  Eye,
  X,
  Loader2,
  MapPin,
  RotateCcw,
  Route,
  Truck,
} from "lucide-react";

import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { button } from "@/app/components/ui";
import {
  CollectionSummary,
  formatDate,
  formatWeight,
  isCollectorRole,
  normalizeCollections,
  statusLabel,
} from "@/app/lib/collectionsPage";
import { getSessionMeta } from "@/app/lib/createCollection";
import {
  formatDistanceMeters,
  normalizeSavedRoutes,
  SavedRoute,
  SuggestedRouteStop,
} from "@/app/lib/routes";

type PageError = {
  message: string;
};

type CollectionModalState =
  | { status: "idle" }
  | { status: "loading"; collectionId: string }
  | { status: "ready"; collection: CollectionSummary }
  | { status: "error"; collectionId: string; message: string };

function getApiError(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }

  return fallback;
}

function formatDateTime(value: string | null): string {
  if (!value) return "Nao informado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStopAddress(stop: SuggestedRouteStop): string {
  if (stop.addressStreet?.trim()) {
    const number = stop.addressNumber?.trim() ? `, ${stop.addressNumber}` : "";
    return `${stop.addressStreet}${number}`;
  }

  return "Endereço não informado";
}

function CollectionDetailsModal({
  state,
  onClose,
}: {
  state: CollectionModalState;
  onClose: () => void;
}) {
  if (state.status === "idle") return null;

  const title = state.status === "ready"
    ? `Coleta #${state.collection.id.slice(0, 8)}`
    : state.status === "loading"
      ? "Carregando coleta"
      : "Erro ao carregar coleta";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <section className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">Detalhes da solicitação de coleta</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Fechar detalhes da coleta"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.status === "loading" && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando dados da coleta...
          </div>
        )}

        {state.status === "error" && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {state.message}
          </div>
        )}

        {state.status === "ready" && (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-xs font-medium uppercase text-gray-400">Status</div>
                <div className="mt-1 text-sm font-semibold text-gray-800">{statusLabel(state.collection.status)}</div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-xs font-medium uppercase text-gray-400">Peso</div>
                <div className="mt-1 text-sm font-semibold text-gray-800">{formatWeight(state.collection.weight)}</div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-xs font-medium uppercase text-gray-400">Criada</div>
                <div className="mt-1 text-sm font-semibold text-gray-800">{formatDate(state.collection.createdAt)}</div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-xs font-medium uppercase text-gray-400">Atualizada</div>
                <div className="mt-1 text-sm font-semibold text-gray-800">{formatDate(state.collection.updatedAt)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Materiais</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {state.collection.materialIds.length > 0 ? (
                  state.collection.materialIds.map((material) => (
                    <span key={material} className="rounded-full bg-cyco-light px-2.5 py-1 text-xs text-cyco-green">
                      {material}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">Sem materiais informados.</span>
                )}
              </div>
            </div>

            <div className="grid gap-2 text-xs text-gray-500">
              <span>ID: {state.collection.id}</span>
              <span>Gerador: {state.collection.generatorId}</span>
              {state.collection.addressId && <span>Endereço: {state.collection.addressId}</span>}
              {state.collection.selectedCollectorId && <span>Coletor: {state.collection.selectedCollectorId}</span>}
              <span>Gerador confirmou: {state.collection.generatorConfirmed ? "Sim" : "Não"}</span>
              <span>Coletor confirmou: {state.collection.collectorConfirmed ? "Sim" : "Não"}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SavedRouteCard({
  route,
  onOpenCollection,
}: {
  route: SavedRoute;
  onOpenCollection: (id: string) => void;
}) {
  const isOpen = route.status === "OPEN";
  const routeCount = route.suggestion?.routes.length ?? 0;
  const stopCount = route.suggestion?.routes.reduce((sum, item) => sum + item.stops.length, 0) ?? 0;
  const totalLoad = route.suggestion?.routes.reduce((sum, item) => sum + item.totalLoad, 0) ?? 0;

  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Rota #{route.id.slice(0, 8)}</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              isOpen ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
            }`}>
              {route.status}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-gray-500">ID: {route.id}</p>
          {route.fingerprint && (
            <p className="mt-1 truncate text-xs text-gray-500">Fingerprint: {route.fingerprint}</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-xs font-medium uppercase text-gray-400">Criada</div>
          <div className="mt-1 text-sm font-semibold text-gray-800">{formatDateTime(route.createdAt)}</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-xs font-medium uppercase text-gray-400">Atualizada</div>
          <div className="mt-1 text-sm font-semibold text-gray-800">{formatDateTime(route.updatedAt)}</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-xs font-medium uppercase text-gray-400">Coletas</div>
          <div className="mt-1 text-sm font-semibold text-gray-800">
            {route.assignedCollectionRequestIds.length} atribuida(s)
          </div>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-xs font-medium uppercase text-gray-400">Carga total</div>
          <div className="mt-1 text-sm font-semibold text-gray-800">
            {route.suggestion ? totalLoad.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "Indisponivel"}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
        {route.suggestion ? (
          <div>
            <div className="grid gap-3 text-sm text-gray-700 md:grid-cols-2 lg:grid-cols-4">
              <span>Status sugerido: {route.suggestion.status}</span>
              <span>Motor: {route.suggestion.solver.engine}</span>
              <span>Rotas: {routeCount}</span>
              <span>Paradas: {stopCount}</span>
              <span>Tempo: {route.suggestion.solver.elapsedMs} ms</span>
              <span>Descartadas: {route.suggestion.solver.droppedStops}</span>
              <span className="md:col-span-2">
                Distância: {formatDistanceMeters(route.suggestion.solver.objectiveDistanceMeters)}
              </span>
            </div>

            {route.suggestion.routes.length > 0 && (
              <div className="mt-4 grid gap-3">
                {route.suggestion.routes.map((vehicleRoute) => (
                  <details
                    key={vehicleRoute.vehicleIndex}
                    className="group rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyco-light text-cyco-green">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">
                            Veículo {vehicleRoute.vehicleIndex + 1}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                            <span>{vehicleRoute.stops.length} parada(s)</span>
                            <span>{formatDistanceMeters(vehicleRoute.totalDistanceMeters)}</span>
                            <span>Carga {vehicleRoute.totalLoad.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronDown className="h-5 w-5 shrink-0 text-gray-400 transition group-open:rotate-180" />
                    </summary>

                    <div className="mt-4 grid gap-3">
                      <div className="grid gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 sm:grid-cols-3">
                        <span>Capacidade: {vehicleRoute.capacity.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
                        <span>Carga total: {vehicleRoute.totalLoad.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
                        <span>Distância: {formatDistanceMeters(vehicleRoute.totalDistanceMeters)}</span>
                      </div>

                      {vehicleRoute.stops.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-500">
                          Sem paradas para este veículo.
                        </div>
                      ) : (
                        vehicleRoute.stops.map((stop) => (
                          <div
                            key={`${vehicleRoute.vehicleIndex}-${stop.sequence}-${stop.collectionRequestId}`}
                            className="rounded-lg border border-gray-100 p-3"
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Parada {stop.sequence}</div>
                                <div className="mt-1 text-xs text-gray-500">
                                  Endereço: {formatStopAddress(stop)}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onOpenCollection(stop.collectionRequestId)}
                                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-cyco-light px-2.5 py-1 text-xs font-medium text-cyco-green hover:bg-cyco-green hover:text-white"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Ver coleta
                                </button>
                              </div>
                              <div className="grid gap-1 text-xs text-gray-600 sm:grid-cols-2">
                                <span>Demanda: {stop.demand.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
                                <span>Acumulado: {stop.accumulatedLoad.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
                                <span>Anterior: {formatDistanceMeters(stop.distanceFromPreviousMeters)}</span>
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-600">Resumo da sugestão indisponível.</div>
        )}
      </div>

      {route.assignedCollectionRequestIds.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-900">Coletas atribuídas</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {route.assignedCollectionRequestIds.map((id) => (
              <span key={id} className="rounded-full bg-cyco-light px-2.5 py-1 text-xs text-cyco-green">
                {id.slice(0, 8)}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function SavedRoutesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionMeta = getSessionMeta(session);
  const isCollector = isCollectorRole(sessionMeta.role);
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PageError>();
  const [collectionModal, setCollectionModal] = useState<CollectionModalState>({ status: "idle" });

  const headers = useMemo((): HeadersInit => (
    sessionMeta.token ? { authorization: `Bearer ${sessionMeta.token}` } : {}
  ), [sessionMeta.token]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [router, status]);

  const loadSavedRoutes = useCallback(async () => {
    if (!isCollector) {
      setRoutes([]);
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const res = await fetch("/api/collectors/routes/saved", { headers });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao buscar rotas salvas."));
      }

      setRoutes(normalizeSavedRoutes(data));
    } catch (err) {
      setRoutes([]);
      setError({
        message: err instanceof Error ? err.message : "Erro ao buscar rotas salvas.",
      });
    } finally {
      setLoading(false);
    }
  }, [headers, isCollector]);

  useEffect(() => {
    if (status !== "authenticated" || !isCollector) return;
    loadSavedRoutes();
  }, [isCollector, loadSavedRoutes, status]);

  async function openCollectionDetails(collectionId: string) {
    setCollectionModal({ status: "loading", collectionId });

    try {
      const res = await fetch(`/api/collections/${collectionId}`, { headers });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao buscar dados da coleta."));
      }

      const collection = normalizeCollections([data])[0];
      if (!collection) {
        throw new Error("Dados da coleta inválidos.");
      }

      setCollectionModal({ status: "ready", collection });
    } catch (err) {
      setCollectionModal({
        status: "error",
        collectionId,
        message: err instanceof Error ? err.message : "Erro ao buscar dados da coleta.",
      });
    }
  }

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-gray-500">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-gray-100">
      <Header centerText="Rotas Salvas" />

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        <main className="flex flex-1 flex-col overflow-y-auto p-4 md:p-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
            {!isCollector ? (
              <section className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-amber-900">
                <h1 className="text-lg font-semibold">Acesso exclusivo para coletores</h1>
                <p className="mt-2 text-sm">Entre com um perfil de coletor para ver rotas salvas.</p>
              </section>
            ) : (
              <>
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900">Rotas salvas</h1>
                      <p className="mt-1 text-sm text-gray-600">
                        Acompanhe rotas planejadas e abra os detalhes por veículo.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => router.push("/routes/suggest")}
                        className={`${button({ variant: "ghost" })} gap-2`}
                      >
                        <Route className="h-4 w-4" />
                        Sugerir rota
                      </button>
                      <button type="button" onClick={loadSavedRoutes} className={`${button()} gap-2`}>
                        <RotateCcw className="h-4 w-4" />
                        Atualizar
                      </button>
                    </div>
                  </div>
                </section>

                {error && (
                  <section className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error.message}
                  </section>
                )}

                {loading ? (
                  <section className="flex items-center gap-2 rounded-2xl bg-white p-5 text-sm text-gray-600 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando rotas salvas...
                  </section>
                ) : routes.length === 0 && !error ? (
                  <section className="rounded-2xl bg-white p-5 text-sm text-gray-600 shadow-sm">
                    Nenhuma rota salva encontrada.
                  </section>
                ) : (
                  <div className="grid gap-4">
                    {routes.map((route) => (
                      <SavedRouteCard
                        key={route.id}
                        route={route}
                        onOpenCollection={openCollectionDetails}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <CollectionDetailsModal state={collectionModal} onClose={() => setCollectionModal({ status: "idle" })} />
    </div>
  );
}

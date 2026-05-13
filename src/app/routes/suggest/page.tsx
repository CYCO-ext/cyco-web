"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  RotateCcw,
  Route,
  Save,
  Truck,
} from "lucide-react";

import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { button, Input } from "@/app/components/ui";
import { getSessionMeta } from "@/app/lib/createCollection";
import {
  CollectionSummary,
  formatCollectionAddress,
  formatDate,
  formatWeight,
  isCollectorRole,
  normalizeCollections,
  statusLabel,
} from "@/app/lib/collectionsPage";
import {
  buildRouteSuggestionRequest,
  buildSaveRouteRequest,
  createInitialRouteSuggestionFormState,
  extractRegisteredStartCoordinates,
  formatDistanceMeters,
  formatRouteLoad,
  normalizeRouteSuggestionResponse,
  RouteSuggestionFormState,
  RouteSuggestionResponse,
  SaveRouteState,
  RouteStartCoordinates,
  SuggestedRoute,
} from "@/app/lib/routes";

type PageError = {
  message: string;
};

type LocationState = "idle" | "loading" | "ready" | "error" | "unsupported";
type RegisteredLocationState = "idle" | "loading" | "ready" | "error";

function getApiError(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }

  return fallback;
}

function CandidateCard({
  collection,
  selected,
  onToggle,
}: {
  collection: CollectionSummary;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
      selected ? "border-cyco-green bg-cyco-light" : "border-gray-200 bg-white hover:border-cyco-green/40"
    }`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(collection.id)}
        className="mt-1 h-4 w-4 accent-cyco-green"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Coleta #{collection.id.slice(0, 8)}</h3>
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
            {statusLabel(collection.status)}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-gray-500">ID: {collection.id}</p>
        <p className="mt-1 truncate text-xs font-medium text-cyco-green">
          {formatCollectionAddress(collection)}
        </p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
          <span>{formatWeight(collection.weight)}</span>
          <span>{formatDate(collection.updatedAt)}</span>
          {collection.materialIds.length ? (
            collection.materialIds.map((material) => (
              <span key={material} className="rounded-full bg-white px-2 py-0.5 text-cyco-green">
                {material}
              </span>
            ))
          ) : (
            <span>Sem materiais</span>
          )}
        </div>
      </div>
    </label>
  );
}

function formatStopAddress(stop: SuggestedRoute["stops"][number]): string {
  if (stop.street?.trim()) {
    const number = stop.number?.trim() ? `, ${stop.number}` : "";
    return `${stop.street}${number}`;
  }

  return `Endereço ${stop.addressId.slice(0, 16)}`;
}

function RouteResult({
  result,
  saveState,
  onSave,
}: {
  result: RouteSuggestionResponse;
  saveState: SaveRouteState;
  onSave: () => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Resultado da sugestão</h2>
          <p className="text-sm text-gray-600">Status: {result.status}</p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
            <span>Motor: {result.solver.engine}</span>
            <span>Tempo: {result.solver.elapsedMs} ms</span>
            <span>Distância: {formatDistanceMeters(result.solver.objectiveDistanceMeters)}</span>
            <span>Descartadas: {result.solver.droppedStops}</span>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saveState.status === "saving" || saveState.status === "saved"}
            className={`${button()} gap-2`}
          >
            {saveState.status === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveState.status === "saved" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveState.status === "saving"
              ? "Salvando..."
              : saveState.status === "saved"
                ? "Rota salva"
                : "Salvar rota"}
          </button>
        </div>
      </div>

      {saveState.status === "saved" && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Rota salva com ID {saveState.routeId}.
        </div>
      )}

      {saveState.status === "error" && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {saveState.message}
        </div>
      )}

      {result.routes.length === 0 ? (
        <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
          Nenhuma rota retornada para os parâmetros informados.
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          {result.routes.map((route) => (
            <VehicleRouteCard key={route.vehicleIndex} route={route} />
          ))}
        </div>
      )}

      {result.unassigned.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">Coletas não atribuídas</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.unassigned.map((id) => (
              <span key={id} className="rounded-full bg-white px-2.5 py-1 text-xs text-amber-800">
                {id.slice(0, 8)}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function VehicleRouteCard({ route }: { route: SuggestedRoute }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-cyco-green" />
          <h3 className="font-semibold text-gray-900">Veículo {route.vehicleIndex + 1}</h3>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          <span>Capacidade: {formatRouteLoad(route.capacity)}</span>
          <span>Carga: {formatRouteLoad(route.totalLoad)}</span>
          <span>Distância: {formatDistanceMeters(route.totalDistanceMeters)}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {route.stops.length === 0 ? (
          <div className="rounded-lg bg-white p-3 text-sm text-gray-600">Sem paradas para este veículo.</div>
        ) : route.stops.map((stop) => (
          <div key={`${route.vehicleIndex}-${stop.sequence}`} className="rounded-lg bg-white p-3 text-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold text-gray-900">Parada {stop.sequence}</div>
                <div className="text-xs text-gray-500">Coleta: {stop.collectionRequestId}</div>
                <div className="text-xs text-gray-500">Endereço: {formatStopAddress(stop)}</div>
              </div>
              <div className="grid gap-1 text-xs text-gray-600 sm:grid-cols-2">
                <span>Demanda: {formatRouteLoad(stop.demand)}</span>
                <span>Acumulado: {formatRouteLoad(stop.accumulatedLoad)}</span>
                <span>Anterior: {formatDistanceMeters(stop.distanceFromPreviousMeters)}</span>
                <span>
                  {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function SuggestRoutePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionMeta = getSessionMeta(session);
  const [form, setForm] = useState<RouteSuggestionFormState>(createInitialRouteSuggestionFormState);
  const [candidates, setCandidates] = useState<CollectionSummary[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState<PageError>();
  const [submitError, setSubmitError] = useState<PageError>();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RouteSuggestionResponse>();
  const [saveState, setSaveState] = useState<SaveRouteState>({ status: "idle" });
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [locationError, setLocationError] = useState<string>();
  const [currentLocation, setCurrentLocation] = useState<RouteStartCoordinates>();
  const [registeredLocation, setRegisteredLocation] = useState<RouteStartCoordinates>();
  const [registeredLocationState, setRegisteredLocationState] = useState<RegisteredLocationState>("idle");
  const [registeredLocationError, setRegisteredLocationError] = useState<string>();
  const isCollector = isCollectorRole(sessionMeta.role);

  const headers = useMemo((): HeadersInit => (
    sessionMeta.token ? { authorization: `Bearer ${sessionMeta.token}` } : {}
  ), [sessionMeta.token]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [router, status]);

  const loadCandidates = useCallback(async () => {
    if (!sessionMeta.generatorId || !isCollector) {
      setCandidates([]);
      return;
    }

    setCandidatesLoading(true);
    setCandidatesError(undefined);

    const query = new URLSearchParams({
      collectorId: sessionMeta.generatorId,
      status: "IN_PROGRESS",
    });

    try {
      const res = await fetch(`/api/collections/search?${query.toString()}`, { headers });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao buscar coletas em andamento."));
      }

      setCandidates(normalizeCollections(data).filter((collection) => collection.status === "IN_PROGRESS"));
    } catch (error) {
      setCandidates([]);
      setCandidatesError({
        message: error instanceof Error ? error.message : "Erro ao buscar coletas em andamento.",
      });
    } finally {
      setCandidatesLoading(false);
    }
  }, [headers, isCollector, sessionMeta.generatorId]);

  useEffect(() => {
    if (status !== "authenticated" || !isCollector) return;
    loadCandidates();
  }, [isCollector, loadCandidates, status]);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationState("unsupported");
      setLocationError("Seu navegador não permite obter localização automaticamente.");
      return;
    }

    setLocationState("loading");
    setLocationError(undefined);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentLocation(coordinates);
        setForm((current) => ({
          ...current,
          ...(current.startLocationSource === "current"
            ? {
                latitude: coordinates.latitude.toString(),
                longitude: coordinates.longitude.toString(),
              }
            : {}),
        }));
        setLocationState("ready");
      },
      () => {
        setLocationState("error");
        setLocationError("Não foi possível obter sua localização. Permita o acesso e tente novamente.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !isCollector) return;
    requestLocation();
  }, [isCollector, requestLocation, status]);

  const loadRegisteredLocation = useCallback(async () => {
    if (!sessionMeta.generatorId || !isCollector) return;

    setRegisteredLocationState("loading");
    setRegisteredLocationError(undefined);

    try {
      const res = await fetch(`/api/collectors/${sessionMeta.generatorId}/address`, { headers });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao buscar localização cadastrada."));
      }

      const coordinates = extractRegisteredStartCoordinates(data);
      if (!coordinates) {
        throw new Error("Localização cadastrada não possui coordenadas.");
      }

      setRegisteredLocation(coordinates);
      setRegisteredLocationState("ready");
      setForm((current) => ({
        ...current,
        ...(current.startLocationSource === "registered"
          ? {
              latitude: coordinates.latitude.toString(),
              longitude: coordinates.longitude.toString(),
            }
          : {}),
      }));
    } catch (error) {
      setRegisteredLocation(undefined);
      setRegisteredLocationState("error");
      setRegisteredLocationError(
        error instanceof Error ? error.message : "Erro ao buscar localização cadastrada.",
      );
    }
  }, [headers, isCollector, sessionMeta.generatorId]);

  useEffect(() => {
    if (status !== "authenticated" || !isCollector) return;
    loadRegisteredLocation();
  }, [isCollector, loadRegisteredLocation, status]);

  function updateForm<K extends keyof RouteSuggestionFormState>(
    key: K,
    value: RouteSuggestionFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCandidate(id: string) {
    setForm((current) => ({
      ...current,
      selectedRequestIds: current.selectedRequestIds.includes(id)
        ? current.selectedRequestIds.filter((requestId) => requestId !== id)
        : [...current.selectedRequestIds, id],
    }));
  }

  function selectStartLocation(source: RouteSuggestionFormState["startLocationSource"]) {
    setSubmitError(undefined);

    if (source === "current") {
      setForm((current) => ({
        ...current,
        startLocationSource: source,
        latitude: currentLocation?.latitude.toString() ?? "",
        longitude: currentLocation?.longitude.toString() ?? "",
      }));

      if (!currentLocation) {
        requestLocation();
      }
      return;
    }

    setForm((current) => ({
      ...current,
      startLocationSource: source,
      latitude: registeredLocation?.latitude.toString() ?? "",
      longitude: registeredLocation?.longitude.toString() ?? "",
    }));

    if (!registeredLocation) {
      loadRegisteredLocation();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(undefined);

    const { payload, error } = buildRouteSuggestionRequest(form, sessionMeta.generatorId);
    if (error || !payload) {
      setSubmitError({ message: error ?? "Confira os dados da rota." });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/collectors/routes/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao sugerir rota."));
      }

      const normalized = normalizeRouteSuggestionResponse(data);
      if (!normalized) {
        throw new Error("Resposta de rota inválida.");
      }

      setResult(normalized);
      setSaveState({ status: "idle" });
    } catch (error) {
      setSubmitError({
        message: error instanceof Error ? error.message : "Erro ao sugerir rota.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveRoute() {
    const { payload, error } = buildSaveRouteRequest(sessionMeta.generatorId, result);
    if (error || !payload) {
      setSaveState({ status: "error", message: error ?? "Gere uma rota antes de salvar." });
      return;
    }

    setSaveState({ status: "saving" });

    try {
      const res = await fetch("/api/collectors/routes/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao salvar rota."));
      }

      const savedRouteId = typeof data === "object" && data !== null && "id" in data && typeof data.id === "string"
        ? data.id
        : "salva";
      setSaveState({ status: "saved", routeId: savedRouteId });
    } catch (error) {
      setSaveState({
        status: "error",
        message: error instanceof Error ? error.message : "Erro ao salvar rota.",
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
      <Header centerText="Sugestão de Rota" />

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        <main className="flex flex-1 flex-col overflow-y-auto p-4 md:p-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
            {!isCollector ? (
              <section className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-amber-900">
                <h1 className="text-lg font-semibold">Acesso exclusivo para coletores</h1>
                <p className="mt-2 text-sm">Entre com um perfil de coletor para sugerir rotas.</p>
              </section>
            ) : (
              <>
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900">Criar sugestão de rota</h1>
                      <p className="mt-1 text-sm text-gray-600">
                        Escolha coletas em andamento e configure seus veículos.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => router.push("/routes/saved")}
                        className={`${button({ variant: "ghost" })} gap-2`}
                      >
                        <Save className="h-4 w-4" />
                        Rotas salvas
                      </button>
                      <button type="button" onClick={loadCandidates} className={button({ variant: "ghost" })}>
                        <RotateCcw className="h-4 w-4" />
                        Atualizar
                      </button>
                    </div>
                  </div>
                </section>

                <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                  <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-gray-900">Coletas em andamento</h2>
                      <span className="text-sm text-gray-500">
                        {form.selectedRequestIds.length} selecionada(s)
                      </span>
                    </div>

                    {candidatesError && (
                      <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        {candidatesError.message}
                      </div>
                    )}

                    {candidatesLoading ? (
                      <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buscando coletas...
                      </div>
                    ) : candidates.length === 0 && !candidatesError ? (
                      <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                        Nenhuma coleta em andamento encontrada.
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {candidates.map((collection) => (
                          <CandidateCard
                            key={collection.id}
                            collection={collection}
                            selected={form.selectedRequestIds.includes(collection.id)}
                            onToggle={toggleCandidate}
                          />
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Parâmetros da rota</h2>

                    <div className="mt-4 grid gap-4">
                      <label className="grid gap-1 text-sm text-gray-700">
                        Quantidade de veículos
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={form.vehicleCount}
                          onChange={(event) => updateForm("vehicleCount", event.target.value)}
                        />
                      </label>

                      <label className="grid gap-1 text-sm text-gray-700">
                        Capacidade por veículo
                        <Input
                          type="number"
                          min={0}
                          step="0.1"
                          value={form.vehicleCapacity}
                          onChange={(event) => updateForm("vehicleCapacity", event.target.value)}
                        />
                      </label>

                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Localização inicial</div>
                          <p className="mt-1 text-xs text-gray-600">
                            Escolha sua localização atual ou a localização cadastrada no perfil.
                          </p>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => selectStartLocation("current")}
                            className={`rounded-xl border p-3 text-left text-sm transition ${
                              form.startLocationSource === "current"
                                ? "border-cyco-green bg-white text-cyco-green"
                                : "border-gray-200 bg-white text-gray-700 hover:border-cyco-green/40"
                            }`}
                          >
                            <span className="font-semibold">Localização atual</span>
                            <span className="mt-1 block text-xs text-gray-500">
                              Usar GPS do dispositivo
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => selectStartLocation("registered")}
                            className={`rounded-xl border p-3 text-left text-sm transition ${
                              form.startLocationSource === "registered"
                                ? "border-cyco-green bg-white text-cyco-green"
                                : "border-gray-200 bg-white text-gray-700 hover:border-cyco-green/40"
                            }`}
                          >
                            <span className="font-semibold">Localização cadastrada</span>
                            <span className="mt-1 block text-xs text-gray-500">
                              Usar endereço salvo no perfil
                            </span>
                          </button>
                        </div>

                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-xs text-gray-600">
                            {form.latitude && form.longitude ? (
                              <div className="grid gap-1 sm:grid-cols-2">
                                <span>Latitude: {Number(form.latitude).toFixed(6)}</span>
                                <span>Longitude: {Number(form.longitude).toFixed(6)}</span>
                              </div>
                            ) : form.startLocationSource === "current" && locationState === "loading" ? (
                              "Solicitando localização do dispositivo..."
                            ) : form.startLocationSource === "registered" && registeredLocationState === "loading" ? (
                              "Buscando localização cadastrada..."
                            ) : (
                              "Localização ainda não disponível."
                            )}
                          </div>

                          {form.startLocationSource === "current" ? (
                            <button
                              type="button"
                              onClick={requestLocation}
                              disabled={locationState === "loading"}
                              className={button({ variant: "ghost" })}
                            >
                              {locationState === "loading" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MapPin className="h-4 w-4" />
                              )}
                              {locationState === "loading" ? "Obtendo..." : "Atualizar localização"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={loadRegisteredLocation}
                              disabled={registeredLocationState === "loading"}
                              className={button({ variant: "ghost" })}
                            >
                              {registeredLocationState === "loading" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MapPin className="h-4 w-4" />
                              )}
                              {registeredLocationState === "loading" ? "Buscando..." : "Atualizar cadastro"}
                            </button>
                          )}
                        </div>

                        {(locationError || locationState === "unsupported") && (
                          <div className={`mt-3 items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 ${
                            form.startLocationSource === "current" ? "flex" : "hidden"
                          }`}>
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {locationError}
                          </div>
                        )}

                        {registeredLocationError && (
                          <div className={`mt-3 items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 ${
                            form.startLocationSource === "registered" ? "flex" : "hidden"
                          }`}>
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {registeredLocationError}
                          </div>
                        )}
                      </div>

                      <label className="grid gap-1 text-sm text-gray-700">
                        Limite de tempo (segundos)
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={form.timeLimitSeconds}
                          onChange={(event) => updateForm("timeLimitSeconds", event.target.value)}
                        />
                      </label>

                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.allowDroppingStops}
                          onChange={(event) => updateForm("allowDroppingStops", event.target.checked)}
                          className="h-4 w-4 accent-cyco-green"
                        />
                        Permitir remover paradas inviáveis
                      </label>

                      {submitError && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          {submitError.message}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submitting || form.selectedRequestIds.length === 0}
                        className={`${button()} gap-2`}
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Route className="h-4 w-4" />
                        )}
                        {submitting ? "Calculando..." : "Sugerir rota"}
                      </button>
                    </div>
                  </section>
                </form>

                {result && <RouteResult result={result} saveState={saveState} onSave={handleSaveRoute} />}

                <section className="rounded-2xl bg-white p-5 text-sm text-gray-600 shadow-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-cyco-green" />
                    A rota usa a localização atual ou cadastrada como ponto inicial e considera apenas coletas em andamento.
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

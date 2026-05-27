"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Map,
  RotateCcw,
  Truck,
} from "lucide-react";

import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { button } from "@/app/components/ui";
import { isCollectorRole } from "@/app/lib/collectionsPage";
import { getSessionMeta } from "@/app/lib/createCollection";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrlFromRouteMap,
  extractRouteMapSummary,
  formatDistanceMeters,
  normalizeRouteMapResponse,
  normalizeSavedRoutes,
  RouteMapItem,
  RouteMapResponse,
  SavedRoute,
  selectRouteMapItem,
} from "@/app/lib/routes";

import RouteMapLeaflet from "./RouteMapLeaflet";

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "loaded"; response: RouteMapResponse; selectedMap: RouteMapItem }
  | { status: "empty"; message: string; response?: RouteMapResponse }
  | { status: "error"; message: string };

function getApiError(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }

  return fallback;
}

function formatDateTime(value?: string): string {
  if (!value) return "Não informado";

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

function formatDurationSeconds(value?: number): string {
  if (value === undefined) return "Indisponível";

  if (value < 60) {
    return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} s`;
  }

  return `${(value / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min`;
}

function vehicleIndexesFromRoute(route?: SavedRoute): number[] {
  const indexes = route?.suggestion?.routes
    .map((item) => item.vehicleIndex)
    .filter((item) => Number.isInteger(item) && item >= 0) ?? [];

  return Array.from(new Set(indexes)).sort((a, b) => a - b);
}

function selectedVehicleRouteFromRoute(route: SavedRoute | undefined, vehicleIndex: number) {
  return route?.suggestion?.routes.find((item) => item.vehicleIndex === vehicleIndex);
}

export default function SavedRouteMapPage() {
  const router = useRouter();
  const params = useParams<{ savedRouteId?: string }>();
  const savedRouteId = typeof params.savedRouteId === "string" ? params.savedRouteId : "";
  const { data: session, status } = useSession();
  const sessionMeta = getSessionMeta(session);
  const isCollector = isCollectorRole(sessionMeta.role);
  const [savedRoute, setSavedRoute] = useState<SavedRoute>();
  const [contextError, setContextError] = useState<string>();
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle" });

  const headers = useMemo((): Record<string, string> => (
    sessionMeta.token ? { authorization: `Bearer ${sessionMeta.token}` } : {}
  ), [sessionMeta.token]);

  const vehicleIndexes = useMemo(() => {
    const fromRoute = vehicleIndexesFromRoute(savedRoute);
    if (fromRoute.length > 0) return fromRoute;
    return [0];
  }, [savedRoute]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [router, status]);

  const loadSavedRouteContext = useCallback(async () => {
    if (!isCollector || !savedRouteId) return;

    setContextError(undefined);

    try {
      const res = await fetch("/api/collectors/routes/saved", { headers });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao buscar contexto da rota salva."));
      }

      const route = normalizeSavedRoutes(data).find((item) => item.id === savedRouteId);
      setSavedRoute(route);
      const indexes = vehicleIndexesFromRoute(route);
      setSelectedVehicleIndex((current) => indexes.includes(current) ? current : indexes[0] ?? 0);
    } catch (err) {
      setSavedRoute(undefined);
      setContextError(err instanceof Error ? err.message : "Erro ao buscar contexto da rota salva.");
    }
  }, [headers, isCollector, savedRouteId]);

  const loadRouteMap = useCallback(async () => {
    if (!isCollector || !savedRouteId) return;

    setLoadState({ status: "loading" });

    try {
      const searchParams = new URLSearchParams({ vehicleIndex: String(selectedVehicleIndex) });
      const res = await fetch(`/api/collectors/routes/saved/${savedRouteId}/map?${searchParams}`, { headers });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao buscar mapa da rota salva."));
      }

      const response = normalizeRouteMapResponse(data);
      if (!response) {
        setLoadState({ status: "empty", message: "Resposta do mapa inválida." });
        return;
      }

      const selectedMap = selectRouteMapItem(response, selectedVehicleIndex);
      if (!selectedMap?.geoJson) {
        setLoadState({
          status: "empty",
          message: "Nenhum mapa disponível para este veículo.",
          response,
        });
        return;
      }

      setLoadState({ status: "loaded", response, selectedMap });
    } catch (err) {
      setLoadState({
        status: "error",
        message: err instanceof Error ? err.message : "Erro ao buscar mapa da rota salva.",
      });
    }
  }, [headers, isCollector, savedRouteId, selectedVehicleIndex]);

  useEffect(() => {
    if (status !== "authenticated" || !isCollector) return;
    loadSavedRouteContext();
  }, [isCollector, loadSavedRouteContext, status]);

  useEffect(() => {
    if (status !== "authenticated" || !isCollector) return;
    loadRouteMap();
  }, [isCollector, loadRouteMap, status]);

  const selectedMap = loadState.status === "loaded" ? loadState.selectedMap : undefined;
  const response = loadState.status === "loaded" ? loadState.response : loadState.status === "empty" ? loadState.response : undefined;
  const summary = extractRouteMapSummary(selectedMap?.geoJson);
  const attribution = selectedMap?.geoJson?.metadata?.attribution;
  const selectedVehicleRoute = selectedVehicleRouteFromRoute(savedRoute, selectedVehicleIndex);
  const googleMapsUrl = buildGoogleMapsDirectionsUrl(selectedVehicleRoute) ??
    buildGoogleMapsDirectionsUrlFromRouteMap(selectedMap?.geoJson) ??
    "https://www.google.com/maps";

  function openGoogleMapsDirections() {
    window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
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
      <Header centerText="Mapa da Rota" />

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        <main className="flex flex-1 flex-col overflow-y-auto p-4 md:p-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
            {!isCollector ? (
              <section className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-amber-900">
                <h1 className="text-lg font-semibold">Acesso exclusivo para coletores</h1>
                <p className="mt-2 text-sm">Entre com um perfil de coletor para ver mapas de rotas salvas.</p>
              </section>
            ) : (
              <>
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <Link
                        href="/routes/saved"
                        className="inline-flex items-center gap-2 text-sm font-medium text-cyco-green hover:text-cyco-dark"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Rotas salvas
                      </Link>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-semibold text-gray-900">
                          Mapa da rota #{savedRouteId.slice(0, 8)}
                        </h1>
                        {savedRoute?.status && (
                          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                            {savedRoute.status}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 break-all text-xs text-gray-500">ID: {savedRouteId}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Truck className="h-4 w-4 text-cyco-green" />
                        <select
                          value={selectedVehicleIndex}
                          onChange={(event) => setSelectedVehicleIndex(Number(event.target.value))}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm"
                          aria-label="Selecionar veículo para visualizar no mapa"
                        >
                          {vehicleIndexes.map((vehicleIndex) => (
                            <option key={vehicleIndex} value={vehicleIndex}>
                              Veículo {vehicleIndex + 1}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={loadRouteMap}
                        className={`${button()} gap-2`}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Atualizar
                      </button>
                      <button
                        type="button"
                        onClick={openGoogleMapsDirections}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir no Google Maps
                      </button>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-gray-500">
                    O Google Maps usa as paradas do veículo selecionado quando disponíveis e recalcula o trajeto no próprio navegador.
                    Sem paradas suficientes, usamos o início e o fim da linha do mapa ou abrimos o Google Maps.
                  </p>
                </section>

                {contextError && (
                  <section className="flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {contextError}
                  </section>
                )}

                <section className="grid gap-4 lg:grid-cols-4">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="text-xs font-medium uppercase text-gray-400">Provedor</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{response?.provider ?? "Indisponível"}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="text-xs font-medium uppercase text-gray-400">Perfil</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{response?.profile ?? "Indisponível"}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="text-xs font-medium uppercase text-gray-400">Distância</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {summary.distance !== undefined ? formatDistanceMeters(summary.distance) : "Indisponível"}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="text-xs font-medium uppercase text-gray-400">Duração</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{formatDurationSeconds(summary.duration)}</div>
                  </div>
                </section>

                {selectedMap && (
                  <section className="grid gap-3 rounded-2xl bg-white p-4 text-sm text-gray-700 shadow-sm md:grid-cols-2 lg:grid-cols-4">
                    <span>Veículo: {selectedMap.vehicleIndex + 1}</span>
                    <span>Origem: {selectedMap.reused ? "Mapa reutilizado" : "Mapa gerado"}</span>
                    <span>Criado: {formatDateTime(selectedMap.createdAt)}</span>
                    <span>Atualizado: {formatDateTime(selectedMap.updatedAt)}</span>
                    {selectedMap.fingerprint && (
                      <span className="break-all md:col-span-2 lg:col-span-4">
                        Fingerprint: {selectedMap.fingerprint}
                      </span>
                    )}
                  </section>
                )}

                {loadState.status === "loading" && (
                  <section className="flex min-h-[420px] items-center justify-center rounded-2xl bg-white p-5 text-sm text-gray-600 shadow-sm">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando mapa da rota...
                  </section>
                )}

                {loadState.status === "error" && (
                  <section className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {loadState.message}
                  </section>
                )}

                {loadState.status === "empty" && (
                  <section className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600 shadow-sm">
                    <Map className="mb-3 h-8 w-8 text-gray-400" />
                    {loadState.message}
                  </section>
                )}

                {loadState.status === "loaded" && loadState.selectedMap.geoJson && (
                  <section className="grid gap-4">
                    <RouteMapLeaflet geoJson={loadState.selectedMap.geoJson} attribution={attribution} />
                    <div className="flex items-center gap-2 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-800">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Mapa carregado para o veículo {loadState.selectedMap.vehicleIndex + 1}.
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

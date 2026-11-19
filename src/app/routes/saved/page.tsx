"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Eye,
  GripVertical,
  Loader2,
  Map as MapIcon,
  MapPin,
  MoveRight,
  Play,
  RotateCcw,
  Route,
  Send,
  UserPlus,
  Truck,
  Trash2,
  X,
} from "lucide-react";

import { useMaterialNames } from "@/app/hooks/useMaterialNames";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import CollectionCompletionForm from "@/app/components/CollectionCompletionForm";
import { button } from "@/app/components/ui";
import {
  CollectionSummary,
  formatCollectionAddress,
  formatDate,
  formatWeight,
  isCollectorRole,
  normalizeCollections,
  statusLabel,
} from "@/app/lib/collectionsPage";
import { getSessionMeta, isDeliverymanRole, materialDisplayName } from "@/app/lib/createCollection";
import {
  buildAssignDeliverymanRequest,
  buildFailStopRequest,
  buildMoveSavedRouteRequest,
  getVehicleDisplayName,
  formatDistanceMeters,
  normalizeDeliveryAssignments,
  normalizeDeliverymen,
  normalizeSavedRoute,
  normalizeSavedRoutes,
  DeliverymanProfile,
  RouteAssignment,
  SavedRoute,
  SuggestedRouteStop,
} from "@/app/lib/routes";

type PageError = {
  message: string;
};

type DeleteRouteFeedback = {
  type: "success" | "error";
  message: string;
};

type MoveRouteFeedback = {
  type: "success" | "error";
  message: string;
};

type DeliveryFeedback = {
  type: "success" | "error";
  message: string;
};

type DraggedStop = {
  savedRouteId: string;
  collectionRequestId: string;
  sourceVehicleIndex: number;
};

type DropTarget = {
  savedRouteId: string;
  vehicleIndex: number;
};

type AssignmentPending = {
  savedRouteId: string;
  vehicleIndex: number;
};

type DeliveryPendingAction = {
  assignmentId: string;
  collectionRequestId?: string;
  action: "start" | "complete" | "fail" | "finish";
};

type CollectionModalState =
  | { status: "idle" }
  | { status: "loading"; collectionId: string }
  | { status: "ready"; collection: CollectionSummary }
  | { status: "error"; collectionId: string; message: string };

function getApiError(data: unknown, fallback: string): string {
  // The collections API returns some failures as plain text. Its proxy wraps
  // that text in a JSON string, so accept it here instead of hiding the cause.
  if (typeof data === "string" && data.trim()) return data.trim();

  if (typeof data === "object" && data !== null && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }

  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
  const streetLine = stop.street?.trim()
    ? `${stop.street.trim()}${stop.number?.trim() ? `, ${stop.number.trim()}` : ""}`
    : "";
  const locality = [stop.city?.trim(), stop.state?.trim(), stop.zipCode?.trim()]
    .filter(Boolean)
    .join(" - ");
  const address = [streetLine, locality].filter(Boolean).join(" • ");

  return address || `Endereço ${stop.addressId.slice(0, 8)}`;
}

function routeAssignmentLabel(status?: string): string {
  switch (status) {
    case "ASSIGNED":
      return "Atribuída";
    case "IN_PROGRESS":
      return "Em rota";
    case "COMPLETED":
      return "Concluída";
    case "PARTIALLY_COMPLETED":
      return "Parcial";
    case "FAILED":
      return "Falhou";
    case "CANCELLED":
      return "Cancelada";
    default:
      return status ?? "Sem atribuição";
  }
}

function getDeliverymanDisplayName(deliveryman: DeliverymanProfile | undefined, fallbackId?: string): string {
  return deliveryman?.name ?? deliveryman?.email ?? fallbackId ?? "Entregador";
}

function CollectionDetailsModal({
  state,
  materialNames,
  onClose,
}: {
  state: CollectionModalState;
  materialNames: ReadonlyMap<string, string>;
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

            <div className="rounded-xl border border-cyco-light bg-cyco-light/40 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Endereço da coleta</h3>
              <p className="mt-1 break-words text-sm text-gray-700">
                {formatCollectionAddress(state.collection)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Materiais</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {state.collection.materialIds.length > 0 ? (
                  state.collection.materialIds.map((material) => (
                    <span key={material} className="rounded-full bg-cyco-light px-2.5 py-1 text-xs text-cyco-green">
                      {materialDisplayName(material, materialNames)}
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
              {state.collection.addressId && <span>ID do endereço: {state.collection.addressId}</span>}
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
  deletePending,
  movePending,
  draggedStop,
  dropTarget,
  deliverymen,
  assignmentPending,
  onDelete,
  onAssignDeliveryman,
  onOpenCollection,
  onMoveRequest,
  onStopDragStart,
  onStopDragEnd,
  onVehicleDragOver,
  onVehicleDragLeave,
  onVehicleDrop,
}: {
  route: SavedRoute;
  deletePending: boolean;
  movePending: boolean;
  draggedStop?: DraggedStop;
  dropTarget?: DropTarget;
  deliverymen: DeliverymanProfile[];
  assignmentPending?: AssignmentPending;
  onDelete: (id: string) => void;
  onAssignDeliveryman: (savedRouteId: string, vehicleIndex: number, deliverymanId: string) => void;
  onOpenCollection: (id: string) => void;
  onMoveRequest: (
    savedRouteId: string,
    collectionRequestId: string,
    sourceVehicleIndex: number,
    targetVehicleIndex: number,
  ) => void;
  onStopDragStart: (stop: DraggedStop) => void;
  onStopDragEnd: () => void;
  onVehicleDragOver: (savedRouteId: string, vehicleIndex: number) => void;
  onVehicleDragLeave: (savedRouteId: string, vehicleIndex: number) => void;
  onVehicleDrop: (savedRouteId: string, vehicleIndex: number) => void;
}) {
  const isOpen = route.status === "OPEN";
  const routeCount = route.suggestion?.routes.length ?? 0;
  const stopCount = route.suggestion?.routes.reduce((sum, item) => sum + item.stops.length, 0) ?? 0;
  const totalLoad = route.suggestion?.routes.reduce((sum, item) => sum + item.totalLoad, 0) ?? 0;
  const vehicleIndexes = route.suggestion?.routes.map((item) => item.vehicleIndex) ?? [];
  const vehicleLabels = new Map(route.suggestion?.routes.map((item) => [
    item.vehicleIndex,
    getVehicleDisplayName(item),
  ]) ?? []);
  const deliverymenById = new Map(deliverymen.map((deliveryman) => [deliveryman.id, deliveryman]));
  const canMoveStops = isOpen && vehicleIndexes.length > 1 && !deletePending && !movePending;

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

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/routes/saved/${route.id}/map`}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-cyco-green bg-white px-4 py-2 text-sm font-semibold text-cyco-green shadow-sm hover:bg-cyco-green hover:text-white"
          >
            <MapIcon className="h-4 w-4" />
            Ver mapa
          </Link>
          <button
            type="button"
            onClick={() => onDelete(route.id)}
            disabled={deletePending || movePending}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-red-700 bg-white px-4 py-2 text-sm font-semibold text-red-800 shadow-sm hover:bg-red-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deletePending ? "Excluindo..." : "Excluir"}
          </button>
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
                {route.suggestion.routes.map((vehicleRoute) => {
                  const isActiveDropTarget = dropTarget?.savedRouteId === route.id &&
                    dropTarget.vehicleIndex === vehicleRoute.vehicleIndex &&
                    draggedStop?.savedRouteId === route.id &&
                    draggedStop.sourceVehicleIndex !== vehicleRoute.vehicleIndex;
                  const vehicleLabel = getVehicleDisplayName(vehicleRoute);
                  const assignment = route.assignments.find((item) => item.vehicleIndex === vehicleRoute.vehicleIndex);
                  const pendingAssignment = assignmentPending?.savedRouteId === route.id &&
                    assignmentPending.vehicleIndex === vehicleRoute.vehicleIndex;
                  const canAssign = isOpen && !assignment && deliverymen.length > 0 && !pendingAssignment;

                  return (
                  <details
                    key={vehicleRoute.vehicleIndex}
                    className={`group rounded-xl border bg-white p-4 transition ${
                      isActiveDropTarget
                        ? "border-cyco-green bg-cyco-light/60"
                        : "border-gray-200"
                    }`}
                    onDragOver={(event) => {
                      if (!canMoveStops || !draggedStop || draggedStop.savedRouteId !== route.id) return;
                      event.preventDefault();
                      onVehicleDragOver(route.id, vehicleRoute.vehicleIndex);
                    }}
                    onDragLeave={() => onVehicleDragLeave(route.id, vehicleRoute.vehicleIndex)}
                    onDrop={(event) => {
                      event.preventDefault();
                      onVehicleDrop(route.id, vehicleRoute.vehicleIndex);
                    }}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyco-light text-cyco-green">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">
                            {vehicleLabel}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                            <span>Veículo {vehicleRoute.vehicleIndex + 1}</span>
                            <span>{vehicleRoute.stops.length} parada(s)</span>
                            <span>{formatDistanceMeters(vehicleRoute.totalDistanceMeters)}</span>
                            <span>Carga {vehicleRoute.totalLoad.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronDown className="h-5 w-5 shrink-0 text-gray-400 transition group-open:rotate-180" />
                    </summary>

                    <div className="mt-4 grid gap-3">
                      {isActiveDropTarget && (
                        <div className="rounded-lg border border-dashed border-cyco-green bg-white/70 p-3 text-sm font-medium text-cyco-green">
                          Soltar em {vehicleLabel}
                        </div>
                      )}

                      <div className="grid gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 sm:grid-cols-3">
                        <span>Capacidade: {vehicleRoute.capacity.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
                        <span>Carga total: {vehicleRoute.totalLoad.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
                        <span>Distância: {formatDistanceMeters(vehicleRoute.totalDistanceMeters)}</span>
                      </div>

                      <div className="grid gap-3 rounded-lg border border-gray-100 bg-white p-3 md:grid-cols-[1fr_auto] md:items-center">
                        <div className="min-w-0 text-sm">
                          <div className="font-semibold text-gray-900">
                            {assignment
                              ? getDeliverymanDisplayName(deliverymenById.get(assignment.deliverymanId), assignment.deliverymanId)
                              : "Sem entregador"}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {assignment
                              ? `${routeAssignmentLabel(assignment.status)} • ${assignment.assignedCollectionRequestIds.length} parada(s)`
                              : "Veículo disponível para atribuição"}
                          </div>
                        </div>
                        <label className="flex min-w-0 items-center gap-2">
                          {pendingAssignment ? (
                            <Loader2 className="h-4 w-4 animate-spin text-cyco-green" />
                          ) : (
                            <UserPlus className="h-4 w-4 text-cyco-green" />
                          )}
                          <select
                            value=""
                            disabled={!canAssign}
                            onChange={(event) => {
                              const deliverymanId = event.target.value;
                              if (!deliverymanId) return;
                              onAssignDeliveryman(route.id, vehicleRoute.vehicleIndex, deliverymanId);
                            }}
                            className="min-w-0 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Atribuir entregador para ${vehicleLabel}`}
                          >
                            <option value="">
                              {assignment ? "Atribuído" : deliverymen.length > 0 ? "Atribuir..." : "Sem entregadores"}
                            </option>
                            {deliverymen.map((deliveryman) => (
                              <option key={deliveryman.id} value={deliveryman.id}>
                                {getDeliverymanDisplayName(deliveryman, deliveryman.id)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {vehicleRoute.stops.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-500">
                          Sem paradas para este veículo.
                        </div>
                      ) : (
                        vehicleRoute.stops.map((stop) => (
                          <div
                            key={`${vehicleRoute.vehicleIndex}-${stop.sequence}-${stop.collectionRequestId}`}
                            draggable={canMoveStops}
                            onDragStart={(event) => {
                              if (!canMoveStops) return;
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", stop.collectionRequestId);
                              onStopDragStart({
                                savedRouteId: route.id,
                                collectionRequestId: stop.collectionRequestId,
                                sourceVehicleIndex: vehicleRoute.vehicleIndex,
                              });
                            }}
                            onDragEnd={onStopDragEnd}
                            className={`rounded-lg border border-gray-100 p-3 transition ${
                              canMoveStops ? "cursor-grab active:cursor-grabbing" : ""
                            } ${
                              movePending ? "opacity-70" : ""
                            }`}
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                  {canMoveStops && <GripVertical className="h-4 w-4 text-gray-400" />}
                                  Parada {stop.sequence}
                                  {movePending && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyco-green" />}
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  Endereço: {formatStopAddress(stop)}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => onOpenCollection(stop.collectionRequestId)}
                                    className="inline-flex items-center gap-1 rounded-full bg-cyco-light px-2.5 py-1 text-xs font-medium text-cyco-green hover:bg-cyco-green hover:text-white"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Ver coleta
                                  </button>
                                  {canMoveStops && (
                                    <label className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">
                                      <MoveRight className="h-3.5 w-3.5" />
                                      <span className="sr-only">
                                        Mover coleta {stop.collectionRequestId} para outro veículo
                                      </span>
                                      <select
                                        value=""
                                        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                                          const targetVehicleIndex = Number(event.target.value);
                                          if (!Number.isInteger(targetVehicleIndex)) return;
                                          onMoveRequest(
                                            route.id,
                                            stop.collectionRequestId,
                                            vehicleRoute.vehicleIndex,
                                            targetVehicleIndex,
                                          );
                                        }}
                                        disabled={!canMoveStops}
                                        className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        aria-label={`Mover parada ${stop.sequence} para outro veículo`}
                                      >
                                        <option value="">Mover para...</option>
                                        {vehicleIndexes
                                          .filter((vehicleIndex) => vehicleIndex !== vehicleRoute.vehicleIndex)
                                          .map((vehicleIndex) => (
                                            <option key={vehicleIndex} value={vehicleIndex}>
                                              {vehicleLabels.get(vehicleIndex) ?? `Veículo ${vehicleIndex + 1}`}
                                            </option>
                                          ))}
                                      </select>
                                    </label>
                                  )}
                                </div>
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
                  );
                })}
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

function DeliveryAssignmentsPanel({
  assignments,
  pendingAction,
  failReasons,
  onFailReasonChange,
  onStart,
  onCompleteStop,
  onFailStop,
  onFinish,
}: {
  assignments: RouteAssignment[];
  pendingAction?: DeliveryPendingAction;
  failReasons: Record<string, string>;
  onFailReasonChange: (key: string, value: string) => void;
  onStart: (assignment: RouteAssignment) => void;
  onCompleteStop: (assignment: RouteAssignment, collectionRequestId: string, code: string, idempotencyKey: string) => Promise<Response>;
  onFailStop: (assignment: RouteAssignment, collectionRequestId: string) => void;
  onFinish: (assignment: RouteAssignment) => void;
}) {
  return (
    <div className="grid gap-4">
      {assignments.map((assignment) => {
        const canStart = assignment.status === "ASSIGNED";
        const canWorkStops = assignment.status === "IN_PROGRESS";
        const canFinish = assignment.status === "IN_PROGRESS" || assignment.status === "ASSIGNED";
        const isAssignmentPending = pendingAction?.assignmentId === assignment.id;
        const isStarting = isAssignmentPending && pendingAction?.action === "start";
        const isFinishing = isAssignmentPending && pendingAction?.action === "finish";

        return (
          <article key={assignment.id ?? `${assignment.savedRouteId}-${assignment.vehicleIndex}`} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Veículo {assignment.vehicleIndex + 1}
                  </h2>
                  <span className="rounded-full bg-cyco-light px-2.5 py-1 text-xs font-medium text-cyco-green">
                    {routeAssignmentLabel(assignment.status)}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-gray-500">Rota: {assignment.savedRouteId ?? "Nao informada"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canStart || isAssignmentPending}
                  onClick={() => onStart(assignment)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyco-green bg-white px-4 py-2 text-sm font-semibold text-cyco-green shadow-sm hover:bg-cyco-green hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isStarting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Iniciar
                </button>
                <button
                  type="button"
                  disabled={!canFinish || isAssignmentPending}
                  onClick={() => onFinish(assignment)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isFinishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Finalizar
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {assignment.assignedCollectionRequestIds.map((collectionRequestId) => {
                const isCompleted = assignment.completedCollectionRequestIds.includes(collectionRequestId);
                const reasonKey = `${assignment.id}:${collectionRequestId}`;
                const isStopPending = pendingAction?.assignmentId === assignment.id &&
                  pendingAction?.collectionRequestId === collectionRequestId;
                const isFailing = isStopPending && pendingAction?.action === "fail";

                return (
                  <div key={collectionRequestId} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900">
                          Coleta #{collectionRequestId.slice(0, 8)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {isCompleted ? "Concluída" : canWorkStops ? "Pendente" : "Aguardando início"}
                        </div>
                      </div>
                      {canWorkStops && !isCompleted && (
                        <CollectionCompletionForm
                          label="Código de confirmação"
                          onConfirm={(code, idempotencyKey) => onCompleteStop(assignment, collectionRequestId, code, idempotencyKey)}
                        />
                      )}
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                      <input
                        value={failReasons[reasonKey] ?? ""}
                        onChange={(event) => onFailReasonChange(reasonKey, event.target.value)}
                        disabled={!canWorkStops || isCompleted}
                        placeholder="Motivo da falha"
                        className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyco-green/40 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <button
                        type="button"
                        disabled={!canWorkStops || isCompleted || isStopPending}
                        onClick={() => onFailStop(assignment, collectionRequestId)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-700 bg-white px-3 py-2 text-xs font-semibold text-red-800 shadow-sm hover:bg-red-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isFailing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5" />
                        )}
                        Falhou
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function SavedRoutesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionMeta = getSessionMeta(session);
  const materialNames = useMaterialNames(sessionMeta.token);
  const isCollector = isCollectorRole(sessionMeta.role);
  const isDeliveryman = isDeliverymanRole(sessionMeta.role);
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [deliverymen, setDeliverymen] = useState<DeliverymanProfile[]>([]);
  const [deliveryAssignments, setDeliveryAssignments] = useState<RouteAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [deliverymenLoading, setDeliverymenLoading] = useState(false);
  const [error, setError] = useState<PageError>();
  const [deletePendingId, setDeletePendingId] = useState<string>();
  const [deleteFeedback, setDeleteFeedback] = useState<DeleteRouteFeedback>();
  const [movePending, setMovePending] = useState<DraggedStop>();
  const [moveFeedback, setMoveFeedback] = useState<MoveRouteFeedback>();
  const [assignmentPending, setAssignmentPending] = useState<AssignmentPending>();
  const [deliveryPendingAction, setDeliveryPendingAction] = useState<DeliveryPendingAction>();
  const [deliveryFeedback, setDeliveryFeedback] = useState<DeliveryFeedback>();
  const [failReasons, setFailReasons] = useState<Record<string, string>>({});
  const [draggedStop, setDraggedStop] = useState<DraggedStop>();
  const [dropTarget, setDropTarget] = useState<DropTarget>();
  const [collectionModal, setCollectionModal] = useState<CollectionModalState>({ status: "idle" });

  const headers = useMemo((): Record<string, string> => (
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
      const res = await fetch(
        `/api/collectors/routes/saved?collectorId=${encodeURIComponent(sessionMeta.generatorId ?? "")}`,
        { headers },
      );
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao buscar rotas salvas."));
      }

      // The collections API currently lists saved routes across collectors.
      // Keep this screen scoped to the authenticated collector so it cannot
      // offer assignments for routes owned by another collector.
      setRoutes(normalizeSavedRoutes(data).filter(
        (route) => route.collectorId === sessionMeta.generatorId,
      ));
    } catch (err) {
      setRoutes([]);
      setError({
        message: err instanceof Error ? err.message : "Erro ao buscar rotas salvas.",
      });
    } finally {
      setLoading(false);
    }
  }, [headers, isCollector, sessionMeta.generatorId]);

  const loadDeliverymen = useCallback(async () => {
    if (!isCollector || !sessionMeta.generatorId) {
      setDeliverymen([]);
      return;
    }

    setDeliverymenLoading(true);

    try {
      const res = await fetch(`/api/collectors/${sessionMeta.generatorId}/deliverymen`, { headers });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao buscar entregadores."));
      }

      setDeliverymen(normalizeDeliverymen(data));
    } catch {
      setDeliverymen([]);
    } finally {
      setDeliverymenLoading(false);
    }
  }, [headers, isCollector, sessionMeta.generatorId]);

  const loadDeliveryAssignments = useCallback(async () => {
    if (!isDeliveryman || !sessionMeta.generatorId) {
      setDeliveryAssignments([]);
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const res = await fetch(`/api/deliverymen/${sessionMeta.generatorId}/assignments`, { headers });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao buscar rotas atribuídas."));
      }

      setDeliveryAssignments(normalizeDeliveryAssignments(data));
    } catch (err) {
      setDeliveryAssignments([]);
      setError({
        message: err instanceof Error ? err.message : "Erro ao buscar rotas atribuídas.",
      });
    } finally {
      setLoading(false);
    }
  }, [headers, isDeliveryman, sessionMeta.generatorId]);

  useEffect(() => {
    if (status !== "authenticated" || !isCollector) return;
    loadSavedRoutes();
    loadDeliverymen();
  }, [isCollector, loadDeliverymen, loadSavedRoutes, status]);

  useEffect(() => {
    if (status !== "authenticated" || !isDeliveryman) return;
    loadDeliveryAssignments();
  }, [isDeliveryman, loadDeliveryAssignments, status]);

  async function deleteSavedRoute(savedRouteId: string) {
    setDeletePendingId(savedRouteId);
    setDeleteFeedback(undefined);
    setMoveFeedback(undefined);

    try {
      const res = await fetch(`/api/collectors/routes/saved/${savedRouteId}`, {
        method: "DELETE",
        headers,
      });
      const data = res.status === 204 ? null : await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao excluir rota salva."));
      }

      setRoutes((current) => current.filter((route) => route.id !== savedRouteId));
      setDeleteFeedback({
        type: "success",
        message: "Rota salva excluída com sucesso.",
      });
    } catch (err) {
      setDeleteFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao excluir rota salva.",
      });
    } finally {
      setDeletePendingId(undefined);
    }
  }

  async function moveSavedRouteRequest(
    savedRouteId: string,
    collectionRequestId: string,
    sourceVehicleIndex: number,
    targetVehicleIndex: number,
  ) {
    const result = buildMoveSavedRouteRequest(collectionRequestId, sourceVehicleIndex, targetVehicleIndex);

    setDraggedStop(undefined);
    setDropTarget(undefined);

    if (result.noop) return;

    if (!result.payload) {
      setMoveFeedback({
        type: "error",
        message: result.error ?? "Não foi possível mover a coleta.",
      });
      return;
    }

    setMovePending({
      savedRouteId,
      collectionRequestId: result.payload.collectionRequestId,
      sourceVehicleIndex: result.payload.sourceVehicleIndex,
    });
    setMoveFeedback(undefined);
    setDeleteFeedback(undefined);
    const previousRoute = routes.find((route) => route.id === savedRouteId);

    try {
      const res = await fetch(`/api/collectors/routes/saved/${savedRouteId}/move-request`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao mover coleta entre veículos."));
      }

      const updatedRouteInput = isRecord(data) && previousRoute
        ? {
          ...previousRoute,
          ...data,
          createdAt: data.createdAt ?? previousRoute.createdAt,
          closedAt: data.closedAt ?? previousRoute.closedAt,
        }
        : data;
      const updatedRoute = normalizeSavedRoute(updatedRouteInput)[0];
      if (!updatedRoute) {
        throw new Error("Resposta da rota atualizada inválida.");
      }

      setRoutes((current) => current.map((route) => (
        route.id === updatedRoute.id ? updatedRoute : route
      )));
      setMoveFeedback({
        type: "success",
        message: "Coleta movida entre veículos com sucesso.",
      });
    } catch (err) {
      setMoveFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao mover coleta entre veículos.",
      });
    } finally {
      setMovePending(undefined);
    }
  }

  async function assignDeliveryman(savedRouteId: string, vehicleIndex: number, deliverymanId: string) {
    const result = buildAssignDeliverymanRequest(sessionMeta.generatorId, deliverymanId, vehicleIndex);

    if (!result.payload) {
      setMoveFeedback({
        type: "error",
        message: result.error ?? "Não foi possível atribuir entregador.",
      });
      return;
    }

    setAssignmentPending({ savedRouteId, vehicleIndex });
    setMoveFeedback(undefined);
    setDeleteFeedback(undefined);

    try {
      const res = await fetch(`/api/collectors/${result.payload.collectorId}/routes/${savedRouteId}/assign`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao atribuir entregador."));
      }

      const [assignment] = normalizeDeliveryAssignments([data]);
      if (assignment) {
        setRoutes((current) => current.map((route) => (
          route.id !== savedRouteId
            ? route
            : {
              ...route,
              assignments: [
                ...route.assignments.filter((item) => item.vehicleIndex !== vehicleIndex),
                assignment,
              ],
            }
        )));
      } else {
        await loadSavedRoutes();
      }

      setMoveFeedback({
        type: "success",
        message: "Entregador atribuído ao veículo.",
      });
    } catch (err) {
      setMoveFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao atribuir entregador.",
      });
    } finally {
      setAssignmentPending(undefined);
    }
  }

  function replaceDeliveryAssignment(updated: RouteAssignment) {
    setDeliveryAssignments((current) => current.map((assignment) => (
      assignment.id === updated.id ? updated : assignment
    )));
  }

  async function runDeliveryAction(
    assignment: RouteAssignment,
    action: DeliveryPendingAction["action"],
    path: string,
    body?: unknown,
    collectionRequestId?: string,
  ) {
    if (!assignment.id || !sessionMeta.generatorId) {
      setDeliveryFeedback({ type: "error", message: "Rota do entregador inválida." });
      return;
    }

    setDeliveryPendingAction({ assignmentId: assignment.id, collectionRequestId, action });
    setDeliveryFeedback(undefined);

    try {
      const res = await fetch(path, {
        method: "POST",
        headers: {
          ...headers,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao atualizar rota."));
      }

      const [updated] = normalizeDeliveryAssignments([data]);
      if (updated) {
        replaceDeliveryAssignment(updated);
      } else {
        await loadDeliveryAssignments();
      }

      setDeliveryFeedback({ type: "success", message: "Rota atualizada." });
    } catch (err) {
      setDeliveryFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao atualizar rota.",
      });
    } finally {
      setDeliveryPendingAction(undefined);
    }
  }

  function startDeliveryAssignment(assignment: RouteAssignment) {
    if (!assignment.id || !sessionMeta.generatorId) return;
    runDeliveryAction(
      assignment,
      "start",
      `/api/deliverymen/${sessionMeta.generatorId}/assignments/${assignment.id}/start`,
    );
  }

  async function completeDeliveryStop(
    assignment: RouteAssignment,
    collectionRequestId: string,
    code: string,
    idempotencyKey: string,
  ): Promise<Response> {
    if (!assignment.id || !sessionMeta.generatorId) {
      return Response.json({ error: "Rota do entregador inválida." }, { status: 400 });
    }

    setDeliveryPendingAction({ assignmentId: assignment.id, collectionRequestId, action: "complete" });
    setDeliveryFeedback(undefined);

    try {
      const response = await fetch(`/api/deliverymen/${sessionMeta.generatorId}/assignments/${assignment.id}/stops/${collectionRequestId}/complete`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ code }),
      });

      if (response.status === 200) {
        const data = await response.clone().json().catch(() => null);
        const updatedAssignment = data?.assignment
          ? normalizeDeliveryAssignments([data.assignment])[0]
          : normalizeDeliveryAssignments([data])[0];
        if (updatedAssignment) {
          replaceDeliveryAssignment(updatedAssignment);
        } else {
          await loadDeliveryAssignments();
        }
        setDeliveryFeedback({ type: "success", message: "Coleta confirmada." });
      } else if (response.status === 202) {
        setDeliveryFeedback({ type: "success", message: "Confirmação aceita. A rota será atualizada após a reconciliação." });
      }

      return response;
    } catch {
      return Response.json({ error: "Erro ao confirmar coleta. Tente novamente." }, { status: 500 });
    } finally {
      setDeliveryPendingAction(undefined);
    }
  }

  function failDeliveryStop(assignment: RouteAssignment, collectionRequestId: string) {
    if (!assignment.id || !sessionMeta.generatorId) return;
    const reasonKey = `${assignment.id}:${collectionRequestId}`;
    const result = buildFailStopRequest(failReasons[reasonKey] ?? "");

    if (!result.payload) {
      setDeliveryFeedback({
        type: "error",
        message: result.error ?? "Não foi possível marcar falha.",
      });
      return;
    }

    runDeliveryAction(
      assignment,
      "fail",
      `/api/deliverymen/${sessionMeta.generatorId}/assignments/${assignment.id}/stops/${collectionRequestId}/fail`,
      result.payload,
      collectionRequestId,
    );
  }

  function finishDeliveryAssignment(assignment: RouteAssignment) {
    if (!assignment.id || !sessionMeta.generatorId) return;
    runDeliveryAction(
      assignment,
      "finish",
      `/api/deliverymen/${sessionMeta.generatorId}/assignments/${assignment.id}/finish`,
    );
  }

  function handleStopDragStart(stop: DraggedStop) {
    if (movePending || deletePendingId === stop.savedRouteId) return;
    setDraggedStop(stop);
  }

  function handleStopDragEnd() {
    setDraggedStop(undefined);
    setDropTarget(undefined);
  }

  function handleVehicleDragOver(savedRouteId: string, vehicleIndex: number) {
    if (!draggedStop || draggedStop.savedRouteId !== savedRouteId || draggedStop.sourceVehicleIndex === vehicleIndex) {
      setDropTarget(undefined);
      return;
    }

    setDropTarget({ savedRouteId, vehicleIndex });
  }

  function handleVehicleDragLeave(savedRouteId: string, vehicleIndex: number) {
    setDropTarget((current) => (
      current?.savedRouteId === savedRouteId && current.vehicleIndex === vehicleIndex
        ? undefined
        : current
    ));
  }

  function handleVehicleDrop(savedRouteId: string, vehicleIndex: number) {
    if (!draggedStop || draggedStop.savedRouteId !== savedRouteId) {
      setDropTarget(undefined);
      return;
    }

    moveSavedRouteRequest(
      savedRouteId,
      draggedStop.collectionRequestId,
      draggedStop.sourceVehicleIndex,
      vehicleIndex,
    );
  }

  async function openCollectionDetails(collectionId: string) {
    setCollectionModal({ status: "loading", collectionId });

    try {
      const res = await fetch(`/api/collections/${collectionId}`, { headers });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao buscar dados da coleta."));
      }

      const collection = normalizeCollections(data)[0];
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
            {!isCollector && !isDeliveryman ? (
              <section className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-amber-900">
                <h1 className="text-lg font-semibold">Acesso exclusivo para operação de rotas</h1>
                <p className="mt-2 text-sm">Entre como coletor ou entregador para ver rotas.</p>
              </section>
            ) : isDeliveryman ? (
              <>
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900">Minhas rotas</h1>
                      <p className="mt-1 text-sm text-gray-600">
                        Execute as paradas atribuídas ao seu veículo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={loadDeliveryAssignments}
                      className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-cyco-green bg-white px-4 py-2 text-cyco-green shadow hover:bg-cyco-light"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Atualizar
                    </button>
                  </div>
                </section>

                {error && (
                  <section className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error.message}
                  </section>
                )}

                {deliveryFeedback && (
                  <section
                    className={`flex items-start gap-2 rounded-2xl border p-5 text-sm ${
                      deliveryFeedback.type === "success"
                        ? "border-green-100 bg-green-50 text-green-700"
                        : "border-red-100 bg-red-50 text-red-700"
                    }`}
                  >
                    {deliveryFeedback.type === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    {deliveryFeedback.message}
                  </section>
                )}

                {loading ? (
                  <section className="flex items-center gap-2 rounded-2xl bg-white p-5 text-sm text-gray-600 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando rotas atribuídas...
                  </section>
                ) : deliveryAssignments.length === 0 && !error ? (
                  <section className="rounded-2xl bg-white p-5 text-sm text-gray-600 shadow-sm">
                    Nenhuma rota atribuída encontrada.
                  </section>
                ) : (
                  <DeliveryAssignmentsPanel
                    assignments={deliveryAssignments}
                    pendingAction={deliveryPendingAction}
                    failReasons={failReasons}
                    onFailReasonChange={(key, value) => setFailReasons((current) => ({ ...current, [key]: value }))}
                    onStart={startDeliveryAssignment}
                    onCompleteStop={completeDeliveryStop}
                    onFailStop={failDeliveryStop}
                    onFinish={finishDeliveryAssignment}
                  />
                )}
              </>
            ) : (
              <>
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900">Rotas salvas</h1>
                      <p className="mt-1 text-sm text-gray-600">
                        Acompanhe rotas planejadas e atribua veículos aos entregadores.
                      </p>
                      {deliverymenLoading && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Buscando entregadores...
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => router.push("/routes/suggest")}
                        className={`${button()} gap-2`}
                      >
                        <Route className="h-4 w-4" />
                        Sugerir rota
                      </button>
                      <button
                        type="button"
                        onClick={loadSavedRoutes}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyco-green bg-white px-4 py-2 text-cyco-green shadow hover:bg-cyco-light"
                      >
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

                {deleteFeedback && (
                  <section
                    className={`flex items-start gap-2 rounded-2xl border p-5 text-sm ${
                      deleteFeedback.type === "success"
                        ? "border-green-100 bg-green-50 text-green-700"
                        : "border-red-100 bg-red-50 text-red-700"
                    }`}
                  >
                    {deleteFeedback.type === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    {deleteFeedback.message}
                  </section>
                )}

                {moveFeedback && (
                  <section
                    className={`flex items-start gap-2 rounded-2xl border p-5 text-sm ${
                      moveFeedback.type === "success"
                        ? "border-green-100 bg-green-50 text-green-700"
                        : "border-red-100 bg-red-50 text-red-700"
                    }`}
                  >
                    {moveFeedback.type === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    {moveFeedback.message}
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
                        deletePending={deletePendingId === route.id}
                        movePending={movePending?.savedRouteId === route.id}
                        draggedStop={draggedStop}
                        dropTarget={dropTarget}
                        deliverymen={deliverymen}
                        assignmentPending={assignmentPending}
                        onDelete={deleteSavedRoute}
                        onAssignDeliveryman={assignDeliveryman}
                        onOpenCollection={openCollectionDetails}
                        onMoveRequest={moveSavedRouteRequest}
                        onStopDragStart={handleStopDragStart}
                        onStopDragEnd={handleStopDragEnd}
                        onVehicleDragOver={handleVehicleDragOver}
                        onVehicleDragLeave={handleVehicleDragLeave}
                        onVehicleDrop={handleVehicleDrop}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <CollectionDetailsModal materialNames={materialNames} state={collectionModal} onClose={() => setCollectionModal({ status: "idle" })} />
    </div>
  );
}

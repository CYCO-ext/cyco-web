export interface RouteSuggestionRequest {
  collectorId: string;
  vehicleCount: number;
  vehicleCapacity: number;
  start: {
    type: "COORDINATES";
    latitude: number;
    longitude: number;
  };
  candidateRequestIds: string[];
  options: {
    timeLimitSeconds: number;
    allowDroppingStops: boolean;
  };
}

export interface RouteSuggestionResponse {
  status: string;
  solver: {
    engine: string;
    elapsedMs: number;
    objectiveDistanceMeters: number;
    droppedStops: number;
  };
  routes: SuggestedRoute[];
  unassigned: string[];
}

export interface SuggestedRoute {
  vehicleIndex: number;
  capacity: number;
  totalLoad: number;
  totalDistanceMeters: number;
  stops: SuggestedRouteStop[];
}

export interface SuggestedRouteStop {
  sequence: number;
  collectionRequestId: string;
  addressId: string;
  street?: string;
  number?: string;
  latitude: number;
  longitude: number;
  demand: number;
  accumulatedLoad: number;
  distanceFromPreviousMeters: number;
}

export interface RouteSuggestionFormState {
  selectedRequestIds: string[];
  vehicleCount: string;
  vehicleCapacity: string;
  startLocationSource: "current" | "registered";
  latitude: string;
  longitude: string;
  timeLimitSeconds: string;
  allowDroppingStops: boolean;
}

export interface RouteStartCoordinates {
  latitude: number;
  longitude: number;
}

export interface SaveRouteRequest {
  collectorId: string;
  source: "ROUTE_SUGGESTION";
  suggestion: RouteSuggestionResponse;
}

export interface SavedRoute {
  id: string;
  collectorId: string;
  status: string;
  fingerprint?: string;
  assignedCollectionRequestIds: string[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  suggestion?: RouteSuggestionResponse;
}

export type SaveRouteState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; routeId: string }
  | { status: "error"; message: string };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberFrom(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function createInitialRouteSuggestionFormState(): RouteSuggestionFormState {
  return {
    selectedRequestIds: [],
    vehicleCount: "2",
    vehicleCapacity: "100",
    startLocationSource: "current",
    latitude: "",
    longitude: "",
    timeLimitSeconds: "5",
    allowDroppingStops: true,
  };
}

export function buildRouteSuggestionRequest(
  state: RouteSuggestionFormState,
  collectorId?: string,
): { payload?: RouteSuggestionRequest; error?: string } {
  if (!collectorId) {
    return { error: "Não foi possível identificar o coletor autenticado." };
  }

  if (state.selectedRequestIds.length === 0) {
    return { error: "Selecione pelo menos uma coleta em andamento." };
  }

  const vehicleCount = numberFrom(state.vehicleCount);
  if (!vehicleCount || !Number.isInteger(vehicleCount) || vehicleCount < 1) {
    return { error: "Informe uma quantidade de veículos maior ou igual a 1." };
  }

  const vehicleCapacity = numberFrom(state.vehicleCapacity);
  if (!vehicleCapacity || vehicleCapacity <= 0) {
    return { error: "Informe uma capacidade maior que zero." };
  }

  const latitude = numberFrom(state.latitude);
  if (latitude === undefined || latitude < -90 || latitude > 90) {
    return { error: "Informe uma latitude válida entre -90 e 90." };
  }

  const longitude = numberFrom(state.longitude);
  if (longitude === undefined || longitude < -180 || longitude > 180) {
    return { error: "Informe uma longitude válida entre -180 e 180." };
  }

  const timeLimitSeconds = numberFrom(state.timeLimitSeconds);
  if (!timeLimitSeconds || timeLimitSeconds <= 0) {
    return { error: "Informe um limite de tempo maior que zero." };
  }

  return {
    payload: {
      collectorId,
      vehicleCount,
      vehicleCapacity,
      start: {
        type: "COORDINATES",
        latitude,
        longitude,
      },
      candidateRequestIds: state.selectedRequestIds,
      options: {
        timeLimitSeconds,
        allowDroppingStops: state.allowDroppingStops,
      },
    },
  };
}

export function normalizeRouteSuggestionResponse(response: unknown): RouteSuggestionResponse | undefined {
  if (!isRecord(response)) return undefined;

  const solver = isRecord(response.solver) ? response.solver : {};
  const routes = Array.isArray(response.routes) ? response.routes : [];
  const unassigned = Array.isArray(response.unassigned) ? response.unassigned : [];

  return {
    status: stringFrom(response.status) ?? "UNKNOWN",
    solver: {
      engine: stringFrom(solver.engine) ?? "UNKNOWN",
      elapsedMs: numberFrom(solver.elapsedMs) ?? 0,
      objectiveDistanceMeters: numberFrom(solver.objectiveDistanceMeters) ?? 0,
      droppedStops: numberFrom(solver.droppedStops) ?? 0,
    },
    routes: routes.flatMap(normalizeRoute),
    unassigned: unassigned.flatMap((item) => stringFrom(item) ? [stringFrom(item)!] : []),
  };
}

export function buildSaveRouteRequest(
  collectorId: string | undefined,
  suggestion: RouteSuggestionResponse | undefined,
): { payload?: SaveRouteRequest; error?: string } {
  if (!collectorId) {
    return { error: "Não foi possível identificar o coletor autenticado." };
  }

  if (!suggestion) {
    return { error: "Gere uma sugestão de rota antes de salvar." };
  }

  return {
    payload: {
      collectorId,
      source: "ROUTE_SUGGESTION",
      suggestion,
    },
  };
}

export function normalizeSavedRoutes(response: unknown): SavedRoute[] {
  if (!Array.isArray(response)) return [];

  return response.flatMap(normalizeSavedRoute);
}

export function normalizeSavedRoute(response: unknown): SavedRoute[] {
  if (!isRecord(response)) return [];

  const id = stringFrom(response.id);
  const collectorId = stringFrom(response.collectorId);
  const status = stringFrom(response.status);
  const createdAt = stringFrom(response.createdAt);
  const updatedAt = stringFrom(response.updatedAt);
  const assignedCollectionRequestIds = Array.isArray(response.assignedCollectionRequestIds)
    ? response.assignedCollectionRequestIds.flatMap((item) => stringFrom(item) ? [stringFrom(item)!] : [])
    : [];

  if (!id || !collectorId || !status || !createdAt || !updatedAt) {
    return [];
  }

  return [{
    id,
    collectorId,
    status,
    fingerprint: stringFrom(response.fingerprint),
    assignedCollectionRequestIds,
    createdAt,
    updatedAt,
    closedAt: stringFrom(response.closedAt) ?? null,
    suggestion: normalizeRouteSuggestionResponse(response.suggestion),
  }];
}

export function isSaveRouteRequest(value: unknown): value is SaveRouteRequest {
  if (!isRecord(value)) return false;

  return Boolean(
    stringFrom(value.collectorId) &&
    value.source === "ROUTE_SUGGESTION" &&
    normalizeRouteSuggestionResponse(value.suggestion),
  );
}

export function extractRegisteredStartCoordinates(profile: unknown): RouteStartCoordinates | undefined {
  const data = isRecord(profile) && "data" in profile ? profile.data : profile;
  const candidates = Array.isArray(data) ? data : [data];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;

    const coordinates = extractCoordinatesFromAddressLikeRecord(candidate);
    if (coordinates) return coordinates;
  }

  return undefined;
}

function extractCoordinatesFromAddressLikeRecord(data: UnknownRecord): RouteStartCoordinates | undefined {
  const rootCoordinates = coordinatesFromRecord(data);
  if (rootCoordinates) return rootCoordinates;

  if (isRecord(data.location)) {
    const locationCoordinates = coordinatesFromRecord(data.location);
    if (locationCoordinates) return locationCoordinates;
  }

  const addressCandidates = Array.isArray(data.address) ? data.address : [data.address];

  for (const address of addressCandidates) {
    if (!isRecord(address)) continue;

    const addressCoordinates = coordinatesFromRecord(address);
    if (addressCoordinates) return addressCoordinates;

    if (isRecord(address.location)) {
      const addressLocationCoordinates = coordinatesFromRecord(address.location);
      if (addressLocationCoordinates) return addressLocationCoordinates;
    }
  }

  return undefined;
}

function coordinatesFromRecord(value: UnknownRecord): RouteStartCoordinates | undefined {
  const latitude = numberFrom(value.latitude) ?? numberFrom(value.lat);
  const longitude = numberFrom(value.longitude) ?? numberFrom(value.lng) ?? numberFrom(value.lon);

  if (
    latitude === undefined ||
    longitude === undefined ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return undefined;
  }

  return { latitude, longitude };
}

function normalizeRoute(value: unknown): SuggestedRoute[] {
  if (!isRecord(value)) return [];

  const vehicleIndex = numberFrom(value.vehicleIndex);
  const capacity = numberFrom(value.capacity);
  const totalLoad = numberFrom(value.totalLoad);
  const totalDistanceMeters = numberFrom(value.totalDistanceMeters);
  const stops = Array.isArray(value.stops) ? value.stops : [];

  if (
    vehicleIndex === undefined ||
    capacity === undefined ||
    totalLoad === undefined ||
    totalDistanceMeters === undefined
  ) {
    return [];
  }

  return [{
    vehicleIndex,
    capacity,
    totalLoad,
    totalDistanceMeters,
    stops: stops.flatMap(normalizeStop),
  }];
}

function normalizeStop(value: unknown): SuggestedRouteStop[] {
  if (!isRecord(value)) return [];

  const sequence = numberFrom(value.sequence);
  const collectionRequestId = stringFrom(value.collectionRequestId);
  const addressId = stringFrom(value.addressId);
  const address = isRecord(value.address) ? value.address : undefined;
  const latitude = numberFrom(value.latitude);
  const longitude = numberFrom(value.longitude);
  const demand = numberFrom(value.demand);
  const accumulatedLoad = numberFrom(value.accumulatedLoad);
  const distanceFromPreviousMeters = numberFrom(value.distanceFromPreviousMeters);

  if (
    sequence === undefined ||
    !collectionRequestId ||
    !addressId ||
    latitude === undefined ||
    longitude === undefined ||
    demand === undefined ||
    accumulatedLoad === undefined ||
    distanceFromPreviousMeters === undefined
  ) {
    return [];
  }

  return [{
    sequence,
    collectionRequestId,
    addressId,
    street: stringFrom(value.street) ?? stringFrom(value.street) ?? stringFrom(address?.street),
    number: stringFrom(value.number) ?? stringFrom(value.number) ?? stringFrom(address?.number),
    latitude,
    longitude,
    demand,
    accumulatedLoad,
    distanceFromPreviousMeters,
  }];
}

export function isRouteSuggestionRequest(value: unknown): value is RouteSuggestionRequest {
  if (!isRecord(value) || !isRecord(value.start) || !isRecord(value.options)) return false;

  return Boolean(
    stringFrom(value.collectorId) &&
    numberFrom(value.vehicleCount) &&
    numberFrom(value.vehicleCapacity) &&
    value.start.type === "COORDINATES" &&
    numberFrom(value.start.latitude) !== undefined &&
    numberFrom(value.start.longitude) !== undefined &&
    Array.isArray(value.candidateRequestIds) &&
    value.candidateRequestIds.length > 0 &&
    numberFrom(value.options.timeLimitSeconds) &&
    typeof value.options.allowDroppingStops === "boolean",
  );
}

export function formatDistanceMeters(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km`;
  }

  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} m`;
}

export function formatRouteLoad(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

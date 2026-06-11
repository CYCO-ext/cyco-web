export interface RouteSuggestionRequest {
  collectorId: string;
  vehicles: Array<{
    name: string;
    capacity: number;
  }>;
  start: {
    type: "COORDINATES";
    addressId: string | null;
    latitude: number;
    longitude: number;
  };
  endAtStart: boolean;
  candidateRequestIds: string[];
  filters: {
    materialIds: string[];
    maxDistanceKmFromStart: number;
    onlyInProgress: boolean;
  };
  options: {
    timeLimitSeconds: number;
    allowDroppingStops: boolean;
    dropPenalty: number;
    distanceUnit: "METERS" | "KILOMETERS";
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
  vehicleName?: string;
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
  vehicleNames: string[];
  vehicleCapacities: string[];
  startLocationSource: "current" | "registered";
  latitude: string;
  longitude: string;
  endAtStart: boolean;
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

export interface MoveSavedRouteRequestPayload {
  collectionRequestId: string;
  sourceVehicleIndex: number;
  targetVehicleIndex: number;
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

export interface RouteMapResponse {
  savedRouteId: string;
  provider: string;
  profile: string;
  maps: RouteMapItem[];
}

export interface RouteMapItem {
  vehicleIndex: number;
  fingerprint?: string;
  reused?: boolean;
  geoJson?: RouteMapGeoJson;
  createdAt?: string;
  updatedAt?: string;
}

export interface RouteMapGeoJson {
  type: "FeatureCollection";
  bbox?: RouteMapBbox;
  features: RouteMapFeature[];
  metadata?: {
    attribution?: string;
    service?: string;
    timestamp?: number;
  };
}

export type RouteMapBbox = [number, number, number, number];
export type RouteMapCoordinate = [number, number];

export interface RouteMapFeature {
  type: "Feature";
  bbox?: RouteMapBbox;
  properties?: {
    segments?: RouteMapSegment[];
    summary?: {
      distance?: number;
      duration?: number;
    };
    way_points?: [number, number];
  };
  geometry?: {
    type: string;
    coordinates?: RouteMapCoordinate[];
  };
}

export interface RouteMapSegment {
  distance?: number;
  duration?: number;
  steps?: Array<{
    distance?: number;
    duration?: number;
    instruction?: string;
    name?: string;
    way_points?: [number, number];
  }>;
}

export interface RouteMapSummary {
  distance?: number;
  duration?: number;
}

export interface RouteMapGeometry {
  coordinates: RouteMapCoordinate[];
  bbox?: RouteMapBbox;
  start?: RouteMapCoordinate;
  end?: RouteMapCoordinate;
}

export type SaveRouteState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; routeId: string }
  | { status: "error"; message: string };

type UnknownRecord = Record<string, unknown>;

const DEFAULT_MAX_DISTANCE_KM_FROM_START = 50;
const DEFAULT_TIME_LIMIT_SECONDS = 5;
const DEFAULT_DROP_PENALTY = 100000;
const DEFAULT_DISTANCE_UNIT: RouteSuggestionRequest["options"]["distanceUnit"] = "METERS";
const GOOGLE_MAPS_DIRECTIONS_URL = "https://www.google.com/maps/dir/";
const GOOGLE_MAPS_URL_MAX_LENGTH = 2048;
const MAX_VEHICLE_NAME_LENGTH = 60;

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

export function defaultVehicleName(index: number): string {
  return `Veículo ${index + 1}`;
}

export function normalizeVehicleName(value: string): string {
  return value.trim();
}

export function getVehicleDisplayName(route: SuggestedRoute): string {
  return route.vehicleName ?? defaultVehicleName(route.vehicleIndex);
}

export function createInitialRouteSuggestionFormState(): RouteSuggestionFormState {
  return {
    selectedRequestIds: [],
    vehicleCount: "2",
    vehicleNames: [defaultVehicleName(0), defaultVehicleName(1)],
    vehicleCapacities: ["100", "80"],
    startLocationSource: "current",
    latitude: "",
    longitude: "",
    endAtStart: true,
    allowDroppingStops: true,
  };
}

export function buildRouteSuggestionRequest(
  state: RouteSuggestionFormState,
  collectorId?: string,
  materialIds: string[] = [],
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

  const vehicleNames = Array.from({ length: vehicleCount }, (_, index) => (
    normalizeVehicleName(state.vehicleNames[index] ?? "")
  ));
  const blankNameIndex = vehicleNames.findIndex((name) => !name);
  if (blankNameIndex >= 0) {
    return { error: `Informe um nome para o veículo ${blankNameIndex + 1}.` };
  }

  const longNameIndex = vehicleNames.findIndex((name) => name.length > MAX_VEHICLE_NAME_LENGTH);
  if (longNameIndex >= 0) {
    return {
      error: `Informe um nome com até ${MAX_VEHICLE_NAME_LENGTH} caracteres para o veículo ${longNameIndex + 1}.`,
    };
  }

  const normalizedNameKeys = vehicleNames.map((name) => name.toLocaleLowerCase("pt-BR"));
  const duplicateNameIndex = normalizedNameKeys.findIndex((name, index) => normalizedNameKeys.indexOf(name) !== index);
  if (duplicateNameIndex >= 0) {
    return { error: `O nome "${vehicleNames[duplicateNameIndex]}" já está sendo usado em outro veículo.` };
  }

  const vehicleCapacities = Array.from({ length: vehicleCount }, (_, index) => (
    numberFrom(state.vehicleCapacities[index])
  ));
  const invalidCapacityIndex = vehicleCapacities.findIndex((capacity) => !capacity || capacity <= 0);
  if (invalidCapacityIndex >= 0) {
    return { error: `Informe uma capacidade maior que zero para o veículo ${invalidCapacityIndex + 1}.` };
  }

  const latitude = numberFrom(state.latitude);
  if (latitude === undefined || latitude < -90 || latitude > 90) {
    return { error: "Informe uma latitude válida entre -90 e 90." };
  }

  const longitude = numberFrom(state.longitude);
  if (longitude === undefined || longitude < -180 || longitude > 180) {
    return { error: "Informe uma longitude válida entre -180 e 180." };
  }

  return {
    payload: {
      collectorId,
      vehicles: vehicleCapacities.map((capacity, index) => ({
        name: vehicleNames[index],
        capacity: capacity!,
      })),
      start: {
        type: "COORDINATES",
        addressId: null,
        latitude,
        longitude,
      },
      endAtStart: state.endAtStart,
      candidateRequestIds: state.selectedRequestIds,
      filters: {
        materialIds,
        maxDistanceKmFromStart: DEFAULT_MAX_DISTANCE_KM_FROM_START,
        onlyInProgress: true,
      },
      options: {
        timeLimitSeconds: DEFAULT_TIME_LIMIT_SECONDS,
        allowDroppingStops: state.allowDroppingStops,
        dropPenalty: DEFAULT_DROP_PENALTY,
        distanceUnit: DEFAULT_DISTANCE_UNIT,
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

export function buildMoveSavedRouteRequest(
  collectionRequestId: string,
  sourceVehicleIndex: number,
  targetVehicleIndex: number,
): { payload?: MoveSavedRouteRequestPayload; error?: string; noop?: boolean } {
  const requestId = collectionRequestId.trim();

  if (!requestId) {
    return { error: "Não foi possível identificar a coleta selecionada." };
  }

  if (!Number.isInteger(sourceVehicleIndex) || sourceVehicleIndex < 0) {
    return { error: "Veículo de origem inválido." };
  }

  if (!Number.isInteger(targetVehicleIndex) || targetVehicleIndex < 0) {
    return { error: "Veículo de destino inválido." };
  }

  if (sourceVehicleIndex === targetVehicleIndex) {
    return { noop: true };
  }

  return {
    payload: {
      collectionRequestId: requestId,
      sourceVehicleIndex,
      targetVehicleIndex,
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

export function normalizeRouteMapResponse(response: unknown): RouteMapResponse | undefined {
  if (!isRecord(response)) return undefined;

  const savedRouteId = stringFrom(response.savedRouteId);
  const provider = stringFrom(response.provider) ?? "UNKNOWN";
  const profile = stringFrom(response.profile) ?? "UNKNOWN";
  const maps = Array.isArray(response.maps) ? response.maps.flatMap(normalizeRouteMapItem) : [];

  if (!savedRouteId) return undefined;

  return {
    savedRouteId,
    provider,
    profile,
    maps,
  };
}

export function selectRouteMapItem(
  response: RouteMapResponse | undefined,
  vehicleIndex: number,
): RouteMapItem | undefined {
  if (!response?.maps.length) return undefined;

  const matchingMap = response.maps.find((item) => item.vehicleIndex === vehicleIndex && item.geoJson);
  if (matchingMap) return matchingMap;

  return response.maps.find((item) => item.geoJson) ?? response.maps[0];
}

export function extractRouteMapSummary(geoJson: RouteMapGeoJson | undefined): RouteMapSummary {
  if (!geoJson) return {};

  for (const feature of geoJson.features) {
    const summary = feature.properties?.summary;
    if (summary?.distance !== undefined || summary?.duration !== undefined) {
      return {
        distance: summary.distance,
        duration: summary.duration,
      };
    }

    const segment = feature.properties?.segments?.find((item) => (
      item.distance !== undefined || item.duration !== undefined
    ));
    if (segment) {
      return {
        distance: segment.distance,
        duration: segment.duration,
      };
    }
  }

  return {};
}

export function isValidRouteMapBbox(value: unknown): value is RouteMapBbox {
  if (!Array.isArray(value) || value.length !== 4) return false;

  const [west, south, east, north] = value;
  return [west, south, east, north].every((item) => typeof item === "number" && Number.isFinite(item)) &&
    west <= east &&
    south <= north &&
    south >= -90 &&
    north <= 90 &&
    west >= -180 &&
    east <= 180;
}

export function extractRouteMapGeometry(geoJson: RouteMapGeoJson | undefined): RouteMapGeometry | undefined {
  if (!geoJson) return undefined;

  const coordinates = geoJson.features.flatMap((feature) => {
    if (feature.geometry?.type !== "LineString" || !Array.isArray(feature.geometry.coordinates)) {
      return [];
    }

    return feature.geometry.coordinates.filter(isValidRouteMapCoordinate);
  });

  if (coordinates.length === 0) return undefined;

  return {
    coordinates,
    bbox: isValidRouteMapBbox(geoJson.bbox) ? geoJson.bbox : computeRouteMapBbox(coordinates),
    start: coordinates[0],
    end: coordinates[coordinates.length - 1],
  };
}

export function buildGoogleMapsDirectionsUrl(route: SuggestedRoute | undefined): string | undefined {
  const stops = route?.stops
    .filter((stop) => isValidLatitudeLongitude(stop.latitude, stop.longitude))
    .sort((left, right) => left.sequence - right.sequence) ?? [];

  if (stops.length < 2) return undefined;

  const origin = formatGoogleMapsCoordinate(stops[0]);
  const destination = formatGoogleMapsCoordinate(stops[stops.length - 1]);
  const waypoints = stops.slice(1, -1).map(formatGoogleMapsCoordinate);

  return buildGoogleMapsUrlWithinLimit(origin, destination, waypoints);
}

export function buildGoogleMapsDirectionsUrlFromRouteMap(geoJson: RouteMapGeoJson | undefined): string | undefined {
  const geometry = extractRouteMapGeometry(geoJson);
  if (!geometry?.start || !geometry.end) return undefined;

  return buildGoogleMapsUrlWithinLimit(
    formatGoogleMapsLngLatCoordinate(geometry.start),
    formatGoogleMapsLngLatCoordinate(geometry.end),
    [],
  );
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

function normalizeRouteMapItem(value: unknown): RouteMapItem[] {
  if (!isRecord(value)) return [];

  const vehicleIndex = numberFrom(value.vehicleIndex);
  if (vehicleIndex === undefined || !Number.isInteger(vehicleIndex) || vehicleIndex < 0) return [];

  return [{
    vehicleIndex,
    fingerprint: stringFrom(value.fingerprint),
    reused: typeof value.reused === "boolean" ? value.reused : undefined,
    geoJson: normalizeRouteMapGeoJson(value.geoJson),
    createdAt: stringFrom(value.createdAt),
    updatedAt: stringFrom(value.updatedAt),
  }];
}

function normalizeRouteMapGeoJson(value: unknown): RouteMapGeoJson | undefined {
  if (!isRecord(value) || value.type !== "FeatureCollection") return undefined;

  const features = Array.isArray(value.features) ? value.features.flatMap(normalizeRouteMapFeature) : [];
  const metadata = isRecord(value.metadata) ? value.metadata : undefined;

  return {
    type: "FeatureCollection",
    bbox: isValidRouteMapBbox(value.bbox) ? value.bbox : undefined,
    features,
    metadata: metadata ? {
      attribution: stringFrom(metadata.attribution),
      service: stringFrom(metadata.service),
      timestamp: numberFrom(metadata.timestamp),
    } : undefined,
  };
}

function normalizeRouteMapFeature(value: unknown): RouteMapFeature[] {
  if (!isRecord(value) || value.type !== "Feature") return [];

  const geometry = isRecord(value.geometry) ? value.geometry : undefined;
  const properties = isRecord(value.properties) ? value.properties : undefined;
  const summary = isRecord(properties?.summary) ? properties.summary : undefined;
  const segments = Array.isArray(properties?.segments)
    ? properties.segments.flatMap(normalizeRouteMapSegment)
    : undefined;
  const coordinates = Array.isArray(geometry?.coordinates)
    ? geometry.coordinates.filter(isValidRouteMapCoordinate)
    : undefined;

  return [{
    type: "Feature",
    bbox: isValidRouteMapBbox(value.bbox) ? value.bbox : undefined,
    properties: properties ? {
      segments,
      summary: summary ? {
        distance: numberFrom(summary.distance),
        duration: numberFrom(summary.duration),
      } : undefined,
      way_points: isNumberPair(properties.way_points) ? properties.way_points : undefined,
    } : undefined,
    geometry: geometry ? {
      type: stringFrom(geometry.type) ?? "Unknown",
      coordinates,
    } : undefined,
  }];
}

function normalizeRouteMapSegment(value: unknown): RouteMapSegment[] {
  if (!isRecord(value)) return [];

  const steps = Array.isArray(value.steps)
    ? value.steps.flatMap((step) => {
      if (!isRecord(step)) return [];
      return [{
        distance: numberFrom(step.distance),
        duration: numberFrom(step.duration),
        instruction: stringFrom(step.instruction),
        name: stringFrom(step.name),
        way_points: isNumberPair(step.way_points) ? step.way_points : undefined,
      }];
    })
    : undefined;

  return [{
    distance: numberFrom(value.distance),
    duration: numberFrom(value.duration),
    steps,
  }];
}

function isNumberPair(value: unknown): value is [number, number] {
  return Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item));
}

function isValidRouteMapCoordinate(value: unknown): value is RouteMapCoordinate {
  if (!isNumberPair(value)) return false;

  const [longitude, latitude] = value;
  return longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
}

function computeRouteMapBbox(coordinates: RouteMapCoordinate[]): RouteMapBbox {
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

function isValidLatitudeLongitude(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
}

function formatGoogleMapsCoordinate(stop: SuggestedRouteStop): string {
  return `${stop.latitude},${stop.longitude}`;
}

function formatGoogleMapsLngLatCoordinate(coordinate: RouteMapCoordinate): string {
  const [longitude, latitude] = coordinate;
  return `${latitude},${longitude}`;
}

function buildGoogleMapsUrlWithinLimit(
  origin: string,
  destination: string,
  waypoints: string[],
): string {
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  });

  const urlWithoutWaypoints = `${GOOGLE_MAPS_DIRECTIONS_URL}?${params.toString()}`;
  if (waypoints.length === 0) return urlWithoutWaypoints;

  const includedWaypoints: string[] = [];

  for (const waypoint of waypoints) {
    const candidateWaypoints = [...includedWaypoints, waypoint];
    params.set("waypoints", candidateWaypoints.join("|"));

    const candidateUrl = `${GOOGLE_MAPS_DIRECTIONS_URL}?${params.toString()}`;
    if (candidateUrl.length > GOOGLE_MAPS_URL_MAX_LENGTH) break;

    includedWaypoints.push(waypoint);
  }

  if (includedWaypoints.length > 0) {
    params.set("waypoints", includedWaypoints.join("|"));
  } else {
    params.delete("waypoints");
  }

  return `${GOOGLE_MAPS_DIRECTIONS_URL}?${params.toString()}`;
}

function normalizeRoute(value: unknown): SuggestedRoute[] {
  if (!isRecord(value)) return [];

  const vehicleIndex = numberFrom(value.vehicleIndex);
  const vehicleName = stringFrom(value.vehicleName) ?? stringFrom(value.name);
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
    vehicleName,
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
  if (
    !isRecord(value) ||
    !isRecord(value.start) ||
    !isRecord(value.filters) ||
    !isRecord(value.options) ||
    !Array.isArray(value.vehicles)
  ) return false;

  return Boolean(
    stringFrom(value.collectorId) &&
    value.vehicles.length > 0 &&
    value.vehicles.every((vehicle) => {
      if (!isRecord(vehicle)) return false;
      const name = stringFrom(vehicle.name);
      const capacity = numberFrom(vehicle.capacity);
      return Boolean(name && name.length <= MAX_VEHICLE_NAME_LENGTH && capacity !== undefined && capacity > 0);
    }) &&
    value.start.type === "COORDINATES" &&
    ("addressId" in value.start) &&
    numberFrom(value.start.latitude) !== undefined &&
    numberFrom(value.start.longitude) !== undefined &&
    typeof value.endAtStart === "boolean" &&
    Array.isArray(value.candidateRequestIds) &&
    value.candidateRequestIds.length > 0 &&
    Array.isArray(value.filters.materialIds) &&
    numberFrom(value.filters.maxDistanceKmFromStart) !== undefined &&
    numberFrom(value.filters.maxDistanceKmFromStart)! > 0 &&
    typeof value.filters.onlyInProgress === "boolean" &&
    numberFrom(value.options.timeLimitSeconds) &&
    typeof value.options.allowDroppingStops === "boolean" &&
    numberFrom(value.options.dropPenalty) &&
    (value.options.distanceUnit === "METERS" || value.options.distanceUnit === "KILOMETERS"),
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

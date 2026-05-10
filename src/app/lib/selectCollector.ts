export interface CreatedCollectionResponse {
  id?: string;
  requestId?: string;
  collectionRequestId?: string;
  request?: {
    id?: string;
  };
  data?: {
    id?: string;
    requestId?: string;
    collectionRequestId?: string;
  };
}

export interface CollectorOption {
  id: string;
  name: string;
  enterpriseName?: string;
  distance?: number;
  materials?: string[];
  rating?: number;
  raw?: unknown;
}

export interface SelectCollectorRequest {
  collectorId: string;
}

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

function normalizeMaterials(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const materials = value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [item];
    if (isRecord(item)) {
      const name = stringFrom(item.name) ?? stringFrom(item.label) ?? stringFrom(item.description);
      return name ? [name] : [];
    }
    return [];
  });

  return materials.length > 0 ? materials : undefined;
}

export function extractCollectionRequestId(response: unknown): string | undefined {
  if (!isRecord(response)) return undefined;

  const request = isRecord(response.request) ? response.request : undefined;
  const data = isRecord(response.data) ? response.data : undefined;

  return (
    stringFrom(response.id) ??
    stringFrom(response.requestId) ??
    stringFrom(response.collectionRequestId) ??
    stringFrom(request?.id) ??
    stringFrom(data?.id) ??
    stringFrom(data?.requestId) ??
    stringFrom(data?.collectionRequestId)
  );
}

export function normalizeCollectors(response: unknown): CollectorOption[] {
  const rawList = Array.isArray(response)
    ? response
    : isRecord(response) && Array.isArray(response.data)
      ? response.data
      : isRecord(response) && Array.isArray(response.collectors)
        ? response.collectors
        : [];

  return rawList.flatMap((item) => {
    if (!isRecord(item)) return [];

    const enterprise = isRecord(item.enterprise) ? item.enterprise : undefined;
    const id =
      stringFrom(item.id) ??
      stringFrom(item.collectorId) ??
      stringFrom(item.uuid) ??
      stringFrom(enterprise?.id);

    if (!id) return [];

    const enterpriseName =
      stringFrom(item.enterpriseName) ??
      stringFrom(item.companyName) ??
      stringFrom(item.company) ??
      stringFrom(enterprise?.companyName) ??
      stringFrom(enterprise?.name);
    const name =
      enterpriseName ??
      stringFrom(item.name) ??
      stringFrom(item.email) ??
      `Coletor ${id.slice(0, 8)}`;

    return [{
      id,
      name,
      enterpriseName,
      distance: numberFrom(item.distance) ?? numberFrom(item.distanceKm),
      materials: normalizeMaterials(item.materials),
      rating: numberFrom(item.rating),
      raw: item,
    }];
  });
}

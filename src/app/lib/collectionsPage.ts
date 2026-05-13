export type CollectionStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED"
  | string;

export interface CollectionAddress {
  id?: string;
  street?: string;
  number?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  enrichmentStatus?: string;
  enrichmentSource?: string;
}

export interface CollectionSummary {
  id: string;
  generatorId: string;
  addressId?: string;
  address?: CollectionAddress;
  materialIds: string[];
  weight: number;
  status: CollectionStatus;
  selectedCollectorId?: string;
  generatorConfirmed: boolean;
  collectorConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionSearchQuery {
  status?: CollectionStatus;
  generatorId?: string;
  collectorId?: string;
}

export type ViewerRole = "GENERATOR" | "WASTE_COLLECTOR";

export type CounterpartKind = "generator" | "waste-collector";

export interface CounterpartProfile {
  id: string;
  name?: string;
  email?: string;
  document?: string;
  phone?: {
    ddi?: number;
    ddd?: number;
    number?: string;
  };
  enterprise?: {
    companyName?: string;
  };
  address?: Array<{
    zipCode?: string;
    number?: string;
    complement?: string;
  }>;
  fallback?: boolean;
}

export interface CounterpartLookup {
  key: string;
  id: string;
  kind: CounterpartKind;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function booleanFrom(value: unknown): boolean {
  return value === true;
}

function numberFieldFrom(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function numberFrom(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function stringArrayFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [item];
    if (isRecord(item)) {
      const name = stringFrom(item.name) ?? stringFrom(item.id);
      return name ? [name] : [];
    }
    return [];
  });
}

function normalizePhone(value: unknown): CounterpartProfile["phone"] {
  if (!isRecord(value)) return undefined;

  const ddi = numberFieldFrom(value.ddi);
  const ddd = numberFieldFrom(value.ddd);
  const number = stringFrom(value.number);

  if (ddi === undefined && ddd === undefined && !number) return undefined;

  return { ddi, ddd, number };
}

function normalizeAddresses(value: unknown): CounterpartProfile["address"] {
  if (!Array.isArray(value)) return undefined;

  const addresses = value.flatMap((item) => {
    if (!isRecord(item)) return [];

    const zipCode = stringFrom(item.zipCode);
    const number = stringFrom(item.number);
    const complement = stringFrom(item.complement);

    if (!zipCode && !number && !complement) return [];

    return [{ zipCode, number, complement }];
  });

  return addresses.length ? addresses : undefined;
}

function normalizeCollectionAddress(value: unknown): CollectionAddress | undefined {
  if (!isRecord(value)) return undefined;

  const address: CollectionAddress = {
    id: stringFrom(value.id),
    street: stringFrom(value.street),
    number: stringFrom(value.number),
    city: stringFrom(value.city),
    state: stringFrom(value.state),
    zipCode: stringFrom(value.zipCode),
    latitude: numberFieldFrom(value.latitude),
    longitude: numberFieldFrom(value.longitude),
    enrichmentStatus: stringFrom(value.enrichmentStatus),
    enrichmentSource: stringFrom(value.enrichmentSource),
  };

  return Object.values(address).some((field) => field !== undefined) ? address : undefined;
}

export function normalizeCollections(response: unknown): CollectionSummary[] {
  const rawList = Array.isArray(response)
    ? response
    : isRecord(response) && Array.isArray(response.data)
      ? response.data
      : isRecord(response) && Array.isArray(response.collections)
        ? response.collections
        : isRecord(response)
          ? [response]
          : [];

  return rawList.flatMap((item) => {
    if (!isRecord(item)) return [];

    const id = stringFrom(item.id);
    const generatorId = stringFrom(item.generatorId);
    const weight = numberFrom(item.weight);
    const status = stringFrom(item.status);
    const createdAt = stringFrom(item.createdAt);
    const updatedAt = stringFrom(item.updatedAt);

    if (!id || !generatorId || weight === undefined || !status || !createdAt || !updatedAt) {
      return [];
    }

    return [{
      id,
      generatorId,
      addressId: stringFrom(item.addressId),
      address: normalizeCollectionAddress(item.address),
      materialIds: stringArrayFrom(item.materialIds),
      weight,
      status,
      selectedCollectorId: stringFrom(item.selectedCollectorId),
      generatorConfirmed: booleanFrom(item.generatorConfirmed),
      collectorConfirmed: booleanFrom(item.collectorConfirmed),
      createdAt,
      updatedAt,
    }];
  });
}

export function normalizeCounterpartProfile(response: unknown, fallbackId: string): CounterpartProfile {
  const data = isRecord(response) && isRecord(response.data) ? response.data : response;

  if (!isRecord(data)) {
    return { id: fallbackId, fallback: true };
  }

  const id = stringFrom(data.id) ?? fallbackId;
  const enterprise = isRecord(data.enterprise) ? data.enterprise : undefined;

  return {
    id,
    name: stringFrom(data.name) ?? stringFrom(enterprise?.companyName) ?? stringFrom(enterprise?.businessName),
    email: stringFrom(data.email),
    document: stringFrom(data.document),
    phone: normalizePhone(data.phone),
    address: normalizeAddresses(data.address),
    fallback: id === fallbackId && !stringFrom(data.name) && !stringFrom(data.email),
  };
}

export function isCollectorRole(role?: string): boolean {
  if (!role) return false;
  return ["WASTE_COLLECTOR", "CATADOR"].includes(role.toUpperCase());
}

export function getViewerRole(role?: string): ViewerRole | undefined {
  if (!role) return undefined;

  const normalized = role.toUpperCase();
  if (["GENERATOR", "GERADOR"].includes(normalized)) return "GENERATOR";
  if (["WASTE_COLLECTOR", "CATADOR"].includes(normalized)) return "WASTE_COLLECTOR";

  return undefined;
}

export function getCounterpartLookup(
  collection: CollectionSummary,
  viewerRole?: ViewerRole,
): CounterpartLookup | undefined {
  if (viewerRole === "GENERATOR") {
    if (!collection.selectedCollectorId) return undefined;
    return {
      key: `waste-collector:${collection.selectedCollectorId}`,
      id: collection.selectedCollectorId,
      kind: "waste-collector",
    };
  }

  if (viewerRole === "WASTE_COLLECTOR") {
    return {
      key: `generator:${collection.generatorId}`,
      id: collection.generatorId,
      kind: "generator",
    };
  }

  return undefined;
}

export function collectCounterpartLookups(
  collections: CollectionSummary[],
  viewerRole?: ViewerRole,
): CounterpartLookup[] {
  const unique = new Map<string, CounterpartLookup>();

  collections.forEach((collection) => {
    const lookup = getCounterpartLookup(collection, viewerRole);
    if (lookup) unique.set(lookup.key, lookup);
  });

  return Array.from(unique.values());
}

export function counterpartProfileMapKey(kind: CounterpartKind, id: string): string {
  return `${kind}:${id}`;
}

export function formatWeight(weight: number): string {
  return `${weight.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
}

export function formatCollectionAddress(collection: CollectionSummary): string {
  const address = collection.address;

  if (address) {
    const streetLine = [address.street, address.number].filter(Boolean).join(", ");
    const cityState = [address.city, address.state].filter(Boolean).join("/");
    const zipCode = address.zipCode ? `CEP ${address.zipCode}` : undefined;
    const parts = [streetLine, cityState, zipCode].filter(Boolean);

    if (parts.length) return parts.join(" - ");
  }

  if (collection.addressId) return `Endereço ${collection.addressId.slice(0, 8)}`;
  return `Coleta #${collection.id.slice(0, 8)}`;
}

export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function statusLabel(status: CollectionStatus): string {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluída",
    CANCELED: "Cancelada",
    CANCELLED: "Cancelada",
  };

  return labels[status] ?? status;
}

export function formatProfilePhone(phone?: CounterpartProfile["phone"]): string | undefined {
  if (!phone?.number) return undefined;

  const ddi = phone.ddi ? `+${phone.ddi} ` : "";
  const ddd = phone.ddd ? `(${phone.ddd}) ` : "";

  return `${ddi}${ddd}${phone.number}`;
}

export const COLLECTION_STATUS_OPTIONS = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
] as const;

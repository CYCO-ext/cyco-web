export interface Material {
  /**
   * Backend materials are value objects and may only expose a name.
   * Keep this field as the selectable/submittable value used by the existing form state.
   */
  id: string;
  name: string;
}

export interface GeneratorProfile {
  id: string;
  birthDate: string;
  document: string;
  email: string;
  name: string;
  phone: {
    ddd: number;
    ddi: number;
    number: string;
  };
  address: GeneratorAddress[];
}

export interface GeneratorAddress {
  id?: string;
  zipCode: string;
  number: string;
  complement?: string;
  street?: string;
  city?: string;
  neighborhood?: string;
}

export interface CepAddress {
  zipCode: string;
  street: string;
  city: string;
  neighborhood: string;
}

export interface CreateCollectionFormState {
  useRegisteredAddress: boolean;
  addressId?: string;
  zipCode: string;
  number: string;
  street: string;
  city: string;
  neighborhood: string;
  complement: string;
  materialIds: string[];
  weight: string;
}

export interface CreateCollectionRequest {
  generatorId: string;
  addressId?: string;
  materialIds: string[];
  weight: number;
}

export interface SessionMeta {
  generatorId?: string;
  role?: string;
  token?: string;
}

type MaybeRecord = Record<string, unknown>;

function isRecord(value: unknown): value is MaybeRecord {
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

export function normalizeMaterials(input: unknown): Material[] {
  const rawList = Array.isArray(input)
    ? input
    : isRecord(input) && Array.isArray(input.data)
      ? input.data
      : isRecord(input) && Array.isArray(input.materials)
        ? input.materials
        : [];

  return rawList.flatMap((item) => {
    if (!isRecord(item)) return [];

    const name = stringFrom(item.name) ?? stringFrom(item.label) ?? stringFrom(item.description);
    const id = stringFrom(item.id) ?? stringFrom(item.materialId) ?? stringFrom(item.uuid) ?? name;

    if (!id || !name) return [];
    return [{ id, name }];
  });
}

export function getSessionMeta(session: unknown): SessionMeta {
  if (!isRecord(session)) return {};

  const user = isRecord(session.user) ? session.user : {};
  return {
    generatorId: stringFrom(user.id),
    role: stringFrom(session.role),
    token: stringFrom(session.token) ?? stringFrom(session.accessToken),
  };
}

export function isGeneratorRole(role?: string): boolean {
  if (!role) return false;
  return ["GERADOR", "GENERATOR"].includes(role.toUpperCase());
}

export function sanitizeZipCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function createInitialCollectionFormState(): CreateCollectionFormState {
  return {
    useRegisteredAddress: false,
    zipCode: "",
    number: "",
    street: "",
    city: "",
    neighborhood: "",
    complement: "",
    materialIds: [],
    weight: "",
  };
}

export function mapRegisteredAddress(address: GeneratorAddress): Partial<CreateCollectionFormState> {
  return {
    zipCode: address.zipCode ?? "",
    number: address.number ?? "",
    street: address.street ?? "",
    city: address.city ?? "",
    neighborhood: address.neighborhood ?? "",
    complement: address.complement ?? "",
  };
}

export function buildCreateCollectionRequest(
  state: CreateCollectionFormState,
  generatorId?: string,
): { payload?: CreateCollectionRequest; error?: string } {
  if (!generatorId) {
    return { error: "Não foi possível identificar o gerador autenticado." };
  }

  if (state.materialIds.length === 0) {
    return { error: "Selecione pelo menos um material." };
  }

  const weight = numberFrom(state.weight);
  if (!weight || weight <= 0) {
    return { error: "Informe um peso maior que zero." };
  }

  return {
    payload: {
      generatorId,
      addressId: state.addressId,
      materialIds: state.materialIds,
      weight,
    },
  };
}

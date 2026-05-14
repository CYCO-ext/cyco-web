export type UserProfileRole = "GENERATOR" | "WASTE_COLLECTOR";

export interface ProfileField {
  label: string;
  value: string;
}

export interface ProfileAddressView {
  title: string;
  fields: ProfileField[];
}

export interface UserProfileView {
  id: string;
  role: UserProfileRole;
  roleLabel: string;
  name?: string;
  email?: string;
  identity: ProfileField[];
  contact: ProfileField[];
  enterprise: ProfileField[];
  materials: ProfileField[];
  addresses: ProfileAddressView[];
  additional: ProfileField[];
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function stringFrom(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return value.toString();
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return undefined;
}

function unwrapProfile(response: unknown): unknown {
  return isRecord(response) && isRecord(response.data) ? response.data : response;
}

function addField(fields: ProfileField[], label: string, value: unknown, seen?: Set<string>, key?: string) {
  const normalized = stringFrom(value);
  if (!normalized) return;

  fields.push({ label, value: normalized });
  if (key) seen?.add(key);
}

function formatPhone(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;

  const ddi = stringFrom(value.ddi);
  const ddd = stringFrom(value.ddd);
  const number = stringFrom(value.number);

  if (!ddi && !ddd && !number) return undefined;

  const country = ddi ? `+${ddi} ` : "";
  const area = ddd ? `(${ddd}) ` : "";
  return `${country}${area}${number ?? ""}`.trim();
}

function normalizeAddressList(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value)) return [value];
  return [];
}

function normalizeMaterials(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [item.trim()];
    if (isRecord(item)) {
      const name = stringFrom(item.name) ?? stringFrom(item.id) ?? stringFrom(item.value);
      return name ? [name] : [];
    }

    const material = stringFrom(item);
    return material ? [material] : [];
  });
}

function normalizeAddresses(value: unknown): ProfileAddressView[] {
  return normalizeAddressList(value).flatMap((address, index) => {
    const fields: ProfileField[] = [];

    addField(fields, "CEP", address.zipCode);
    addField(fields, "Rua", address.street);
    addField(fields, "Número", address.number);
    addField(fields, "Complemento", address.complement);
    addField(fields, "Bairro", address.neighborhood);
    addField(fields, "Cidade", address.city);
    addField(fields, "Estado", address.state);
    addField(fields, "Latitude", address.latitude);
    addField(fields, "Longitude", address.longitude);
    addField(fields, "Status de enriquecimento", address.enrichmentStatus);
    addField(fields, "Fonte de enriquecimento", address.enrichmentSource);

    if (fields.length === 0) return [];

    return [{
      title: `Endereço ${index + 1}`,
      fields,
    }];
  });
}

function roleLabel(role: UserProfileRole): string {
  return role === "GENERATOR" ? "Gerador" : "Coletor";
}

function titleFromKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

export function normalizeUserProfile(
  response: unknown,
  role: UserProfileRole,
  fallbackId: string,
): UserProfileView {
  const data = unwrapProfile(response);
  const profile = isRecord(data) ? data : {};
  const seen = new Set<string>();
  const identity: ProfileField[] = [];
  const contact: ProfileField[] = [];
  const enterprise: ProfileField[] = [];
  const materials: ProfileField[] = [];

  const enterpriseData = isRecord(profile.enterprise) ? profile.enterprise : undefined;
  const id = stringFrom(profile.id) ?? fallbackId;
  const name = stringFrom(profile.name) ?? stringFrom(enterpriseData?.companyName) ?? stringFrom(enterpriseData?.businessName);
  const email = stringFrom(profile.email);

  addField(identity, "ID", id, seen, "id");
  addField(identity, "Nome", name, seen, "name");
  addField(identity, "Email", email, seen, "email");
  addField(identity, "Documento", profile.document, seen, "document");
  addField(identity, "Data de nascimento", profile.birthDate, seen, "birthDate");
  identity.push({ label: "Perfil", value: roleLabel(role) });

  const phone = formatPhone(profile.phone);
  addField(contact, "Telefone", phone, seen, "phone");
  if (isRecord(profile.phone)) {
    addField(contact, "DDI", profile.phone.ddi);
    addField(contact, "DDD", profile.phone.ddd);
    addField(contact, "Número", profile.phone.number);
  }

  if (enterpriseData) {
    seen.add("enterprise");
    addField(enterprise, "Razão social", enterpriseData.companyName);
    addField(enterprise, "Nome empresarial", enterpriseData.businessName);
    addField(enterprise, "Nome fantasia", enterpriseData.tradeName);
    addField(enterprise, "Documento", enterpriseData.document);
    addField(enterprise, "CNPJ", enterpriseData.cnpj);
    addField(enterprise, "Inscrição estadual", enterpriseData.stateRegistration);
    addField(enterprise, "Inscrição municipal", enterpriseData.municipalRegistration);
  }

  const collectorMaterials = normalizeMaterials(profile.materials);
  if (collectorMaterials.length > 0) {
    seen.add("materials");
    addField(materials, "Materiais aceitos", collectorMaterials.join(", "));
  }

  seen.add("address");
  const addresses = normalizeAddresses(profile.address);
  const additional: ProfileField[] = [];

  Object.entries(profile).forEach(([key, value]) => {
    if (seen.has(key)) return;
    if (isRecord(value) || Array.isArray(value)) return;
    addField(additional, titleFromKey(key), value);
  });

  return {
    id,
    role,
    roleLabel: roleLabel(role),
    name,
    email,
    identity,
    contact,
    enterprise,
    materials,
    addresses,
    additional,
  };
}

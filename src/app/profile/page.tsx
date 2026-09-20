"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Home,
  IdCard,
  Loader2,
  Mail,
  Package,
  Phone,
  RotateCcw,
  User,
  UserPlus,
} from "lucide-react";

import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { button, Input } from "@/app/components/ui";
import { getSessionMeta, isGeneratorRole } from "@/app/lib/createCollection";
import { isCollectorRole } from "@/app/lib/collectionsPage";
import {
  normalizeUserProfile,
  ProfileAddressView,
  ProfileField,
  UserProfileRole,
  UserProfileView,
} from "@/app/lib/userProfile";
import { DeliverymanProfile, normalizeDeliverymen } from "@/app/lib/routes";

type ProfileState =
  | { status: "idle" | "loading" }
  | { status: "ready"; profile: UserProfileView }
  | { status: "error"; message: string };

type Feedback = {
  type: "success" | "error";
  message: string;
};

type VehicleOption = {
  id: string;
  modelId?: string;
  colorId?: string;
  brand?: string;
  model?: string;
  color?: string;
  type?: string;
  year?: number;
};

type DeliverymanForm = {
  name: string;
  email: string;
  password: string;
  birthDate: string;
  ddi: string;
  ddd: string;
  phone: string;
  licenseNumber: string;
  vehicleOption: string;
  vehiclePlate: string;
};

type DeliverymanTab = "create" | "list";

const initialDeliverymanForm: DeliverymanForm = {
  name: "",
  email: "",
  password: "",
  birthDate: "",
  ddi: "55",
  ddd: "",
  phone: "",
  licenseNumber: "",
  vehicleOption: "",
  vehiclePlate: "",
};

function getApiError(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) return data;

  if (typeof data === "object" && data !== null) {
    const body = data as { message?: unknown; error?: unknown };
    const message = body.message;

    if (Array.isArray(message)) {
      const text = message.filter((item): item is string => typeof item === "string" && item.trim().length > 0).join(", ");
      if (text) return text;
    }

    if (typeof message === "string" && message.trim()) {
      try {
        const parsed = JSON.parse(message) as unknown;
        if (typeof parsed === "object" && parsed !== null && "errors" in parsed) {
          const errors = (parsed as { errors?: unknown }).errors;
          if (typeof errors === "object" && errors !== null) {
            const text = Object.values(errors)
              .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
              .join(", ");
            if (text) return text;
          }
        }
      } catch {
        return message;
      }

      return message;
    }

    const error = body.error;
    if (typeof error === "string" && error.trim()) return error;
  }

  return fallback;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function formatDateAsIso(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00.000Z`).toISOString()
    : value;
}

function resolveProfileRole(role?: string): UserProfileRole | undefined {
  if (isGeneratorRole(role)) return "GENERATOR";
  if (isCollectorRole(role)) return "WASTE_COLLECTOR";
  return undefined;
}

function getVehicleOptionLabel(vehicle: VehicleOption): string {
  return [vehicle.brand, vehicle.model, vehicle.color, vehicle.year].filter(Boolean).join(" - ") || vehicle.id;
}

function DetailSection({
  title,
  icon,
  fields,
}: {
  title: string;
  icon: ReactNode;
  fields: ProfileField[];
}) {
  if (fields.length === 0) return null;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-xl bg-cyco-light p-2 text-cyco-green">{icon}</span>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <dl className="grid gap-3">
        {fields.map((field) => (
          <div key={`${title}-${field.label}`} className="min-w-0">
            <dt className="text-xs font-medium uppercase text-gray-400">{field.label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-gray-800">{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AddressSection({ addresses }: { addresses: ProfileAddressView[] }) {
  if (addresses.length === 0) return null;

  return (
    <section className="grid gap-4">
      <div className="flex items-center gap-2">
        <span className="rounded-xl bg-cyco-light p-2 text-cyco-green">
          <Home className="h-5 w-5" />
        </span>
        <h2 className="text-base font-semibold text-gray-900">Endereços</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <div key={address.title} className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">{address.title}</h3>
            <dl className="mt-3 grid gap-3">
              {address.fields.map((field) => (
                <div key={`${address.title}-${field.label}`} className="min-w-0">
                  <dt className="text-xs font-medium uppercase text-gray-400">{field.label}</dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-gray-800">{field.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

function DeliverymanRegistrationSection({
  form,
  feedback,
  pending,
  vehicles,
  onChange,
  onSubmit,
}: {
  form: DeliverymanForm;
  feedback?: Feedback;
  pending: boolean;
  vehicles: VehicleOption[];
  onChange: (field: keyof DeliverymanForm, value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-xl bg-cyco-light p-2 text-cyco-green">
          <UserPlus className="h-5 w-5" />
        </span>
        <h2 className="text-base font-semibold text-gray-900">Cadastrar entregador</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input value={form.name} onChange={(event) => onChange("name", event.target.value)} placeholder="Nome completo" />
        <Input value={form.email} onChange={(event) => onChange("email", event.target.value)} placeholder="Email" />
        <Input
          type="password"
          value={form.password}
          onChange={(event) => onChange("password", event.target.value)}
          placeholder="Senha inicial"
        />
        <Input type="date" value={form.birthDate} onChange={(event) => onChange("birthDate", event.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          <Input value={form.ddi} onChange={(event) => onChange("ddi", event.target.value)} placeholder="DDI" />
          <Input value={form.ddd} onChange={(event) => onChange("ddd", event.target.value)} placeholder="DDD" />
          <Input value={form.phone} onChange={(event) => onChange("phone", event.target.value)} placeholder="Telefone" />
        </div>
        <Input
          value={form.licenseNumber}
          onChange={(event) => onChange("licenseNumber", event.target.value)}
          placeholder="CNH"
        />
        <select
          value={form.vehicleOption}
          onChange={(event) => onChange("vehicleOption", event.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyco-green/40"
        >
          <option value="">Selecione o veículo</option>
          {vehicles
            .filter((vehicle) => vehicle.modelId && vehicle.colorId)
            .map((vehicle) => (
              <option
                key={`${vehicle.id}-${vehicle.modelId}-${vehicle.colorId}`}
                value={`${vehicle.id}|${vehicle.modelId}|${vehicle.colorId}`}
              >
                {getVehicleOptionLabel(vehicle)}
              </option>
            ))}
        </select>
        <Input value={form.vehiclePlate} onChange={(event) => onChange("vehiclePlate", event.target.value)} placeholder="Placa" />
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {feedback ? (
          <div className={`flex items-start gap-2 text-sm ${feedback.type === "success" ? "text-green-700" : "text-red-700"}`}>
            {feedback.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {feedback.message}
          </div>
        ) : (
          <span className="text-sm text-gray-500">O entregador ficará vinculado a este coletor.</span>
        )}
        <button type="button" onClick={onSubmit} disabled={pending} className={`${button()} gap-2`}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Cadastrar entregador
        </button>
      </div>
    </section>
  );
}

function DeliverymenListSection({
  deliverymen,
  loading,
  onRefresh,
}: {
  deliverymen: DeliverymanProfile[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-cyco-light p-2 text-cyco-green">
            <User className="h-5 w-5" />
          </span>
          <h2 className="text-base font-semibold text-gray-900">Entregadores cadastrados</h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-cyco-green bg-white px-3 py-2 text-sm font-semibold text-cyco-green hover:bg-cyco-light"
        >
          <RotateCcw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Buscando entregadores...
        </div>
      ) : deliverymen.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
          Nenhum entregador cadastrado.
        </div>
      ) : (
        <div className="grid gap-3">
          {deliverymen.map((deliveryman) => (
            <article
              key={deliveryman.id}
              className="grid gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-gray-900">
                  {deliveryman.name ?? deliveryman.email ?? deliveryman.id}
                </h3>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                  {deliveryman.email && <span>{deliveryman.email}</span>}
                  {deliveryman.phone && <span>{deliveryman.phone}</span>}
                  {deliveryman.licenseNumber && <span>CNH {deliveryman.licenseNumber}</span>}
                </div>
              </div>
              <div className="grid gap-1 text-xs text-gray-500 md:text-right">
                {deliveryman.vehiclePlate && <span>Placa {deliveryman.vehiclePlate}</span>}
                <span>ID {deliveryman.id.slice(0, 8)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DeliverymanManagementSection({
  activeTab,
  form,
  feedback,
  pending,
  vehicles,
  deliverymen,
  deliverymenLoading,
  onTabChange,
  onFormChange,
  onSubmit,
  onRefresh,
}: {
  activeTab: DeliverymanTab;
  form: DeliverymanForm;
  feedback?: Feedback;
  pending: boolean;
  vehicles: VehicleOption[];
  deliverymen: DeliverymanProfile[];
  deliverymenLoading: boolean;
  onTabChange: (tab: DeliverymanTab) => void;
  onFormChange: (field: keyof DeliverymanForm, value: string) => void;
  onSubmit: () => void;
  onRefresh: () => void;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex w-fit rounded-xl bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => onTabChange("create")}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            activeTab === "create" ? "bg-cyco-green text-white" : "text-gray-600 hover:bg-cyco-light"
          }`}
        >
          <UserPlus className="h-4 w-4" />
          Cadastrar
        </button>
        <button
          type="button"
          onClick={() => onTabChange("list")}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            activeTab === "list" ? "bg-cyco-green text-white" : "text-gray-600 hover:bg-cyco-light"
          }`}
        >
          <User className="h-4 w-4" />
          Entregadores
        </button>
      </div>

      {activeTab === "create" ? (
        <DeliverymanRegistrationSection
          form={form}
          feedback={feedback}
          pending={pending}
          vehicles={vehicles}
          onChange={onFormChange}
          onSubmit={onSubmit}
        />
      ) : (
        <DeliverymenListSection
          deliverymen={deliverymen}
          loading={deliverymenLoading}
          onRefresh={onRefresh}
        />
      )}
    </section>
  );
}

function ProfileContent({ profile }: { profile: UserProfileView }) {
  return (
    <>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyco-light text-cyco-green">
                <User className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold text-gray-900">
                  {profile.name ?? "Usuário"}
                </h1>
                <p className="mt-1 text-sm text-gray-600">{profile.roleLabel}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-1 text-sm text-gray-600 md:text-right">
            {profile.email && (
              <span className="inline-flex items-center gap-1 md:justify-end">
                <Mail className="h-4 w-4" />
                {profile.email}
              </span>
            )}
            <span>ID: {profile.id}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <DetailSection
          title="Identificação"
          icon={<IdCard className="h-5 w-5" />}
          fields={profile.identity}
        />
        <DetailSection
          title="Contato"
          icon={<Phone className="h-5 w-5" />}
          fields={profile.contact}
        />
        <DetailSection
          title="Empresa"
          icon={<Building2 className="h-5 w-5" />}
          fields={profile.enterprise}
        />
        <DetailSection
          title="Materiais"
          icon={<Package className="h-5 w-5" />}
          fields={profile.materials}
        />
        <DetailSection
          title="Detalhes adicionais"
          icon={<User className="h-5 w-5" />}
          fields={profile.additional}
        />
      </div>

      <AddressSection addresses={profile.addresses} />
    </>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionMeta = getSessionMeta(session);
  const profileRole = useMemo(() => resolveProfileRole(sessionMeta.role), [sessionMeta.role]);
  const [state, setState] = useState<ProfileState>({ status: "idle" });
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [deliverymanForm, setDeliverymanForm] = useState<DeliverymanForm>(initialDeliverymanForm);
  const [deliverymanFeedback, setDeliverymanFeedback] = useState<Feedback>();
  const [deliverymanPending, setDeliverymanPending] = useState(false);
  const [deliverymen, setDeliverymen] = useState<DeliverymanProfile[]>([]);
  const [deliverymenLoading, setDeliverymenLoading] = useState(false);
  const [deliverymanTab, setDeliverymanTab] = useState<DeliverymanTab>("create");

  const loadProfile = useCallback(async () => {
    if (!sessionMeta.generatorId) {
      setState({ status: "error", message: "Não foi possível identificar o usuário autenticado." });
      return;
    }

    if (!profileRole) {
      setState({ status: "error", message: "Perfil de usuário não suportado." });
      return;
    }

    setState({ status: "loading" });

    const endpoint = profileRole === "GENERATOR"
      ? `/api/generator/${sessionMeta.generatorId}`
      : `/api/waste-collector/${sessionMeta.generatorId}`;

    try {
      const headers: HeadersInit = sessionMeta.token
        ? { authorization: `Bearer ${sessionMeta.token}` }
        : {};
      const response = await fetch(endpoint, { headers });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getApiError(data, "Erro ao buscar perfil."));
      }

      setState({
        status: "ready",
        profile: normalizeUserProfile(data, profileRole, sessionMeta.generatorId),
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Erro ao buscar perfil.",
      });
    }
  }, [profileRole, sessionMeta.generatorId, sessionMeta.token]);

  const loadVehicles = useCallback(async () => {
    if (profileRole !== "WASTE_COLLECTOR") {
      setVehicles([]);
      return;
    }

    try {
      const headers: HeadersInit = sessionMeta.token
        ? { authorization: `Bearer ${sessionMeta.token}` }
        : {};
      const response = await fetch("/api/vehicles", { headers });
      const data = await response.json().catch(() => null);
      setVehicles(response.ok && Array.isArray(data) ? data : []);
    } catch {
      setVehicles([]);
    }
  }, [profileRole, sessionMeta.token]);

  const loadDeliverymen = useCallback(async () => {
    if (profileRole !== "WASTE_COLLECTOR" || !sessionMeta.generatorId) {
      setDeliverymen([]);
      return;
    }

    setDeliverymenLoading(true);

    try {
      const headers: HeadersInit = sessionMeta.token
        ? { authorization: `Bearer ${sessionMeta.token}` }
        : {};
      const response = await fetch(`/api/collectors/${sessionMeta.generatorId}/deliverymen`, { headers });
      const data = await response.json().catch(() => null);
      setDeliverymen(response.ok ? normalizeDeliverymen(data) : []);
    } catch {
      setDeliverymen([]);
    } finally {
      setDeliverymenLoading(false);
    }
  }, [profileRole, sessionMeta.generatorId, sessionMeta.token]);

  function updateDeliverymanForm(field: keyof DeliverymanForm, value: string) {
    setDeliverymanForm((current) => ({ ...current, [field]: value }));
  }

  async function createDeliveryman() {
    if (!sessionMeta.generatorId) {
      setDeliverymanFeedback({ type: "error", message: "Não foi possível identificar o coletor autenticado." });
      return;
    }

    const [vehicleId, modelId, colorId] = deliverymanForm.vehicleOption.split("|");
    const requiredValues = [
      deliverymanForm.name,
      deliverymanForm.email,
      deliverymanForm.password,
      deliverymanForm.birthDate,
      deliverymanForm.ddi,
      deliverymanForm.ddd,
      deliverymanForm.phone,
      deliverymanForm.licenseNumber,
      vehicleId,
      modelId,
      colorId,
      deliverymanForm.vehiclePlate,
    ];

    if (requiredValues.some((value) => !value.trim())) {
      setDeliverymanFeedback({ type: "error", message: "Preencha todos os dados do entregador." });
      return;
    }

    const phoneNumber = onlyDigits(deliverymanForm.phone);
    const ddd = onlyDigits(deliverymanForm.ddd);
    const ddi = onlyDigits(deliverymanForm.ddi);
    const vehiclePlate = deliverymanForm.vehiclePlate.trim().toUpperCase();

    if (deliverymanForm.password.length < 8) {
      setDeliverymanFeedback({ type: "error", message: "A senha inicial precisa ter pelo menos 8 caracteres." });
      return;
    }

    if (phoneNumber.length < 8 || phoneNumber.length > 9) {
      setDeliverymanFeedback({ type: "error", message: "O telefone deve ter 8 ou 9 dígitos." });
      return;
    }

    setDeliverymanPending(true);
    setDeliverymanFeedback(undefined);

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(sessionMeta.token ? { authorization: `Bearer ${sessionMeta.token}` } : {}),
      };
      const response = await fetch(`/api/collectors/${sessionMeta.generatorId}/deliverymen`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: deliverymanForm.email,
          password: deliverymanForm.password,
          name: deliverymanForm.name,
          birthDate: formatDateAsIso(deliverymanForm.birthDate),
          licenseNumber: deliverymanForm.licenseNumber.trim(),
          phone: {
            ddi: Number(ddi),
            ddd: Number(ddd),
            number: phoneNumber,
          },
          vehicle: {
            id: vehicleId,
            modelId,
            colorId,
            plate: vehiclePlate,
          },
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getApiError(data, "Erro ao cadastrar entregador."));
      }

      setDeliverymanForm(initialDeliverymanForm);
      setDeliverymanFeedback({ type: "success", message: "Entregador cadastrado." });
      setDeliverymanTab("list");
      await loadDeliverymen();
    } catch (error) {
      setDeliverymanFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Erro ao cadastrar entregador.",
      });
    } finally {
      setDeliverymanPending(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadProfile();
    loadVehicles();
    loadDeliverymen();
  }, [loadDeliverymen, loadProfile, loadVehicles, status]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-gray-500">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-gray-100">
      <Header centerText="Perfil" />

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        <main className="flex flex-1 flex-col overflow-y-auto p-4 md:p-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
            {state.status === "loading" || state.status === "idle" ? (
              <section className="rounded-2xl bg-white p-6 text-sm text-gray-600 shadow-sm">
                Buscando perfil...
              </section>
            ) : state.status === "error" ? (
              <section className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {state.message}
                  </div>
                  <button
                    type="button"
                    onClick={loadProfile}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Tentar novamente
                  </button>
                </div>
              </section>
            ) : state.status === "ready" ? (
              <>
                <ProfileContent profile={state.profile} />
                {profileRole === "WASTE_COLLECTOR" && (
                  <DeliverymanManagementSection
                    activeTab={deliverymanTab}
                    form={deliverymanForm}
                    feedback={deliverymanFeedback}
                    pending={deliverymanPending}
                    vehicles={vehicles}
                    deliverymen={deliverymen}
                    deliverymenLoading={deliverymenLoading}
                    onTabChange={setDeliverymanTab}
                    onFormChange={updateDeliverymanForm}
                    onSubmit={createDeliveryman}
                    onRefresh={loadDeliverymen}
                  />
                )}
              </>
            ) : (
              <section className="rounded-2xl bg-white p-6 text-sm text-gray-600 shadow-sm">
                Preparando perfil...
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

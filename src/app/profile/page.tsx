"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  Building2,
  Home,
  IdCard,
  Mail,
  Package,
  Phone,
  RotateCcw,
  User,
} from "lucide-react";

import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { getSessionMeta, isGeneratorRole } from "@/app/lib/createCollection";
import { isCollectorRole } from "@/app/lib/collectionsPage";
import {
  normalizeUserProfile,
  ProfileAddressView,
  ProfileField,
  UserProfileRole,
  UserProfileView,
} from "@/app/lib/userProfile";

type ProfileState =
  | { status: "idle" | "loading" }
  | { status: "ready"; profile: UserProfileView }
  | { status: "error"; message: string };

function getApiError(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }

  return fallback;
}

function resolveProfileRole(role?: string): UserProfileRole | undefined {
  if (isGeneratorRole(role)) return "GENERATOR";
  if (isCollectorRole(role)) return "WASTE_COLLECTOR";
  return undefined;
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadProfile();
  }, [loadProfile, status]);

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
              <ProfileContent profile={state.profile} />
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

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertCircle, Check, ChevronDown, HelpCircle, Info } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { button, Input } from "@/app/components/ui";
import {
  buildCreateCollectionRequest,
  CepAddress,
  createInitialCollectionFormState,
  CreateCollectionFormState,
  GeneratorProfile,
  getSessionMeta,
  isGeneratorRole,
  mapRegisteredAddress,
  Material,
  sanitizeZipCode,
} from "@/app/lib/createCollection";
import { extractCollectionRequestId } from "@/app/lib/selectCollector";

type FormErrors = Partial<Record<"address" | "materials" | "weight" | "submit" | "cep", string>>;

function getApiError(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }

  return fallback;
}

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;

  return (
    <p className="mt-1 flex items-start gap-1 text-xs text-red-600">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export default function NewCollectionPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionMeta = getSessionMeta(session);
  const canCreateCollection = !sessionMeta.role || isGeneratorRole(sessionMeta.role);

  const [form, setForm] = useState<CreateCollectionFormState>(() => createInitialCollectionFormState());
  const [materials, setMaterials] = useState<Material[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    async function loadMaterials() {
      setLoadingMaterials(true);
      setErrors((current) => ({ ...current, materials: undefined }));

      try {
        const res = await fetch("/api/materials");
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error ?? "Erro ao buscar materiais.");
        }

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Nenhum material disponível para coleta.");
        }

        if (!cancelled) {
          setMaterials(data);
        }
      } catch (error) {
        if (!cancelled) {
          setMaterials([]);
          setErrors((current) => ({
            ...current,
            materials: error instanceof Error ? error.message : "Erro ao buscar materiais.",
          }));
        }
      } finally {
        if (!cancelled) setLoadingMaterials(false);
      }
    }

    loadMaterials();

    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function updateForm(values: Partial<CreateCollectionFormState>) {
    setForm((current) => ({ ...current, ...values }));
  }

  function toggleMaterial(materialId: string) {
    setForm((current) => ({
      ...current,
      materialIds: current.materialIds.includes(materialId)
        ? current.materialIds.filter((id) => id !== materialId)
        : [...current.materialIds, materialId],
    }));
    setErrors((current) => ({ ...current, materials: undefined }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  }

  async function fetchCepAddress(zipCode: string): Promise<CepAddress> {
    const res = await fetch(`/api/address/cep/${zipCode}`);
    const data = await res.json().catch(() => null) as CepAddress | { error?: string } | null;

    if (!res.ok || !data) {
      throw new Error(getApiError(data, "Erro ao buscar CEP."));
    }

    if ("error" in data) {
      throw new Error(getApiError(data, "Erro ao buscar CEP."));
    }

    return data as CepAddress;
  }

  async function handleRegisteredAddressToggle(checked: boolean) {
    updateForm({
      useRegisteredAddress: checked,
      addressId: undefined,
    });
    setErrors((current) => ({ ...current, address: undefined, cep: undefined }));

    if (!checked) {
      updateForm({
        useRegisteredAddress: false,
        addressId: undefined,
        zipCode: "",
        number: "",
        street: "",
        city: "",
        neighborhood: "",
        complement: "",
      });
      return;
    }

    if (!sessionMeta.generatorId) {
      setErrors((current) => ({
        ...current,
        address: "Não foi possível identificar o gerador autenticado.",
      }));
      return;
    }

    setLoadingAddress(true);

    try {
      const headers: HeadersInit = sessionMeta.token
        ? { authorization: `Bearer ${sessionMeta.token}` }
        : {};
      const res = await fetch(`/api/generator/${sessionMeta.generatorId}`, { headers });
      const data = await res.json().catch(() => null) as GeneratorProfile | { error?: string } | null;

      if (!res.ok || !data) {
        throw new Error(getApiError(data, "Erro ao buscar endereço cadastrado."));
      }

      if ("error" in data) {
        throw new Error(getApiError(data, "Erro ao buscar endereço cadastrado."));
      }

      const profile = data as GeneratorProfile;
      const registeredAddress = profile.address?.[0];
      if (!registeredAddress) {
        throw new Error("Nenhum endereço cadastrado encontrado.");
      }

      const registeredZipCode = sanitizeZipCode(registeredAddress.zipCode ?? "");
      let enrichedAddress: Partial<CreateCollectionFormState> = {};

      if (registeredZipCode.length === 8) {
        const cepAddress = await fetchCepAddress(registeredZipCode);
        enrichedAddress = {
          addressId: registeredAddress.id,
          zipCode: cepAddress.zipCode,
          street: cepAddress.street,
          city: cepAddress.city,
          neighborhood: cepAddress.neighborhood,
        };
      }

      updateForm({
        useRegisteredAddress: true,
        ...mapRegisteredAddress(registeredAddress),
        ...enrichedAddress,
      });
    } catch (error) {
      updateForm({ useRegisteredAddress: false, addressId: undefined });
      setErrors((current) => ({
        ...current,
        address: error instanceof Error ? error.message : "Erro ao buscar endereço cadastrado.",
      }));
    } finally {
      setLoadingAddress(false);
    }
  }

  async function handleCepBlur() {
    if (form.useRegisteredAddress) return;

    const zipCode = sanitizeZipCode(form.zipCode);
    updateForm({ zipCode });

    if (!zipCode) return;
    if (zipCode.length !== 8) {
      setErrors((current) => ({ ...current, cep: "Informe um CEP com 8 dígitos." }));
      return;
    }

    setLoadingCep(true);
    setErrors((current) => ({ ...current, cep: undefined }));

    try {
      const cepAddress = await fetchCepAddress(zipCode);
      updateForm({
        zipCode: cepAddress.zipCode,
        street: cepAddress.street,
        city: cepAddress.city,
        neighborhood: cepAddress.neighborhood,
      });
    } catch (error) {
      setErrors((current) => ({
        ...current,
        cep: error instanceof Error ? error.message : "Erro ao buscar CEP.",
      }));
    } finally {
      setLoadingCep(false);
    }
  }

  async function handleSubmit() {
    setErrors({});

    const { payload, error } = buildCreateCollectionRequest(form, sessionMeta.generatorId);
    if (error || !payload) {
      setErrors((current) => ({ ...current, submit: error }));
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/collections/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? "Erro ao criar solicitação de coleta.");
      }

      const requestId = extractCollectionRequestId(data);
      if (!requestId) {
        throw new Error("Coleta criada, mas a API não retornou o ID da solicitação.");
      }

      router.push(`/collections/${encodeURIComponent(requestId)}/collectors`);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        submit: error instanceof Error ? error.message : "Erro ao criar solicitação de coleta.",
      }));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedMaterialNames = materials
    .filter((material) => form.materialIds.includes(material.id))
    .map((material) => material.name);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-gray-500">Carregando...</span>
      </div>
    );
  }

  if (!canCreateCollection) {
    return (
      <div className="flex h-screen flex-col bg-gray-100">
        <Header />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-gray-900">Acesso indisponível</h1>
            <p className="mt-2 text-sm text-gray-600">
              Apenas geradores podem criar solicitações de coleta.
            </p>
            <button type="button" className={`${button()} mt-5`} onClick={() => router.push("/")}>
              Voltar
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-gray-100">
      <Header />

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        <main className="flex flex-1 flex-col overflow-y-auto p-4 md:p-6">
          <div className="flex w-full flex-1 items-center justify-center">
            <div className="grid w-full max-w-6xl grid-cols-1 gap-6 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-2 md:p-6">
              <section className="flex flex-col gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="cursor-pointer"
                    checked={form.useRegisteredAddress}
                    disabled={loadingAddress}
                    onChange={(event) => handleRegisteredAddressToggle(event.target.checked)}
                  />
                  Localização cadastrada
                </label>

                {loadingAddress && <p className="text-xs text-gray-500">Buscando endereço cadastrado...</p>}
                <ErrorText>{errors.address}</ErrorText>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Input
                      value={form.zipCode}
                      onBlur={handleCepBlur}
                      onChange={(event) => updateForm({ zipCode: event.target.value })}
                      placeholder="00000-000"
                      disabled={form.useRegisteredAddress || loadingAddress}
                    />
                    {loadingCep && <p className="mt-1 text-xs text-gray-500">Buscando CEP...</p>}
                    <ErrorText>{errors.cep}</ErrorText>
                  </div>
                  <Input
                    value={form.number}
                    onChange={(event) => updateForm({ number: event.target.value })}
                    placeholder="Número"
                    disabled={form.useRegisteredAddress || loadingAddress}
                  />
                </div>

                <Input
                  value={form.street}
                  onChange={(event) => updateForm({ street: event.target.value })}
                  placeholder="Logradouro"
                  disabled={form.useRegisteredAddress || loadingAddress}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    value={form.city}
                    onChange={(event) => updateForm({ city: event.target.value })}
                    placeholder="Cidade"
                    disabled={form.useRegisteredAddress || loadingAddress}
                  />
                  <Input
                    value={form.neighborhood}
                    onChange={(event) => updateForm({ neighborhood: event.target.value })}
                    placeholder="Bairro"
                    disabled={form.useRegisteredAddress || loadingAddress}
                  />
                </div>

                <Input
                  value={form.complement}
                  onChange={(event) => updateForm({ complement: event.target.value })}
                  placeholder="Complemento"
                  disabled={form.useRegisteredAddress || loadingAddress}
                />
              </section>

              <section className="flex flex-col gap-4">
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setOpen((current) => !current)}
                    disabled={loadingMaterials || materials.length === 0}
                    className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-100 p-3 text-sm transition hover:ring-2 hover:ring-cyco-green/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex flex-wrap gap-1 text-left">
                      {selectedMaterialNames.length > 0 ? (
                        selectedMaterialNames.map((name) => (
                          <span key={name} className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-700">
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500">
                          {loadingMaterials ? "Carregando materiais..." : "Selecionar materiais"}
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg"
                      >
                        {materials.map((material) => (
                          <label
                            key={material.id}
                            className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-gray-100"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={form.materialIds.includes(material.id)}
                                onChange={() => toggleMaterial(material.id)}
                                className="cursor-pointer"
                              />
                              <span>{material.name}</span>
                            </div>
                            {form.materialIds.includes(material.id) && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </label>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <ErrorText>{errors.materials}</ErrorText>
                </div>

                <div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.weight}
                    onChange={(event) => {
                      updateForm({ weight: event.target.value });
                      setErrors((current) => ({ ...current, weight: undefined, submit: undefined }));
                    }}
                    placeholder="Peso (em kg)"
                  />
                  <ErrorText>{errors.weight}</ErrorText>
                </div>

                <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl bg-gray-100 text-center text-gray-500 transition hover:ring-2 hover:ring-cyco-green/40">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  {images.length > 0 ? (
                    <div className="flex flex-col items-center">
                      <Check className="mb-2 h-8 w-8 text-green-600" />
                      <p className="text-sm font-medium text-green-700">Imagens selecionadas</p>
                      <span className="text-xs text-gray-500">{images.length} arquivo(s)</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">
                        Adicione imagens dos materiais
                        <br />
                        a serem recolhidos
                      </p>
                      <span className="mt-2 text-xs">(JPG, PNG, JPEG)</span>
                    </>
                  )}
                </label>

                <p className="text-sm text-gray-600">
                  CyCoins gerados: <span className="font-semibold">a calcular</span>
                </p>
              </section>
            </div>
          </div>

          <ErrorText>{errors.submit}</ErrorText>

          <div className="mt-6 flex w-full max-w-6xl flex-col gap-4 self-center px-0 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <button
              type="button"
              className="flex items-center gap-2 text-green-700 transition hover:opacity-80"
            >
              <Info className="h-5 w-5" />
              <span>Informações</span>
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-xl border border-gray-300 px-6 py-2 transition hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || loadingMaterials}
                className={`${button()} px-6`}
              >
                {submitting ? "Enviando..." : "Confirmar"}
              </button>
            </div>

            <button
              type="button"
              className="flex items-center gap-2 text-green-700 transition hover:opacity-80"
            >
              <HelpCircle className="h-5 w-5" />
              <span>Ajuda</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

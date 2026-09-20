"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Mail, Lock, Recycle, Factory, Truck } from "lucide-react";
import { registerSchema, RegisterSchemaType } from "../../lib/schemas";
import AuthLayout from "../../components/authLayout";
import { button, Input, MaterialDropdown } from "../../components/ui";
import { RoleCard } from "../../components/roleCard";
import { useState, useEffect } from "react";
import Link from "next/link";

type RegisterPayload = {
  email: string;
  password: string;
  name: string;
  birthDate?: string;
  document: string;
  phone: {
    ddd: number;
    ddi: number;
    number: number | string;
  };
  address: {
    zipCode?: string;
    number?: string;
    complement?: string;
  };
  isEnterprise?: boolean;
  materials?: string[];
  enterprise?: {
    companyName?: string;
  };
  wasteCollectorId?: string;
  licenseNumber?: string;
  vehicle?: {
    id: string;
    modelId: string;
    colorId: string;
    plate: string;
  };
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

export default function RegisterStep1() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [materials, setMaterials] = useState<{ name: string }[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [isEnterprise, setIsEnterprise] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchemaType>({
    resolver: zodResolver(registerSchema),
    shouldUnregister: false,
    defaultValues: {
      ddi: "55",
    },
  });

  const role = watch("role");

  useEffect(() => {
    if (step === 2 && role === "CATADOR") {
      fetch("/api/materials")
        .then((res) => res.json())
        .then((data) => setMaterials(data));
    }
  }, [step, role]);

  useEffect(() => {
    if (step !== 2 || role !== "ENTREGADOR") return;

    fetch("/api/vehicles")
      .then((res) => res.json())
      .then((data) => setVehicles(Array.isArray(data) ? data : []))
      .catch(() => setVehicles([]));
  }, [step, role]);

  const handleNextStep = async () => {
    const valid = await trigger(["email", "password", "role"]);
    if (!valid) return;

    setStep(2);
  };

  const onSubmit = async (data: RegisterSchemaType) => {
    console.log("Submitting data:", data, { selectedMaterials, isEnterprise });
    try {
      let payload: RegisterPayload | null = null;

      if (data.role === "GERADOR") {
        let birthDateFormatted = data.birthDate;

        if (
          birthDateFormatted &&
          /^\d{4}-\d{2}-\d{2}$/.test(birthDateFormatted)
        ) {
          birthDateFormatted = new Date(
            birthDateFormatted + "T00:00:00.000Z"
          ).toISOString();
        }

        payload = {
          email: data.email,
          password: data.password,
          name: `${data.firstName} ${data.lastName}`,
          birthDate: birthDateFormatted,
          document: data.document,
          phone: {
            ddd: Number(data.ddd),
            ddi: Number(data.ddi),
            number: Number(data.phone),
          },
          address: {
            zipCode: data.cep,
            number: data.number,
            complement: data.complement,
          },
        };
      }

      if (data.role === "CATADOR") {
        payload = {
          email: data.email,
          password: data.password,
          name: `${data.firstName} ${data.lastName}`,
          phone: {
            ddd: Number(data.ddd),
            ddi: Number(data.ddi),
            number: data.phone,
          },
          address: {
            zipCode: data.cep,
            number: data.number,
            complement: data.complement,
          },
          document: data.document,
          isEnterprise,
          materials: selectedMaterials,
        };

        if (isEnterprise) {
          payload.enterprise = {
            companyName: data.companyName,
          };
        }
      }

      if (data.role === "ENTREGADOR") {
        const [vehicleId, modelId, colorId] = (data.vehicleOption ?? "").split("|");
        payload = {
          email: data.email,
          password: data.password,
          name: `${data.firstName} ${data.lastName}`,
          birthDate: data.birthDate,
          phone: {
            ddd: Number(data.ddd),
            ddi: Number(data.ddi),
            number: data.phone,
          },
          address: {
            zipCode: data.cep,
            number: data.number,
            complement: data.complement,
          },
          document: data.document,
          wasteCollectorId: data.wasteCollectorId,
          licenseNumber: data.licenseNumber,
          vehicle: {
            id: vehicleId,
            modelId,
            colorId,
            plate: data.vehiclePlate ?? "",
          },
        };
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, role: data.role }),
      });

      if (!res.ok) {
        alert("Erro ao registrar");
        return;
      }

      alert("Registro realizado com sucesso!");
      router.push("/auth/login");
    } catch {
      alert("Erro inesperado ao registrar");
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold mb-1">Registre-se</h1>
      <div className="h-1 w-24 bg-cyco-green mb-6" />

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        {step === 1 && (
          <>
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="exemplo@cyco.com"
                  {...register("email")}
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className="pl-10"
                />
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <RoleCard
                selected={role === "CATADOR"}
                onClick={() =>
                  setValue("role", "CATADOR", { shouldValidate: true })
                }
                label="Catador"
                icon={<Recycle />}
              />
              <RoleCard
                selected={role === "GERADOR"}
                onClick={() =>
                  setValue("role", "GERADOR", { shouldValidate: true })
                }
                label="Gerador"
                icon={<Factory />}
              />
              <RoleCard
                selected={role === "ENTREGADOR"}
                onClick={() =>
                  setValue("role", "ENTREGADOR", { shouldValidate: true })
                }
                label="Entregador"
                icon={<Truck />}
              />
            </div>

            {errors.role && (
              <p className="text-sm text-red-600">{errors.role.message}</p>
            )}

            <button
              type="button"
              onClick={handleNextStep}
              className={`${button()} w-full`}
              disabled={isSubmitting}
            >
              Continuar
            </button>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mb-2 px-4 py-2 rounded-xl border border-cyco-green text-cyco-green w-full"
            >
              Voltar
            </button>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input {...register("firstName")} placeholder="Nome" />
                {errors.firstName && (
                  <p className="text-red-600 text-sm">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <Input {...register("lastName")} placeholder="Sobrenome" />
                {errors.lastName && (
                  <p className="text-red-600 text-sm">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Input {...register("ddi")} placeholder="DDI" />
                {errors.ddi && (
                  <p className="text-red-600 text-sm">
                    {errors.ddi.message}
                  </p>
                )}
              </div>

              <div>
                <Input {...register("ddd")} placeholder="DDD" />
                {errors.ddd && (
                  <p className="text-red-600 text-sm">
                    {errors.ddd.message}
                  </p>
                )}
              </div>

              <div>
                <Input {...register("phone")} placeholder="Telefone" />
                {errors.phone && (
                  <p className="text-red-600 text-sm">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            {(role === "GERADOR" || role === "ENTREGADOR") && (
              <div>
                <Input type="date" {...register("birthDate")} />
                {errors.birthDate && (
                  <p className="text-red-600 text-sm">
                    {errors.birthDate.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <Input
                {...register("document")}
                placeholder={role === "GERADOR" ? "CPF" : "CPF/CNPJ"}
              />
              {errors.document && (
                <p className="text-red-600 text-sm">
                  {errors.document.message}
                </p>
              )}
            </div>

            <div>
              <Input {...register("cep")} placeholder="CEP" />
              {errors.cep && (
                <p className="text-red-600 text-sm">
                  {errors.cep.message}
                </p>
              )}
            </div>

            <div>
              <Input {...register("number")} placeholder="Número" />
              {errors.number && (
                <p className="text-red-600 text-sm">
                  {errors.number.message}
                </p>
              )}
            </div>

            <Input {...register("street")} placeholder="Logradouro" />
            <Input {...register("city")} placeholder="Cidade" />
            <Input {...register("district")} placeholder="Bairro" />
            <Input {...register("complement")} placeholder="Complemento" />

            {role === "CATADOR" && (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isEnterprise}
                    onChange={(e) => setIsEnterprise(e.target.checked)}
                  />
                  <label>Sou empresa</label>
                </div>

                {isEnterprise && (
                  <div>
                    <Input
                      {...register("companyName")}
                      placeholder="Razão Social"
                    />
                    {errors.companyName && (
                      <p className="text-red-600 text-sm">
                        {errors.companyName.message}
                      </p>
                    )}
                  </div>
                )}

                <MaterialDropdown
                  options={materials}
                  selected={selectedMaterials}
                  onChange={setSelectedMaterials}
                  placeholder="Materiais"
                />
              </>
            )}

            {role === "ENTREGADOR" && (
              <div className="grid gap-3 rounded-xl border border-gray-200 p-3">
                <Input
                  {...register("wasteCollectorId")}
                  placeholder="ID do coletor responsável"
                />
                {errors.wasteCollectorId && (
                  <p className="text-red-600 text-sm">
                    {errors.wasteCollectorId.message}
                  </p>
                )}

                <Input {...register("licenseNumber")} placeholder="CNH" />
                {errors.licenseNumber && (
                  <p className="text-red-600 text-sm">
                    {errors.licenseNumber.message}
                  </p>
                )}

                <select
                  {...register("vehicleOption")}
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
                        {[vehicle.brand, vehicle.model, vehicle.color, vehicle.year].filter(Boolean).join(" - ")}
                      </option>
                    ))}
                </select>
                {errors.vehicleOption && (
                  <p className="text-red-600 text-sm">
                    {errors.vehicleOption.message}
                  </p>
                )}

                <Input {...register("vehiclePlate")} placeholder="Placa do veículo" />
                {errors.vehiclePlate && (
                  <p className="text-red-600 text-sm">
                    {errors.vehiclePlate.message}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              className={`${button()} w-full`}
              disabled={isSubmitting}
            >
              Finalizar cadastro
            </button>
          </>
        )}

        <p className="text-center text-sm">
          Já tem uma conta?{" "}
          <Link href="/auth/login" className="font-semibold">
            Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Mail, Lock, Recycle, Factory } from "lucide-react";
import { registerStep1Schema } from "../../lib/schemas";
import AuthLayout from "../../components/authLayout";
import { button, Input, MaterialDropdown } from "../../components/ui";
import { RoleCard } from "../../components/roleCard";
import { useState, useEffect } from "react";

export default function RegisterStep1() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [materials, setMaterials] = useState<{ name: string }[]>([]);
  const [isEnterprise, setIsEnterprise] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof registerStep1Schema> & any>({ resolver: zodResolver(registerStep1Schema) });

  const role = watch("role");

  // Campos extras
  const [extraFields, setExtraFields] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    ddd: "",
    ddi: "55",
    birthDate: "",
    document: "",
    cep: "",
    number: "",
    street: "",
    city: "",
    district: "",
    complement: "",
    companyName: "",
  });

  useEffect(() => {
    if (step === 2 && role === "CATADOR") {
      fetch("/api/materials")
        .then((res) => res.json())
        .then((data) => setMaterials(data));
    }
  }, [step, role]);

  const handleExtraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExtraFields({ ...extraFields, [e.target.name]: e.target.value });
  };

  const onSubmit = async (data: any) => {
    if (step === 1) {
      setStep(2);
      return;
    }
    try {
      let payload: any = {};
      if (role === "GERADOR") {
        let birthDateFormatted = extraFields.birthDate;
        if (birthDateFormatted && /^\d{4}-\d{2}-\d{2}$/.test(birthDateFormatted)) {
          birthDateFormatted = new Date(birthDateFormatted + "T00:00:00.000Z").toISOString();
        }
        payload = {
          email: data.email,
          password: data.password,
          name: extraFields.firstName + " " + extraFields.lastName,
          birthDate: birthDateFormatted,
          document: extraFields.document,
          phone: {
            ddd: Number(extraFields.ddd),
            ddi: Number(extraFields.ddi),
            number: Number(extraFields.phone),
          },
        };
      } else if (role === "CATADOR") {
        payload = {
          email: data.email,
          password: data.password,
          name: extraFields.firstName + " " + extraFields.lastName,
          phone: {
            ddd: Number(extraFields.ddd),
            ddi: Number(extraFields.ddi),
            number: extraFields.phone,
          },
          address: {
            zipCode: extraFields.cep,
            number: extraFields.number,
            complement: extraFields.complement,
          },
          document: extraFields.document,
          isEnterprise,
          materials: selectedMaterials,
        };
        if (isEnterprise) {
          payload.enterprise = {
            companyName: extraFields.companyName,
          };
        }
      }
      // Envia para a API interna
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, role }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || "Erro ao registrar");
        return;
      }
      alert("Registro realizado com sucesso!");
      router.push("/auth/login");
    } catch (e) {
      alert("Erro inesperado ao registrar");
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold mb-1">Registre-se</h1>
      <div className="h-1 w-24 bg-cyco-green mb-6" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 1 && (
          <>
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input placeholder="exemplo@cyco.com" {...register("email")} className="pl-10" />
              </div>
              {typeof errors.email?.message === "string" && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input type="password" placeholder="••••••••" {...register("password")} className="pl-10" />
              </div>
              {typeof errors.password?.message === "string" && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <RoleCard
                selected={role === "CATADOR"}
                onClick={() => setValue("role", "CATADOR", { shouldValidate: true })}
                label="Catador"
                icon={<Recycle />}
              />
              <RoleCard
                selected={role === "GERADOR"}
                onClick={() => setValue("role", "GERADOR", { shouldValidate: true })}
                label="Gerador"
                icon={<Factory />}
              />
            </div>
            {typeof errors.role?.message === "string" && <p className="text-sm text-red-600 -mt-2">{errors.role.message}</p>}
            <button className={`${button()} w-full cursor-pointer`} disabled={isSubmitting}>Continuar</button>
          </>
        )}
        {step === 2 && (
          <>
            <button
              type="button"
              className="mb-2 px-4 py-2 rounded-xl border border-cyco-green text-cyco-green hover:bg-cyco-light transition w-full"
              onClick={() => setStep(1)}
            >
              Voltar
            </button>
            <div className="grid grid-cols-2 gap-2">
              <Input name="firstName" placeholder="Nome" value={extraFields.firstName} onChange={handleExtraChange} required />
              <Input name="lastName" placeholder="Sobrenome" value={extraFields.lastName} onChange={handleExtraChange} required />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input name="ddi" placeholder="DDI" value={extraFields.ddi} onChange={handleExtraChange} required />
              <Input name="ddd" placeholder="DDD" value={extraFields.ddd} onChange={handleExtraChange} required />
              <Input name="phone" placeholder="Telefone" value={extraFields.phone} onChange={handleExtraChange} required />
            </div>
            {role === "GERADOR" && (
              <Input name="birthDate" type="date" placeholder="Data de nascimento" value={extraFields.birthDate} onChange={handleExtraChange} required />
            )}
            <Input name="document" placeholder={role === "GERADOR" ? "CPF" : "CPF/CNPJ"} value={extraFields.document} onChange={handleExtraChange} required />
            <Input name="cep" placeholder="CEP" value={extraFields.cep} onChange={handleExtraChange} required={role === "CATADOR"} />
            <Input name="number" placeholder="Número" value={extraFields.number} onChange={handleExtraChange} required={role === "CATADOR"} />
            <Input name="street" placeholder="Logradouro" value={extraFields.street} onChange={handleExtraChange} />
            <Input name="city" placeholder="Cidade" value={extraFields.city} onChange={handleExtraChange} />
            <Input name="district" placeholder="Bairro" value={extraFields.district} onChange={handleExtraChange} />
            <Input name="complement" placeholder="Complemento" value={extraFields.complement} onChange={handleExtraChange} />
            {role === "CATADOR" && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={isEnterprise} onChange={e => setIsEnterprise(e.target.checked)} id="isEnterprise" />
                  <label htmlFor="isEnterprise">Sou empresa</label>
                </div>
                {isEnterprise && (
                  <Input name="companyName" placeholder="Razão Social" value={extraFields.companyName} onChange={handleExtraChange} required />
                )}
                <label className="block mb-1 font-medium">Materiais que trabalha</label>
                <MaterialDropdown
                  options={materials}
                  selected={selectedMaterials}
                  onChange={setSelectedMaterials}
                  placeholder="Selecione e/ou busque materiais"
                />
              </>
            )}
            <button className={`${button()} w-full cursor-pointer`} disabled={isSubmitting}>Finalizar cadastro</button>
          </>
        )}
      </form>
    </AuthLayout>
  );
}

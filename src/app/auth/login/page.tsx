"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { z } from "zod";
import { button, Input } from "../../components/ui";
import { useRouter } from "next/navigation";
import { loginSchema } from "../../lib/schemas";
import AuthLayout from "../../components/authLayout";

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || "Email ou senha inválidos");
        return;
      }
      // Salva token e user no localStorage
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      router.push("/auth/welcome");
    } catch (e) {
      alert("Erro ao fazer login");
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold mb-1">Bem-vindo à <span className="font-extrabold">CYCO</span></h1>
      <div className="h-1 w-24 bg-cyco-green mb-6" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input placeholder="exemplo@cyco.com" {...register("email")} className="pl-10" />
          </div>
          {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input type="password" placeholder="••••••••" {...register("password")} className="pl-10" />
          </div>
          {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
        </div>
        <div className="text-right text-xs text-gray-500 -mt-2">esqueci minha senha</div>
        <button type="submit" className={`${button()} w-full cursor-pointer`} disabled={isSubmitting}>Entrar</button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Não tem uma conta? <Link href="/auth/register" className="font-semibold">Cadastre-se</Link>
      </p>
    </AuthLayout>
  );
}



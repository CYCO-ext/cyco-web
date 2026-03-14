"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") return null;

  if (!session) {
    if (typeof window !== "undefined") router.replace("/auth/login");
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Bem-vindo, {session.user?.name}!</h1>
      <p className="text-lg text-gray-600">Seu email: {session.user?.email}</p>
      {Boolean((session as any).role) && (
        <p className="text-lg text-cyco-green mt-2">Tipo: {(session as any).role}</p>
      )}
    </div>
  );
}

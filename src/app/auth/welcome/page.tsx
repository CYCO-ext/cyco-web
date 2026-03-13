"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    } else {
      router.replace("/auth/login");
    }
  }, [router]);

  if (!user) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Bem-vindo, {user.name}!</h1>
      <p className="text-lg text-gray-600">Seu email: {user.email}</p>
    </div>
  );
}

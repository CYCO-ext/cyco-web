"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/home/MainContent";

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.replace("/auth/login");
    }
  }, [status, session, router]);

  if (status === "loading" || !session) return null;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      
      {/* HEADER */}
      <Header centerText="Olá, Boas Vindas!" />

      {/* CONTEÚDO */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <MainContent />

        
      </div>

    </div>
  );
}

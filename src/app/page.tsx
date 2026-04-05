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
    <div className="flex flex-col h-screen w-full">
      <Header centerText="Olá, Boas Vindas!" />
      <div className="flex flex-1 md:flex-row flex-col-reverse overflow-hidden min-h-0">
        <div className="hidden md:flex h-full">
          <Sidebar />
        </div>
        <div className="flex-1 min-h-0 w-full flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <MainContent />
          </div>
        </div>
      </div>
    </div>
  );
}

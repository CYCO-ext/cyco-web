"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Info, HelpCircle, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

const materialsList = ["Vidro", "Metal", "Eletrônico", "Plástico"];

export default function NewCollectionPage() {
  const router = useRouter();
  const { status } = useSession();

  const [images, setImages] = useState<File[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  }

  function toggleMaterial(mat: string) {
    setSelectedMaterials(prev =>
      prev.includes(mat)
        ? prev.filter(m => m !== mat)
        : [...prev, mat]
    );
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-gray-500">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-gray-100">
      <Header />

      <div className="flex flex-1 min-h-0">
        {/* SIDEBAR */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* CONTENT */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6">

          {/* CENTRALIZAÇÃO */}
          <div className="flex-1 w-full flex items-center justify-center">

            {/* CARD */}
            <div className="w-full max-w-6xl bg-white rounded-2xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* LEFT */}
              <div className="flex flex-col gap-4">
                <input className="bg-gray-100 rounded-lg p-3 text-sm" placeholder="Empresa" />

                <div className="grid grid-cols-2 gap-4">
                  <input className="bg-gray-100 rounded-lg p-3 text-sm" placeholder="00000-000" />
                  <input className="bg-gray-100 rounded-lg p-3 text-sm" placeholder="Número" />
                </div>

                <input className="bg-gray-100 rounded-lg p-3 text-sm" placeholder="Logradouro" />

                <div className="grid grid-cols-2 gap-4">
                  <input className="bg-gray-100 rounded-lg p-3 text-sm" placeholder="Cidade" />
                  <input className="bg-gray-100 rounded-lg p-3 text-sm" placeholder="Bairro" />
                </div>

                <input className="bg-gray-100 rounded-lg p-3 text-sm" placeholder="Complemento" />

                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" className="cursor-pointer" />
                  Localização cadastrada
                </label>
              </div>

              {/* RIGHT */}
              <div className="flex flex-col gap-4">

                {/* MULTISELECT */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="w-full bg-gray-100 rounded-lg p-3 text-sm flex justify-between items-center hover:ring-2 hover:ring-green-500 transition"
                  >
                    <div className="flex flex-wrap gap-1">
                      {selectedMaterials.length > 0 ? (
                        selectedMaterials.map(mat => (
                          <span key={mat} className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs">
                            {mat}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500">Selecionar materiais</span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 transition ${open ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-10 mt-2 w-full bg-white border rounded-xl shadow-lg overflow-hidden"
                      >
                        {materialsList.map(mat => (
                          <label
                            key={mat}
                            className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedMaterials.includes(mat)}
                                onChange={() => toggleMaterial(mat)}
                                className="cursor-pointer"
                              />
                              {mat}
                            </div>
                            {selectedMaterials.includes(mat) && (
                              <Check className="w-4 h-4 text-green-600" />
                            )}
                          </label>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* PESO */}
                <input
                  type="number"
                  className="bg-gray-100 rounded-lg p-3 text-sm"
                  placeholder="Peso (em kg)"
                />

                {/* IMAGE UPLOAD */}
                <label className="bg-gray-100 rounded-xl h-48 flex flex-col items-center justify-center text-center text-gray-500 cursor-pointer hover:ring-2 hover:ring-green-500 transition">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  {images.length > 0 ? (
                    <div className="flex flex-col items-center">
                      <Check className="w-8 h-8 text-green-600 mb-2" />
                      <p className="text-sm font-medium text-green-700">Imagens selecionadas</p>
                      <span className="text-xs text-gray-500">{images.length} arquivo(s)</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">
                        Adicione imagens dos materiais<br />
                        a serem recolhidos
                      </p>
                      <span className="text-xs mt-2">(JPG, PNG, JPEG)</span>
                    </>
                  )}
                </label>

                {/* COINS */}
                <div className="text-sm text-gray-600">
                  🪙 CyCoins gerados: <span className="font-semibold">10</span>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="w-full max-w-6xl flex justify-between items-center px-6 mt-6 self-center">
            <div className="flex items-center gap-2 text-green-600 cursor-pointer hover:opacity-80">
              <Info />
              <span>Informações</span>
            </div>

            <div className="flex gap-4">
              <button className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-100 transition">
                Cancelar
              </button>
              <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition">
                Confirmar
              </button>
            </div>

            <div className="flex items-center gap-2 text-green-600 cursor-pointer hover:opacity-80">
              <HelpCircle />
              <span>Ajuda</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

"use client";
import clsx from "clsx";


export function RoleCard({ selected, onClick, label, icon }: { selected: boolean; onClick: () => void; label: string; icon: React.ReactNode; }) {
  return (
    <button type="button" onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm",
        selected ? "border-cyco-green bg-cyco-light" : "border-gray-200 bg-white hover:bg-gray-50"
      )}
    >
      <div className="text-2xl">{icon}</div>
      <div className="text-left">
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-gray-500">{label === "Catador" ? "Coleta materiais" : "Gera resíduos"}</div>
      </div>
    </button>
  );
}

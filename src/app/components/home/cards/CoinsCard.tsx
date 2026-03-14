import { Gift } from "lucide-react";

export default function CoinsCard() {
  return (
    <div className="bg-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center shadow w-full h-full">

      <Gift size={40} className="text-yellow-500 mb-4" />

      <span className="text-3xl font-bold text-green-800">
        450
      </span>

      <span className="text-lg font-semibold text-green-800">
        CYCOINS
      </span>

      <p className="text-gray-500 text-sm mt-4">
        Pontos acumulados
      </p>

    </div>
  );
}

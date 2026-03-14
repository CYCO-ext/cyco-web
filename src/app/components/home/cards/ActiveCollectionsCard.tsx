import { Clock } from "lucide-react";

export default function ActiveCollectionsCard() {
  return (
    <div className="bg-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center shadow w-full h-full">

      <h2 className="text-gray-600 text-lg">
        Coletas em andamento
      </h2>

      <span className="text-4xl font-bold text-green-700 mt-4">
        5
      </span>

      <Clock className="text-green-700 mt-4" size={40} />

    </div>
  );
}

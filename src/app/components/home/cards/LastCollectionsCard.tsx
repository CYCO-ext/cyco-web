import { Star } from "lucide-react";

export type CollectionRow = {
  id: string | number;
  kg: string;
  date: string;
  status: "Concluída" | "Cancelado" | "Em Andamento";
  rating: number | null;
};

type LastCollectionsProps = {
  collections: CollectionRow[];
};

export default function LastCollectionsCard({ collections }: LastCollectionsProps) {
  return (
    <div className="bg-[#C7D6A3] rounded-2xl p-6 w-full h-full transition-all duration-300 ease-in-out 
                    shadow-sm hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] 
                    border border-transparent hover:border-white/20 group">

      <div className="flex justify-between mb-4">
        <h2 className="text-[#2F4F2F] font-bold text-lg">
          Últimas coletas
        </h2>

        <span className="text-sm text-green-800 font-semibold cursor-pointer hover:underline active:scale-95 transition-transform">
          Ver todas →
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {collections.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[1fr_1fr_1.5fr_1fr] items-center bg-white/50 backdrop-blur-sm rounded-lg p-3 text-sm text-[#2F4F2F]
                       transition-all duration-200 hover:bg-white hover:scale-[1.02] shadow-sm cursor-pointer"
          >
            <span className="font-medium text-left">{row.kg}</span>
            <span className="opacity-70 text-center">{row.date}</span>
            
            <span className={`font-semibold text-center ${
              row.status === "Cancelado" ? "text-red-600" : 
              row.status === "Em Andamento" ? "text-blue-600" : "text-green-700"
            }`}>
              {row.status}
            </span>
            
            <div className="justify-self-end">
              {/* Lógica de exibição da última coluna */}
              {row.status === "Concluída" ? (
                row.rating === null ? (
                  <button className="text-green-800 font-bold cursor-pointer hover:text-green-600 active:scale-90 transition-transform">
                    Avalie
                  </button>
                ) : (
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, index) => (
                      <Star
                        key={index}
                        size={14}
                        className={index < row.rating! ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}
                      />
                    ))}
                  </div>
                )
              ) : (
                <span className="text-[#2F4F2F]/30">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

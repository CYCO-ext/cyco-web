import Link from "next/link";
import { Star } from "lucide-react";
import { LastCollectionRowView } from "@/app/lib/homeCollections";

export type CollectionRow = LastCollectionRowView;

type LastCollectionsProps = {
  collections: CollectionRow[];
  loading?: boolean;
  error?: boolean;
};

export default function LastCollectionsCard({ collections, loading, error }: LastCollectionsProps) {
  function statusColor(status: string) {
    const normalized = status.toLowerCase();
    if (normalized.includes("cancel")) return "text-red-600";
    if (normalized.includes("andamento")) return "text-blue-600";
    if (normalized.includes("pendente")) return "text-amber-700";
    return "text-green-700";
  }

  return (
    <div className="bg-[#C7D6A3] rounded-2xl p-6 w-full h-full transition-all duration-300 ease-in-out 
                    shadow-sm hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] 
                    border border-transparent hover:border-white/20 group">

      <div className="flex justify-between mb-4">
        <h2 className="text-[#2F4F2F] font-bold text-lg">
          Últimas coletas
        </h2>

        <Link href="/collections" className="text-sm text-green-800 font-semibold cursor-pointer hover:underline active:scale-95 transition-transform">
          Ver todas →
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {loading && (
          <div className="text-gray-600 text-center py-8">Carregando coletas...</div>
        )}
        {!loading && error && (
          <div className="text-gray-600 text-center py-8">Não foi possível carregar coletas</div>
        )}
        {!loading && !error && collections.length === 0 && (
          <div className="text-gray-500 text-center py-8">Nenhuma coleta encontrada</div>
        )}
        {!loading && !error && collections.map((row) => (
          <Link
            href="/collections"
            key={row.id}
            className="grid grid-cols-[auto_1fr_auto] gap-3 items-center bg-white/50 backdrop-blur-sm rounded-lg p-3 text-sm text-[#2F4F2F]
                       transition-all duration-200 hover:bg-white hover:scale-[1.02] shadow-sm cursor-pointer"
          >
            <div className="min-w-[4.5rem]">
              <div className="font-medium text-left">{row.kg}</div>
              <div className="opacity-70 text-xs">{row.date}</div>
            </div>

            <div className="min-w-0">
              <div className="truncate text-xs text-[#2F4F2F]/70">{row.location}</div>
              <div className={`font-semibold ${statusColor(row.status)}`}>
                {row.status}
              </div>
            </div>
            
            <div className="justify-self-end">
              {row.status === "Concluída" ? (
                row.rating === null ? (
                  <span className="text-green-800 font-bold">
                    Avalie
                  </span>
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
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { NextCollectionView } from "@/app/lib/homeCollections";

type Props = {
  collections: NextCollectionView[];
  loading?: boolean;
  error?: boolean;
};

function formatDate(date: Date) {
  const months = ["JAN", "FEB", "MAR", "APR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return {
    month: months[date.getMonth()],
    day: date.getDate().toString().padStart(2, "0"),
    weekday: weekdays[date.getDay()],
  };
}

export default function NextCollectionsCard({ collections, loading, error }: Props) {
  return (
    <div className="bg-[#C7D6A3] rounded-2xl p-6 w-full h-full transition-all duration-300 ease-in-out \
                    shadow-sm hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] \
                    border border-transparent hover:border-white/20 group flex flex-col">
      <h2 className="text-[#2F4F2F] font-bold text-lg mb-4">Próximas Coletas</h2>
      <div className="flex flex-col gap-4 flex-1">
        {loading && (
          <div className="text-gray-600 text-center py-8">Carregando coletas...</div>
        )}
        {!loading && error && (
          <div className="text-gray-600 text-center py-8">Não foi possível carregar coletas</div>
        )}
        {!loading && !error && collections.length === 0 && (
          <div className="text-gray-500 text-center py-8">Nenhuma coleta agendada</div>
        )}
        {!loading && !error && collections.map((col) => {
          const { month, day, weekday } = formatDate(new Date(col.date));
          return (
            <Link href="/collections" key={col.id} className="flex flex-row gap-4 bg-white/50 backdrop-blur-sm rounded-lg p-4 items-center">
              <div className="flex flex-col items-center min-w-[60px]">
                <span className="text-xs text-gray-500 font-bold uppercase">{month}</span>
                <span className="text-3xl font-extrabold text-green-800 leading-none">{day}</span>
                <span className="text-xs text-gray-500 mt-1">{weekday}</span>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <div className="font-semibold text-[#2F4F2F] text-base truncate">{col.location}</div>
                <div className="flex gap-4 text-xs text-gray-600">
                  <span>Horário: <span className="font-medium text-green-800">{col.time}</span></span>
                  <span>Peso: <span className="font-medium text-green-800">{col.weight}</span></span>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {col.materials.map((mat, i) => (
                    <span key={i} className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                      {mat}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <Link href="/collections" className="mt-6 bg-cyco-green text-white px-6 py-2 rounded-full text-sm w-fit font-semibold mx-auto hover:bg-green-800 transition-all cursor-pointer">
        Ver detalhes
      </Link>
    </div>
  );
}

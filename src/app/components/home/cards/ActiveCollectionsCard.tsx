import { Clock } from "lucide-react";

export default function ActiveCollectionsCard() {
  const redirectUrl = "/coletas"; 

  return (
    <a
      href={redirectUrl}
      className="bg-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center w-full h-full gap-4 no-underline text-current
                 transition-all duration-300 ease-in-out cursor-pointer
                 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]
                 border border-transparent hover:border-gray-300"
    >
      <h2 className="text-gray-600 text-2xl font-semibold text-center">
        Coletas em andamento
      </h2>

      <span className="text-5xl font-extrabold text-green-700 mt-4">
        5
      </span>

      <Clock className="text-green-700 mt-4" size={75} />
    </a>
  );
}

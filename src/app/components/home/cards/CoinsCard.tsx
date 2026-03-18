import { Gift } from "lucide-react";

export default function CoinsCard() {
  const redirectUrl = "/rewards"; // <--- Rota para a loja ou extrato de pontos

  return (
    <a
      href={redirectUrl}
      className="bg-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center w-full h-full gap-4 no-underline text-current
                 transition-all duration-300 ease-in-out cursor-pointer
                 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]
                 border border-transparent hover:border-gray-300"
    >
      <Gift size={75} className="text-yellow-500 mb-2" />

      <div className="flex flex-col items-center">
        <span className="text-4xl font-extrabold text-green-800 leading-tight">
          450
        </span>
        <span className="text-4xl font-extrabold text-green-800 leading-tight">
          CYCOINS
        </span>
      </div>

      <p className="text-gray-500 text-sm mt-2">
        Pontos acumulados
      </p>
    </a>
  );
}

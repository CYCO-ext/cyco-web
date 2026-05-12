import Link from "next/link";
import { MapPinned, Route, Truck } from "lucide-react";

export default function CreateRouteSuggestionCard() {
  return (
    <Link
      href="/routes/suggest"
      className="group relative flex h-full w-full items-center justify-between overflow-hidden rounded-2xl border border-transparent bg-[#C7D6A3] p-6 text-current no-underline shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:scale-[1.02] hover:border-white/20 hover:shadow-xl"
    >
      <div className="z-10 flex max-w-[230px] flex-col gap-3">
        <h2 className="text-4xl font-bold leading-tight text-white">
          Sugira uma rota!
        </h2>

        <p className="text-sm text-[#2F4F2F]">
          Selecione coletas em andamento e organize seus veículos.
        </p>

        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#8DB37C] px-5 py-2 text-sm font-semibold text-white transition-all duration-150">
          <Route className="h-4 w-4" />
          Criar rota
        </span>
      </div>

      <div className="absolute bottom-[-18px] right-[-18px] flex h-36 w-36 rotate-6 items-center justify-center rounded-full bg-white/25 text-green-800 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
        <Truck className="absolute h-16 w-16 translate-y-5" />
        <MapPinned className="absolute h-14 w-14 -translate-y-8 translate-x-2 text-[#2F4F2F]" />
      </div>
    </Link>
  );
}

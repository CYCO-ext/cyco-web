import Image from "next/image";

export default function CreateCollectionCard() {
  const redirectUrl = "/nova-coleta"; // <--- Rota para criar coleta

  return (
    <a
      href={redirectUrl}
      className="relative bg-[#C7D6A3] rounded-2xl p-6 flex justify-between items-center w-full h-full overflow-visible no-underline
                 transition-all duration-300 ease-in-out cursor-pointer
                 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]
                 border border-transparent hover:border-white/20 group"
    >
      
      <div className="flex flex-col gap-3 max-w-[220px] z-10">
        <h2 className="text-white font-bold text-4xl leading-tight">
          Crie uma nova coleta!
        </h2>

        <p className="text-sm text-[#2F4F2F]">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>

        {/* Botão com efeito de click (active) */}
        <button className="bg-[#8DB37C] text-white px-6 py-2 rounded-full text-sm w-fit font-semibold
                           transition-all duration-150
                           cursor-pointer
                           group-hover:bg-[#7a9d6a]
                           active:scale-95 active:shadow-inner">
          Nova Coleta +
        </button>
      </div>

      {/* Imagem com leve animação no hover do card */}
      <div className="absolute right-[-50px] bottom-[-70px] rotate-6 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
        <Image
          src="/Recycling.png"
          alt="reciclagem"
          width={260}
          height={260}
          priority
        />
      </div>
    </a>
  );
}

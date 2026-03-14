import Image from "next/image";

export default function CreateCollectionCard() {
  return (
    <div className="bg-[#C7D6A3] rounded-2xl p-6 flex justify-between items-center shadow w-full h-full">
      
      <div className="flex flex-col gap-3 max-w-[220px]">
        <h2 className="text-white font-semibold text-lg">
          Crie uma nova coleta!
        </h2>

        <p className="text-sm text-[#2F4F2F]">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>

        <button className="bg-[#8DB37C] text-white px-4 py-2 rounded-full text-sm w-fit">
          Nova Coleta +
        </button>
      </div>

      <Image
        src="/Recycling.png"
        alt="reciclagem"
        width={120}
        height={120}
      />
    </div>
  );
}

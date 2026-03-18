type Material = {
  name: string;
  value: number;
  color: string;
};

type Props = {
  total: number;
  materials: Material[];
};

export default function EnvironmentalImpactCard({
  total,
  materials,
}: Props) {
  const topMaterials = materials.slice(0, 3);

  const redirectUrl = "/detalhes-impacto";

  return (
    <a 
      href={redirectUrl}
      className="bg-[#AFC39A] rounded-3xl p-6 flex flex-col gap-5 w-full h-full text-current no-underline
                 transition-all duration-300 ease-in-out cursor-pointer
                 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]
                 border border-transparent hover:border-white/20"
    >
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-[#2F4F2F] font-semibold text-lg">
          Impacto Ambiental
        </h2>
        <span className="text-[#2F4F2F]/70 text-sm">
          {total} Kg
        </span>
      </div>

      {/* Lista estilo dashboard (apenas top 3) */}
      <div className="flex flex-col gap-3">
        {topMaterials.map((item, index) => {
          const percentage = (item.value / total) * 100;

          return (
            <div
              key={index}
              className="bg-white/30 rounded-xl p-4 flex flex-col gap-3 backdrop-blur-sm"
            >
              {/* Topo */}
              <div className="flex justify-between items-center">
                <span className="text-[#2F4F2F] font-medium">
                  {item.name}
                </span>

                <div className="text-right">
                  <p className="text-sm text-[#2F4F2F] font-semibold">
                    {item.value}Kg
                  </p>
                  <p className="text-xs text-[#2F4F2F]/70">
                    {percentage.toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Barra principal */}
              <div className="w-full h-3 bg-gray-200/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </a>
  );
}

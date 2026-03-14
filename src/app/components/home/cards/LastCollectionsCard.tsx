export default function LastCollectionsCard() {
  const rows = [
    { kg: "120Kg", date: "14/09", status: "Concluída" },
    { kg: "100Kg", date: "15/09", status: "Cancelado" },
    { kg: "89Kg", date: "16/09", status: "Em Andamento" },
    { kg: "78Kg", date: "16/09", status: "Concluída" },
  ];

  return (
    <div className="bg-[#C7D6A3] rounded-2xl p-6 shadow w-full h-full ">

      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Últimas coletas
        </h2>

        <span className="text-sm text-green-700 cursor-pointer">
          Ver todas →
        </span>
      </div>

      <div className="flex flex-col gap-3">

        {rows.map((row, i) => (
          <div
            key={i}
            className="flex justify-between bg-white rounded-lg p-3 text-sm"
          >
            <span>{row.kg}</span>
            <span>{row.date}</span>
            <span>{row.status}</span>
            <span className="text-green-700 cursor-pointer">
              Avalie
            </span>
          </div>
        ))}

      </div>

    </div>
  );
}

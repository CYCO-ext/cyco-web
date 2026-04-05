import CreateCollectionCard from "./cards/CreateCollectionCard";
import ActiveCollectionsCard from "./cards/ActiveCollectionsCard";
import EnvironmentalImpactCard from "./cards/EnvironmentalImpactCard";
import CoinsCard from "./cards/CoinsCard";
import LastCollectionsCard, { CollectionRow } from "./cards/LastCollectionsCard";

export default function MainContent() {
  const coletasRecentes: CollectionRow[] = [
    { id: "1", kg: "120Kg", date: "14/09", status: "Concluída", rating: 5 },
    { id: "2", kg: "85Kg", date: "18/09", status: "Concluída", rating: null },
    { id: "3", kg: "42Kg", date: "20/09", status: "Em Andamento", rating: null },
    { id: "4", kg: "15Kg", date: "21/09", status: "Cancelado", rating: null },
  ];

  const materials = [{ name: "Papel", value: 1175, color: "#3B82F6" },
              { name: "Vidro", value: 1175, color: "#166534" }];

 return (
    <main className="w-full h-full bg-[#F5F5F5] p-4 md:p-14">
      <div className="flex flex-col gap-4 md:gap-10">
        {/* TOP */}
        <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-10">
          <CreateCollectionCard />
          <ActiveCollectionsCard />
          <EnvironmentalImpactCard total={2350} materials={materials} />
        </div>
        {/* BOTTOM */}
        <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-10">
          <CoinsCard />
          <LastCollectionsCard collections={coletasRecentes} />
        </div>
      </div>
    </main>
  );
}

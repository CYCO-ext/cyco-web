import CreateCollectionCard from "./cards/CreateCollectionCard";
import ActiveCollectionsCard from "./cards/ActiveCollectionsCard";
import EnvironmentalImpactCard from "./cards/EnvironmentalImpactCard";
import CoinsCard from "./cards/CoinsCard";
import LastCollectionsCard, { CollectionRow } from "./cards/LastCollectionsCard";

export default function MainContent() {
  const coletasRecentes: CollectionRow[] = [
    {
      id: "1",
      kg: "120Kg",
      date: "14/09",
      status: "Concluída",
      rating: 5,
    },
    {
      id: "2",
      kg: "85Kg",
      date: "18/09",
      status: "Concluída",
      rating: null,
    },
    {
      id: "3",
      kg: "42Kg",
      date: "20/09",
      status: "Em Andamento",
      rating: null,
    },
    {
      id: "4",
      kg: "15Kg",
      date: "21/09",
      status: "Cancelado",
      rating: null,
    },
  ];
  return (
    <main className="flex-1 h-full p-14 bg-[#F5F5F5]">

      <div className="grid h-full gap-14 grid-rows-[0.45fr_0.55fr]">

        {/* TOP */}
        <div className="grid h-full gap-14 grid-cols-[1.3fr_1fr_1.9fr]">
          <CreateCollectionCard />
          <ActiveCollectionsCard />
          <EnvironmentalImpactCard
            total={2350}
            materials={[
              { name: "Papel", value: 1175, color: "#3B82F6" },
              { name: "Vidro", value: 1175, color: "#166534" }, 
            ]}
          />
        </div>

        {/* BOTTOM */}
        <div className="grid h-full gap-14 grid-cols-[1.3fr_3fr]">
          <CoinsCard />
          <LastCollectionsCard collections={coletasRecentes} />
        </div>

      </div>

    </main>
  );
}

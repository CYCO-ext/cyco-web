import CreateCollectionCard from "./cards/CreateCollectionCard";
import ActiveCollectionsCard from "./cards/ActiveCollectionsCard";
import EnvironmentalImpactCard from "./cards/EnvironmentalImpactCard";
import CoinsCard from "./cards/CoinsCard";
import LastCollectionsCard from "./cards/LastCollectionsCard";

export default function MainContent() {
  return (
    <main className="flex-1 h-full p-8 bg-[#F5F5F5]">

      <div className="grid h-full gap-6 grid-rows-[0.45fr_0.55fr]">

        {/* TOP */}
        <div className="grid h-full gap-6 grid-cols-[1.3fr_1fr_1.9fr]">
          <CreateCollectionCard />
          <ActiveCollectionsCard />
          <EnvironmentalImpactCard />
        </div>

        {/* BOTTOM */}
        <div className="grid h-full gap-6 grid-cols-[1.3fr_3fr]">
          <CoinsCard />
          <LastCollectionsCard />
        </div>

      </div>

    </main>
  );
}

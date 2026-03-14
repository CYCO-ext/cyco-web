export default function EnvironmentalImpactCard() {
  return (
    <div className="bg-[#AFC39A] rounded-2xl p-6 shadow flex flex-col gap-4 w-full h-full">

      <h2 className="font-semibold text-lg">
        Impacto Ambiental
      </h2>

      <div className="flex gap-6 items-center">

        <div className="w-24 h-24 rounded-full border-8 border-green-700 flex items-center justify-center text-lg font-semibold">
          2350Kg
        </div>

        <div className="flex flex-col gap-3 flex-1">

          <div>
            <span>Papel 50%</span>
            <div className="w-full bg-gray-200 h-2 rounded mt-1">
              <div className="w-1/2 bg-blue-500 h-2 rounded"></div>
            </div>
          </div>

          <div>
            <span>Vidro 50%</span>
            <div className="w-full bg-gray-200 h-2 rounded mt-1">
              <div className="w-1/2 bg-green-700 h-2 rounded"></div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

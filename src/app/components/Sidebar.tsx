import { Home, Recycle, Gift, Settings, LogOut } from "lucide-react";

const icons = [
  { icon: <Home size={28} />, label: "Home" },
  { icon: <Recycle size={28} />, label: "Reciclagem" },
  { icon: <Gift size={28} />, label: "Presente" },
  { icon: <Settings size={28} />, label: "Configurações" },
];

export default function Sidebar() {
  return (
    <aside
      className="flex flex-col justify-between items-center h-full py-8"
      style={{
        width: 90,
        background: "linear-gradient(180deg, #ACD294 0%, #F0E9C3 100%)",
      }}
    >
      <div />

      <div className="flex flex-col gap-8 items-center flex-1 justify-center">
        {icons.map((item) => (
          <div
            key={item.label}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-cyco-green hover:text-white transition cursor-pointer"
            title={item.label}
          >
            {item.icon}
          </div>
        ))}
      </div>

      <div className="mb-2">
        <div
          className="w-14 h-14 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-red-500 hover:text-white transition cursor-pointer"
          title="Sair"
        >
          <LogOut size={28} />
        </div>
      </div>
    </aside>
  );
}

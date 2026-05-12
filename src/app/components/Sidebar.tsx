import { Home, Recycle, Gift, Settings, LogOut, Route } from "lucide-react";
import { useRouter } from "next/navigation";

const icons = [
  { icon: <Home size={28} />, label: "Home", path: "/" },
  { icon: <Recycle size={28} />, label: "Coletas", path: "/collections" },
  { icon: <Route size={28} />, label: "Rotas salvas", path: "/routes/saved" },
  { icon: <Gift size={28} />, label: "CYCO Coins", path: "/coins" },
  { icon: <Settings size={28} />, label: "Configurações", path: "/settings" },
];

export default function Sidebar() {
  const router = useRouter();
  return (
    <aside
      className="hidden md:flex flex-col justify-between items-center h-full py-8 md:w-[90px] w-full p-2 md:p-8"
      style={{
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
    onClick={() => router.push(item.path)}
  >
    {item.icon}
  </div>
))}
      </div>

      <div className="mb-2">
        <div
          className="w-14 h-14 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-red-500 hover:text-white transition cursor-pointer"
          title="Sair"
          onClick={() => router.push("/auth/login")}

        >
          <LogOut size={28} />
        </div>
      </div>
    </aside>
  );
}

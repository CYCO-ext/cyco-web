import Image from "next/image";

interface HeaderProps {
  centerText?: string;
}

export default function Header({ centerText }: HeaderProps) {
  return (
    <header
      className="w-full flex items-center justify-between"
      style={{ background: "#C5DBB7", padding: "21px 30px" }}
    >
      <div className="flex items-center gap-2">
        <Image src="/Logo.png" alt="Logo" width={163} height={51} className="rounded" />
      </div>
      <div className="flex-1 flex justify-center">
        {centerText && (
          <span
            className="text-cyco-green"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 42 }}
          >
            {centerText}
          </span>
        )}
      </div>
      <div>
        <Image
          src="/Profile.png"
          alt="User"
          width={57}
          height={57}
          className="rounded-full border-2 border-cyco-green object-cover"
        />
      </div>
    </header>
  );
}

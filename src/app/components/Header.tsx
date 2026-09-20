"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getSessionMeta, isDeliverymanRole } from "@/app/lib/createCollection";

interface HeaderProps {
  centerText?: string;
}

export default function Header({ centerText }: HeaderProps) {
  const { data: session } = useSession();
  const sessionMeta = getSessionMeta(session);
  const profileHref = isDeliverymanRole(sessionMeta.role) ? "/deliveryman" : "/profile";

  return (
    <header
      className="w-full flex items-center justify-between px-3 md:px-[30px] py-3 md:py-[21px]"
      style={{ background: "#C5DBB7" }}
    >
      <div className="flex items-center gap-2">
        <Image
          src="/Logo.png"
          alt="Logo"
          width={100}
          height={32}
          className="rounded md:w-[163px] md:h-[51px] w-[100px] h-[32px] object-contain"
        />
      </div>
      <div className="flex-1 flex justify-center">
        {centerText && (
          <span
            className="text-cyco-green text-center break-words font-semibold"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 24,
              lineHeight: "28px",
              maxWidth: "90vw",
            }}
          >
            <span className="hidden md:inline" style={{ fontSize: 42, lineHeight: "48px" }}>
              {centerText}
            </span>
            <span className="md:hidden block">{centerText}</span>
          </span>
        )}
      </div>
      <Link href={profileHref} aria-label="Abrir perfil">
        <Image
          src="/Profile.png"
          alt="User"
          width={40}
          height={40}
          className="rounded-full border-2 border-cyco-green object-cover md:w-[57px] md:h-[57px] w-[40px] h-[40px]"
        />
      </Link>
    </header>
  );
}
